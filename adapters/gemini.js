// Gemini adapter (generic REST shape).
const nodeFetch = (typeof fetch !== 'undefined') ? fetch : require('node-fetch');

module.exports = function createGeminiAdapter(cfg) {
  const providerId = 'gemini';
  const baseUrl = cfg.url;
  const apiKey = cfg.key;

  if (!baseUrl) {
    console.warn(`[Gemini] Adapter created without API URL configuration. Set PROVIDER_GEMINI_API_URL or GEMINI_API_URL environment variable.`);
    return {
      providerId,
      generateText: async () => { throw new Error('Gemini API URL not configured. Set PROVIDER_GEMINI_API_URL environment variable.'); },
      generateImage: async () => null,
      generateTTS: async () => null,
    };
  }

  async function call(endpointPath, payload, signal) {
    const url = cfg.endpoint ? cfg.endpoint : baseUrl;
    const body = JSON.stringify(payload || {});
    console.log(`[Gemini] Making API request to ${url}`);
    const res = await nodeFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body,
      signal,
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      const errorMsg = `Gemini API error ${res.status}: ${txt || 'No response body'}`;
      console.error(`[Gemini] ${errorMsg}`);
      throw new Error(errorMsg);
    }
    const json = await res.json().catch(() => ({}));
    return json;
  }

  return {
    providerId,
    async generateText({ prompt, options, signal }) {
      console.log(`[Gemini] Generating text for prompt length: ${prompt?.length || 0}`);
      const json = await call('', { prompt, options }, signal);
      const text = json?.text || json?.output || json?.result || '';
      if (!text) {
        console.warn(`[Gemini] API returned success but no text in response`);
      }
      return text ? { text } : null;
    },
    async generateImage({ prompt, options, signal }) {
      console.log(`[Gemini] Generating image for prompt length: ${prompt?.length || 0}`);
      const json = await call('', { prompt, options }, signal);
      const imageUrl = json?.url || json?.image_url || json?.data?.[0]?.url || null;
      const base64 = json?.base64 || null;
      if (!imageUrl && !base64) {
        console.warn(`[Gemini] API returned success but no image data in response`);
        return null;
      }
      return { imageUrl, base64 };
    },
    async generateTTS({ text, voice, options, signal }) {
      console.log(`[Gemini] Generating TTS for text length: ${text?.length || 0}`);
      // Gemini may not provide TTS in your integration; try and map if present.
      const json = await call('', { text, voice, options }, signal);
      const audioUrl = json?.url || json?.audio_url || null;
      const base64 = json?.base64 || null;
      if (!audioUrl && !base64) {
        console.warn(`[Gemini] API returned success but no audio data in response`);
        return null;
      }
      return { audioUrl, base64 };
    },
  };
};
