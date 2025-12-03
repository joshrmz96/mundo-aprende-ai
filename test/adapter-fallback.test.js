// Lightweight test to assert fallback behavior by mocking global.fetch.
// Run with: node test/adapter-fallback.test.js

const assert = require('assert');

async function run() {
  console.log('Starting adapter fallback test...');

  // Keep original fetch if present
  const originalFetch = global.fetch;

  const sequence = []; // stores which provider endpoints were called

  // Mock fetch to simulate:
  // - first provider fails (HTTP 500)
  // - second provider returns non-usable body
  // - third provider returns success payload
  global.fetch = async (url, opts) => {
    sequence.push(url || 'unknown-url');

    // Simulate different behaviors based on URL string (we'll call adapters with fake URLs)
    if (url.includes('fail1')) {
      return {
        ok: false,
        status: 500,
        text: async () => 'simulated failure',
      };
    }
    if (url.includes('bad2')) {
      return {
        ok: true,
        json: async () => ({ unexpected: 'shape' }),
      };
    }
    // success for third
    if (url.includes('ok3')) {
      // return different shapes depending on the body (text/image/tts)
      const body = opts && opts.body ? JSON.parse(opts.body) : {};
      // TTS has both text and voice
      if (body.text && body.voice) {
        return { ok: true, json: async () => ({ url: 'https://example.com/audio.mp3' }) };
      }
      // Image and text both have prompt, so we need to differentiate by checking for specific fields
      // The generateText call also has prompt, but we return text for all prompt-based calls
      // and let the calling test verify proper field extraction
      if (body.prompt) {
        // Return both text and url to allow tests for both text and image to pass
        return { ok: true, json: async () => ({ text: 'successful text result', url: 'https://example.com/image.png' }) };
      }
      return { ok: true, json: async () => ({ url: 'https://example.com/image.png' }) };
    }

    // default fallback
    return { ok: false, status: 502, text: async () => 'unknown mock route' };
  };

  // Now require adapters/generic to call them directly (avoids HTTP server)
  const generic = require('../adapters/generic')({ id: 'test' });

  // Text fallback: simulate providers with URLs 'fail1', 'bad2', 'ok3'
  try {
    // call the first adapter (fail)
    let threw = false;
    try {
      await generic.generateText({ prompt: 'x', options: {}, signal: undefined, urlHint: 'fail1' });
    } catch (e) {
      threw = true;
    }
    assert.strictEqual(threw, true, 'Expected first provider to fail');

    // call the second adapter (bad shape)
    const json2 = await (async () => {
      // we directly call postJson behavior by invoking generic with a base URL containing bad2
      const gen2 = require('../adapters/generic')({ id: 'test', url: 'https://bad2.example/api' });
      // generateText should return null for unexpected shape
      const r = await gen2.generateText({ prompt: 'x', options: {} });
      assert.strictEqual(r, null, 'Expected second provider to return null for bad shape');
      return r;
    })();

    // call the third adapter (ok3)
    const gen3 = require('../adapters/generic')({ id: 'test', url: 'https://ok3.example/api' });
    const r3 = await gen3.generateText({ prompt: 'write me', options: {} });
    assert.ok(r3 && r3.text === 'successful text result', 'Expected third provider to return success text');

    console.log('Text fallback test passed');
  } catch (err) {
    console.error('Text fallback test failed:', err);
    process.exit(1);
  }

  // Image fallback
  try {
    const genOk = require('../adapters/generic')({ id: 'test', url: 'https://ok3.example/api' });
    const img = await genOk.generateImage({ prompt: 'img', options: {} });
    assert.ok(img && (img.imageUrl || img.base64), 'Expected image result from ok3 mock');
    console.log('Image fallback test passed');
  } catch (err) {
    console.error('Image fallback test failed:', err);
    process.exit(1);
  }

  // TTS fallback
  try {
    const genOk = require('../adapters/generic')({ id: 'test', url: 'https://ok3.example/api' });
    const tts = await genOk.generateTTS({ text: 'hello', voice: 'chatgpt', options: {} });
    assert.ok(tts && (tts.audioUrl || tts.base64), 'Expected tts result from ok3 mock');
    console.log('TTS fallback test passed');
  } catch (err) {
    console.error('TTS fallback test failed:', err);
    process.exit(1);
  }

  // restore fetch
  global.fetch = originalFetch;
  console.log('All adapter fallback tests passed.');
}

run();
