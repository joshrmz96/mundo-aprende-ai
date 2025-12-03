'use strict';

const PROVIDER_ID = 'murf';
const MURF_API_URL = 'https://api.murf.ai/v1/speech/generate';

/**
 * Generate speech using Murf AI TTS API
 * @param {Object} options - Request options
 * @param {string} options.text - Text to convert to speech
 * @param {string} options.lang - Language code (optional)
 * @param {Object} options.fetchFn - Fetch function (for testing/mocking)
 * @param {number} options.timeoutMs - Request timeout in milliseconds
 * @returns {Promise<Object>} - Response with audioUrl, base64, and provider
 */
async function generateSpeech(options) {
  const { text, lang = 'en-US', fetchFn = fetch, timeoutMs = 30000 } = options;
  const apiKey = process.env.MURF_API_KEY;

  if (!apiKey) {
    throw new Error('MURF_API_KEY not configured');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Map language to Murf voice ID
    const voiceId = getVoiceForLang(lang);

    const response = await fetchFn(MURF_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify({
        voiceId: voiceId,
        text: text,
        format: 'MP3'
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Murf API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      audioUrl: data.audioFile || null,
      base64: data.encodedAudio || null,
      provider: PROVIDER_ID
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Map language code to Murf voice ID
 * @param {string} lang - Language code (e.g., 'en-US', 'es-ES')
 * @returns {string} - Murf voice ID
 */
function getVoiceForLang(lang) {
  const voiceMap = {
    'en-US': 'en-US-natalie',
    'en-GB': 'en-GB-hazel',
    'es-ES': 'es-ES-elena',
    'es-MX': 'es-MX-maria',
    'fr-FR': 'fr-FR-jean',
    'de-DE': 'de-DE-jonas'
  };
  return voiceMap[lang] || 'en-US-natalie';
}

module.exports = {
  generateSpeech,
  PROVIDER_ID,
  capabilities: ['tts']
};
