import { useState, useEffect } from 'react'
import { checkStatus } from '../api/translationClient'

export default function Popup() {
  const [status, setStatus] = useState(null) // null | {status, model_loaded}
  const [error, setError] = useState('')

  useEffect(() => {
    checkStatus()
      .then(setStatus)
      .catch(() => setError('Backend offline'))
  }, [])

  const online = status && !error
  const modelLoaded = status?.model_loaded

  return (
    <div className="popup-container">
      <header className="popup-header">
        <div className="popup-logo">
          <span className="logo-icon">⚡</span>
          <span className="logo-text">IT Translator</span>
        </div>
        <div
          className={`status-dot ${!status && !error ? 'checking' : online ? 'online' : 'offline'}`}
          title={!status && !error ? 'Checking...' : online ? 'Backend online' : 'Backend offline'}
        />
      </header>

      <div className="status-card">
        {error ? (
          <>
            <div className="status-row error">
              <span className="icon">🔴</span>
              <span>Backend is <strong>offline</strong></span>
            </div>
            <p className="hint">Start the Flask server:<br/><code>python app.py</code></p>
          </>
        ) : !status ? (
          <div className="status-row checking">
            <span className="spinner" />
            <span>Connecting to backend...</span>
          </div>
        ) : (
          <>
            <div className={`status-row ${modelLoaded ? 'success' : 'warn'}`}>
              <span className="icon">{modelLoaded ? '🟢' : '🟡'}</span>
              <span>
                Backend <strong>online</strong> · Model {modelLoaded ? 'loaded' : 'not loaded'}
              </span>
            </div>
            {!modelLoaded && (
              <p className="hint">The model is still loading. Wait a moment and reopen.</p>
            )}
          </>
        )}
      </div>

      {online && modelLoaded && (
        <div className="instructions">
          <p className="inst-title">How to use</p>
          <ol>
            <li>Select any text on the page</li>
            <li>Click the <strong>⚡ Translate</strong> button that appears</li>
            <li>The text is replaced inline — hover to see the original</li>
          </ol>
          <p className="inst-note">Auto-detects English ↔ Vietnamese</p>
        </div>
      )}
    </div>
  )
}
