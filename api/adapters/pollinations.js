import { BaseAdapter } from './base.js';

/**
 * Pollinations adapter for free image generation (fallback)
 * Provider ID: pollinations
 * No API key required - free service
 */
export class PollinationsAdapter extends BaseAdapter {
    constructor() {
        super('pollinations');
    }

    // Always configured as no API key is required
    isConfigured() {
        return true;
    }

    async generateText() {
        throw new Error('Pollinations text generation not supported');
    }

    async generateImage({ prompt }) {
        // Pollinations generates image URLs directly, no API call needed
        const encodedPrompt = encodeURIComponent(prompt);
        const imageUrl = `https://image.pollinations.ai/prompt/illustration%20of%20${encodedPrompt}%20vector%20flat%20colorful?width=600&height=400&nologo=true`;
        
        // Verify the URL is accessible by making a HEAD request
        const response = await fetch(imageUrl, { method: 'HEAD' });
        if (!response.ok) {
            throw new Error(`Pollinations failed: ${response.status}`);
        }
        
        return imageUrl;
    }

    async generateTTS() {
        throw new Error('Pollinations TTS not supported');
    }
}
