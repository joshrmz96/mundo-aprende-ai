export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

    try {
        const { text, lang } = await req.json();
        const GEMINI_KEY = process.env.GEMINI_API_KEY;
        const OPENAI_KEY = process.env.OPENAI_API_KEY;
        const MURF_KEY = process.env.MURF_API_KEY;

        // 1. OPENAI TTS (Balance perfecto Calidad/Velocidad)
        const callOpenAI = async () => {
            if (!OPENAI_KEY) throw new Error("No Key");
            const response = await fetch("https://api.openai.com/v1/audio/speech", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_KEY}`
                },
                body: JSON.stringify({
                    model: "tts-1",
                    input: text,
                    voice: "nova"
                })
            });
            if (!response.ok) throw new Error("OpenAI Failed");
            return response.blob(); // Devolvemos el archivo de audio
        };

        // 2. GEMINI TTS (Respaldo)
        const callGemini = async () => {
            if (!GEMINI_KEY) throw new Error("No Key");
            // Nota: Gemini devuelve base64, hay que convertirlo si queremos mantener consistencia, 
            // pero para simplicidad en edge, OpenAI es preferible como principal.
            // Si OpenAI falla, el frontend usará voz nativa como último recurso.
            throw new Error("Gemini Fallback not implemented in Edge for binary consistency, skipping to native.");
        };

        // Intentar OpenAI primero
        try {
            const audioBlob = await callOpenAI();
            return new Response(audioBlob, {
                headers: { 'Content-Type': 'audio/mpeg' }
            });
        } catch (e) {
            // Si falla, devolvemos 500 para que el frontend use la voz nativa del navegador
            return new Response(JSON.stringify({ error: "TTS API Failed" }), { status: 500 });
        }

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
