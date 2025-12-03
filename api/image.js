'use strict';

const { generateImage } = require('./adapters');

module.exports.config = {
  runtime: 'edge'
};

module.exports = async function handler(req) {
  const { searchParams } = new URL(req.url);
  const prompt = searchParams.get('prompt');

  if (!prompt) {
    return new Response('Missing prompt', { status: 400 });
  }

  try {
    const result = await generateImage({ prompt });

    // If we have a URL, redirect to it (faster for client)
    if (result.imageUrl) {
      return Response.redirect(result.imageUrl, 302);
    }

    // If we have base64, return it as JSON
    if (result.base64) {
      return new Response(
        JSON.stringify({
          base64: result.base64,
          provider: result.provider
        }),
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    throw new Error('No image data returned');
  } catch (error) {
    console.warn('[image] All providers failed:', error.message);
    return new Response(JSON.stringify({ error: 'Image generation failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
