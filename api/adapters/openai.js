/**
 * OpenAI Provider Adapter
 * Supports: Text generation (ChatGPT), Image generation (DALL-E), TTS
 */

const OPENAI_API_BASE = 'https://api.openai.com/v1';

/**
 * Generate text using OpenAI ChatGPT
 * @param {Object} params
 * @param {string} params.prompt - The user prompt
 * @param {Object} params.options - Additional options
 * @param {Array} params.options.messages - Conversation messages array
 * @param {string} params.options.system - System instruction
 * @param {AbortSignal} params.options.signal - AbortController signal for timeout
 * @returns {Promise<{text: string}>}
 */
export async function generateText({ prompt, options = {} }) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY not configured');
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

    const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: msgs,
            response_format: { type: 'json_object' }
        }),
        signal
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI text generation failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    
    return { text };
}

/**
 * Generate image using OpenAI DALL-E
 * @param {Object} params
 * @param {string} params.prompt - Image description prompt
 * @param {Object} params.options - Additional options
 * @param {string} params.options.size - Image size (e.g., '1024x1024')
 * @param {string} params.options.quality - Image quality ('standard' or 'hd')
 * @param {AbortSignal} params.options.signal - AbortController signal for timeout
 * @returns {Promise<{imageUrl: string, base64: string|null}>}
 */
export async function generateImage({ prompt, options = {} }) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY not configured');
    }

    const { 
        size = '1024x1024', 
        quality = 'standard',
        signal 
    } = options;

    const response = await fetch(`${OPENAI_API_BASE}/images/generations`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'dall-e-3',
            prompt,
            n: 1,
            size,
            quality,
            response_format: 'url'
        }),
        signal
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI image generation failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const imageUrl = data.data?.[0]?.url;
    
    if (!imageUrl) {
        throw new Error('OpenAI did not return image URL');
    }

    return { imageUrl, base64: null };
}

/**
 * Generate TTS audio using OpenAI
 * @param {Object} params
 * @param {string} params.text - Text to convert to speech
 * @param {string} params.voice - Voice identifier (alloy, echo, fable, onyx, nova, shimmer)
 * @param {Object} params.options - Additional options
 * @param {AbortSignal} params.options.signal - AbortController signal for timeout
 * @returns {Promise<{audioUrl: string|null, base64: string|null, blob: Blob|null}>}
 */
export async function generateTTS({ text, voice = 'nova', options = {} }) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY not configured');
    }

    const { signal } = options;

    const response = await fetch(`${OPENAI_API_BASE}/audio/speech`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'tts-1',
            input: text,
            voice
        }),
        signal
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI TTS failed: ${response.status} - ${errorText}`);
    }

    const blob = await response.blob();
    
    return { audioUrl: null, base64: null, blob };
}

export default {
    id: 'openai',
    name: 'OpenAI',
    generateText,
    generateImage,
    generateTTS
};
