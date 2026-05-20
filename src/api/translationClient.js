const BASE_URL = 'http://127.0.0.1:5000'

/**
 * Check if the Flask backend is up and the model is loaded.
 */
export async function checkStatus() {
  const response = await fetch(`${BASE_URL}/api/status`)
  if (!response.ok) throw new Error('Backend unreachable')
  return response.json()
}

/**
 * Translate text with optional context and target language (auto-detected if omitted).
 * @param {string} text
 * @param {string} context
 * @param {'auto'|'vietnamese'|'english'} targetLang
 */
export async function translateText(text, context = '', targetLang = 'auto', glossary = {}, glossaryMode = 'both') {
  const response = await fetch(`${BASE_URL}/api/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, context, target_lang: targetLang, glossary, glossary_mode: glossaryMode }),
  })
  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error || 'Translation failed')
  }
  return response.json()
}
