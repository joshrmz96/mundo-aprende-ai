// Grok adapter (generic).
const nodeFetch = (typeof fetch !== 'undefined') ? fetch : require('node-fetch');

module.exports = function createGrokAdapter(cfg) {
  const providerId = 'grok';
  const baseUrl = cfg.url;
  const apiKey = cfg.key;

  if (!baseUrl) {
    return {
      providerId,
      generateText: async () => { throw new Error('Grok API URL not configured'); },
      generateImage: async () => null,
      generateTTS: async () => null,
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
      throw new Error(`Grok ${res.status}: ${txt}`);
    }
    const json = await res.json().catch(() => ({}));
    return json;
  }

  return {
    providerId,
    async generateText({ prompt, options, signal }) {
      const json = await call({ prompt, options }, signal);
      const text = json?.text || json?.output || json?.result || '';
      return text ? { text } : null;
    },
    async generateImage({ prompt, options, signal }) {
      const json = await call({ prompt, options }, signal);
      const imageUrl = json?.url || json?.image_url || json?.data?.[0]?.url || null;
      const base64 = json?.base64 || null;
      if (!imageUrl && !base64) return null;
      return { imageUrl, base64 };
    },
    async generateTTS({ text, voice, options, signal }) {
      const json = await call({ text, voice, options }, signal);
      const audioUrl = json?.url || json?.audio_url || null;
      const base64 = json?.base64 || null;
      if (!audioUrl && !base64) return null;
      return { audioUrl, base64 };
    },
  };
};
