import { executeWithFallback, getAdaptersForType } from './adapters/index.js';

export const config = {
    runtime: 'edge',
};

// Fallback to Pollinations.ai for free image generation
const POLLINATIONS_BASE = 'https://image.pollinations.ai/prompt';

async function generatePollinationsImage(prompt) {
    const encodedPrompt = encodeURIComponent(`illustration of ${prompt} vector flat colorful`);
    const imageUrl = `${POLLINATIONS_BASE}/${encodedPrompt}?width=600&height=400&nologo=true`;
    return { imageUrl, base64: null, provider: 'pollinations' };
}

export default async function handler(req) {
    const { searchParams } = new URL(req.url);
    const prompt = searchParams.get('prompt');

    if (!prompt) {
        return new Response('Missing prompt', { status: 400 });
    }

    try {
        // Check if any image providers are configured
        const providers = getAdaptersForType('image');
        
        if (providers.length > 0) {
            // Try configured providers with fallback
            try {
                const result = await executeWithFallback('image', 'generateImage', {
                    prompt,
                    options: {
                        size: '1024x1024'
                    }
                });

                // If we got base64 data, return it directly
                if (result.base64) {
                    // Convert base64 to binary using Edge Runtime compatible method
                    const binaryString = atob(result.base64);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    return new Response(bytes, {
                        headers: { 
                            'Content-Type': 'image/png',
                            'X-Provider': result.provider
                        }
                    });
                }

                // If we got a URL, redirect to it
                if (result.imageUrl) {
                    return Response.redirect(result.imageUrl, 302);
                }
            } catch (error) {
                console.error('[Image API] Configured providers failed, falling back to Pollinations:', error.message);
            }
        }

        // Fallback to Pollinations (free, no API key required)
        const fallbackResult = await generatePollinationsImage(prompt);
        return Response.redirect(fallbackResult.imageUrl, 302);

    } catch (error) {
        console.error('[Image API Error]', error.message);
        return new Response(JSON.stringify({ 
            error: error.message || 'Image generation failed' 
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
