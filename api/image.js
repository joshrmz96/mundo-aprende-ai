const { getAdapter } = require('../adapters/index');
const { logValidationWarnings } = require('../lib/envValidator');
const { formatErrorDetails } = require('../lib/errorUtils');

const TIMEOUT_MS = parseInt(process.env.TIMEOUT_MS || '15000', 10);

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
        url: process.env.PRIMARY_IMAGE_API_URL || process.env.PRIMARY_IMAGE_API_ENDPOINT || '',
        key: process.env.PRIMARY_IMAGE_API_KEY || '',
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

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { prompt, options } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'Missing prompt', code: 'MISSING_PROMPT' });

  const providerIds = parseProvidersEnv('IMAGE_PROVIDERS', 'PRIMARY_IMAGE_API_URL');
  const ids = providerIds.length ? providerIds : ['gemini', 'openai', 'grok'];
  const adapters = buildAdapters(ids);
  const errors = []; // Collect all errors for detailed response

  for (const adapter of adapters) {
    if (!adapter || !adapter.generateImage) continue;
    const adapterId = adapter.providerId || adapter.provider || 'unknown';
    const { controller, clear } = createTimeoutController(TIMEOUT_MS);
    try {
      console.log(`[Image] Attempting provider: ${adapterId}`);
      const result = await adapter.generateImage({ prompt, options, signal: controller.signal });
      clear();
      if (result && (result.imageUrl || result.base64)) {
        console.log(`[Image] Success with provider: ${adapterId}`);
        return res.status(200).json({ imageUrl: result.imageUrl, base64: result.base64, provider: adapterId });
      }
      // Result was empty/null - log and continue
      console.warn(`[Image] Provider ${adapterId} returned empty result`);
      errors.push({ provider: adapterId, error: 'Empty result returned', errorType: 'empty_response' });
    } catch (err) {
      clear();
      const errorDetails = formatErrorDetails(err, adapterId);
      console.error(`[Image] Provider ${adapterId} failed:`, JSON.stringify(errorDetails));
      errors.push({ provider: adapterId, error: errorDetails.message, errorType: errorDetails.errorType });
    }
  }

  // Return detailed error response
  console.error(`[Image] All providers failed. Attempted: ${ids.join(', ')}`);
  return res.status(502).json({
    error: 'Unable to generate image. All image providers failed.',
    code: 'ALL_PROVIDERS_FAILED',
    attemptedProviders: ids,
    details: errors,
  });
};
