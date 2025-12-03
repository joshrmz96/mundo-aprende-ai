// Test for error handling in API handlers
// Run with: node test/api-error-handling.test.js

const assert = require('assert');

// Mock request and response objects
function createMockReq(method, body) {
  return {
    method,
    body,
  };
}

function createMockRes() {
  const res = {
    statusCode: 200,
    responseBody: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.responseBody = body;
      return this;
    },
    end() {
      return this;
    }
  };
  return res;
}

async function run() {
  console.log('Starting API error handling tests...');

  // Store original fetch and env
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  // Clear provider env vars to ensure we're testing with mocked fetch
  delete process.env.TTS_PROVIDERS;
  delete process.env.TEXT_PROVIDERS;
  delete process.env.IMAGE_PROVIDERS;

  // Mock fetch to simulate failures
  global.fetch = async (url, opts) => {
    // All providers fail for this test
    return {
      ok: false,
      status: 500,
      text: async () => 'Simulated provider failure',
    };
  };

  // Clear require cache to get fresh modules
  Object.keys(require.cache).forEach(key => {
    if (key.includes('/api/') || key.includes('/adapters/') || key.includes('/lib/')) {
      delete require.cache[key];
    }
  });

  // Test 1: TTS handler returns descriptive error when all providers fail
  try {
    const ttsHandler = require('../api/tts');
    const req = createMockReq('POST', { text: 'test text' });
    const res = createMockRes();
    
    await ttsHandler(req, res);
    
    assert.strictEqual(res.statusCode, 502, 'Should return 502 status');
    assert.ok(res.responseBody.error, 'Response should have error message');
    assert.ok(res.responseBody.error.includes('Unable to generate audio'), 'Error should be descriptive');
    assert.strictEqual(res.responseBody.code, 'ALL_PROVIDERS_FAILED', 'Should have error code');
    assert.ok(Array.isArray(res.responseBody.attemptedProviders), 'Should list attempted providers');
    assert.ok(Array.isArray(res.responseBody.details), 'Should have error details');
    console.log('Test 1 passed: TTS handler returns descriptive error');
  } catch (err) {
    console.error('Test 1 failed:', err);
    process.exit(1);
  }

  // Test 2: Chat handler returns descriptive error when all providers fail
  try {
    // Clear cache again
    Object.keys(require.cache).forEach(key => {
      if (key.includes('/api/') || key.includes('/adapters/') || key.includes('/lib/')) {
        delete require.cache[key];
      }
    });
    
    const chatHandler = require('../api/chat');
    const req = createMockReq('POST', { prompt: 'test prompt' });
    const res = createMockRes();
    
    await chatHandler(req, res);
    
    assert.strictEqual(res.statusCode, 502, 'Should return 502 status');
    assert.ok(res.responseBody.error, 'Response should have error message');
    assert.ok(res.responseBody.error.includes('Unable to generate text'), 'Error should be descriptive');
    assert.strictEqual(res.responseBody.code, 'ALL_PROVIDERS_FAILED', 'Should have error code');
    console.log('Test 2 passed: Chat handler returns descriptive error');
  } catch (err) {
    console.error('Test 2 failed:', err);
    process.exit(1);
  }

  // Test 3: Image handler returns descriptive error when all providers fail
  try {
    // Clear cache again
    Object.keys(require.cache).forEach(key => {
      if (key.includes('/api/') || key.includes('/adapters/') || key.includes('/lib/')) {
        delete require.cache[key];
      }
    });
    
    const imageHandler = require('../api/image');
    const req = createMockReq('POST', { prompt: 'test prompt' });
    const res = createMockRes();
    
    await imageHandler(req, res);
    
    assert.strictEqual(res.statusCode, 502, 'Should return 502 status');
    assert.ok(res.responseBody.error, 'Response should have error message');
    assert.ok(res.responseBody.error.includes('Unable to generate image'), 'Error should be descriptive');
    assert.strictEqual(res.responseBody.code, 'ALL_PROVIDERS_FAILED', 'Should have error code');
    console.log('Test 3 passed: Image handler returns descriptive error');
  } catch (err) {
    console.error('Test 3 failed:', err);
    process.exit(1);
  }

  // Test 4: Handlers return proper error for missing required fields
  try {
    // Clear cache again
    Object.keys(require.cache).forEach(key => {
      if (key.includes('/api/') || key.includes('/adapters/') || key.includes('/lib/')) {
        delete require.cache[key];
      }
    });
    
    const ttsHandler = require('../api/tts');
    const req = createMockReq('POST', {}); // Missing 'text'
    const res = createMockRes();
    
    await ttsHandler(req, res);
    
    assert.strictEqual(res.statusCode, 400, 'Should return 400 status');
    assert.ok(res.responseBody.error.includes('Missing text'), 'Error should mention missing text');
    assert.strictEqual(res.responseBody.code, 'MISSING_TEXT', 'Should have error code');
    console.log('Test 4 passed: TTS handler returns proper error for missing text');
  } catch (err) {
    console.error('Test 4 failed:', err);
    process.exit(1);
  }

  // Test 5: Handlers return proper error for missing prompt
  try {
    // Clear cache again
    Object.keys(require.cache).forEach(key => {
      if (key.includes('/api/') || key.includes('/adapters/') || key.includes('/lib/')) {
        delete require.cache[key];
      }
    });
    
    const chatHandler = require('../api/chat');
    const req = createMockReq('POST', {}); // Missing 'prompt'
    const res = createMockRes();
    
    await chatHandler(req, res);
    
    assert.strictEqual(res.statusCode, 400, 'Should return 400 status');
    assert.ok(res.responseBody.error.includes('Missing prompt'), 'Error should mention missing prompt');
    assert.strictEqual(res.responseBody.code, 'MISSING_PROMPT', 'Should have error code');
    console.log('Test 5 passed: Chat handler returns proper error for missing prompt');
  } catch (err) {
    console.error('Test 5 failed:', err);
    process.exit(1);
  }

  // Restore original fetch and env
  global.fetch = originalFetch;
  Object.keys(process.env).forEach(key => {
    if (!originalEnv.hasOwnProperty(key)) {
      delete process.env[key];
    }
  });
  Object.assign(process.env, originalEnv);

  console.log('All API error handling tests passed.');
}

run();
