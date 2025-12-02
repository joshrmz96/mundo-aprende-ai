export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    const { searchParams } = new URL(req.url);
    const prompt = searchParams.get('prompt');

    if (!prompt) return new Response('Missing prompt', { status: 400 });

    // Construimos la URL de Pollinations
    const encodedPrompt = encodeURIComponent(prompt);
    const imageUrl = `https://image.pollinations.ai/prompt/illustration%20of%20${encodedPrompt}%20vector%20flat%20colorful?width=600&height=400&nologo=true`;

    // Redirigimos al navegador directamente a la imagen generada
    // Esto es mucho más rápido que descargarla en el servidor y volverla a enviar
    return Response.redirect(imageUrl, 302);
}
