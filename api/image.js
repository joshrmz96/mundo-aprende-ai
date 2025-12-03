import { createImageAdapters, executeWithFallback } from './adapters/index.js';

export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    const { searchParams } = new URL(req.url);
    const prompt = searchParams.get('prompt');

    if (!prompt) return new Response('Missing prompt', { status: 400 });

    // Create image adapters with deterministic fallback order
    // OpenAI DALL-E (primary) → Pollinations (fallback, free)
    const adapters = createImageAdapters();

    try {
        const { result, providerId } = await executeWithFallback(
            adapters,
            (adapter) => adapter.generateImage({ prompt })
        );

        // Redirect to the generated image URL
        return Response.redirect(result, 302);
    } catch (error) {
        // All providers failed
        return new Response(JSON.stringify({ error: "Image generation failed", details: error.message }), { status: 500 });
    }
}
