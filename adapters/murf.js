// Murf adapter (TTS-focused)
const nodeFetch = (typeof fetch !== 'undefined') ? fetch : require('node-fetch');

module.exports = function createMurfAdapter(cfg) {
  const providerId = 'murf';
  const baseUrl = cfg.url;
  const apiKey = cfg.key;

  if (!baseUrl) {
    return {
      providerId,
      generateText: async () => null,
      generateImage: async () => null,
      generateTTS: async () => { throw new Error('Murf API URL not configured'); },
    };
  }

  async function call(payload, signal) {
    const res = await nodeFetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(payload || {}),
      signal,
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Murf ${res.status}: ${txt}`);
    }
    const json = await res.json().catch(() => ({}));
    return json;
  }

  return {
    providerId,
    async generateText() { return null; },
    async generateImage() { return null; },
    async generateTTS({ text, voice, options, signal }) {
      const body = { text, voice: voice || process.env.DEFAULT_TTS_VOICE || 'chatgpt', options };
      const json = await call(body, signal);
      const audioUrl = json?.url || json?.audio_url || null;
      const base64 = json?.base64 || null;
      if (!audioUrl && !base64) return null;
      return { audioUrl, base64 };
    },
  };
};
