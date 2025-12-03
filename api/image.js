import { createImageAdapters, executeWithFallback } from './adapters/index.js';

export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    const { searchParams } = new URL(req.url);
    const prompt = searchParams.get('prompt');

    if (!prompt) return new Response('Missing prompt', { status: 400 });

    // Create image adapters with deterministic fallback order
    // OpenAI DALL-E is primary, falls back to Pollinations (free)
    const adapters = createImageAdapters();

    try {
        const { result, providerId } = await executeWithFallback(
            adapters,
            (adapter) => adapter.generateImage({ prompt })
        );

        // Redirect to the generated image URL
        return Response.redirect(result, 302);
    } catch (error) {
        // Fallback to Pollinations (free, no API key needed)
        const encodedPrompt = encodeURIComponent(prompt);
        const imageUrl = `https://image.pollinations.ai/prompt/illustration%20of%20${encodedPrompt}%20vector%20flat%20colorful?width=600&height=400&nologo=true`;
        return Response.redirect(imageUrl, 302);
    }
}
