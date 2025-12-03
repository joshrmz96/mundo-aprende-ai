/**
 * OpenAI (ChatGPT) AI Adapter
 * Supports: Text generation, Image generation (DALL-E), TTS
 */

import { DEFAULT_TIMEOUT, createTimeoutController } from './utils.js';

/**
 * Generate text using OpenAI API
 * @param {Object} params - Parameters
 * @param {string} params.prompt - The prompt for text generation
 * @param {Object} [params.options] - Additional options
 * @param {string} [params.options.system] - System instruction
 * @param {Array} [params.options.messages] - Conversation history
 * @param {boolean} [params.options.jsonMode] - Whether to request JSON output
 * @param {string} [params.options.model] - Model to use (default: gpt-4o-mini)
 * @param {number} [params.options.timeout] - Request timeout in ms
 * @param {AbortSignal} [params.signal] - Abort signal
 * @returns {Promise<string>} - Generated text
 */
async function generateText({ prompt, options = {}, signal }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const timeout = options.timeout || DEFAULT_TIMEOUT;
  const { controller, timeoutId } = createTimeoutController(timeout, signal);
  const model = options.model || 'gpt-4o-mini';

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

    const requestBody = {
      model,
      messages
    };

    // Request JSON output if specified
    if (options.jsonMode) {
      requestBody.response_format = { type: 'json_object' };
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0]?.message?.content) {
      throw new Error('Invalid response structure from OpenAI API');
    }

    return data.choices[0].message.content;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Generate image using OpenAI DALL-E API
 * @param {Object} params - Parameters
 * @param {string} params.prompt - Image description
 * @param {Object} [params.options] - Additional options
 * @param {string} [params.options.size] - Image size (default: 1024x1024)
 * @param {string} [params.options.model] - Model (default: dall-e-3)
 * @param {number} [params.options.timeout] - Request timeout in ms
 * @param {AbortSignal} [params.signal] - Abort signal
 * @returns {Promise<string>} - Image URL
 */
async function generateImage({ prompt, options = {}, signal }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const timeout = options.timeout || 60000; // Images can take longer
  const { controller, timeoutId } = createTimeoutController(timeout, signal);

  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: options.model || 'dall-e-3',
        prompt,
        n: 1,
        size: options.size || '1024x1024',
        response_format: 'url'
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI Image API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.data || !data.data[0]?.url) {
      throw new Error('Invalid response structure from OpenAI Image API');
    }

    return data.data[0].url;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Generate TTS audio using OpenAI API
 * @param {Object} params - Parameters
 * @param {string} params.text - Text to convert to speech
 * @param {string} [params.voice] - Voice selection (default: nova)
 * @param {Object} [params.options] - Additional options
 * @param {string} [params.options.model] - Model (default: tts-1)
 * @param {number} [params.options.timeout] - Request timeout in ms
 * @param {AbortSignal} [params.signal] - Abort signal
 * @returns {Promise<Blob>} - Audio blob
 */
async function generateTTS({ text, voice = 'nova', options = {}, signal }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const timeout = options.timeout || DEFAULT_TIMEOUT;
  const { controller, timeoutId } = createTimeoutController(timeout, signal);

  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: options.model || 'tts-1',
        input: text,
        voice
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI TTS API error: ${response.status} - ${errorText}`);
    }

    return await response.blob();
  } finally {
    clearTimeout(timeoutId);
  }
}

// ES Module exports for edge runtime
export const id = 'openai';
export const name = 'OpenAI';
export { generateText, generateImage, generateTTS };
export default { id, name, generateText, generateImage, generateTTS };
