/**
 * Pollinations AI Adapter
 * Supports: Image generation (free, no API key required)
 */

/**
 * Generate text using Pollinations API
 * Note: Pollinations does not support text generation
 * @param {Object} params - Parameters
 * @param {string} params.prompt - The prompt for text generation
 * @param {Object} [params.options] - Additional options
 * @param {AbortSignal} [params.signal] - Abort signal
 * @returns {Promise<null>} - Always returns null (not supported)
 */
async function generateText({ prompt, options = {}, signal }) {
  // Pollinations does not support text generation
  return null;
}

/**
 * Generate image using Pollinations API
 * Note: This returns a URL that can be used directly (redirect-based)
 * @param {Object} params - Parameters
 * @param {string} params.prompt - Image description
 * @param {Object} [params.options] - Additional options
 * @param {number} [params.options.width] - Image width (default: 600)
 * @param {number} [params.options.height] - Image height (default: 400)
 * @param {string} [params.options.style] - Style prefix (default: 'illustration of')
 * @param {string} [params.options.suffix] - Style suffix appended to prompt (default: 'vector flat colorful')
 * @param {boolean} [params.options.nologo] - Hide Pollinations logo (default: true)
 * @param {AbortSignal} [params.signal] - Abort signal
 * @returns {Promise<string>} - Image URL
 */
async function generateImage({ prompt, options = {}, signal }) {
  const width = options.width || 600;
  const height = options.height || 400;
  const style = options.style !== undefined ? options.style : 'illustration of';
  const suffix = options.suffix !== undefined ? options.suffix : 'vector flat colorful';
  const nologo = options.nologo !== undefined ? options.nologo : true;
  
  const encodedPrompt = encodeURIComponent(prompt);
  const stylePrefix = style ? encodeURIComponent(style + ' ') : '';
  const styleSuffix = suffix ? '%20' + encodeURIComponent(suffix) : '';
  
  // Build the Pollinations URL
  // Style prefix and suffix are configurable for different use cases
  const imageUrl = `https://image.pollinations.ai/prompt/${stylePrefix}${encodedPrompt}${styleSuffix}?width=${width}&height=${height}&nologo=${nologo}`;
  
  return imageUrl;
}

/**
 * Generate TTS audio using Pollinations API
 * Note: Pollinations does not support TTS
 * @param {Object} params - Parameters
 * @param {string} params.text - Text to convert to speech
 * @param {string} [params.voice] - Voice selection
 * @param {Object} [params.options] - Additional options
 * @param {AbortSignal} [params.signal] - Abort signal
 * @returns {Promise<null>} - Always returns null (not supported)
 */
async function generateTTS({ text, voice, options = {}, signal }) {
  // Pollinations does not support TTS
  return null;
}

// ES Module exports for edge runtime
export const id = 'pollinations';
export const name = 'Pollinations AI';
export { generateText, generateImage, generateTTS };
export default { id, name, generateText, generateImage, generateTTS };
