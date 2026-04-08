import { useState, useEffect } from 'react'
import { translateText, checkStatus } from '../api/translationClient'

export default function Popup() {
    const [selectedText, setSelectedText] = useState('')
    const [context, setContext] = useState('')
    const [translation, setTranslation] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [backendOnline, setBackendOnline] = useState(null)
    const [feedback, setFeedback] = useState(null) // 'up' | 'down' | null

    // On mount: check backend status and read any pending translation from session storage
    useEffect(() => {
        checkStatus()
            .then(() => setBackendOnline(true))
            .catch(() => setBackendOnline(false))

        chrome.storage.session.get(['pendingTranslation'], (result) => {
            if (result.pendingTranslation) {
                setSelectedText(result.pendingTranslation.text || '')
                setContext(result.pendingTranslation.context || '')
                // Auto-translate if triggered from context menu
                if (result.pendingTranslation.source === 'contextMenu') {
                    handleTranslate(
                        result.pendingTranslation.text,
                        result.pendingTranslation.context
                    )
                }
                // Clear after reading
                chrome.storage.session.remove(['pendingTranslation'])
            }
        })
    }, [])

    const handleTranslate = async (text, ctx) => {
        const t = text || selectedText
        const c = ctx !== undefined ? ctx : context
        if (!t.trim()) {
            setError('No text selected. Highlight text on a page first.')
            return
        }
        setLoading(true)
        setError('')
        setTranslation('')
        setFeedback(null)
        try {
            const result = await translateText(t, c)
            setTranslation(result.translation)
        } catch (e) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    const handleFeedback = (type) => {
        setFeedback(type)
        // Store feedback for future fine-tuning data collection
        chrome.storage.local.get(['feedbackLog'], (result) => {
            const log = result.feedbackLog || []
            log.push({
                text: selectedText,
                context,
                translation,
                feedback: type,
                timestamp: Date.now(),
            })
            chrome.storage.local.set({ feedbackLog: log })
        })
    }

    return (
        <div className="popup-container">
            {/* Header */}
            <header className="popup-header">
                <div className="popup-logo">
                    <span className="logo-icon">⚡</span>
                    <span className="logo-text">IT Translator</span>
                </div>
                <div className={`status-dot ${backendOnline === null ? 'checking' : backendOnline ? 'online' : 'offline'}`}
                    title={backendOnline === null ? 'Checking...' : backendOnline ? 'Backend online' : 'Backend offline'} />
            </header>

            {/* Backend offline warning */}
            {backendOnline === false && (
                <div className="alert alert-error">
                    ⚠ Backend offline. Start the Flask server at <code>http://127.0.0.1:5000</code>
                </div>
            )}

            {/* Selected Text */}
            <section className="section">
                <label className="section-label">Selected Text</label>
                <div className="text-box source-box">
                    {selectedText
                        ? <span>{selectedText}</span>
                        : <span className="placeholder">Highlight text on the page, then open this popup.</span>}
                </div>
            </section>

            {/* Context (collapsed summary) */}
            {context && (
                <section className="section">
                    <label className="section-label">Context</label>
                    <div className="text-box context-box">
                        <span className="context-text">{context}</span>
                    </div>
                </section>
            )}

            {/* Translate Button */}
            <button
                className="translate-btn"
                onClick={() => handleTranslate()}
                disabled={loading || !selectedText || backendOnline === false}
            >
                {loading ? <span className="spinner" /> : '🌐 Translate'}
            </button>

            {/* Error */}
            {error && <div className="alert alert-error">{error}</div>}

            {/* Translation Result */}
            {translation && (
                <section className="section result-section">
                    <label className="section-label">Translation</label>
                    <div className="text-box result-box">
                        <span>{translation}</span>
                    </div>

                    {/* Feedback */}
                    <div className="feedback-row">
                        <span className="feedback-label">Was this helpful?</span>
                        <button
                            className={`feedback-btn ${feedback === 'up' ? 'active-up' : ''}`}
                            onClick={() => handleFeedback('up')}
                            title="Good translation"
                        >👍</button>
                        <button
                            className={`feedback-btn ${feedback === 'down' ? 'active-down' : ''}`}
                            onClick={() => handleFeedback('down')}
                            title="Bad translation"
                        >👎</button>
                        {feedback && <span className="feedback-thanks">Thanks!</span>}
                    </div>
                </section>
            )}
        </div>
    )
}
