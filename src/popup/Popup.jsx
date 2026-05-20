import { useState, useEffect } from 'react'
import { checkStatus } from '../api/translationClient'
import { loginWithEmail, registerWithEmail, logout, getSession } from '../api/authClient'

export default function Popup() {
  const [status, setStatus] = useState(null)
  const [error, setError] = useState('')
  const [session, setSession] = useState(null)   // { uid, email, role }
  const [authLoading, setAuthLoading] = useState(true)

  // Auth form state
  const [isRegistering, setIsRegistering] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Inference Mode (API vs Local)
  const [inferenceMode, setInferenceMode] = useState('api')

  // Check backend status
  useEffect(() => {
    checkStatus()
      .then(setStatus)
      .catch(() => setError('Backend offline'))
  }, [])

  // Restore session & mode from storage on open
  useEffect(() => {
    getSession().then(s => {
      setSession(s)
      setAuthLoading(false)
    })

    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['inferenceMode'], (res) => {
        if (res.inferenceMode) setInferenceMode(res.inferenceMode)
      })
    } else {
      setInferenceMode(localStorage.getItem('inferenceMode') || 'api')
    }
  }, [])

  const online = status && !error
  const modelLoaded = status?.model_loaded

  async function handleAuthSubmit(e) {
    e.preventDefault()
    setAuthError('')
    setIsSubmitting(true)
    try {
      let s;
      if (isRegistering) {
        s = await registerWithEmail(email, password)
      } else {
        s = await loginWithEmail(email, password)
      }
      setSession(s)
      setEmail('')
      setPassword('')
    } catch (err) {
      setAuthError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleLogout() {
    logout()
    setSession(null)
  }

  function toggleInferenceMode() {
    const newMode = inferenceMode === 'api' ? 'local' : 'api'
    setInferenceMode(newMode)
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ inferenceMode: newMode })
    } else {
      localStorage.setItem('inferenceMode', newMode)
    }
  }

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

      {/* ── Mode Switcher ── */}
      <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f4f4f5', padding: '8px 12px', borderRadius: '8px' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: "#18181b" }}>Chế độ dịch:</span>
        <button
          onClick={toggleInferenceMode}
          style={{
            background: inferenceMode === 'api' ? '#18181b' : '#3b82f6',
            color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '6px',
            fontSize: '11px', fontWeight: 600, cursor: 'pointer',
            transition: 'background 0.2s'
          }}
        >
          {inferenceMode === 'api' ? '☁️ API (Máy chủ)' : '💻 Local (Thiết bị)'}
        </button>
      </div>

      {/* ── Backend Status Card ── */}
      <div className="status-card" style={{ marginTop: '10px' }}>
        {error ? (
          <>
            <div className="status-row error">
              <span className="icon">🔴</span>
              <span>Backend is <strong>offline</strong></span>
            </div>
            <p className="hint">Start the Flask server:<br /><code>python app.py</code></p>
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

      {/* ── Auth Section (only shown when backend is online) ── */}
      {online && (
        <div style={{ marginTop: '10px' }}>
          {authLoading ? (
            <div style={{ textAlign: 'center', color: '#888', fontSize: '12px' }}>
              Đang kiểm tra tài khoản...
            </div>
          ) : session ? (
            /* ── Logged In: show user info + logout ── */
            <div style={{
              background: '#f4f4f5', borderRadius: '10px', padding: '10px 12px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px'
            }}>
              <div style={{ fontSize: '12px', lineHeight: 1.4 }}>
                <div style={{ fontWeight: 700, color: '#18181b' }}>{session.email}</div>
                <div style={{
                  display: 'inline-block', marginTop: '3px',
                  background: session.role === 'admin' ? '#18181b' : '#e5e5e5',
                  color: session.role === 'admin' ? '#fff' : '#52525b',
                  fontSize: '10px', fontWeight: 600,
                  padding: '1px 8px', borderRadius: '999px'
                }}>
                  {session.role === 'admin' ? '👑 Admin' : '👤 User'}
                </div>
              </div>
              <button onClick={handleLogout} style={{
                background: 'none', border: '1px solid #d4d4d8',
                borderRadius: '6px', padding: '4px 10px',
                fontSize: '11px', cursor: 'pointer', color: '#71717a', fontWeight: 600
              }}>
                Đăng xuất
              </button>
            </div>
          ) : (
            /* ── Not Logged In: show auth form ── */
            <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#18181b', marginBottom: '2px', display: 'flex', justifyContent: 'space-between' }}>
                <span>{isRegistering ? '📝 Đăng ký tài khoản mới' : '🔐 Đăng nhập tài khoản'}</span>
                <span
                  onClick={() => { setIsRegistering(!isRegistering); setAuthError(''); }}
                  style={{ color: '#3b82f6', cursor: 'pointer', fontSize: '11px', fontWeight: 500 }}
                >
                  {isRegistering ? 'Đã có tài khoản?' : 'Tạo tài khoản'}
                </span>
              </div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{
                  padding: '7px 10px', borderRadius: '8px',
                  border: '1px solid #d4d4d8', fontSize: '12px',
                  outline: 'none', background: '#fafafa'
                }}
              />
              <input
                type="password"
                placeholder="Mật khẩu"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{
                  padding: '7px 10px', borderRadius: '8px',
                  border: '1px solid #d4d4d8', fontSize: '12px',
                  outline: 'none', background: '#fafafa'
                }}
              />
              {authError && (
                <div style={{ fontSize: '11px', color: '#dc2626' }}>{authError}</div>
              )}
              <button type="submit" disabled={isSubmitting} style={{
                background: '#18181b', color: '#fff',
                border: 'none', borderRadius: '8px', padding: '8px',
                fontSize: '13px', fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1
              }}>
                {isSubmitting ? 'Đang xử lý...' : (isRegistering ? 'Đăng ký' : 'Đăng nhập')}
              </button>
            </form>
          )}
        </div>
      )}

      {/* ── How to use (shown only when model is loaded) ── */}
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

      {/* ── Open Dashboard ── */}
      <button
        className="dashboard-btn"
        onClick={() => chrome.tabs.create({ url: chrome.runtime.getURL('src/dashboard/index.html') })}
        style={{
          marginTop: '8px', background: '#ffffff', color: '#000000',
          border: 'none', padding: '10px 16px', borderRadius: '10px',
          fontSize: '13px', fontWeight: '600', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '8px', width: '100%', transition: 'transform 0.2s, background-color 0.2s'
        }}
        onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.backgroundColor = '#e5e5e5'; }}
        onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.backgroundColor = '#ffffff'; }}
      >
        📊 Mở Dashboard
      </button>

      {/* ── Translate Whole Page ── */}
      <button
        className="translate-page-btn"
        onClick={() => {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
              chrome.tabs.sendMessage(tabs[0].id, { type: 'TRANSLATE_PAGE_CMD' }, () => {
                if (chrome.runtime.lastError) {
                  alert('Vui lòng tải lại trang (F5) web bạn muốn dịch. Mỗi lần reload extension, bạn cần F5 lại trang web để kết nối lại.');
                }
              });
            }
          });
        }}
        style={{
          marginTop: '8px', background: '#18181b', color: '#ffffff',
          border: '1px solid rgba(255, 255, 255, 0.15)', padding: '10px 16px',
          borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '8px', width: '100%', transition: 'transform 0.2s, background-color 0.2s'
        }}
        onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.backgroundColor = '#27272a'; }}
        onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.backgroundColor = '#18181b'; }}
      >
        🌐 Dịch toàn trang
      </button>
    </div>
  )
}
