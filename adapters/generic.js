// Generic adapter used for unknown provider IDs (fallback).
// Sends POST {prompt/options} or {text/voice/options} and tries to map common response shapes.

const nodeFetch = (typeof fetch !== 'undefined') ? fetch : require('node-fetch');

module.exports = function createGenericAdapter(cfg) {
  const providerId = (cfg && cfg.id) || 'generic';
  const baseUrl = cfg.url;
  const apiKey = cfg.key;

  async function postJson(path, body, signal) {
    if (!baseUrl) throw new Error('No base URL configured for generic adapter');
    const url = path ? `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}` : baseUrl;
    const res = await nodeFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(body || {}),
      signal,
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${txt}`);
    }
    const json = await res.json().catch(() => ({}));
    return json;
  }

  return {
    providerId,
    async generateText({ prompt, options, signal }) {
      const json = await postJson('', { prompt, options }, signal);
      const text = json?.text || json?.output || json?.result || (Array.isArray(json?.choices) && json.choices[0]?.text) || '';
      return text ? { text } : null;
    },
    async generateImage({ prompt, options, signal }) {
      const json = await postJson('', { prompt, options }, signal);
      const imageUrl = json?.url || json?.image_url || json?.data?.[0]?.url || null;
      const base64 = json?.base64 || null;
      if (!imageUrl && !base64) return null;
      return { imageUrl, base64 };
    },
    async generateTTS({ text, voice, options, signal }) {
      const json = await postJson('', { text, voice, options }, signal);
      const audioUrl = json?.url || json?.audio_url || null;
      const base64 = json?.base64 || null;
      if (!audioUrl && !base64) return null;
      return { audioUrl, base64 };
    },
  };
};
