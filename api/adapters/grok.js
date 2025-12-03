/**
 * Grok (xAI) AI Adapter
 * Supports: Text generation
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
 * Clean JSON response from markdown code blocks
 * @param {string} text - Raw response text
 * @returns {string} - Clean JSON string
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
 * Generate text using Grok (xAI) API
 * @param {Object} params - Parameters
 * @param {string} params.prompt - The prompt for text generation
 * @param {Object} [params.options] - Additional options
 * @param {string} [params.options.system] - System instruction
 * @param {Array} [params.options.messages] - Conversation history
 * @param {boolean} [params.options.jsonMode] - Whether to clean JSON from response
 * @param {string} [params.options.model] - Model to use (default: grok-beta)
 * @param {number} [params.options.timeout] - Request timeout in ms
 * @param {AbortSignal} [params.signal] - Abort signal
 * @returns {Promise<string>} - Generated text
 */
async function generateText({ prompt, options = {}, signal }) {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error('XAI_API_KEY is not configured');
  }

  const timeout = options.timeout || DEFAULT_TIMEOUT;
  const { controller, timeoutId } = createTimeoutController(timeout, signal);
  const model = options.model || 'grok-beta';

  try {
    // Build messages array
    const messages = [];
    
    if (options.system) {
      messages.push({ role: 'system', content: options.system });
    }

    if (options.messages && Array.isArray(options.messages)) {
      messages.push(...options.messages);
    } else if (prompt) {
      messages.push({ role: 'user', content: prompt });
    }

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Grok API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0]?.message?.content) {
      throw new Error('Invalid response structure from Grok API');
    }

    const text = data.choices[0].message.content;
    return options.jsonMode ? cleanJSON(text) : text;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Generate image using Grok API
 * Note: Grok does not support image generation
 * @param {Object} params - Parameters
 * @param {string} params.prompt - Image description
 * @param {Object} [params.options] - Additional options
 * @param {AbortSignal} [params.signal] - Abort signal
 * @returns {Promise<null>} - Always returns null (not supported)
 */
async function generateImage({ prompt, options = {}, signal }) {
  // Grok does not support image generation
  return null;
}

/**
 * Generate TTS audio using Grok API
 * Note: Grok does not support TTS
 * @param {Object} params - Parameters
 * @param {string} params.text - Text to convert to speech
 * @param {string} [params.voice] - Voice selection
 * @param {Object} [params.options] - Additional options
 * @param {AbortSignal} [params.signal] - Abort signal
 * @returns {Promise<null>} - Always returns null (not supported)
 */
async function generateTTS({ text, voice, options = {}, signal }) {
  // Grok does not support TTS
  return null;
}

// ES Module exports for edge runtime
export const id = 'grok';
export const name = 'Grok (xAI)';
export { generateText, generateImage, generateTTS };
export default { id, name, generateText, generateImage, generateTTS };
