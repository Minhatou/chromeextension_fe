import { createWorker } from 'tesseract.js';

console.log('[OCR Offscreen] Script loaded, waiting for OCR_REQUEST messages...');

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('[OCR Offscreen] Received message:', message.type);
  if (message.type !== 'OCR_REQUEST') return;

  const { imageBase64, mimeType } = message;

  (async () => {
    try {
      const workerPath = chrome.runtime.getURL('worker.min.js');
      const langPath   = chrome.runtime.getURL('lang-data/');
      const corePath   = chrome.runtime.getURL('tesseract-core.wasm.js');

      const worker = await createWorker(['eng', 'vie'], 1, {
        workerPath,
        langPath,
        corePath,
        workerBlobURL: false,
        logger: m => console.log('[OCR Offscreen]', m)
      });

      const dataUrl = `data:${mimeType};base64,${imageBase64}`;
      const { data: { text } } = await worker.recognize(dataUrl);
      await worker.terminate();

      const clean = text.trim();
      if (!clean) {
        sendResponse({ error: 'Không tìm thấy chữ trong ảnh' });
      } else {
        sendResponse({ text: clean });
      }
    } catch (err) {
      const errMsg = err?.message || String(err) || 'Unknown OCR error';
      console.error('[OCR Offscreen] Error:', errMsg, err);
      sendResponse({ error: errMsg });
    }
  })();

  return true; // keep sendResponse channel open for async
});
