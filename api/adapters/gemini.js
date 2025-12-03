/**
 * Gemini (Google) AI Adapter
 * Supports: Text generation, Image generation (via Imagen), TTS (limited)
 */

import { DEFAULT_TIMEOUT, createTimeoutController, cleanJSON } from './utils.js';

/**
 * Generate text using Gemini API
 * @param {Object} params - Parameters
 * @param {string} params.prompt - The prompt for text generation
 * @param {Object} [params.options] - Additional options
 * @param {string} [params.options.system] - System instruction
 * @param {Array} [params.options.messages] - Conversation history
 * @param {boolean} [params.options.jsonMode] - Whether to request JSON output
 * @param {number} [params.options.timeout] - Request timeout in ms
 * @param {AbortSignal} [params.signal] - Abort signal
 * @returns {Promise<string>} - Generated text
 */
async function generateText({ prompt, options = {}, signal }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const timeout = options.timeout || DEFAULT_TIMEOUT;
  const { controller, timeoutId } = createTimeoutController(timeout, signal);

  try {
    // Build contents array from messages or single prompt
    let contents;
    if (options.messages && Array.isArray(options.messages)) {
      contents = options.messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));
    } else {
      contents = [{ role: 'user', parts: [{ text: prompt }] }];
    }

    const requestBody = {
      contents,
      generationConfig: {}
    };

    // Add system instruction if provided
    if (options.system) {
      requestBody.systemInstruction = { parts: [{ text: options.system }] };
    }

    // Request JSON output if specified
    if (options.jsonMode) {
      requestBody.generationConfig.responseMimeType = 'application/json';
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response structure from Gemini API');
    }

    const text = data.candidates[0].content.parts[0].text;
    return options.jsonMode ? cleanJSON(text) : text;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Generate image using Gemini/Imagen API
 * Note: Gemini's image generation capabilities are limited.
 * This implementation uses Pollinations as a fallback approach.
 * @param {Object} params - Parameters
 * @param {string} params.prompt - Image description
 * @param {Object} [params.options] - Additional options
 * @param {AbortSignal} [params.signal] - Abort signal
 * @returns {Promise<string|null>} - Image URL or null if not supported
 */
async function generateImage({ prompt, options = {}, signal }) {
  // Gemini does not have a direct public image generation API for general use
  // Return null to indicate this provider doesn't support this modality
  return null;
}

/**
 * Generate TTS audio using Gemini
 * Note: Gemini's TTS capabilities are limited in edge environments
 * @param {Object} params - Parameters
 * @param {string} params.text - Text to convert to speech
 * @param {string} [params.voice] - Voice selection
 * @param {Object} [params.options] - Additional options
 * @param {AbortSignal} [params.signal] - Abort signal
 * @returns {Promise<Blob|null>} - Audio blob or null if not supported
 */
async function generateTTS({ text, voice, options = {}, signal }) {
  // Gemini's TTS returns base64 which is not ideal for edge runtime
  // Return null to indicate fallback should be used
  return null;
}

// ES Module exports for edge runtime
export const id = 'gemini';
export const name = 'Google Gemini';
export { generateText, generateImage, generateTTS };
export default { id, name, generateText, generateImage, generateTTS };
