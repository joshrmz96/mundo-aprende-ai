const { getAdapter } = require('./adapters/index');

const TIMEOUT_MS = parseInt(process.env.TIMEOUT_MS || '15000', 10);
const DEFAULT_VOICE = process.env.DEFAULT_TTS_VOICE || 'chatgpt'; // user requested chatgpt as default

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
      return getAdapter(cfg.id) || require('./adapters/generic')(cfg);
    }
    const adapter = getAdapter(id);
    if (!adapter) {
      const cfg = {
        id,
        url: process.env[`PROVIDER_${id.toUpperCase()}_API_URL`] || '',
        key: process.env[`PROVIDER_${id.toUpperCase()}_API_KEY`] || '',
      };
      return require('./adapters/generic')(cfg);
    }
    return adapter;
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { text, voice, options } = req.body || {};
  if (!text) return res.status(400).json({ error: 'Missing text' });

  const providerIds = parseProvidersEnv('TTS_PROVIDERS', 'PRIMARY_TTS_API_URL');
  // default order; Murf will be tried as specified via TTS_PROVIDERS or AUDIO_FALLBACK_PROVIDER
  const ids = providerIds.length ? providerIds : ['openai', 'gemini', 'grok'];

  // If an explicit audio fallback provider is configured, put it at the end if not already present
  const audioFallback = process.env.AUDIO_FALLBACK_PROVIDER || 'murf';
  if (!ids.includes(audioFallback)) ids.push(audioFallback);

  const adapters = buildAdapters(ids);

  for (const adapter of adapters) {
    if (!adapter || !adapter.generateTTS) continue;
    const { controller, clear } = createTimeoutController(TIMEOUT_MS);
    try {
      const result = await adapter.generateTTS({ text, voice: voice || DEFAULT_VOICE, options, signal: controller.signal });
      clear();
      if (result && (result.audioUrl || result.base64)) {
        return res.status(200).json({ audioUrl: result.audioUrl, base64: result.base64, provider: adapter.providerId || adapter.provider || 'unknown' });
      }
    } catch (err) {
      clear();
      console.warn(`TTS provider ${adapter.providerId || adapter.provider || 'unknown'} failed:`, err && err.message ? err.message : err);
    }
  }

  return res.status(502).json({ error: 'All TTS providers failed' });
};
