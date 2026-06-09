// Background service worker for IT Translator Chrome Extension

const BASE_URL = 'https://hvmndoan-production.up.railway.app'

// Register the context menu entry when the extension is installed/updated
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'it-translator',
    title: 'Dịch văn bản',
    contexts: ['selection'],
  });
  chrome.contextMenus.create({
    id: 'it-explainer',
    title: 'Giải thích văn bản',
    contexts: ['selection'],
  });
  chrome.contextMenus.create({
    id: 'it-image-translator',
    title: 'Dịch hình ảnh',
    contexts: ['image'],
  });
  chrome.contextMenus.create({
    id: 'it-open-dashboard',
    title: 'Mở Dashboard IT Translator',
    contexts: ['all'],
  });
})

// Handle messages from Side Panel or Content Script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // If message is a request to translate
  if (message.type === 'TRANSLATE_TEXT') {
    const { text, context } = message;
    translateDirectly(text, context, sender.tab.id);
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

function parseTranslation(data) {
  let text = '';
  if (Array.isArray(data)) {
    if (data[0] && typeof data[0].generated_text === 'string') {
      text = data[0].generated_text;
    }
  } else if (data) {
    if (typeof data.translation === 'string') {
      text = data.translation;
    } else if (typeof data.generated_text === 'string') {
      text = data.generated_text;
    } else if (Array.isArray(data.translation)) {
      if (data.translation[0] && typeof data.translation[0].generated_text === 'string') {
        text = data.translation[0].generated_text;
      }
    }
  }

  if (!text) return '';

  // Clean up <think> reasoning tags
  if (text.includes('<think>') && text.includes('</think>')) {
    text = text.replace(/<think>[\s\S]*?<\/think>/g, '');
  } else {
    text = text.replace(/<think>/g, '').replace(/<\/think>/g, '');
  }
  return text.trim();
}

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
      const translation = parseTranslation(data);

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
            return text || null;
          }
        }).then(results => {
          const text = results?.[0]?.result;
          if (text) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: 'TRIGGER_TRANSLATE_FROM_CONTEXT',
              text: text
            });
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
