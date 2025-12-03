import { BaseAdapter, cleanJSON } from './base.js';

/**
 * Gemini (Google) adapter for text generation
 * Provider ID: gemini
 * Env var: GEMINI_API_KEY
 */
export class GeminiAdapter extends BaseAdapter {
    constructor() {
        super('gemini');
        this.apiKey = process.env.GEMINI_API_KEY;
    }

    isConfigured() {
        return Boolean(this.apiKey);
    }

    async generateText({ messages, system }) {
        if (!this.isConfigured()) {
            throw new Error('Gemini API key not configured');
        }

        // Convert message format for Gemini
        const contents = messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
        }));

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: contents,
                    systemInstruction: { parts: [{ text: system }] },
                    generationConfig: { responseMimeType: "application/json" }
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`Gemini API failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return cleanJSON(data.candidates[0].content.parts[0].text);
    }

    async generateImage() {
        throw new Error('Gemini image generation not supported');
    }

    async generateTTS() {
        throw new Error('Gemini TTS not implemented');
    }
}
