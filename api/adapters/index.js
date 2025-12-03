/**
 * Adapter Loader
 * Provides a unified interface to load and use AI provider adapters
 */

import geminiAdapter from './gemini.js';
import openaiAdapter from './openai.js';
import grokAdapter from './grok.js';
import murfAdapter from './murf.js';

// Registry of all available adapters
const adapters = {
    gemini: geminiAdapter,
    openai: openaiAdapter,
    grok: grokAdapter,
    murf: murfAdapter
};

// Default provider orders for each modality
const DEFAULT_TEXT_PROVIDERS = 'gemini,openai,grok';
const DEFAULT_IMAGE_PROVIDERS = 'gemini,openai';
const DEFAULT_TTS_PROVIDERS = 'openai,gemini,murf';
const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Get a specific adapter by provider ID
 * @param {string} providerId - The provider identifier (e.g., 'gemini', 'openai', 'grok', 'murf')
 * @returns {Object|null} The adapter object or null if not found
 */
export function getAdapter(providerId) {
    const adapter = adapters[providerId?.toLowerCase()];
    if (!adapter) {
        return null;
    }
    return adapter;
}

/**
 * Get an ordered list of adapters for a specific modality
 * @param {string} type - The modality type ('text', 'image', 'tts')
 * @returns {Array<Object>} Array of adapter objects in priority order
 */
export function getAdaptersForType(type) {
    let providerList;
    
    switch (type) {
        case 'text':
            providerList = process.env.TEXT_PROVIDERS || DEFAULT_TEXT_PROVIDERS;
            break;
        case 'image':
            providerList = process.env.IMAGE_PROVIDERS || DEFAULT_IMAGE_PROVIDERS;
            break;
        case 'tts':
            providerList = process.env.TTS_PROVIDERS || DEFAULT_TTS_PROVIDERS;
            break;
        default:
            return [];
    }

    return providerList
        .split(',')
        .map(id => id.trim().toLowerCase())
        .filter(id => id && adapters[id])
        .map(id => adapters[id]);
}

/**
 * Get timeout value from environment or use default
 * @returns {number} Timeout in milliseconds
 */
export function getTimeoutMs() {
    const timeout = parseInt(process.env.TIMEOUT_MS, 10);
    return isNaN(timeout) ? DEFAULT_TIMEOUT_MS : timeout;
}

/**
 * Execute a function with fallback across multiple providers
 * @param {string} type - The modality type ('text', 'image', 'tts')
 * @param {string} method - The method to call ('generateText', 'generateImage', 'generateTTS')
 * @param {Object} params - Parameters to pass to the method
 * @returns {Promise<Object>} The result from the first successful provider
 */
export async function executeWithFallback(type, method, params) {
    const providers = getAdaptersForType(type);
    const timeoutMs = getTimeoutMs();
    const errors = [];

    for (const adapter of providers) {
        try {
            // Create abort controller for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

            // Add signal to options
            const paramsWithSignal = {
                ...params,
                options: {
                    ...params.options,
                    signal: controller.signal
                }
            };

            // Call the adapter method
            const result = await adapter[method](paramsWithSignal);
            
            clearTimeout(timeoutId);
            
            // Add provider info to result
            return {
                ...result,
                provider: adapter.id
            };
        } catch (error) {
            // Log error and continue to next provider
            const errorMessage = error.name === 'AbortError' 
                ? `${adapter.id}: Request timed out after ${timeoutMs}ms`
                : `${adapter.id}: ${error.message}`;
            
            errors.push(errorMessage);
            console.error(`[Adapter] ${errorMessage}`);
        }
    }

    // All providers failed
    throw new Error(`All providers failed for ${type}: ${errors.join('; ')}`);
}

export default {
    getAdapter,
    getAdaptersForType,
    getTimeoutMs,
    executeWithFallback
};
