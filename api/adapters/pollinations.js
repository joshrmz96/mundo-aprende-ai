'use strict';

const PROVIDER_ID = 'pollinations';
const POLLINATIONS_IMAGE_URL = 'https://image.pollinations.ai/prompt';

/**
 * Generate image using Pollinations API
 * @param {Object} options - Request options
 * @param {string} options.prompt - Image generation prompt
 * @param {Object} options.fetchFn - Fetch function (for testing/mocking)
 * @param {number} options.timeoutMs - Request timeout in milliseconds
 * @returns {Promise<Object>} - Response with imageUrl, base64, and provider
 */
async function generateImage(options) {
  const { prompt, fetchFn = fetch, timeoutMs = 60000 } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const encodedPrompt = encodeURIComponent(`illustration of ${prompt} vector flat colorful`);
    const imageUrl = `${POLLINATIONS_IMAGE_URL}/${encodedPrompt}?width=600&height=400&nologo=true`;

    // Verify the URL is accessible by making a HEAD request
    const response = await fetchFn(imageUrl, {
      method: 'HEAD',
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Pollinations API error: ${response.status}`);
    }

    return {
      imageUrl: imageUrl,
      base64: null,
      provider: PROVIDER_ID
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

module.exports = {
  generateImage,
  PROVIDER_ID,
  capabilities: ['image']
};
