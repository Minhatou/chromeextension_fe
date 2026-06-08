/**
 * Firebase Auth Client for IT Translator Chrome Extension.
 * Uses Firebase REST API (no SDK needed - works in Chrome Extension context).
 *
 * Replace FIREBASE_API_KEY with your actual key from:
 * Firebase Console → Project Settings → General → Web API Key
 */

const FLASK_BASE_URL   = 'https://hvmndoan-production.up.railway.app';

// ── Local storage helpers ─────────────────────────────────────────────────────

function saveSession(uid, email, role, idToken, refreshToken) {
  const session = { uid, email, role, idToken, refreshToken, savedAt: Date.now() };
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.set({ authSession: session });
  } else {
    localStorage.setItem('authSession', JSON.stringify(session));
  }
}

function clearSession() {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.remove('authSession');
  } else {
    localStorage.removeItem('authSession');
  }
}

export function getSession() {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['authSession'], (result) => {
        resolve(result.authSession || null);
      });
    } else {
      const raw = localStorage.getItem('authSession');
      resolve(raw ? JSON.parse(raw) : null);
    }
  });
}

/**
 * Exchange the saved refresh token for a new idToken and save it.
 */
export async function refreshSessionToken() {
  const session = await getSession();
  if (!session || !session.refreshToken) {
    throw new Error("No refresh token available");
  }

  const response = await fetch(`${FLASK_BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: session.refreshToken })
  });

  if (!response.ok) {
    clearSession();
    throw new Error("Failed to refresh session");
  }

  const data = await response.json();
  saveSession(session.uid, session.email, session.role, data.idToken, data.refreshToken);
  return { ...session, idToken: data.idToken, refreshToken: data.refreshToken };
}

// ── Login / Logout ────────────────────────────────────────────────────────────

export async function registerWithEmail(email, password) {
  const flaskRes = await fetch(`${FLASK_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!flaskRes.ok) {
    const err = await flaskRes.json();
    throw new Error(err.error || 'Đăng ký thất bại. Vui lòng thử lại.');
  }

  const { uid, email: userEmail, role, idToken, refreshToken } = await flaskRes.json();
  saveSession(uid, userEmail, role, idToken, refreshToken);
  return { uid, email: userEmail, role, idToken, refreshToken };
}

/**
 * Login with email and password via Flask Backend.
 * Flask will verify credentials and return a token and role.
 * @returns {{ uid, email, role, idToken, refreshToken }} session info
 */
export async function loginWithEmail(email, password) {
  const flaskRes = await fetch(`${FLASK_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!flaskRes.ok) {
    const err = await flaskRes.json();
    throw new Error(err.error || 'Đăng nhập thất bại. Vui lòng thử lại.');
  }

  const { uid, email: userEmail, role, idToken, refreshToken } = await flaskRes.json();

  // Save session locally
  saveSession(uid, userEmail, role, idToken, refreshToken);

  return { uid, email: userEmail, role, idToken, refreshToken };
}

/**
 * Login with Google via popup integration using Firebase REST API.
 */
export async function loginWithGoogle() {
  return new Promise((resolve, reject) => {
    const width = 500;
    const height = 650;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    const popupUrl = FLASK_BASE_URL.replace('127.0.0.1', 'localhost');
    const popup = window.open(
      `${popupUrl}/auth/google`,
      'Google Sign-In - IT Translator',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,status=1`
    );

    if (!popup) {
      reject(new Error('Popup Blocker đã chặn cửa sổ đăng nhập Google. Vui lòng bật popup cho trang này.'));
      return;
    }

    const messageListener = async (event) => {
      if (event.data && event.data.type === 'GOOGLE_AUTH_SUCCESS') {
        window.removeEventListener('message', messageListener);
        const { idToken, refreshToken } = event.data;
        
        try {
          const flaskRes = await fetch(`${FLASK_BASE_URL}/api/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken, refreshToken }),
          });

          if (!flaskRes.ok) {
            const err = await flaskRes.json();
            reject(new Error(err.error || 'Đăng nhập Google thất bại tại máy chủ.'));
            return;
          }

          const { uid, email, role, idToken: fbIdToken, refreshToken: fbRefreshToken } = await flaskRes.json();
          saveSession(uid, email, role, fbIdToken, fbRefreshToken);
          resolve({ uid, email, role, idToken: fbIdToken, refreshToken: fbRefreshToken });
        } catch (err) {
          reject(err);
        }
      } else if (event.data && event.data.type === 'GOOGLE_AUTH_ERROR') {
        window.removeEventListener('message', messageListener);
        reject(new Error(event.data.error || 'Lỗi đăng nhập Google.'));
      }
    };

    window.addEventListener('message', messageListener);

    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        setTimeout(() => {
          window.removeEventListener('message', messageListener);
        }, 1000);
      }
    }, 500);
  });
}

/**
 * Send password reset email via Flask backend.
 */
export async function resetPassword(email) {
  const res = await fetch(`${FLASK_BASE_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Không thể gửi email đặt lại mật khẩu.');
  }
  return res.json();
}

/**
 * Log out and clear local session.
 */
export function logout() {
  clearSession();
}
