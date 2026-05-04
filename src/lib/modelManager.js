import { openDB } from 'idb';

const DB_NAME = 'ModelDatabase';
const STORE_NAME = 'models';
const MODEL_KEY = 'gemma-2b-it-gpu-int4';
const DEFAULT_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/llm_inference/gemma-2b-it-gpu-int4.bin';

function showNotification(title, message) {
  try {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icon128.png'),
      title: title,
      message: message,
      priority: 2
    });
  } catch (err) {
    console.error('[ModelManager] Notification failed:', err);
  }
}

export async function getModel(onProgress) {
  console.log('[ModelManager] Opening IndexedDB...');
  const db = await openDB(DB_NAME, 1, {
    upgrade(db) {
      console.log('[ModelManager] Upgrading/Creating Object Store...');
      db.createObjectStore(STORE_NAME);
    },
  });

  console.log('[ModelManager] Checking for existing model in storage...');
  const existingModel = await db.get(STORE_NAME, MODEL_KEY);
  if (existingModel) {
    console.log('[ModelManager] Model found in IndexedDB. Size:', existingModel.size, 'bytes');
    return existingModel;
  }

  console.log('[ModelManager] Model not found. Initiating download from:', DEFAULT_MODEL_URL);
  showNotification('IT Translator', 'Starting model download (1.3GB). Please keep the browser open.');
  
  const response = await fetch(DEFAULT_MODEL_URL);
  if (!response.ok) {
    console.error('[ModelManager] Download failed with status:', response.status);
    throw new Error(`Failed to download model: ${response.statusText}`);
  }

  const contentLength = response.headers.get('content-length');
  const total = parseInt(contentLength, 10);
  console.log('[ModelManager] Total download size:', total, 'bytes');
  
  let loaded = 0;
  const reader = response.body.getReader();
  const chunks = [];

  console.log('[ModelManager] Starting stream read...');
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      console.log('[ModelManager] Stream read complete.');
      break;
    }
    chunks.push(value);
    loaded += value.length;
    if (onProgress) {
      const p = Math.round((loaded / total) * 100);
      if (p % 10 === 0) console.log(`[ModelManager] Download progress: ${p}%`);
      onProgress(p);
    }
  }

  console.log('[ModelManager] Creating Blob from chunks...');
  const blob = new Blob(chunks);
  console.log('[ModelManager] Saving Blob to IndexedDB...');
  await db.put(STORE_NAME, blob, MODEL_KEY);
  
  console.log('[ModelManager] Model successfully saved to storage.');
  showNotification('IT Translator', 'Download complete! Offline AI is ready.');
  return blob;
}

export async function storeModelFromFile(file, onProgress) {
  console.log('[ModelManager] Storing model from local file:', file.name);
  const db = await openDB(DB_NAME, 1);
  
  // We don't really have "progress" for a local blob read as it's fast,
  // but we'll simulate it or just call onProgress(100)
  if (onProgress) onProgress(50);
  
  await db.put(STORE_NAME, file, MODEL_KEY);
  console.log('[ModelManager] Local model saved to IndexedDB.');
  
  if (onProgress) onProgress(100);
  showNotification('IT Translator', 'Model imported successfully!');
  return file;
}

export async function clearModel() {
  console.log('[ModelManager] Clearing model from IndexedDB...');
  const db = await openDB(DB_NAME, 1);
  await db.delete(STORE_NAME, MODEL_KEY);
  console.log('[ModelManager] Storage cleared.');
}
