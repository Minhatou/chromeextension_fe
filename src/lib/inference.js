import { LlmInference, FilesetResolver } from '@mediapipe/tasks-genai';

let llmInference = null;

const SYSTEM_PROMPT = 
  "Bạn là một biên dịch viên chuyên nghiệp về công nghệ thông tin. " +
  "Nhiệm vụ của bạn là CHỈ dịch đoạn văn bản nằm trong khối [TEXT_TO_TRANSLATE] sang tiếng Việt (hoặc tiếng Anh nếu văn bản gốc là tiếng Việt). " +
  "Khối [CONTEXT] được cung cấp CHỈ để giúp bạn hiểu rõ ngữ cảnh của từ ngữ hoặc các đại từ xưng hô, " +
  "tuyệt đối KHÔNG được dịch các câu trong khối [CONTEXT] hay đưa bất kỳ nội dung nào từ [CONTEXT] vào kết quả đầu ra của bạn. " +
  "Hãy CHỈ trả về bản dịch trực tiếp của văn bản trong khối [TEXT_TO_TRANSLATE], KHÔNG giải thích, không thêm tiêu đề, nhãn hay từ ngữ thừa nào khác.";

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
  const fullPrompt = `${SYSTEM_PROMPT}\n\n[CONTEXT]\n${context}\n[/CONTEXT]\n\n[TEXT_TO_TRANSLATE]\n${text}\n[/TEXT_TO_TRANSLATE]\n\nTranslation:`;
  
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
  const fullPrompt = `${SYSTEM_PROMPT}\n\n[CONTEXT]\n${context}\n[/CONTEXT]\n\n[TEXT_TO_TRANSLATE]\n${text}\n[/TEXT_TO_TRANSLATE]\n\nTranslation:`;
  
  await llmInference.generateResponse(fullPrompt, (partialText, done) => {
    if (done) console.log('[Inference] Stream complete.');
    onPartialResults(partialText, done);
  });
}
