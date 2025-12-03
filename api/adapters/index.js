/**
 * AI Provider Adapter Loader
 * 
 * This module provides a unified interface for accessing different AI providers.
 * Configuration is read from environment variables.
 * 
 * Environment Variables:
 * - PROVIDER_TEXT_ORDER: Comma-separated list of provider IDs for text generation (default: "gemini,openai,grok")
 * - PROVIDER_IMAGE_ORDER: Comma-separated list of provider IDs for image generation (default: "openai,pollinations")
 * - PROVIDER_TTS_ORDER: Comma-separated list of provider IDs for TTS (default: "openai,murf")
 * 
 * Each provider needs its respective API key configured:
 * - GEMINI_API_KEY
 * - OPENAI_API_KEY
 * - XAI_API_KEY (for Grok)
 * - MURF_API_KEY
 */

import * as geminiAdapter from './gemini.js';
import * as openaiAdapter from './openai.js';
import * as grokAdapter from './grok.js';
import * as murfAdapter from './murf.js';
import * as pollinationsAdapter from './pollinations.js';

// Registry of available adapters
const adapters = {
  gemini: geminiAdapter.default || geminiAdapter,
  openai: openaiAdapter.default || openaiAdapter,
  grok: grokAdapter.default || grokAdapter,
  murf: murfAdapter.default || murfAdapter,
  pollinations: pollinationsAdapter.default || pollinationsAdapter
};

// Default fallback orders for each modality
export const DEFAULT_TEXT_ORDER = ['gemini', 'openai', 'grok'];
export const DEFAULT_IMAGE_ORDER = ['openai', 'pollinations'];
export const DEFAULT_TTS_ORDER = ['openai', 'murf'];

/**
 * Get an adapter by ID
 * @param {string} id - Provider ID (gemini, openai, grok, murf)
 * @returns {Object|null} - Adapter object or null if not found
 */
export function getAdapter(id) {
  return adapters[id] || null;
}

/**
 * Get all available adapters
 * @returns {Object} - Map of all adapters
 */
export function getAllAdapters() {
  return { ...adapters };
}

/**
 * Parse provider order from environment variable or use default
 * @param {string} envVar - Environment variable name
 * @param {string[]} defaultOrder - Default order array
 * @returns {string[]} - Array of provider IDs
 */
function getProviderOrder(envVar, defaultOrder) {
  const envValue = typeof process !== 'undefined' && process.env?.[envVar];
  if (envValue && typeof envValue === 'string') {
    return envValue.split(',').map(id => id.trim()).filter(Boolean);
  }
  return defaultOrder;
}

/**
 * Get the ordered list of text generation providers
 * @returns {string[]} - Array of provider IDs
 */
export function getTextProviderOrder() {
  return getProviderOrder('PROVIDER_TEXT_ORDER', DEFAULT_TEXT_ORDER);
}

/**
 * Get the ordered list of image generation providers
 * @returns {string[]} - Array of provider IDs
 */
export function getImageProviderOrder() {
  return getProviderOrder('PROVIDER_IMAGE_ORDER', DEFAULT_IMAGE_ORDER);
}

/**
 * Get the ordered list of TTS providers
 * @returns {string[]} - Array of provider IDs
 */
export function getTTSProviderOrder() {
  return getProviderOrder('PROVIDER_TTS_ORDER', DEFAULT_TTS_ORDER);
}

/**
 * Execute a function with deterministic fallback across providers
 * @param {string} modality - The modality (text, image, tts)
 * @param {Function} fn - Function to execute on each adapter (receives adapter as parameter)
 * @param {Object} [options] - Options
 * @param {boolean} [options.continueOnNull] - Continue to next provider if function returns null
 * @returns {Promise<any>} - Result from the first successful provider
 */
export async function executeWithFallback(modality, fn, options = {}) {
  let providerOrder;
  
  switch (modality) {
    case 'text':
      providerOrder = getTextProviderOrder();
      break;
    case 'image':
      providerOrder = getImageProviderOrder();
      break;
    case 'tts':
      providerOrder = getTTSProviderOrder();
      break;
    default:
      throw new Error(`Unknown modality: ${modality}`);
  }

  const errors = [];
  
  for (const providerId of providerOrder) {
    const adapter = getAdapter(providerId);
    
    if (!adapter) {
      errors.push({ provider: providerId, error: new Error(`Adapter not found: ${providerId}`) });
      continue;
    }

    try {
      const result = await fn(adapter);
      
      // If result is null and continueOnNull is true, try next provider
      if (result === null && options.continueOnNull) {
        errors.push({ provider: providerId, error: new Error('Provider returned null (not supported)') });
        continue;
      }
      
      return result;
    } catch (error) {
      errors.push({ provider: providerId, error });
      // Continue to next provider
    }
  }

  // All providers failed
  const errorMessages = errors.map(e => `${e.provider}: ${e.error.message}`).join('; ');
  throw new Error(`All providers failed. Errors: ${errorMessages}`);
}

/**
 * Generate text with deterministic fallback
 * @param {Object} params - Parameters to pass to generateText
 * @returns {Promise<string>} - Generated text
 */
export async function generateText(params) {
  return executeWithFallback('text', async (adapter) => {
    return adapter.generateText(params);
  }, { continueOnNull: true });
}

/**
 * Generate image with deterministic fallback
 * @param {Object} params - Parameters to pass to generateImage
 * @returns {Promise<string>} - Image URL
 */
export async function generateImage(params) {
  return executeWithFallback('image', async (adapter) => {
    return adapter.generateImage(params);
  }, { continueOnNull: true });
}

/**
 * Generate TTS with deterministic fallback
 * @param {Object} params - Parameters to pass to generateTTS
 * @returns {Promise<Blob>} - Audio blob
 */
export async function generateTTS(params) {
  return executeWithFallback('tts', async (adapter) => {
    return adapter.generateTTS(params);
  }, { continueOnNull: true });
}

export default {
  getAdapter,
  getAllAdapters,
  getTextProviderOrder,
  getImageProviderOrder,
  getTTSProviderOrder,
  executeWithFallback,
  generateText,
  generateImage,
  generateTTS,
  DEFAULT_TEXT_ORDER,
  DEFAULT_IMAGE_ORDER,
  DEFAULT_TTS_ORDER
};
