export const config = {
    runtime: 'edge', // Hace que sea ultra rápido
};

export default async function handler(req) {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

    try {
        const { messages, system } = await req.json();
        
        // Definir las claves desde el entorno seguro
        const GEMINI_KEY = process.env.GEMINI_API_KEY;
        const OPENAI_KEY = process.env.OPENAI_API_KEY;
        const XAI_KEY = process.env.XAI_API_KEY;

        // Función helper para limpiar JSON
        const cleanJSON = (text) => {
            if (!text) return "{}";
            let clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
            const start = clean.indexOf('{');
            const end = clean.lastIndexOf('}');
            if (start !== -1 && end !== -1) return clean.substring(start, end + 1);
            return clean;
        };

        // 1. LLAMADA A GEMINI (Google)
        const callGemini = async () => {
            if (!GEMINI_KEY) throw new Error("No Gemini Key");
            // Convertir formato de mensajes
            const contents = messages.map(m => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.content }]
            }));
            
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: contents,
                    systemInstruction: { parts: [{ text: system }] },
                    generationConfig: { responseMimeType: "application/json" }
                })
            });
            if (!response.ok) throw new Error('Gemini Failed');
            const data = await response.json();
            return cleanJSON(data.candidates[0].content.parts[0].text);
        };

        // 2. LLAMADA A OPENAI (ChatGPT)
        const callOpenAI = async () => {
            if (!OPENAI_KEY) throw new Error("No OpenAI Key");
            const msgs = [{ role: "system", content: system }, ...messages];
            
            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_KEY}`
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: msgs,
                    response_format: { type: "json_object" }
                })
            });
            if (!response.ok) throw new Error('OpenAI Failed');
            const data = await response.json();
            return data.choices[0].message.content;
        };

        // 3. LLAMADA A GROK (xAI)
        const callGrok = async () => {
            if (!XAI_KEY) throw new Error("No Grok Key");
            const msgs = [{ role: "system", content: system }, ...messages];
            
            const response = await fetch("https://api.x.ai/v1/chat/completions", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${XAI_KEY}`
                },
                body: JSON.stringify({
                    model: "grok-beta",
                    messages: msgs
                })
            });
            if (!response.ok) throw new Error('Grok Failed');
            const data = await response.json();
            return cleanJSON(data.choices[0].message.content);
        };

        // INICIAR LA CARRERA (RACE)
        // Intentamos obtener la respuesta más rápida
        try {
            const result = await Promise.any([callGemini(), callOpenAI(), callGrok()]);
            return new Response(JSON.stringify({ result }), {
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            // Si todas fallan, devolvemos error controlado
            return new Response(JSON.stringify({ error: "All AIs failed" }), { status: 500 });
        }

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
