'use strict';

const assert = require('assert');
const { describe, it, beforeEach, afterEach } = require('node:test');

// Save original env
const originalEnv = { ...process.env };

// Helper to create a mock fetch function
function createMockFetch(providerBehavior) {
  return async function mockFetch(url, options) {
    // Determine which provider is being called based on URL
    let provider = null;
    if (url.includes('generativelanguage.googleapis.com')) {
      provider = 'gemini';
    } else if (url.includes('api.openai.com')) {
      if (url.includes('images')) provider = 'openai-image';
      else if (url.includes('audio')) provider = 'openai-tts';
      else provider = 'openai';
    } else if (url.includes('api.x.ai')) {
      provider = 'grok';
    } else if (url.includes('murf.ai')) {
      provider = 'murf';
    } else if (url.includes('pollinations.ai')) {
      provider = 'pollinations';
    }

    const behavior = providerBehavior[provider];
    if (!behavior) {
      throw new Error(`Unknown provider for URL: ${url}`);
    }

    if (behavior.shouldFail) {
      throw new Error(behavior.error || `${provider} failed`);
    }

    return {
      ok: true,
      json: async () => behavior.response,
      arrayBuffer: async () => {
        const base64 = behavior.response?.base64 || 'dGVzdCBhdWRpbw==';
        return Buffer.from(base64, 'base64').buffer;
      }
    };
  };
}

describe('Adapter Fallback Tests', () => {
  beforeEach(() => {
    // Reset environment variables
    process.env = { ...originalEnv };
    // Set up test API keys
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.XAI_API_KEY = 'test-xai-key';
    process.env.MURF_API_KEY = 'test-murf-key';
    process.env.TIMEOUT_MS = '5000';
  });

  afterEach(() => {
    // Restore original environment properly
    Object.keys(process.env).forEach((key) => {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    });
    Object.assign(process.env, originalEnv);
    // Clear module cache to reset adapters
    delete require.cache[require.resolve('../api/adapters/index')];
    delete require.cache[require.resolve('../api/adapters/gemini')];
    delete require.cache[require.resolve('../api/adapters/openai')];
    delete require.cache[require.resolve('../api/adapters/grok')];
    delete require.cache[require.resolve('../api/adapters/murf')];
    delete require.cache[require.resolve('../api/adapters/pollinations')];
  });

  describe('Text Generation Fallback', () => {
    it('should try gemini, then openai, then grok when first two fail', async () => {
      const { generateText } = require('../api/adapters');

      const mockFetch = createMockFetch({
        gemini: { shouldFail: true, error: 'Gemini rate limit' },
        openai: { shouldFail: true, error: 'OpenAI server error' },
        grok: {
          shouldFail: false,
          response: {
            choices: [{ message: { content: '{"result": "success from grok"}' } }]
          }
        }
      });

      const result = await generateText({
        messages: [{ role: 'user', content: 'test' }],
        system: 'test system',
        fetchFn: mockFetch
      });

      assert.strictEqual(result.provider, 'grok');
      assert.ok(result.text.includes('success from grok'));
    });

    it('should return result from first successful provider', async () => {
      const { generateText } = require('../api/adapters');

      const mockFetch = createMockFetch({
        gemini: {
          shouldFail: false,
          response: {
            candidates: [{ content: { parts: [{ text: '{"result": "gemini first"}' }] } }]
          }
        },
        openai: { shouldFail: true },
        grok: { shouldFail: true }
      });

      const result = await generateText({
        messages: [{ role: 'user', content: 'test' }],
        system: 'test system',
        fetchFn: mockFetch
      });

      assert.strictEqual(result.provider, 'gemini');
    });

    it('should throw error when all text providers fail', async () => {
      const { generateText } = require('../api/adapters');

      const mockFetch = createMockFetch({
        gemini: { shouldFail: true },
        openai: { shouldFail: true },
        grok: { shouldFail: true }
      });

      await assert.rejects(
        async () => {
          await generateText({
            messages: [{ role: 'user', content: 'test' }],
            system: 'test system',
            fetchFn: mockFetch
          });
        },
        /All providers failed/
      );
    });

    it('should respect custom TEXT_PROVIDERS order', async () => {
      process.env.TEXT_PROVIDERS = 'grok,gemini,openai';

      // Need to reload the module to pick up new env
      delete require.cache[require.resolve('../api/adapters/index')];
      const { generateText, getTextProviders } = require('../api/adapters');

      const providers = getTextProviders();
      assert.deepStrictEqual(providers, ['grok', 'gemini', 'openai']);

      const callOrder = [];
      const mockFetch = async (url) => {
        if (url.includes('x.ai')) callOrder.push('grok');
        if (url.includes('googleapis')) callOrder.push('gemini');
        if (url.includes('openai')) callOrder.push('openai');

        if (url.includes('googleapis')) {
          return {
            ok: true,
            json: async () => ({
              candidates: [{ content: { parts: [{ text: '{"result": "gemini"}' }] } }]
            })
          };
        }
        throw new Error('Failed');
      };

      const result = await generateText({
        messages: [{ role: 'user', content: 'test' }],
        system: 'test',
        fetchFn: mockFetch
      });

      // Grok should be called first, then gemini (which succeeds)
      assert.strictEqual(callOrder[0], 'grok');
      assert.strictEqual(callOrder[1], 'gemini');
      assert.strictEqual(result.provider, 'gemini');
    });

    it('should support PRIMARY_TEXT_PROVIDER backwards compatibility', async () => {
      process.env.PRIMARY_TEXT_PROVIDER = 'openai';

      delete require.cache[require.resolve('../api/adapters/index')];
      const { getTextProviders } = require('../api/adapters');

      const providers = getTextProviders();
      assert.strictEqual(providers[0], 'openai');
    });
  });

  describe('Image Generation Fallback', () => {
    it('should try pollinations, then openai when first fails', async () => {
      const { generateImage } = require('../api/adapters');

      const mockFetch = createMockFetch({
        pollinations: { shouldFail: true, error: 'Pollinations timeout' },
        'openai-image': {
          shouldFail: false,
          response: {
            data: [{ b64_json: 'aW1hZ2VkYXRh' }]
          }
        }
      });

      const result = await generateImage({
        prompt: 'test image',
        fetchFn: mockFetch
      });

      assert.strictEqual(result.provider, 'openai');
      assert.strictEqual(result.base64, 'aW1hZ2VkYXRh');
    });

    it('should return imageUrl from pollinations when successful', async () => {
      const { generateImage } = require('../api/adapters');

      const mockFetch = createMockFetch({
        pollinations: {
          shouldFail: false,
          response: {} // HEAD request doesn't need response body
        }
      });

      const result = await generateImage({
        prompt: 'test image',
        fetchFn: mockFetch
      });

      assert.strictEqual(result.provider, 'pollinations');
      assert.ok(result.imageUrl.includes('pollinations.ai'));
    });
  });

  describe('TTS Generation Fallback', () => {
    it('should try openai, then murf when first fails', async () => {
      const { generateSpeech } = require('../api/adapters');

      const mockFetch = createMockFetch({
        'openai-tts': { shouldFail: true, error: 'OpenAI TTS quota exceeded' },
        murf: {
          shouldFail: false,
          response: {
            audioFile: 'https://murf.ai/audio/123.mp3',
            encodedAudio: null
          }
        }
      });

      const result = await generateSpeech({
        text: 'test speech',
        fetchFn: mockFetch
      });

      assert.strictEqual(result.provider, 'murf');
      assert.strictEqual(result.audioUrl, 'https://murf.ai/audio/123.mp3');
    });

    it('should return base64 audio from openai when successful', async () => {
      const { generateSpeech } = require('../api/adapters');

      const mockFetch = createMockFetch({
        'openai-tts': {
          shouldFail: false,
          response: { base64: 'dGVzdCBhdWRpbw==' }
        }
      });

      const result = await generateSpeech({
        text: 'test speech',
        fetchFn: mockFetch
      });

      assert.strictEqual(result.provider, 'openai');
      assert.ok(result.base64);
    });

    it('should fail gracefully when all TTS providers fail', async () => {
      const { generateSpeech } = require('../api/adapters');

      const mockFetch = createMockFetch({
        'openai-tts': { shouldFail: true },
        murf: { shouldFail: true }
      });

      await assert.rejects(
        async () => {
          await generateSpeech({
            text: 'test speech',
            fetchFn: mockFetch
          });
        },
        /All providers failed/
      );
    });

    it('should support PRIMARY_TTS_PROVIDER backwards compatibility', async () => {
      process.env.PRIMARY_TTS_PROVIDER = 'murf';

      delete require.cache[require.resolve('../api/adapters/index')];
      const { getTtsProviders } = require('../api/adapters');

      const providers = getTtsProviders();
      assert.strictEqual(providers[0], 'murf');
    });
  });

  describe('Timeout Configuration', () => {
    it('should use TIMEOUT_MS environment variable', async () => {
      process.env.TIMEOUT_MS = '10000';

      delete require.cache[require.resolve('../api/adapters/index')];
      const { getTimeoutMs } = require('../api/adapters');

      assert.strictEqual(getTimeoutMs(), 10000);
    });

    it('should use default timeout when TIMEOUT_MS is not set', async () => {
      delete process.env.TIMEOUT_MS;

      delete require.cache[require.resolve('../api/adapters/index')];
      const { getTimeoutMs } = require('../api/adapters');

      assert.strictEqual(getTimeoutMs(), 30000);
    });
  });

  describe('Provider Response Normalization', () => {
    it('should normalize text response with provider id', async () => {
      const { generateText } = require('../api/adapters');

      const mockFetch = createMockFetch({
        gemini: {
          shouldFail: false,
          response: {
            candidates: [{ content: { parts: [{ text: '{"test": true}' }] } }]
          }
        }
      });

      const result = await generateText({
        messages: [{ role: 'user', content: 'test' }],
        system: 'test',
        fetchFn: mockFetch
      });

      assert.ok(result.text);
      assert.strictEqual(result.provider, 'gemini');
    });

    it('should normalize image response with provider id', async () => {
      const { generateImage } = require('../api/adapters');

      const mockFetch = createMockFetch({
        pollinations: { shouldFail: false, response: {} }
      });

      const result = await generateImage({
        prompt: 'test',
        fetchFn: mockFetch
      });

      assert.ok(result.imageUrl || result.base64);
      assert.strictEqual(result.provider, 'pollinations');
    });

    it('should normalize TTS response with provider id', async () => {
      const { generateSpeech } = require('../api/adapters');

      const mockFetch = createMockFetch({
        'openai-tts': { shouldFail: false, response: {} }
      });

      const result = await generateSpeech({
        text: 'test',
        fetchFn: mockFetch
      });

      assert.ok(result.audioUrl !== undefined || result.base64 !== undefined);
      assert.strictEqual(result.provider, 'openai');
    });
  });
});
