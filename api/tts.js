import { createTTSAdapters, executeWithFallback } from './adapters/index.js';

export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

    try {
        const { text, lang } = await req.json();

        // Create TTS adapters with deterministic fallback order:
        // OpenAI (primary) → Murf (audio fallback)
        const adapters = createTTSAdapters();

        try {
            const { result, providerId } = await executeWithFallback(
                adapters,
                (adapter) => adapter.generateTTS({ text, lang })
            );

            return new Response(result, {
                headers: { 
                    'Content-Type': 'audio/mpeg',
                    'X-Provider-Id': providerId
                }
            });
        } catch (error) {
            // Si falla, devolvemos 500 para que el frontend use la voz nativa del navegador
            return new Response(JSON.stringify({ error: "TTS API Failed", details: error.message }), { status: 500 });
        }

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
