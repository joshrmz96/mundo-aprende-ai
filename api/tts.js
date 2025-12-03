import { executeWithFallback } from './adapters/index.js';

export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const { text, lang, voice } = await req.json();

        if (!text) {
            return new Response(JSON.stringify({ error: 'Missing text parameter' }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Use adapter system with deterministic fallback order
        // Order: OpenAI (primary) → Gemini (secondary) → Murf (tertiary)
        const result = await executeWithFallback('tts', 'generateTTS', {
            text,
            voice: voice || 'nova',
            options: {
                lang: lang || 'en-US'
            }
        });

        // Handle different response types from providers
        if (result.blob) {
            // OpenAI returns a blob directly
            return new Response(result.blob, {
                headers: { 
                    'Content-Type': 'audio/mpeg',
                    'X-Provider': result.provider
                }
            });
        }

        if (result.base64) {
            // Convert base64 to binary using Edge Runtime compatible method
            // Note: Using atob() as Buffer is not available in Edge Runtime
            const binaryString = atob(result.base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            return new Response(bytes, {
                headers: { 
                    'Content-Type': 'audio/mpeg',
                    'X-Provider': result.provider
                }
            });
        }

        if (result.audioUrl) {
            // Redirect to audio URL
            return Response.redirect(result.audioUrl, 302);
        }

        throw new Error('No audio data received from provider');

    } catch (error) {
        console.error('[TTS API Error]', error.message);
        // Return 500 so frontend can fallback to browser native speech
        return new Response(JSON.stringify({ 
            error: error.message || 'TTS API Failed' 
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
