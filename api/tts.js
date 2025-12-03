export const config = {
    runtime: 'edge',
};

// Import adapters (using dynamic import for edge compatibility)
const getAdapters = async () => {
    const openai = await import('./adapters/openai.js');
    const murf = await import('./adapters/murf.js');
    return { 
        openai: openai.default || openai, 
        murf: murf.default || murf 
    };
};

// Default fallback order for TTS
const DEFAULT_TTS_ORDER = ['openai', 'murf'];

// Get provider order from environment or use default
function getTTSProviderOrder() {
    const envValue = typeof process !== 'undefined' && process.env?.PROVIDER_TTS_ORDER;
    if (envValue && typeof envValue === 'string') {
        return envValue.split(',').map(id => id.trim()).filter(Boolean);
    }
    return DEFAULT_TTS_ORDER;
}

export default async function handler(req) {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

    try {
        const { text, lang, voice } = await req.json();
        
        if (!text) {
            return new Response(JSON.stringify({ error: 'Missing text parameter' }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const adapters = await getAdapters();
        const providerOrder = getTTSProviderOrder();
        
        const errors = [];
        
        // Try each provider in deterministic order
        for (const providerId of providerOrder) {
            const adapter = adapters[providerId];
            
            if (!adapter) {
                errors.push({ provider: providerId, error: 'Adapter not found' });
                continue;
            }

            try {
                const audioBlob = await adapter.generateTTS({
                    text,
                    voice: voice || 'nova',
                    options: {
                        timeout: 30000
                    }
                });
                
                if (audioBlob === null) {
                    errors.push({ provider: providerId, error: 'Provider returned null' });
                    continue;
                }
                
                return new Response(audioBlob, {
                    headers: { 'Content-Type': 'audio/mpeg' }
                });
            } catch (error) {
                errors.push({ provider: providerId, error: error.message });
                // Continue to next provider
            }
        }
        
        // All providers failed - return 500 so frontend can use native browser TTS
        const errorMessages = errors.map(e => `${e.provider}: ${e.error}`).join('; ');
        return new Response(JSON.stringify({ 
            error: 'TTS API Failed', 
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
