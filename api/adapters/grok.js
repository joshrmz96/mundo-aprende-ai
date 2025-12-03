/**
 * Grok (xAI) Provider Adapter
 * Supports: Text generation
 * Note: Grok currently supports text generation only
 */

const GROK_API_BASE = 'https://api.x.ai/v1';

/**
 * Helper to clean JSON from markdown code blocks
 */
function cleanJSON(text) {
    if (!text) return "{}";
    let clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    if (start !== -1 && end !== -1) return clean.substring(start, end + 1);
    return clean;
}

/**
 * Generate text using Grok
 * @param {Object} params
 * @param {string} params.prompt - The user prompt
 * @param {Object} params.options - Additional options
 * @param {Array} params.options.messages - Conversation messages array
 * @param {string} params.options.system - System instruction
 * @param {AbortSignal} params.options.signal - AbortController signal for timeout
 * @returns {Promise<{text: string}>}
 */
export async function generateText({ prompt, options = {} }) {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
        throw new Error('XAI_API_KEY not configured');
    }

    const { messages = [], system = '', signal } = options;
    
    // Build messages array
    const msgs = [];
    if (system) {
        msgs.push({ role: 'system', content: system });
    }
    
    if (messages.length > 0) {
        msgs.push(...messages);
    } else if (prompt) {
        msgs.push({ role: 'user', content: prompt });
    }

    const response = await fetch(`${GROK_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'grok-beta',
            messages: msgs
        }),
        signal
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Grok text generation failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || '';
    const text = cleanJSON(rawText);
    
    return { text };
}

/**
 * Generate image using Grok
 * Note: Grok does not currently support image generation
 * @param {Object} params
 * @returns {Promise<never>}
 */
export async function generateImage({ prompt, options = {} }) {
    throw new Error('Grok does not support image generation');
}

/**
 * Generate TTS audio using Grok
 * Note: Grok does not currently support TTS
 * @param {Object} params
 * @returns {Promise<never>}
 */
export async function generateTTS({ text, voice, options = {} }) {
    throw new Error('Grok does not support TTS');
}

export default {
    id: 'grok',
    name: 'Grok (xAI)',
    generateText,
    generateImage,
    generateTTS
};
