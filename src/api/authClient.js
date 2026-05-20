/**
 * Firebase Auth Client for IT Translator Chrome Extension.
 * Uses Firebase REST API (no SDK needed - works in Chrome Extension context).
 *
 * Replace FIREBASE_API_KEY with your actual key from:
 * Firebase Console → Project Settings → General → Web API Key
 */

const FLASK_BASE_URL   = 'http://127.0.0.1:5000';

// ── Local storage helpers ─────────────────────────────────────────────────────

function saveSession(uid, email, role, idToken) {
  const session = { uid, email, role, idToken, savedAt: Date.now() };
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

  const { uid, email: userEmail, role, idToken } = await flaskRes.json();
  saveSession(uid, userEmail, role, idToken);
  return { uid, email: userEmail, role };
}

/**
 * Login with email and password via Flask Backend.
 * Flask will verify credentials and return a token and role.
 * @returns {{ uid, email, role }} session info
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

  const { uid, email: userEmail, role, idToken } = await flaskRes.json();

  // Save session locally
  saveSession(uid, userEmail, role, idToken);

  return { uid, email: userEmail, role };
}

/**
 * Log out and clear local session.
 */
export function logout() {
  clearSession();
}
