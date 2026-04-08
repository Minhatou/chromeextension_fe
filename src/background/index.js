// Background service worker for IT Translator Chrome Extension

// Register the context menu entry when the extension is installed/updated
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'it-translator',
        title: 'Translate with IT Translator',
        contexts: ['selection'], // Only show when text is selected
    })
})

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'it-translator' && info.selectionText) {
        // Store the selected text and trigger the popup
        chrome.storage.session.set({
            pendingTranslation: {
                text: info.selectionText,
                context: '', // Context will be enriched by content script
                source: 'contextMenu',
            },
        })

        // Execute content script to get enriched context for the selection
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                const selection = window.getSelection()
                if (!selection || selection.rangeCount === 0) return

                const range = selection.getRangeAt(0)
                const container = range.commonAncestorContainer
                const parentEl =
                    container.nodeType === Node.TEXT_NODE
                        ? container.parentElement
                        : container

                // Walk up to find a meaningful context container (p, section, article, div)
                const contextEl =
                    parentEl.closest('p, section, article, li') || parentEl
                const context = contextEl.innerText?.slice(0, 600) || ''

                chrome.runtime.sendMessage({
                    type: 'CONTEXT_ENRICHED',
                    context,
                })
            },
        })

        // Open the popup
        chrome.action.openPopup().catch(() => {
            // openPopup may fail without user gesture in some Chrome versions
            // The popup will read from session storage on open
        })
    }
})

// Listen for enriched context from the content script
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'CONTEXT_ENRICHED') {
        chrome.storage.session.get(['pendingTranslation'], (result) => {
            if (result.pendingTranslation) {
                chrome.storage.session.set({
                    pendingTranslation: {
                        ...result.pendingTranslation,
                        context: message.context,
                    },
                })
            }
        })
    }

    if (message.type === 'SELECTION_CHANGED') {
        // Store latest selection from the content script for the popup to read
        chrome.storage.session.set({
            pendingTranslation: {
                text: message.text,
                context: message.context,
                source: 'selection',
            },
        })
    }
})
