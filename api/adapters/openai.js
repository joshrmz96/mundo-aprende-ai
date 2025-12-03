'use strict';

const PROVIDER_ID = 'openai';
const CHAT_API_URL = 'https://api.openai.com/v1/chat/completions';
const IMAGE_API_URL = 'https://api.openai.com/v1/images/generations';
const TTS_API_URL = 'https://api.openai.com/v1/audio/speech';

/**
 * Generate text using OpenAI API
 * @param {Object} options - Request options
 * @param {Array} options.messages - Array of message objects with role and content
 * @param {string} options.system - System prompt
 * @param {Object} options.fetchFn - Fetch function (for testing/mocking)
 * @param {number} options.timeoutMs - Request timeout in milliseconds
 * @returns {Promise<Object>} - Response with text and provider
 */
async function generateText(options) {
  const { messages, system, fetchFn = fetch, timeoutMs = 30000 } = options;
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const msgs = [{ role: 'system', content: system }, ...messages];

    const response = await fetchFn(CHAT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: msgs,
        response_format: { type: 'json_object' }
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices[0].message.content;

    return { text, provider: PROVIDER_ID };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Generate image using OpenAI DALL-E API
 * @param {Object} options - Request options
 * @param {string} options.prompt - Image generation prompt
 * @param {Object} options.fetchFn - Fetch function (for testing/mocking)
 * @param {number} options.timeoutMs - Request timeout in milliseconds
 * @returns {Promise<Object>} - Response with imageUrl, base64, and provider
 */
async function generateImage(options) {
  const { prompt, fetchFn = fetch, timeoutMs = 60000 } = options;
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchFn(IMAGE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        response_format: 'b64_json'
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`OpenAI Image API error: ${response.status}`);
    }

    const data = await response.json();
    const base64 = data.data[0].b64_json;

    return {
      imageUrl: null,
      base64: base64,
      provider: PROVIDER_ID
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Generate speech using OpenAI TTS API
 * @param {Object} options - Request options
 * @param {string} options.text - Text to convert to speech
 * @param {string} options.lang - Language code (optional)
 * @param {Object} options.fetchFn - Fetch function (for testing/mocking)
 * @param {number} options.timeoutMs - Request timeout in milliseconds
 * @returns {Promise<Object>} - Response with audioUrl, base64, and provider
 */
async function generateSpeech(options) {
  const { text, fetchFn = fetch, timeoutMs = 30000 } = options;
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchFn(TTS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: 'nova'
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`OpenAI TTS API error: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    return {
      audioUrl: null,
      base64: base64,
      provider: PROVIDER_ID
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

module.exports = {
  generateText,
  generateImage,
  generateSpeech,
  PROVIDER_ID,
  capabilities: ['text', 'image', 'tts']
};
