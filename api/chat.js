import { executeWithFallback } from './adapters/index.js';

export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const { messages, system } = await req.json();

        // Use adapter system with deterministic fallback order
        // Order: Gemini (primary) → OpenAI (secondary) → Grok (tertiary)
        const result = await executeWithFallback('text', 'generateText', {
            prompt: messages?.[messages.length - 1]?.content || '',
            options: {
                messages,
                system
            }
        });

        return new Response(JSON.stringify({ 
            result: result.text,
            provider: result.provider 
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('[Chat API Error]', error.message);
        return new Response(JSON.stringify({ 
            error: error.message || 'All AIs failed' 
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
