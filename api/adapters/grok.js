'use strict';

const PROVIDER_ID = 'grok';
const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';

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
 * Generate text using xAI Grok API
 * @param {Object} options - Request options
 * @param {Array} options.messages - Array of message objects with role and content
 * @param {string} options.system - System prompt
 * @param {Object} options.fetchFn - Fetch function (for testing/mocking)
 * @param {number} options.timeoutMs - Request timeout in milliseconds
 * @returns {Promise<Object>} - Response with text and provider
 */
async function generateText(options) {
  const { messages, system, fetchFn = fetch, timeoutMs = 30000 } = options;
  const apiKey = process.env.XAI_API_KEY;

  if (!apiKey) {
    throw new Error('XAI_API_KEY not configured');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const msgs = [{ role: 'system', content: system }, ...messages];

    const response = await fetchFn(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'grok-beta',
        messages: msgs
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Grok API error: ${response.status}`);
    }

    const data = await response.json();
    const text = cleanJSON(data.choices[0].message.content);

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
