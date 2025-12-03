const path = require('path');

function getEnv(name) {
  return process.env[name] || '';
}

function buildConfigForId(id) {
  const up = id ? id.toUpperCase() : '';
  return {
    id,
    url: getEnv(`PROVIDER_${up}_API_URL`) || getEnv(`${id}_API_URL`) || '',
    key: getEnv(`PROVIDER_${up}_API_KEY`) || getEnv(`${id}_API_KEY`) || '',
    endpoint: getEnv(`PROVIDER_${up}_API_ENDPOINT`) || '',
  };
}

// adapter factories
const geminiFactory = require('./gemini');
const openaiFactory = require('./openai');
const grokFactory = require('./grok');
const murfFactory = require('./murf');

function getAdapter(providerId) {
  if (!providerId) return null;
  const id = providerId.toLowerCase().trim();
  const cfg = buildConfigForId(id);
  switch (id) {
    case 'gemini':
      return geminiFactory(cfg);
    case 'openai':
      return openaiFactory(cfg);
    case 'grok':
      return grokFactory(cfg);
    case 'murf':
      return murfFactory(cfg);
    default:
      // Generic adapter that posts {prompt, options} and maps common fields
      return require('./generic')(cfg);
  }
}

module.exports = { getAdapter };
