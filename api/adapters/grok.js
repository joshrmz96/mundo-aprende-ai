import { BaseAdapter, cleanJSON } from './base.js';

/**
 * Grok (xAI) adapter for text generation (tertiary fallback)
 * Provider ID: grok
 * Env var: XAI_API_KEY
 */
export class GrokAdapter extends BaseAdapter {
    constructor() {
        super('grok');
        this.apiKey = process.env.XAI_API_KEY;
    }

    isConfigured() {
        return Boolean(this.apiKey);
    }

    async generateText({ messages, system }) {
        if (!this.isConfigured()) {
            throw new Error('Grok API key not configured');
        }

        const msgs = [{ role: "system", content: system }, ...messages];

        const response = await fetch("https://api.x.ai/v1/chat/completions", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: "grok-beta",
                messages: msgs
            })
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`Grok API failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return cleanJSON(data.choices[0].message.content);
    }

    async generateImage() {
        throw new Error('Grok image generation not supported');
    }

    async generateTTS() {
        throw new Error('Grok TTS not supported');
    }
}
