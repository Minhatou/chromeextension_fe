const BASE_URL = 'http://127.0.0.1:5000'

/**
 * Check if the Flask backend is up and the model is loaded.
 * @returns {Promise<{status: string, model_loaded: boolean}>}
 */
export async function checkStatus() {
    const response = await fetch(`${BASE_URL}/api/status`)
    if (!response.ok) throw new Error('Backend unreachable')
    return response.json()
}

/**
 * Send text and context to the backend for translation.
 * @param {string} text - The selected text to translate.
 * @param {string} context - Surrounding DOM context for disambiguation.
 * @returns {Promise<{translation: string}>}
 */
export async function translateText(text, context = '') {
    const response = await fetch(`${BASE_URL}/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, context }),
    })
    if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Translation failed')
    }
    return response.json()
}
