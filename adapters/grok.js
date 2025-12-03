// Grok adapter (generic).
const nodeFetch = (typeof fetch !== 'undefined') ? fetch : require('node-fetch');

module.exports = function createGrokAdapter(cfg) {
  const providerId = 'grok';
  const baseUrl = cfg.url;
  const apiKey = cfg.key;

  if (!baseUrl) {
    console.warn(`[Grok] Adapter created without API URL configuration. Set PROVIDER_GROK_API_URL or GROK_API_URL environment variable.`);
    return {
      providerId,
      generateText: async () => { throw new Error('Grok API URL not configured. Set PROVIDER_GROK_API_URL environment variable.'); },
      generateImage: async () => null,
      generateTTS: async () => null,
    };
  }

  async function call(payload, signal) {
    console.log(`[Grok] Making API request to ${baseUrl}`);
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
      const errorMsg = `Grok API error ${res.status}: ${txt || 'No response body'}`;
      console.error(`[Grok] ${errorMsg}`);
      throw new Error(errorMsg);
    }
    const json = await res.json().catch(() => ({}));
    return json;
  }

  return {
    providerId,
    async generateText({ prompt, options, signal }) {
      console.log(`[Grok] Generating text for prompt length: ${prompt?.length || 0}`);
      const json = await call({ prompt, options }, signal);
      const text = json?.text || json?.output || json?.result || '';
      if (!text) {
        console.warn(`[Grok] API returned success but no text in response`);
      }
      return text ? { text } : null;
    },
    async generateImage({ prompt, options, signal }) {
      console.log(`[Grok] Generating image for prompt length: ${prompt?.length || 0}`);
      const json = await call({ prompt, options }, signal);
      const imageUrl = json?.url || json?.image_url || json?.data?.[0]?.url || null;
      const base64 = json?.base64 || null;
      if (!imageUrl && !base64) {
        console.warn(`[Grok] API returned success but no image data in response`);
        return null;
      }
      return { imageUrl, base64 };
    },
    async generateTTS({ text, voice, options, signal }) {
      console.log(`[Grok] Generating TTS for text length: ${text?.length || 0}`);
      const json = await call({ text, voice, options }, signal);
      const audioUrl = json?.url || json?.audio_url || null;
      const base64 = json?.base64 || null;
      if (!audioUrl && !base64) {
        console.warn(`[Grok] API returned success but no audio data in response`);
        return null;
      }
      return { audioUrl, base64 };
    },
  };
};
