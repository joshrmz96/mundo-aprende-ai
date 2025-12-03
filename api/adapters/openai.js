import { BaseAdapter } from './base.js';

/**
 * OpenAI (ChatGPT) adapter for text, image, and TTS generation
 * Provider ID: openai
 * Env var: OPENAI_API_KEY
 * 
 * TTS voice can be customized via OPENAI_TTS_VOICE environment variable.
 * Available voices: alloy, echo, fable, onyx, nova, shimmer
 */
export class OpenAIAdapter extends BaseAdapter {
    constructor() {
        super('openai');
        this.apiKey = process.env.OPENAI_API_KEY;
        // Default voice is 'nova', can be overridden via env var
        this.ttsVoice = process.env.OPENAI_TTS_VOICE || 'nova';
    }

    isConfigured() {
        return Boolean(this.apiKey);
    }

    async generateText({ messages, system }) {
        if (!this.isConfigured()) {
            throw new Error('OpenAI API key not configured');
        }

        const msgs = [{ role: "system", content: system }, ...messages];

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: msgs,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`OpenAI API failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    async generateImage({ prompt }) {
        if (!this.isConfigured()) {
            throw new Error('OpenAI API key not configured');
        }

        const response = await fetch("https://api.openai.com/v1/images/generations", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: "dall-e-3",
                prompt: `illustration of ${prompt} vector flat colorful`,
                n: 1,
                size: "1024x1024"
            })
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`OpenAI Image API failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return data.data[0].url;
    }

    async generateTTS({ text, lang }) {
        if (!this.isConfigured()) {
            throw new Error('OpenAI API key not configured');
        }

        // Note: OpenAI TTS voices are not language-specific; they work across languages.
        // The lang parameter is preserved for compatibility with other adapters.
        const response = await fetch("https://api.openai.com/v1/audio/speech", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: "tts-1",
                input: text,
                voice: this.ttsVoice
            })
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`OpenAI TTS API failed: ${response.status} - ${errorText}`);
        }

        return response.blob();
    }
}
