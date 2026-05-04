// Background service worker for IT Translator Chrome Extension

const BASE_URL = 'http://127.0.0.1:5000'

// Register the context menu entry when the extension is installed/updated
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'it-translator',
    title: 'Translate with IT Translator',
    contexts: ['selection'],
  })
})

// Handle messages from Side Panel or Content Script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // If message is a request to translate, ensure Side Panel is open
  if (message.type === 'TRANSLATE_TEXT') {
    chrome.sidePanel.open({ tabId: sender.tab.id });
    // Note: The message will be received by Side Panel once it opens
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

// Handle context menu click — open side panel and translate
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'it-translator' || !info.selectionText) return

  // Open the side panel
  chrome.sidePanel.open({ tabId: tab.id });

  // Send message to side panel (wait a bit for it to load if it's the first time)
  // In a real app, we'd wait for a 'ready' signal from the side panel
  setTimeout(() => {
    chrome.runtime.sendMessage({
      type: 'TRANSLATE_TEXT',
      text: info.selectionText,
      context: '' // Context extraction could be done here or in content script
    }).catch(err => console.log('Side panel not ready yet, retrying...'));
  }, 500);
})

/**
 * This function runs inside the page (injected by executeScript).
 * It replicates the same inline replace + tooltip logic as the content script.
 */
function inlineTranslateSelection(baseUrl) {
  const VI_PATTERN = /[àáảãạăắặẳẵâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i

  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return

  const range = selection.getRangeAt(0)
  const originalText = range.toString().trim()
  if (!originalText) return

  // Extract surrounding context
  const container = range.commonAncestorContainer
  const parentEl = container.nodeType === Node.TEXT_NODE ? container.parentElement : container
  const contextEl = parentEl.closest('p, section, article, li') || parentEl
  const context = contextEl?.innerText?.slice(0, 600) || ''

  // Show a brief loading indicator over the selection
  const loadingSpan = document.createElement('span')
  loadingSpan.style.cssText = 'border-bottom:2px dotted #6c63ff;opacity:0.6;'
  loadingSpan.textContent = '⏳ ' + originalText
  range.deleteContents()
  range.insertNode(loadingSpan)
  window.getSelection()?.removeAllRanges()

  // Call the translation API
  fetch(`${baseUrl}/api/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: originalText, context, target_lang: 'auto' }),
  })
    .then(r => r.json())
    .then(({ translation }) => {
      if (!translation) throw new Error('No translation returned')

      // Build the inline span with tooltip
      const span = document.createElement('span')
      span.className = 'it-translated'
      span.textContent = translation

      const tooltip = document.createElement('span')
      tooltip.className = 'it-tooltip'
      tooltip.textContent = `Original: ${originalText}`
      span.appendChild(tooltip)

      loadingSpan.replaceWith(span)
    })
    .catch(err => {
      // Restore original text on failure
      const restored = document.createTextNode(originalText)
      loadingSpan.replaceWith(restored)
      console.error('[IT Translator]', err.message)
    })
}
