/**
 * Calls Google Gemini via dev proxy `/gemini` (see nuxt.config.js) to avoid CORS.
 */
function buildPrompt(userQuestion, contextText) {
  const systemPreamble =
    'You are a concise Australian energy markets assistant. Answer only using the context below ' +
    'and general reasoning. If data is missing, say so. Keep answers under 12 sentences unless ' +
    'the user asks for detail.\n\nContext:\n'
  return `${systemPreamble}${contextText}\n\nUser question:\n${userQuestion || 'Give a brief markets overview.'}`
}

function parseGeminiText(data) {
  const parts = data.candidates && data.candidates[0] && data.candidates[0].content
    ? data.candidates[0].content.parts
    : null
  if (!parts || !parts.length) {
    return 'No text returned from the model.'
  }
  return parts.map((p) => p.text || '').join('').trim()
}

async function callGeminiModel(apiKey, model, promptText) {
  const url = `/gemini/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: promptText }]
      }
    ]
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })
  const raw = await response.text()
  if (!response.ok) {
    const err = new Error(raw || `Gemini HTTP ${response.status}`)
    err.status = response.status
    throw err
  }
  let data
  try {
    data = JSON.parse(raw)
  } catch (e) {
    throw new Error('Invalid Gemini response')
  }
  return parseGeminiText(data)
}

export async function generateGeminiMarketsAnswer(apiKey, userQuestion, contextText) {
  if (!apiKey) {
    throw new Error('Gemini API key is not configured.')
  }

  const promptText = buildPrompt(userQuestion, contextText)
  try {
    return await callGeminiModel(apiKey, 'gemini-3.0-flash', promptText)
  } catch (error) {
    if (error && error.status === 404) {
      return await callGeminiModel(apiKey, 'gemini-2.5-flash', promptText)
    }
    throw error
  }
}
