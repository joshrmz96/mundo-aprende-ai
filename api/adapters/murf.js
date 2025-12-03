/**
 * Murf AI Adapter
 * Supports: TTS (Text-to-Speech)
 */

const DEFAULT_TIMEOUT = 30000;

/**
 * Create an AbortController with timeout
 * @param {number} timeout - Timeout in milliseconds
 * @param {AbortSignal} [externalSignal] - External abort signal to combine
 * @returns {{ controller: AbortController, timeoutId: NodeJS.Timeout }}
 */
function createTimeoutController(timeout, externalSignal) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  if (externalSignal) {
    externalSignal.addEventListener('abort', () => controller.abort());
  }

  return { controller, timeoutId };
}

/**
 * Generate text using Murf API
 * Note: Murf does not support text generation
 * @param {Object} params - Parameters
 * @param {string} params.prompt - The prompt for text generation
 * @param {Object} [params.options] - Additional options
 * @param {AbortSignal} [params.signal] - Abort signal
 * @returns {Promise<null>} - Always returns null (not supported)
 */
async function generateText({ prompt, options = {}, signal }) {
  // Murf does not support text generation
  return null;
}

/**
 * Generate image using Murf API
 * Note: Murf does not support image generation
 * @param {Object} params - Parameters
 * @param {string} params.prompt - Image description
 * @param {Object} [params.options] - Additional options
 * @param {AbortSignal} [params.signal] - Abort signal
 * @returns {Promise<null>} - Always returns null (not supported)
 */
async function generateImage({ prompt, options = {}, signal }) {
  // Murf does not support image generation
  return null;
}

/**
 * Generate TTS audio using Murf API
 * @param {Object} params - Parameters
 * @param {string} params.text - Text to convert to speech
 * @param {string} [params.voice] - Voice ID (default: en-US-natalie)
 * @param {Object} [params.options] - Additional options
 * @param {string} [params.options.style] - Voice style
 * @param {number} [params.options.rate] - Speech rate
 * @param {number} [params.options.pitch] - Voice pitch
 * @param {number} [params.options.timeout] - Request timeout in ms
 * @param {AbortSignal} [params.signal] - Abort signal
 * @returns {Promise<Blob>} - Audio blob
 */
async function generateTTS({ text, voice = 'en-US-natalie', options = {}, signal }) {
  const apiKey = process.env.MURF_API_KEY;
  if (!apiKey) {
    throw new Error('MURF_API_KEY is not configured');
  }

  const timeout = options.timeout || DEFAULT_TIMEOUT;
  const { controller, timeoutId } = createTimeoutController(timeout, signal);

  try {
    // Murf API endpoint for speech synthesis
    const response = await fetch('https://api.murf.ai/v1/speech/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify({
        voiceId: voice,
        text,
        style: options.style || 'Conversational',
        rate: options.rate || 0,
        pitch: options.pitch || 0,
        format: 'MP3'
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Murf API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Murf returns audio URL, we need to fetch the actual audio
    if (!data.audioFile) {
      throw new Error('Invalid response structure from Murf API');
    }

    // Fetch the audio file
    const audioResponse = await fetch(data.audioFile, {
      signal: controller.signal
    });

    if (!audioResponse.ok) {
      throw new Error(`Failed to fetch Murf audio: ${audioResponse.status}`);
    }

    return await audioResponse.blob();
  } finally {
    clearTimeout(timeoutId);
  }
}

// ES Module exports for edge runtime
export const id = 'murf';
export const name = 'Murf AI';
export { generateText, generateImage, generateTTS };
export default { id, name, generateText, generateImage, generateTTS };
