export const config = {
    runtime: 'edge', // Hace que sea ultra rápido
};

// Import adapters (using dynamic import for edge compatibility)
const getAdapters = async () => {
    const gemini = await import('./adapters/gemini.js');
    const openai = await import('./adapters/openai.js');
    const grok = await import('./adapters/grok.js');
    return { gemini: gemini.default || gemini, openai: openai.default || openai, grok: grok.default || grok };
};

// Default fallback order for text generation
const DEFAULT_TEXT_ORDER = ['gemini', 'openai', 'grok'];

// Get provider order from environment or use default
function getTextProviderOrder() {
    const envValue = typeof process !== 'undefined' && process.env?.PROVIDER_TEXT_ORDER;
    if (envValue && typeof envValue === 'string') {
        return envValue.split(',').map(id => id.trim()).filter(Boolean);
    }
    return DEFAULT_TEXT_ORDER;
}

export default async function handler(req) {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

    try {
        const { messages, system } = await req.json();
        const adapters = await getAdapters();
        const providerOrder = getTextProviderOrder();
        
        const errors = [];
        
        // Try each provider in deterministic order
        for (const providerId of providerOrder) {
            const adapter = adapters[providerId];
            
            if (!adapter) {
                errors.push({ provider: providerId, error: 'Adapter not found' });
                continue;
            }

            try {
                const result = await adapter.generateText({
                    prompt: messages[messages.length - 1]?.content || '',
                    options: {
                        system,
                        messages,
                        jsonMode: true,
                        timeout: 30000
                    }
                });
                
                if (result === null) {
                    errors.push({ provider: providerId, error: 'Provider returned null' });
                    continue;
                }
                
                return new Response(JSON.stringify({ result }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (error) {
                errors.push({ provider: providerId, error: error.message });
                // Continue to next provider
            }
        }
        
        // All providers failed
        const errorMessages = errors.map(e => `${e.provider}: ${e.error}`).join('; ');
        return new Response(JSON.stringify({ 
            error: 'All AIs failed', 
            details: errorMessages 
        }), { status: 500 });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
