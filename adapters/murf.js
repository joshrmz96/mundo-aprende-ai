// Murf adapter (TTS-focused)
const nodeFetch = (typeof fetch !== 'undefined') ? fetch : require('node-fetch');

module.exports = function createMurfAdapter(cfg) {
  const providerId = 'murf';
  const baseUrl = cfg.url;
  const apiKey = cfg.key;

  if (!baseUrl) {
    console.warn(`[Murf] Adapter created without API URL configuration`);
    return {
      providerId,
      generateText: async () => null,
      generateImage: async () => null,
      generateTTS: async () => { throw new Error('Murf API URL not configured. Set PROVIDER_MURF_API_URL environment variable.'); },
    };
  }

  async function call(payload, signal) {
    console.log(`[Murf] Making API request to ${baseUrl}`);
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
      const errorMsg = `Murf API error ${res.status}: ${txt || 'No response body'}`;
      console.error(`[Murf] ${errorMsg}`);
      throw new Error(errorMsg);
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
      console.log(`[Murf] Generating TTS for text length: ${text?.length || 0}, voice: ${body.voice}`);
      const json = await call(body, signal);
      const audioUrl = json?.url || json?.audio_url || null;
      const base64 = json?.base64 || null;
      if (!audioUrl && !base64) {
        console.warn(`[Murf] API returned success but no audio data in response`);
        return null;
      }
      return { audioUrl, base64 };
    },
  };
};
