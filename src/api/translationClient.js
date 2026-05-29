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
export async function translateText(text, context = '', targetLang = 'auto', glossary = {}, glossaryMode = 'both', userId = 'anonymous') {
  const response = await fetch(`${BASE_URL}/api/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, context, target_lang: targetLang, glossary, glossary_mode: glossaryMode, user_id: userId }),
  })
  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error || 'Translation failed')
  }
  return response.json()
}

/**
 * Save translation with note.
 */
export async function addSavedTranslation(uid, sourceText, translatedText, note = '') {
  const response = await fetch(`${BASE_URL}/api/saved_translations/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, source_text: sourceText, translated_text: translatedText, note }),
  })
  if (!response.ok) throw new Error('Failed to save translation')
  return response.json()
}

/**
 * Fetch saved translations.
 */
export async function getSavedTranslations(uid) {
  const response = await fetch(`${BASE_URL}/api/saved_translations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid }),
  })
  if (!response.ok) throw new Error('Failed to fetch saved translations')
  return response.json()
}

/**
 * Update saved translation note.
 */
export async function updateSavedTranslationNote(uid, id, note) {
  const response = await fetch(`${BASE_URL}/api/saved_translations/update_note`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, id, note }),
  })
  if (!response.ok) throw new Error('Failed to update note')
  return response.json()
}

/**
 * Delete a saved translation.
 */
export async function deleteSavedTranslation(uid, id) {
  const response = await fetch(`${BASE_URL}/api/saved_translations/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, id }),
  })
  if (!response.ok) throw new Error('Failed to delete saved translation')
  return response.json()
}

/**
 * Rate a translation (like/dislike).
 */
export async function rateTranslation(uid, source, rating) {
  const response = await fetch(`${BASE_URL}/api/translate/rate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, source, rating }),
  })
  if (!response.ok) throw new Error('Failed to submit rating')
  return response.json()
}

/**
 * Contribute a translation.
 */
export async function contributeTranslation(uid, email, sourceText, originalTranslation, suggestedTranslation) {
  const response = await fetch(`${BASE_URL}/api/translate/contribute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, email, source_text: sourceText, original_translation: originalTranslation, suggested_translation: suggestedTranslation }),
  })
  if (!response.ok) throw new Error('Failed to submit contribution')
  return response.json()
}

/**
 * Recharge tokens (Mock payment recharge).
 */
export async function rechargeTokens(uid, packageId) {
  const response = await fetch(`${BASE_URL}/api/user/recharge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, package_id: packageId }),
  })
  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error || 'Recharge failed')
  }
  return response.json()
}
