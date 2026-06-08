const BASE_URL = 'https://chromeextension-be.onrender.com'

/**
 * Check if the Flask backend is up and the model is loaded.
 */
export async function checkStatus() {
  const response = await fetch(`${BASE_URL}/api/status`)
  if (!response.ok) throw new Error('Backend unreachable')
  return response.json()
}

function parseTranslation(data) {
  let text = '';
  if (Array.isArray(data)) {
    if (data[0] && typeof data[0].generated_text === 'string') {
      text = data[0].generated_text;
    }
  } else if (data) {
    if (typeof data.translation === 'string') {
      text = data.translation;
    } else if (typeof data.generated_text === 'string') {
      text = data.generated_text;
    } else if (Array.isArray(data.translation)) {
      if (data.translation[0] && typeof data.translation[0].generated_text === 'string') {
        text = data.translation[0].generated_text;
      }
    }
  }
  
  if (!text) return '';
  
  // Clean up <think> reasoning tags
  if (text.includes('<think>') && text.includes('</think>')) {
    text = text.replace(/<think>[\s\S]*?<\/think>/g, '');
  } else {
    text = text.replace(/<think>/g, '').replace(/<\/think>/g, '');
  }
  return text.trim();
}

/**
 * Translate text with optional context and target language (auto-detected if omitted).
 * @param {string} text
 * @param {string} context
 * @param {'auto'|'vietnamese'|'english'} targetLang
 */
export async function translateText(text, context = '', targetLang = 'auto', glossary = {}, glossaryMode = 'both', userId = 'anonymous', modelId = 'qwen2', shareTranslation = false) {
  const response = await fetch(`${BASE_URL}/api/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, context, target_lang: targetLang, glossary, glossary_mode: glossaryMode, user_id: userId, model_id: modelId, share_translation: shareTranslation }),
  })
  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error || 'Translation failed')
  }
  const data = await response.json();
  return {
    ...data,
    translation: parseTranslation(data)
  };
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
export async function rechargeTokens(uid, packageId, paymentMethod = 'qr', amount = 0) {
  const response = await fetch(`${BASE_URL}/api/user/recharge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, package_id: packageId, payment_method: paymentMethod, amount }),
  })
  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error || 'Recharge failed')
  }
  return response.json()
}
