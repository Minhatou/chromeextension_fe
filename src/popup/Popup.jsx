import { useState, useEffect } from 'react'
import { checkStatus } from '../api/translationClient'
import { loginWithEmail, registerWithEmail, logout, getSession, loginWithGoogle, resetPassword } from '../api/authClient'
import {
  ThunderboltFilled,
  CrownOutlined,
  UserOutlined,
  FormOutlined,
  LockOutlined,
  DashboardOutlined,
  CloseCircleFilled,
  CheckCircleFilled,
  ExclamationCircleFilled
} from '@ant-design/icons'

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
  const [resetMsg, setResetMsg] = useState('')

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

      if (s && s.idToken) {
        console.log("[Auth Popup] Verifying and refreshing credits...");
        fetch('https://hvmndoan-production.up.railway.app/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: s.idToken })
        })
          .then(r => {
            if (r.ok) return r.json();
            throw new Error();
          })
          .then(freshData => {
            if (freshData.valid) {
              const updatedSession = { ...s, ...freshData };
              if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({ authSession: updatedSession });
              } else {
                localStorage.setItem('authSession', JSON.stringify(updatedSession));
              }
              setSession(updatedSession);
            }
          })
          .catch(() => { });
      }
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

  async function handleGoogleAuth() {
    setAuthError('')
    setIsSubmitting(true)
    try {
      const s = await loginWithGoogle()
      setSession(s)
    } catch (err) {
      setAuthError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleForgotPassword() {
    const target = email.trim()
    if (!target) {
      setAuthError('Vui lòng nhập email để đặt lại mật khẩu.')
      return
    }
    setAuthError('')
    setResetMsg('')
    setIsSubmitting(true)
    try {
      await resetPassword(target)
      setResetMsg('Email đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra hộp thư.')
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
      <header className="popup-header" style={{ marginBottom: '4px' }}>
        <div className="popup-logo" style={{ display: 'flex', alignItems: 'center' }}>
          <ThunderboltFilled style={{ fontSize: '18px', color: 'var(--accent)', marginRight: '6px' }} />
          <span className="logo-text" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>DevBridge</span>
        </div>
        <div
          className={`status-dot ${!status && !error ? 'checking' : online ? 'online' : 'offline'}`}
          title={!status && !error ? 'Checking...' : online ? 'Backend online' : 'Backend offline'}
        />
      </header>

      {/* ── Backend Status Card (Admin only) ── */}
      {session?.role === 'admin' && (
        <div className="status-card" style={{ marginTop: '6px' }}>
          {error ? (
            <>
              <div className="status-row error" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CloseCircleFilled style={{ color: 'var(--red)' }} />
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
              <div className={`status-row ${modelLoaded ? 'success' : 'warn'}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {modelLoaded ? (
                  <CheckCircleFilled style={{ color: 'var(--green)' }} />
                ) : (
                  <ExclamationCircleFilled style={{ color: 'var(--yellow)' }} />
                )}
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
      )}

      {/* ── Auth Section (only shown when backend is online) ── */}
      {online && (
        <div style={{ marginTop: '6px' }}>
          {authLoading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', padding: '12px 0' }}>
              Đang kiểm tra tài khoản...
            </div>
          ) : session ? (
            /* ── Logged In: show user info + logout ── */
            <div style={{
              background: 'var(--surface)', borderRadius: '10px', padding: '12px 14px',
              border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyBehavior: 'space-between', justifyContent: 'space-between', gap: '8px'
            }}>
              <div style={{ fontSize: '12px', lineHeight: 1.4, overflow: 'hidden' }}>
                <div style={{ fontWeight: 700, color: 'var(--text)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{session.email}</div>
                <div style={{
                  display: 'inline-block', marginTop: '4px',
                  background: session.role === 'admin' ? 'var(--surface-2)' : 'rgba(255, 255, 255, 0.08)',
                  color: session.role === 'admin' ? 'var(--text)' : 'var(--text-muted)',
                  fontSize: '10px', fontWeight: 600,
                  padding: '2px 8px', borderRadius: '999px',
                  border: '1px solid var(--border)'
                }}>
                  {session.role === 'admin' ? (
                    <><CrownOutlined style={{ marginRight: '4px' }} /> Admin</>
                  ) : (
                    <><UserOutlined style={{ marginRight: '4px' }} /> User</>
                  )}
                </div>
              </div>
              <button onClick={handleLogout} style={{
                background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border)',
                borderRadius: '8px', padding: '6px 12px',
                fontSize: '11px', cursor: 'pointer', color: 'var(--text-muted)', fontWeight: 600,
                transition: 'all 0.2s'
              }}
              onMouseOver={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
              onMouseOut={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                Đăng xuất
              </button>
            </div>
          ) : (
            /* ── Not Logged In: show auth form ── */
            <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {isRegistering ? (
                    <><FormOutlined /> Đăng ký tài khoản</>
                  ) : (
                    <><LockOutlined /> Đăng nhập tài khoản</>
                  )}
                </span>
                <span
                  onClick={() => { setIsRegistering(!isRegistering); setAuthError(''); }}
                  style={{ color: '#3b82f6', cursor: 'pointer', fontSize: '11px', fontWeight: 500 }}
                >
                  {isRegistering ? 'Đăng nhập' : 'Tạo tài khoản'}
                </span>
              </div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{
                  padding: '8px 12px', borderRadius: '8px',
                  border: '1px solid var(--border)', fontSize: '12px',
                  outline: 'none', background: 'var(--surface)', color: 'var(--text)',
                  boxSizing: 'border-box'
                }}
              />
              <input
                type="password"
                placeholder="Mật khẩu"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{
                  padding: '8px 12px', borderRadius: '8px',
                  border: '1px solid var(--border)', fontSize: '12px',
                  outline: 'none', background: 'var(--surface)', color: 'var(--text)',
                  boxSizing: 'border-box'
                }}
              />
              {!isRegistering && (
                <div style={{ textAlign: 'right', marginTop: '-4px' }}>
                  <span
                    onClick={handleForgotPassword}
                    style={{ color: 'var(--text-muted)', cursor: 'pointer', fontSize: '11px' }}
                  >
                    Quên mật khẩu?
                  </span>
                </div>
              )}
              {authError && (
                <div style={{ fontSize: '11px', color: 'var(--red)' }}>{authError}</div>
              )}
              {resetMsg && (
                <div style={{ fontSize: '11px', color: 'var(--green)' }}>{resetMsg}</div>
              )}
              <button type="submit" disabled={isSubmitting} style={{
                background: 'var(--text)', color: 'var(--bg)',
                border: 'none', borderRadius: '8px', padding: '9px',
                fontSize: '13px', fontWeight: 700,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
                transition: 'opacity 0.2s'
              }}>
                {isSubmitting ? 'Đang xử lý...' : (isRegistering ? 'Đăng ký' : 'Đăng nhập')}
              </button>
              <div style={{ display: 'flex', alignItems: 'center', margin: '2px 0', gap: '8px' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 600 }}>HOẶC</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
              </div>
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={isSubmitting}
                style={{
                  background: 'var(--surface)', color: 'var(--text)',
                  border: '1px solid var(--border)', borderRadius: '8px', padding: '8px',
                  fontSize: '12px', fontWeight: 600,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  transition: 'background 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--surface-2)'}
                onMouseOut={e => e.currentTarget.style.backgroundColor = 'var(--surface)'}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" style={{ display: 'inline-block' }}>
                  <path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.355 0 3.36 2.655 1.345 6.527l3.921 3.238z" />
                  <path fill="#4285F4" d="M23.455 12.273c0-.818-.073-1.609-.209-2.373H12v4.582h6.427a5.532 5.532 0 0 1-2.4 3.627l3.745 2.909c2.191-2.018 3.455-4.991 3.455-8.745z" />
                  <path fill="#FBBC05" d="M5.266 14.235A7.077 7.077 0 0 1 4.909 12c0-.791.136-1.555.357-2.235L1.345 6.527A11.954 11.954 0 0 0 0 12c0 2.018.5 3.918 1.382 5.6l3.884-3.365z" />
                  <path fill="#34A853" d="M12 24c3.245 0 5.973-1.073 7.964-2.91l-3.745-2.909c-1.036.691-2.364 1.109-3.964 1.109-3.055 0-5.645-2.064-6.564-4.836l-3.909 3.027C3.327 21.327 7.327 24 12 24z" />
                </svg>
                Đăng nhập bằng Google
              </button>
            </form>
          )}
        </div>
      )}

      {/* ── Open Dashboard ── */}
      <button
        className="dashboard-btn"
        onClick={() => chrome.tabs.create({ url: chrome.runtime.getURL('src/dashboard/index.html') })}
        style={{
          marginTop: '6px', 
          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', 
          color: '#ffffff',
          border: 'none', padding: '11px 16px', borderRadius: '10px',
          fontSize: '13px', fontWeight: '700', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '6px', width: '100%', 
          boxShadow: '0 4px 14px rgba(59, 130, 246, 0.3)',
          transition: 'all 0.2s ease'
        }}
        onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(59, 130, 246, 0.4)'; }}
        onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(59, 130, 246, 0.3)'; }}
      >
        <DashboardOutlined style={{ fontSize: '14px' }} /> Mở Dashboard
      </button>
    </div>
  )
}

