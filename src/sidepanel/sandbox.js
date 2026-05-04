import { LlmInference, FilesetResolver } from '@mediapipe/tasks-genai';

let llmInference = null;
const SYSTEM_PROMPT = "You are an expert IT translator. Translate the following technical text into professional Vietnamese. Maintain technical terms where appropriate. Provide only the translation.";

console.log('[Sandbox] Sandbox initialized.');

window.addEventListener('message', async (event) => {
  const { type, payload, messageId } = event.data;
  console.log('[Sandbox] Received message from parent:', type);

  try {
    if (type === 'INIT_MODEL') {
      console.log('[Sandbox] Initializing model...');
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
        topK: 40,
        temperature: 0.2,
        randomSeed: 101,
      });

      console.log('[Sandbox] Model ready.');
      window.parent.postMessage({ type: 'INIT_COMPLETE', messageId }, '*');
    }

    if (type === 'GENERATE') {
      if (!llmInference) throw new Error('Inference not initialized');
      
      const { text, context } = payload;
      // Ultra-strict prompt for small models
      const fullPrompt = `<start_of_turn>user
Translate only the "Target" to Vietnamese. Use "Context" for reference only.
Context: ${context}
Target: ${text}<end_of_turn>
<start_of_turn>model
`;

      console.log('[Sandbox] Starting generation...');
      await llmInference.generateResponse(fullPrompt, (partialText, done) => {
        // Advanced cleanup
        let cleanText = partialText
          // Remove conversational fillers
          .replace(/^(Có thể|Chắc chắn|Tôi có thể|Đây là bản dịch|Dưới đây là|Bản dịch của bạn).*?(\n|:)\s*/gi, '')
          .replace(/^Sure.*?(\n|:)\s*/gi, '')
          .replace(/^Here is.*?(\n|:)\s*/gi, '')
          // Remove prompt echoes or labels if model repeats them
          .replace(/^(Translation|Bản dịch|Target|Result):\s*/gi, '')
          // Remove common markdown artifacts
          .replace(/^\*\*.*?\*\*:\s*/g, '') // Remove "**Label:**"
          .replace(/\*\*/g, '')              // Remove all bold markers
          .replace(/###/g, '')               // Remove header markers
          .trimStart();

        window.parent.postMessage({ 
          type: 'GENERATE_PROGRESS', 
          payload: { partialText: cleanText, done },
          messageId 
        }, '*');
      });
    }
  } catch (err) {
    console.error('[Sandbox] Error:', err);
    window.parent.postMessage({ type: 'ERROR', payload: err.message, messageId }, '*');
  }
});
