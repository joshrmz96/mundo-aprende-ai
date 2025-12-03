/**
 * Base adapter interface for AI providers
 * All provider adapters should extend this class
 */
export class BaseAdapter {
    constructor(providerId) {
        this.providerId = providerId;
    }

    /**
     * Check if the adapter is configured (has required API key)
     * @returns {boolean}
     */
    isConfigured() {
        throw new Error('isConfigured() must be implemented');
    }

    /**
     * Generate text completion
     * @param {Object} options - { messages, system }
     * @returns {Promise<string>} - JSON string response
     */
    async generateText(options) {
        throw new Error('generateText() must be implemented');
    }

    /**
     * Generate image
     * @param {Object} options - { prompt }
     * @returns {Promise<string>} - Image URL
     */
    async generateImage(options) {
        throw new Error('generateImage() must be implemented');
    }

    /**
     * Generate text-to-speech audio
     * @param {Object} options - { text, lang }
     * @returns {Promise<Blob>} - Audio blob
     */
    async generateTTS(options) {
        throw new Error('generateTTS() must be implemented');
    }
}

/**
 * Helper function to clean JSON from markdown code blocks
 * @param {string} text - Raw text that may contain markdown
 * @returns {string} - Cleaned JSON string
 */
export function cleanJSON(text) {
    if (!text) return "{}";
    let clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    if (start !== -1 && end !== -1) return clean.substring(start, end + 1);
    return clean;
}

/**
 * Deterministic fallback executor - tries adapters in order until one succeeds
 * @param {Array<BaseAdapter>} adapters - Ordered list of adapters to try
 * @param {Function} operation - Async function to call on each adapter
 * @returns {Promise<{result: any, providerId: string}>} - Result with provider ID
 */
export async function executeWithFallback(adapters, operation) {
    const errors = [];
    
    for (const adapter of adapters) {
        if (!adapter.isConfigured()) {
            errors.push({ providerId: adapter.providerId, error: 'Not configured' });
            continue;
        }
        
        try {
            const result = await operation(adapter);
            return { result, providerId: adapter.providerId };
        } catch (error) {
            errors.push({ providerId: adapter.providerId, error: error.message });
        }
    }
    
    throw new Error(`All providers failed: ${JSON.stringify(errors)}`);
}
