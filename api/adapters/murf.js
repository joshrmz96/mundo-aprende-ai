import { BaseAdapter } from './base.js';

/**
 * Murf adapter for TTS generation (audio fallback)
 * Provider ID: murf
 * Env var: MURF_API_KEY
 */
export class MurfAdapter extends BaseAdapter {
    constructor() {
        super('murf');
        this.apiKey = process.env.MURF_API_KEY;
    }

    isConfigured() {
        return Boolean(this.apiKey);
    }

    async generateText() {
        throw new Error('Murf text generation not supported');
    }

    async generateImage() {
        throw new Error('Murf image generation not supported');
    }

    async generateTTS({ text, lang }) {
        if (!this.isConfigured()) {
            throw new Error('Murf API key not configured');
        }

        // Murf API voice mapping based on language
        const voiceMap = {
            'es': 'es-ES-Standard-A',
            'en': 'en-US-Standard-A',
            'default': 'en-US-Standard-A'
        };
        const voice = voiceMap[lang] || voiceMap['default'];

        // Step 1: Create speech synthesis request
        const createResponse = await fetch("https://api.murf.ai/v1/speech/generate", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': this.apiKey
            },
            body: JSON.stringify({
                text: text,
                voiceId: voice,
                format: 'MP3',
                sampleRate: 24000
            })
        });

        if (!createResponse.ok) {
            const errorText = await createResponse.text().catch(() => 'Unknown error');
            throw new Error(`Murf API failed: ${createResponse.status} - ${errorText}`);
        }

        const data = await createResponse.json();
        
        // Get the audio URL from response
        if (!data.audioFile) {
            throw new Error('Murf API did not return audio file');
        }

        // Fetch the audio file
        const audioResponse = await fetch(data.audioFile);
        if (!audioResponse.ok) {
            throw new Error('Failed to fetch Murf audio file');
        }

        return audioResponse.blob();
    }
}
