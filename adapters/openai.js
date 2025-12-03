// OpenAI adapter (generic REST mapping).
const nodeFetch = (typeof fetch !== 'undefined') ? fetch : require('node-fetch');

module.exports = function createOpenAIAdapter(cfg) {
  const providerId = 'openai';
  const baseUrl = cfg.url || 'https://api.openai.com/v1';
  const apiKey = cfg.key;

  if (!apiKey) {
    console.warn(`[OpenAI] Adapter created without API key. Set PROVIDER_OPENAI_API_KEY or OPENAI_API_KEY environment variable.`);
  }

  function authHeaders() {
    return apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
  }

  async function postJson(path, body, signal) {
    const url = `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
    console.log(`[OpenAI] Making API request to ${path}`);
    const res = await nodeFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify(body || {}),
      signal,
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      const errorMsg = `OpenAI API error ${res.status}: ${txt || 'No response body'}`;
      console.error(`[OpenAI] ${errorMsg}`);
      throw new Error(errorMsg);
    }
    const json = await res.json().catch(() => ({}));
    return json;
  }

  return {
    providerId,
    async generateText({ prompt, options, signal }) {
      console.log(`[OpenAI] Generating text for prompt length: ${prompt?.length || 0}`);
      // Try Responses or Chat Completions; prefer a generic call to the Responses endpoint if path configured
      const respPath = cfg.endpoint || 'chat/completions';
      const body = cfg.endpoint ? { prompt, options } : {
        model: (options && options.model) || 'gpt-4o-mini', // generic
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options && options.max_tokens,
      };
      const json = await postJson(respPath, body, signal);
      // Map different shapes
      const text = json?.output || (json?.choices && (json.choices[0]?.message?.content || json.choices[0]?.text)) || json?.text || '';
      if (!text) {
        console.warn(`[OpenAI] API returned success but no text in response`);
      }
      return text ? { text } : null;
    },
    async generateImage({ prompt, options, signal }) {
      console.log(`[OpenAI] Generating image for prompt length: ${prompt?.length || 0}`);
      // Use Images API (openai/images) if available
      const imagePath = cfg.endpoint || 'images/generations';
      const body = cfg.endpoint ? { prompt, options } : {
        prompt,
        n: 1,
        size: (options && options.size) || '1024x1024',
      };
      const json = await postJson(imagePath, body, signal);
      const imageUrl = json?.data?.[0]?.url || json?.url || json?.image_url || null;
      const base64 = json?.data?.[0]?.b64_json || json?.base64 || null;
      if (!imageUrl && !base64) {
        console.warn(`[OpenAI] API returned success but no image data in response`);
        return null;
      }
      return { imageUrl, base64 };
    },
    async generateTTS({ text, voice, options, signal }) {
      console.log(`[OpenAI] Generating TTS for text length: ${text?.length || 0}, voice: ${voice}`);
      // OpenAI's TTS endpoints vary; send generic request to configured endpoint if present
      const ttsPath = cfg.endpoint || 'audio/generate';
      const body = cfg.endpoint ? { text, voice, options } : { input: text, voice: voice || process.env.DEFAULT_TTS_VOICE || 'chatgpt' };
      const json = await postJson(ttsPath, body, signal);
      const audioUrl = json?.url || json?.audio_url || json?.data?.[0]?.url || null;
      const base64 = json?.base64 || null;
      if (!audioUrl && !base64) {
        console.warn(`[OpenAI] API returned success but no audio data in response`);
        return null;
      }
      return { audioUrl, base64 };
    },
  };
};
