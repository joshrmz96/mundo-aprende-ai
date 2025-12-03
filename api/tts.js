const { getAdapter } = require('../adapters/index');
const { logValidationWarnings } = require('../lib/envValidator');

const TIMEOUT_MS = parseInt(process.env.TIMEOUT_MS || '15000', 10);
const DEFAULT_VOICE = process.env.DEFAULT_TTS_VOICE || 'chatgpt'; // user requested chatgpt as default

// Validate environment variables on module load
logValidationWarnings(process.env.NODE_ENV === 'development');

function createTimeoutController(timeoutMs) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, clear: () => clearTimeout(id) };
}

function parseProvidersEnv(envVar, fallbackUrlName) {
  const list = process.env[envVar];
  if (list && list.trim()) return list.split(',').map(s => s.trim()).filter(Boolean);
  if (process.env[fallbackUrlName]) return ['primary'];
  return [];
}

function buildAdapters(providerIds) {
  return providerIds.map(id => {
    if (id === 'primary') {
      const cfg = {
        id: 'primary',
        url: process.env.PRIMARY_TTS_API_URL || process.env.PRIMARY_TTS_API_ENDPOINT || '',
        key: process.env.PRIMARY_TTS_API_KEY || '',
      };
      return getAdapter(cfg.id) || require('../adapters/generic')(cfg);
    }
    const adapter = getAdapter(id);
    if (!adapter) {
      const cfg = {
        id,
        url: process.env[`PROVIDER_${id.toUpperCase()}_API_URL`] || '',
        key: process.env[`PROVIDER_${id.toUpperCase()}_API_KEY`] || '',
      };
      return require('../adapters/generic')(cfg);
    }
    return adapter;
  });
}

/**
 * Formats error details for logging
 * @param {Error} err - The error object
 * @param {string} adapterId - The adapter identifier
 * @returns {Object} Formatted error details
 */
function formatErrorDetails(err, adapterId) {
  const isTimeout = err && (err.name === 'AbortError' || err.message?.includes('aborted'));
  const isNetworkError = err && (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT');
  
  return {
    adapterId,
    errorType: isTimeout ? 'timeout' : isNetworkError ? 'network' : 'api',
    message: err?.message || String(err),
    code: err?.code || null,
    status: err?.status || null,
    timestamp: new Date().toISOString(),
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { text, voice, options } = req.body || {};
  if (!text) return res.status(400).json({ error: 'Missing text', code: 'MISSING_TEXT' });

  const providerIds = parseProvidersEnv('TTS_PROVIDERS', 'PRIMARY_TTS_API_URL');
  // default order; Murf will be tried as specified via TTS_PROVIDERS or AUDIO_FALLBACK_PROVIDER
  const ids = providerIds.length ? providerIds : ['openai', 'gemini', 'grok'];

  // If an explicit audio fallback provider is configured, put it at the end if not already present
  const audioFallback = process.env.AUDIO_FALLBACK_PROVIDER || 'murf';
  if (!ids.includes(audioFallback)) ids.push(audioFallback);

  const adapters = buildAdapters(ids);
  const errors = []; // Collect all errors for detailed response

  for (const adapter of adapters) {
    if (!adapter || !adapter.generateTTS) continue;
    const adapterId = adapter.providerId || adapter.provider || 'unknown';
    const { controller, clear } = createTimeoutController(TIMEOUT_MS);
    try {
      console.log(`[TTS] Attempting provider: ${adapterId}`);
      const result = await adapter.generateTTS({ text, voice: voice || DEFAULT_VOICE, options, signal: controller.signal });
      clear();
      if (result && (result.audioUrl || result.base64)) {
        console.log(`[TTS] Success with provider: ${adapterId}`);
        return res.status(200).json({ audioUrl: result.audioUrl, base64: result.base64, provider: adapterId });
      }
      // Result was empty/null - log and continue
      console.warn(`[TTS] Provider ${adapterId} returned empty result`);
      errors.push({ provider: adapterId, error: 'Empty result returned', errorType: 'empty_response' });
    } catch (err) {
      clear();
      const errorDetails = formatErrorDetails(err, adapterId);
      console.error(`[TTS] Provider ${adapterId} failed:`, JSON.stringify(errorDetails));
      errors.push({ provider: adapterId, error: errorDetails.message, errorType: errorDetails.errorType });
    }
  }

  // Return detailed error response
  console.error(`[TTS] All providers failed. Attempted: ${ids.join(', ')}`);
  return res.status(502).json({
    error: 'Unable to generate audio. All TTS providers failed.',
    code: 'ALL_PROVIDERS_FAILED',
    attemptedProviders: ids,
    details: errors,
  });
};
