// Content script — injected into every page
// Detects text selections and sends the selected text + surrounding context to the background

let lastSentText = ''

document.addEventListener('mouseup', () => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const selectedText = selection.toString().trim()
    if (!selectedText || selectedText === lastSentText) return
    lastSentText = selectedText

    // Walk up the DOM to find surrounding paragraph/section context
    const range = selection.getRangeAt(0)
    const container = range.commonAncestorContainer
    const parentEl =
        container.nodeType === Node.TEXT_NODE
            ? container.parentElement
            : container

    const contextEl = parentEl.closest('p, section, article, li') || parentEl
    const context = contextEl?.innerText?.slice(0, 600) || ''

    // Send to background service worker
    chrome.runtime.sendMessage({
        type: 'SELECTION_CHANGED',
        text: selectedText,
        context,
    })
})
