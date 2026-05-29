// Background service worker for IT Translator Chrome Extension

const BASE_URL = 'http://127.0.0.1:5000'

// Register the context menu entry when the extension is installed/updated
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'it-translator',
    title: 'Translate with IT Translator',
    contexts: ['selection'],
  });
  chrome.contextMenus.create({
    id: 'it-explainer',
    title: 'Explain with IT Translator',
    contexts: ['selection'],
  });
  chrome.contextMenus.create({
    id: 'it-image-translator',
    title: 'Dịch hình ảnh với IT Translator',
    contexts: ['image'],
  });
  chrome.contextMenus.create({
    id: 'it-open-dashboard',
    title: 'Mở Dashboard IT Translator',
    contexts: ['all'],
  });
  chrome.contextMenus.create({
    id: 'it-translate-page',
    title: 'Dịch toàn bộ trang web',
    contexts: ['all'],
  });
})

// Handle messages from Side Panel or Content Script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // If message is a request to translate
  if (message.type === 'TRANSLATE_TEXT') {
    const { text, context } = message;
    
    chrome.storage.local.get(['inferenceMode'], (data) => {
      const mode = data.inferenceMode || 'local';
      
      if (mode === 'api') {
        // In API mode, translate directly without opening sidebar
        translateDirectly(text, context, sender.tab.id);
      } else {
        // In local mode, save to storage and open sidebar
        chrome.storage.local.set({ 
          pendingTranslation: { text, context, timestamp: Date.now() } 
        });
        chrome.sidePanel.open({ tabId: sender.tab.id });
      }
    });
  }

  // If message is from Side Panel (engine), forward it to the active tab (UI)
  if (message.type === 'GENERATE_PROGRESS') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, message);
      }
    });
  }
});

// Helper function for direct translation in API mode
async function translateDirectly(text, context, tabId) {
  try {
    chrome.storage.local.get(['glossary', 'glossaryEnabled', 'glossaryMode', 'authSession'], async (storageData) => {
      const enabled = storageData.glossaryEnabled !== false;
      const glossaryMode = storageData.glossaryMode || 'both';
      const glossary = enabled ? (storageData.glossary || []) : [];
      const glossaryDict = {};
      const matchedTerms = [];
      glossary.forEach(g => {
        if (g.term && g.meaning) {
          glossaryDict[g.term] = g.meaning;
          if (text.toLowerCase().includes(g.term.toLowerCase())) {
            matchedTerms.push(`${g.term} -> ${g.meaning}`);
          }
        }
      });

      const session = storageData.authSession;
      const userId = (session && session.uid) ? session.uid : 'anonymous';

      console.log(`[Background] Translating selection. Glossary: Enabled=${enabled}, Mode=${glossaryMode}, User=${userId}`);
      if (enabled) {
        console.log(`[Background] 📚 Từ điển hiện tại đang sử dụng:`, glossaryDict);
      }
      if (matchedTerms.length > 0) {
        console.log(`[Background] 🎯 Khớp từ điển cá nhân cho:`, matchedTerms);
      } else if (enabled) {
        console.log(`[Background] ℹ️ Không khớp thuật ngữ nào trong từ điển hiện tại.`);
      }

      const response = await fetch(`${BASE_URL}/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text, 
          context, 
          target_lang: 'auto',
          glossary: glossaryDict,
          glossary_mode: glossaryMode,
          user_id: userId
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API error (${response.status})`);
      }
      
      const data = await response.json();
      const translation = data.translation;
      
      chrome.tabs.sendMessage(tabId, {
        type: 'GENERATE_PROGRESS',
        payload: { partialText: translation, done: true }
      });
    });
  } catch (err) {
    console.error('[Background] Direct translation error:', err);
    chrome.tabs.sendMessage(tabId, {
      type: 'GENERATE_PROGRESS',
      payload: { partialText: `Error: ${err.message}`, done: true }
    });
  }
}

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'it-image-translator') {
    console.log('[Background] Context menu click: it-image-translator for image URL:', info.srcUrl);
    chrome.storage.local.set({ 
      pendingImageTranslation: { 
        srcUrl: info.srcUrl, 
        timestamp: Date.now() 
      } 
    }, () => {
      const url = chrome.runtime.getURL('src/dashboard/index.html');
      chrome.tabs.create({ url });
    });
  }

  if (info.menuItemId === 'it-open-dashboard') {
    console.log('[Background] Context menu click: it-open-dashboard');
    const url = chrome.runtime.getURL('src/dashboard/index.html');
    chrome.tabs.create({ url });
    return;
  }

  if (info.menuItemId === 'it-translate-page') {
    console.log('[Background] Context menu click: it-translate-page');
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'TRANSLATE_PAGE_CMD' });
    }
    return;
  }

  if (!info.selectionText) return;

  if (info.menuItemId === 'it-translator') {
    console.log('[Background] Context menu click: it-translator for text:', info.selectionText);
    chrome.tabs.sendMessage(tab.id, {
      type: 'TRIGGER_TRANSLATE_FROM_CONTEXT',
      text: info.selectionText
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.log('[Background] Content script not loaded on this tab. Falling back to Side Panel.');
        chrome.storage.local.set({ 
          pendingTranslation: { 
            text: info.selectionText, 
            context: '', 
            target_lang: 'auto',
            timestamp: Date.now() 
          } 
        });
        chrome.sidePanel.open({ tabId: tab.id });
      }
    });
  } else if (info.menuItemId === 'it-explainer') {
    console.log('[Background] Context menu click: it-explainer for text:', info.selectionText);
    // Try to send explain command to content script of the active tab
    chrome.tabs.sendMessage(tab.id, {
      type: 'TRIGGER_EXPLAIN_FROM_CONTEXT',
      text: info.selectionText
    }, (response) => {
      // Check if message failed (e.g., content script not injected in PDF view or restricted page)
      if (chrome.runtime.lastError) {
        console.log('[Background] Content script not loaded on this tab (e.g. PDF view, chrome:// page). Falling back to Side Panel for explanation.');
        // Save explain task to storage
        chrome.storage.local.set({ 
          pendingTranslation: { 
            text: info.selectionText, 
            context: '', 
            target_lang: 'explain',
            timestamp: Date.now() 
          } 
        });
        // Open the side panel
        chrome.sidePanel.open({ tabId: tab.id });
      }
    });
  }
})

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  if (command === 'translate-selection') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        // We need to inject a script to get the selection from the page
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: () => {
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) return null;
            const text = selection.toString().trim();
            if (!text) return null;
            
            // Try to get context
            const range = selection.getRangeAt(0);
            const container = range.commonAncestorContainer;
            const parentEl = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
            const contextEl = parentEl.closest('p, section, article, li') || parentEl;
            const context = contextEl?.innerText?.slice(0, 2000) || '';
            
            return { text, context };
          }
        }).then(results => {
          const result = results[0].result;
          if (result) {
            chrome.storage.local.set({ 
              pendingTranslation: { 
                text: result.text, 
                context: result.context, 
                timestamp: Date.now() 
              } 
            });
            chrome.sidePanel.open({ tabId: tabs[0].id });
          }
        });
      }
    });
  } else if (command === 'translate-selection-to-english') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'TRIGGER_INLINE_TRANSLATION' });
      }
    });
  }
});
