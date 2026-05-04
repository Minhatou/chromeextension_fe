import { LlmInference, FilesetResolver } from '@mediapipe/tasks-genai';

let llmInference = null;

const SYSTEM_PROMPT = "You are an expert IT translator. Translate the following technical text into professional Vietnamese. Maintain technical terms where appropriate. Provide only the translation.";

export async function initInference(modelBlob) {
  if (llmInference) {
    console.log('[Inference] LLM already initialized.');
    return llmInference;
  }

  console.log('[Inference] Initializing GenAI Fileset Resolver (Local)...');
  const genaiFileset = await FilesetResolver.forGenAiTasks(
    "/wasm"
  );

  console.log('[Inference] Converting Blob to ArrayBuffer...');
  const modelBuffer = await modelBlob.arrayBuffer();

  console.log('[Inference] Creating LlmInference instance (this may take a few seconds)...');
  llmInference = await LlmInference.createFromOptions(genaiFileset, {
    baseOptions: {
      modelAssetBuffer: new Uint8Array(modelBuffer),
    },
    maxTokens: 1024,
    topK: 40,
    temperature: 0.2,
    randomSeed: 101,
  });

  console.log('[Inference] Engine ready.');
  return llmInference;
}

export async function generateTranslation(text, context = '') {
  if (!llmInference) {
    console.error('[Inference] Call to generateTranslation before initialization.');
    throw new Error('Inference not initialized');
  }

  console.log('[Inference] Generating translation for text:', text.slice(0, 50), '...');
  const fullPrompt = `${SYSTEM_PROMPT}\n\nContext: ${context}\n\nText to translate: ${text}\n\nTranslation:`;
  
  const startTime = performance.now();
  const response = await llmInference.generateResponse(fullPrompt);
  const endTime = performance.now();
  
  console.log(`[Inference] Generation complete in ${Math.round(endTime - startTime)}ms`);
  return response.trim();
}

export async function generateTranslationStream(text, context = '', onPartialResults) {
  if (!llmInference) {
    console.error('[Inference] Call to generateTranslationStream before initialization.');
    throw new Error('Inference not initialized');
  }

  console.log('[Inference] Starting streaming translation...');
  const fullPrompt = `${SYSTEM_PROMPT}\n\nContext: ${context}\n\nText to translate: ${text}\n\nTranslation:`;
  
  await llmInference.generateResponse(fullPrompt, (partialText, done) => {
    if (done) console.log('[Inference] Stream complete.');
    onPartialResults(partialText, done);
  });
}
