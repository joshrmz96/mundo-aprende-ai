/**
 * Gemini (Google) Provider Adapter
 * Supports: Text generation, Image generation (via Imagen), TTS
 */

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

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
 * Generate text using Gemini
 * @param {Object} params
 * @param {string} params.prompt - The user prompt
 * @param {Object} params.options - Additional options
 * @param {Array} params.options.messages - Conversation messages array
 * @param {string} params.options.system - System instruction
 * @param {AbortSignal} params.options.signal - AbortController signal for timeout
 * @returns {Promise<{text: string}>}
 */
export async function generateText({ prompt, options = {} }) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY not configured');
    }

    const { messages = [], system = '', signal } = options;
    
    // Build contents from messages or use prompt directly
    let contents;
    if (messages.length > 0) {
        contents = messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
        }));
    } else {
        contents = [{ role: 'user', parts: [{ text: prompt }] }];
    }

    const requestBody = {
        contents,
        generationConfig: { responseMimeType: "application/json" }
    };
    
    if (system) {
        requestBody.systemInstruction = { parts: [{ text: system }] };
    }

    const response = await fetch(
        `${GEMINI_API_BASE}/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini text generation failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const text = cleanJSON(data.candidates?.[0]?.content?.parts?.[0]?.text || '');
    
    return { text };
}

/**
 * Generate image using Gemini Imagen API
 * Note: Gemini Imagen API availability may vary
 * @param {Object} params
 * @param {string} params.prompt - Image description prompt
 * @param {Object} params.options - Additional options
 * @param {AbortSignal} params.options.signal - AbortController signal for timeout
 * @returns {Promise<{imageUrl: string, base64: string|null}>}
 */
export async function generateImage({ prompt, options = {} }) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY not configured');
    }

    const { signal } = options;

    // Using Gemini's image generation model
    const response = await fetch(
        `${GEMINI_API_BASE}/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    role: 'user',
                    parts: [{ text: `Generate an image: ${prompt}` }]
                }],
                generationConfig: {
                    responseModalities: ['IMAGE', 'TEXT']
                }
            }),
            signal
        }
    );

    if (!response.ok) {
        throw new Error(`Gemini image generation failed: ${response.status}`);
    }

    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    
    // Look for inline image data
    for (const part of parts) {
        if (part.inlineData?.mimeType?.startsWith('image/')) {
            return {
                imageUrl: null,
                base64: part.inlineData.data
            };
        }
    }

    throw new Error('Gemini did not return image data');
}

/**
 * Generate TTS audio using Gemini
 * Note: Gemini TTS support may be limited
 * @param {Object} params
 * @param {string} params.text - Text to convert to speech
 * @param {string} params.voice - Voice identifier
 * @param {Object} params.options - Additional options
 * @param {AbortSignal} params.options.signal - AbortController signal for timeout
 * @returns {Promise<{audioUrl: string|null, base64: string|null}>}
 */
export async function generateTTS({ text, voice = 'default', options = {} }) {
    // Gemini TTS is not fully available in the standard API
    // This is a placeholder that throws to allow fallback to other providers
    throw new Error('Gemini TTS not available - falling back to next provider');
}

export default {
    id: 'gemini',
    name: 'Google Gemini',
    generateText,
    generateImage,
    generateTTS
};
