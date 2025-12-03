'use strict';

const gemini = require('./gemini');
const openai = require('./openai');
const grok = require('./grok');
const murf = require('./murf');
const pollinations = require('./pollinations');

// Registry of all adapters
const adapters = {
  gemini,
  openai,
  grok,
  murf,
  pollinations
};

// Default provider orders for each modality
const DEFAULT_TEXT_PROVIDERS = 'gemini,openai,grok';
const DEFAULT_IMAGE_PROVIDERS = 'pollinations,openai';
const DEFAULT_TTS_PROVIDERS = 'openai,murf';

// Default timeout in milliseconds
const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Get timeout from environment variable
 * @returns {number} - Timeout in milliseconds
 */
function getTimeoutMs() {
  const timeout = parseInt(process.env.TIMEOUT_MS, 10);
  return isNaN(timeout) ? DEFAULT_TIMEOUT_MS : timeout;
}

/**
 * Parse provider list from environment variable or use default
 * @param {string} envVar - Environment variable name
 * @param {string} defaultValue - Default comma-separated provider list
 * @returns {string[]} - Array of provider names
 */
function parseProviders(envVar, defaultValue) {
  const value = process.env[envVar];
  if (value && value.trim()) {
    return value.split(',').map((p) => p.trim().toLowerCase());
  }
  return defaultValue.split(',');
}

/**
 * Get text providers in order (with backwards compatibility for PRIMARY_TEXT_PROVIDER)
 * @returns {string[]} - Array of provider names
 */
function getTextProviders() {
  // Backwards compatibility: if PRIMARY_TEXT_PROVIDER is set, use it first
  const primary = process.env.PRIMARY_TEXT_PROVIDER;
  if (primary) {
    const providers = parseProviders('TEXT_PROVIDERS', DEFAULT_TEXT_PROVIDERS);
    const primaryLower = primary.toLowerCase();
    // Move primary to front if it exists
    const filtered = providers.filter((p) => p !== primaryLower);
    return [primaryLower, ...filtered];
  }
  return parseProviders('TEXT_PROVIDERS', DEFAULT_TEXT_PROVIDERS);
}

/**
 * Get image providers in order (with backwards compatibility for PRIMARY_IMAGE_PROVIDER)
 * @returns {string[]} - Array of provider names
 */
function getImageProviders() {
  const primary = process.env.PRIMARY_IMAGE_PROVIDER;
  if (primary) {
    const providers = parseProviders('IMAGE_PROVIDERS', DEFAULT_IMAGE_PROVIDERS);
    const primaryLower = primary.toLowerCase();
    const filtered = providers.filter((p) => p !== primaryLower);
    return [primaryLower, ...filtered];
  }
  return parseProviders('IMAGE_PROVIDERS', DEFAULT_IMAGE_PROVIDERS);
}

/**
 * Get TTS providers in order (with backwards compatibility for PRIMARY_TTS_PROVIDER)
 * @returns {string[]} - Array of provider names
 */
function getTtsProviders() {
  const primary = process.env.PRIMARY_TTS_PROVIDER;
  if (primary) {
    const providers = parseProviders('TTS_PROVIDERS', DEFAULT_TTS_PROVIDERS);
    const primaryLower = primary.toLowerCase();
    const filtered = providers.filter((p) => p !== primaryLower);
    return [primaryLower, ...filtered];
  }
  return parseProviders('TTS_PROVIDERS', DEFAULT_TTS_PROVIDERS);
}

/**
 * Execute with deterministic fallback order
 * @param {string} capability - Capability required ('text', 'image', 'tts')
 * @param {string[]} providerOrder - Ordered list of provider names to try
 * @param {string} methodName - Method to call on adapter
 * @param {Object} options - Options to pass to the method
 * @returns {Promise<Object>} - Response from successful provider
 * @throws {Error} - If all providers fail
 */
async function executeWithFallback(capability, providerOrder, methodName, options) {
  const timeoutMs = options.timeoutMs || getTimeoutMs();
  const errors = [];

  for (const providerName of providerOrder) {
    const adapter = adapters[providerName];

    if (!adapter) {
      console.warn(`[${providerName}] Provider not found, skipping`);
      continue;
    }

    if (!adapter.capabilities.includes(capability)) {
      console.warn(`[${providerName}] Does not support ${capability}, skipping`);
      continue;
    }

    const method = adapter[methodName];
    if (typeof method !== 'function') {
      console.warn(`[${providerName}] Method ${methodName} not found, skipping`);
      continue;
    }

    try {
      const result = await method({ ...options, timeoutMs });
      return result;
    } catch (error) {
      console.warn(`[${providerName}] ${error.message}`);
      errors.push({ provider: providerName, error: error.message });
    }
  }

  throw new Error(`All providers failed: ${JSON.stringify(errors)}`);
}

/**
 * Generate text with deterministic fallback
 * @param {Object} options - Options for text generation
 * @returns {Promise<Object>} - Response with text and provider
 */
async function generateText(options) {
  const providers = getTextProviders();
  return executeWithFallback('text', providers, 'generateText', options);
}

/**
 * Generate image with deterministic fallback
 * @param {Object} options - Options for image generation
 * @returns {Promise<Object>} - Response with imageUrl, base64, and provider
 */
async function generateImage(options) {
  const providers = getImageProviders();
  return executeWithFallback('image', providers, 'generateImage', options);
}

/**
 * Generate speech with deterministic fallback
 * @param {Object} options - Options for speech generation
 * @returns {Promise<Object>} - Response with audioUrl, base64, and provider
 */
async function generateSpeech(options) {
  const providers = getTtsProviders();
  return executeWithFallback('tts', providers, 'generateSpeech', options);
}

module.exports = {
  adapters,
  generateText,
  generateImage,
  generateSpeech,
  getTextProviders,
  getImageProviders,
  getTtsProviders,
  getTimeoutMs,
  executeWithFallback
};
