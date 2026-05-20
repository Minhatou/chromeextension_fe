import { LlmInference, FilesetResolver } from '@mediapipe/tasks-genai';

let llmInference = null;
let useApi = false;
const API_URL = 'http://127.0.0.1:5000/api/translate';

console.log('[Sandbox] Sandbox initialized.');

window.addEventListener('message', async (event) => {
  const { type, payload, messageId } = event.data;
  console.log('[Sandbox] Received message from parent:', type);

  try {
    if (type === 'SET_MODE') {
      useApi = payload.mode === 'api';
      console.log('[Sandbox] Mode set to:', useApi ? 'API' : 'Local');
      window.parent.postMessage({ type: 'MODE_UPDATED', messageId }, '*');
    }

    if (type === 'INIT_MODEL') {
      console.log('[Sandbox] Initializing local model...');
      const { modelBlob } = payload;

      const genaiFileset = await FilesetResolver.forGenAiTasks(
        "/wasm" // Path relative to extension root
      );

      const modelBuffer = await modelBlob.arrayBuffer();

      llmInference = await LlmInference.createFromOptions(genaiFileset, {
        baseOptions: {
          modelAssetBuffer: new Uint8Array(modelBuffer),
        },
        maxTokens: 1024,
        topK: 1, // Greedy decoding
        temperature: 0.0, // Absolute precision
        randomSeed: 42,
      });

      console.log('[Sandbox] Local model ready.');
      window.parent.postMessage({ type: 'INIT_COMPLETE', messageId }, '*');
    }

    if (type === 'GENERATE') {
      const { text, target_lang } = payload;
      console.log('[Sandbox] Received GENERATE request. Text length:', text.length, 'Mode:', useApi ? 'API' : 'Local', 'Target:', target_lang);

      if (useApi) {
        await generateViaApi(text, target_lang || 'auto', messageId);
      } else {
        if (!llmInference) throw new Error('Local inference engine not initialized. Please load a model or switch to API mode.');
        await generateViaLocal(text, messageId);
      }
    }
  } catch (err) {
    console.error('[Sandbox] Error:', err);
    window.parent.postMessage({ type: 'ERROR', payload: err.message, messageId }, '*');
  }
});

async function generateViaLocal(text, messageId) {
  // Qwen2.5 uses ChatML format: <|im_start|>user\n{prompt}<|im_end|>\n<|im_start|>assistant
  const fullPrompt = `<|im_start|>user
Translate the following IT text to Vietnamese. Provide only the translation.
Text: ${text}<|im_end|>
<|im_start|>assistant
`;

  console.log('[Sandbox] Starting local generation...');
  await llmInference.generateResponse(fullPrompt, (partialText, done) => {
    const cleaned = cleanOutput(partialText);
    window.parent.postMessage({
      type: 'GENERATE_PROGRESS',
      payload: { partialText: cleaned, done },
      messageId
    }, '*');
  });
}

async function generateViaApi(text, targetLang = 'auto', messageId) {
  console.log('[Sandbox] generateViaApi called with targetLang:', targetLang);
  console.log('[Sandbox] API_URL:', API_URL);
  console.log('[Sandbox] Text to translate:', text);
  
  try {
    console.log('[Sandbox] Sending fetch request...');
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text,
        context: '', // You can add context extraction if needed
        target_lang: targetLang
      })
    });

    console.log('[Sandbox] Response status:', response.status);

    if (!response.ok) {
      const errBody = await response.text();
      console.error('[Sandbox] API error body:', errBody);
      throw new Error(`API error (${response.status}): ${errBody || response.statusText}`);
    }

    const data = await response.json();
    console.log('[Sandbox] Data received from API:', data);
    const translation = data.translation;

    console.log('[Sandbox] Translation extracted:', translation);

    // Since the Python backend returns the full text at once (not streaming),
    // we send the full result and mark it as done immediately.
    console.log('[Sandbox] Posting message to parent with result...');
    window.parent.postMessage({
      type: 'GENERATE_PROGRESS',
      payload: { partialText: translation, done: true },
      messageId
    }, '*');
    console.log('[Sandbox] Message posted to parent.');

  } catch (err) {
    console.error('[Sandbox] API Fetch error:', err);
    throw new Error(`Connection to local AI server failed. Ensure Python backend is running on ${API_URL}`);
  }
}

function cleanOutput(text) {
  return text
    .replace(/^Vietnamese:\s*/i, '')
    .replace(/^"|"$/g, '')
    .replace(/^Sure, here is the translation:\s*/i, '')
    .replace(/^I cannot translate this text because.*\./i, '');
}
