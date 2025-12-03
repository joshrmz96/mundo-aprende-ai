/**
 * Provider adapters index
 * Exports all available adapters and helper functions
 */
export { BaseAdapter, cleanJSON, executeWithFallback } from './base.js';
export { GeminiAdapter } from './gemini.js';
export { OpenAIAdapter } from './openai.js';
export { GrokAdapter } from './grok.js';
export { MurfAdapter } from './murf.js';
export { PollinationsAdapter } from './pollinations.js';

import { GeminiAdapter } from './gemini.js';
import { OpenAIAdapter } from './openai.js';
import { GrokAdapter } from './grok.js';
import { MurfAdapter } from './murf.js';
import { PollinationsAdapter } from './pollinations.js';

/**
 * Create text generation adapters in deterministic fallback order
 * Order: Gemini (primary) → OpenAI (secondary) → Grok (tertiary)
 * @returns {Array} Ordered list of text adapters
 */
export function createTextAdapters() {
    return [
        new GeminiAdapter(),
        new OpenAIAdapter(),
        new GrokAdapter()
    ];
}

/**
 * Create image generation adapters in deterministic fallback order
 * Order: OpenAI DALL-E (primary) → Pollinations (fallback, free)
 * @returns {Array} Ordered list of image adapters
 */
export function createImageAdapters() {
    return [
        new OpenAIAdapter(),
        new PollinationsAdapter()
    ];
}

/**
 * Create TTS adapters in deterministic fallback order
 * Order: OpenAI (primary) → Murf (audio fallback)
 * @returns {Array} Ordered list of TTS adapters
 */
export function createTTSAdapters() {
    return [
        new OpenAIAdapter(),
        new MurfAdapter()
    ];
}
