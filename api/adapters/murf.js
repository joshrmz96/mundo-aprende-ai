/**
 * Murf Provider Adapter
 * Supports: TTS only
 * Murf.ai is a specialized text-to-speech provider
 */

const MURF_API_BASE = 'https://api.murf.ai/v1';

/**
 * Generate text - Not supported by Murf
 * @returns {Promise<never>}
 */
export async function generateText({ prompt, options = {} }) {
    throw new Error('Murf does not support text generation');
}

/**
 * Generate image - Not supported by Murf
 * @returns {Promise<never>}
 */
export async function generateImage({ prompt, options = {} }) {
    throw new Error('Murf does not support image generation');
}

/**
 * Generate TTS audio using Murf
 * @param {Object} params
 * @param {string} params.text - Text to convert to speech
 * @param {string} params.voice - Voice identifier
 * @param {Object} params.options - Additional options
 * @param {string} params.options.lang - Language code (e.g., 'en-US', 'es-ES')
 * @param {AbortSignal} params.options.signal - AbortController signal for timeout
 * @returns {Promise<{audioUrl: string|null, base64: string|null}>}
 */
export async function generateTTS({ text, voice = 'en-US-1', options = {} }) {
    const apiKey = process.env.MURF_API_KEY;
    if (!apiKey) {
        throw new Error('MURF_API_KEY not configured');
    }

    const { lang = 'en-US', signal } = options;

    // Murf API uses a voice ID format
    // Common voices: en-US-1, en-US-2, es-ES-1, etc.
    const voiceId = voice || `${lang}-1`;

    const response = await fetch(`${MURF_API_BASE}/speech/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'api-key': apiKey
        },
        body: JSON.stringify({
            voiceId,
            text,
            format: 'MP3',
            sampleRate: 24000
        }),
        signal
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Murf TTS failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Murf typically returns an audio URL or base64 audio data
    if (data.audioFile) {
        return { audioUrl: data.audioFile, base64: null };
    }
    
    if (data.audioContent) {
        return { audioUrl: null, base64: data.audioContent };
    }

    throw new Error('Murf did not return audio data');
}

export default {
    id: 'murf',
    name: 'Murf.ai',
    generateText,
    generateImage,
    generateTTS
};
