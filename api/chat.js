'use strict';

const { generateText } = require('./adapters');

module.exports.config = {
  runtime: 'edge'
};

module.exports = async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { messages, system } = await req.json();

    const result = await generateText({
      messages,
      system
    });

    return new Response(
      JSON.stringify({
        result: result.text,
        provider: result.provider
      }),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.warn('[chat] All providers failed:', error.message);
    return new Response(JSON.stringify({ error: 'All AIs failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
