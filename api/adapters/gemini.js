'use strict';

const PROVIDER_ID = 'gemini';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

/**
 * Clean JSON response from potential markdown formatting
 * @param {string} text - Raw text from API response
 * @returns {string} - Cleaned JSON string
 */
function cleanJSON(text) {
  if (!text) return '{}';
  let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start !== -1 && end !== -1) return clean.substring(start, end + 1);
  return clean;
}

/**
 * Generate text using Google Gemini API
 * @param {Object} options - Request options
 * @param {Array} options.messages - Array of message objects with role and content
 * @param {string} options.system - System prompt
 * @param {Object} options.fetchFn - Fetch function (for testing/mocking)
 * @param {number} options.timeoutMs - Request timeout in milliseconds
 * @returns {Promise<Object>} - Response with text and provider
 */
async function generateText(options) {
  const { messages, system, fetchFn = fetch, timeoutMs = 30000 } = options;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Convert message format
    const contents = messages.map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));

    const response = await fetchFn(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: contents,
        systemInstruction: { parts: [{ text: system }] },
        generationConfig: { responseMimeType: 'application/json' }
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = cleanJSON(data.candidates[0].content.parts[0].text);

    return { text, provider: PROVIDER_ID };
  } finally {
    clearTimeout(timeoutId);
  }
}

module.exports = {
  generateText,
  PROVIDER_ID,
  capabilities: ['text']
};
