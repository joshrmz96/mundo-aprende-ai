'use strict';

const { generateSpeech } = require('./adapters');

module.exports.config = {
  runtime: 'edge'
};

module.exports = async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { text, lang } = await req.json();

    const result = await generateSpeech({ text, lang });

    // If we have base64, convert to binary and return as audio
    if (result.base64) {
      const audioBuffer = Buffer.from(result.base64, 'base64');
      return new Response(audioBuffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'X-Provider': result.provider
        }
      });
    }

    // If we have a URL, redirect to it
    if (result.audioUrl) {
      return Response.redirect(result.audioUrl, 302);
    }

    throw new Error('No audio data returned');
  } catch (error) {
    console.warn('[tts] All providers failed:', error.message);
    return new Response(JSON.stringify({ error: 'TTS API Failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
