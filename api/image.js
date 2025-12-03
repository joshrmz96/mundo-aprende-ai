export const config = {
    runtime: 'edge',
};

// Import adapters (using dynamic import for edge compatibility)
const getAdapters = async () => {
    const openai = await import('./adapters/openai.js');
    const pollinations = await import('./adapters/pollinations.js');
    return { 
        openai: openai.default || openai, 
        pollinations: pollinations.default || pollinations 
    };
};

// Default fallback order for image generation
const DEFAULT_IMAGE_ORDER = ['openai', 'pollinations'];

// Get provider order from environment or use default
function getImageProviderOrder() {
    const envValue = typeof process !== 'undefined' && process.env?.PROVIDER_IMAGE_ORDER;
    if (envValue && typeof envValue === 'string') {
        return envValue.split(',').map(id => id.trim()).filter(Boolean);
    }
    return DEFAULT_IMAGE_ORDER;
}

export default async function handler(req) {
    const { searchParams } = new URL(req.url);
    const prompt = searchParams.get('prompt');

    if (!prompt) return new Response('Missing prompt', { status: 400 });

    try {
        const adapters = await getAdapters();
        const providerOrder = getImageProviderOrder();
        
        const errors = [];
        
        // Try each provider in deterministic order
        for (const providerId of providerOrder) {
            const adapter = adapters[providerId];
            
            if (!adapter) {
                errors.push({ provider: providerId, error: 'Adapter not found' });
                continue;
            }

            try {
                const imageUrl = await adapter.generateImage({
                    prompt,
                    options: {
                        width: 600,
                        height: 400,
                        style: 'illustration of',
                        timeout: 60000
                    }
                });
                
                if (imageUrl === null) {
                    errors.push({ provider: providerId, error: 'Provider returned null' });
                    continue;
                }
                
                // For Pollinations, redirect directly to the image URL
                // For other providers (like OpenAI), also redirect to the generated URL
                return Response.redirect(imageUrl, 302);
            } catch (error) {
                errors.push({ provider: providerId, error: error.message });
                // Continue to next provider
            }
        }
        
        // All providers failed - return error
        const errorMessages = errors.map(e => `${e.provider}: ${e.error}`).join('; ');
        return new Response(JSON.stringify({ 
            error: 'All image providers failed', 
            details: errorMessages 
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
