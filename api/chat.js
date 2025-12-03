import { createTextAdapters, executeWithFallback } from './adapters/index.js';

export const config = {
    runtime: 'edge', // Hace que sea ultra rápido
};

export default async function handler(req) {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

    try {
        const { messages, system } = await req.json();
        
        // Create text adapters with deterministic fallback order:
        // Gemini (primary) → OpenAI (secondary) → Grok (tertiary)
        const adapters = createTextAdapters();

        try {
            const { result, providerId } = await executeWithFallback(
                adapters,
                (adapter) => adapter.generateText({ messages, system })
            );
            
            return new Response(JSON.stringify({ result, providerId }), {
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            // Si todas fallan, devolvemos error controlado
            return new Response(JSON.stringify({ error: "All AIs failed", details: error.message }), { status: 500 });
        }

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
