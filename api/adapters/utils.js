/**
 * Shared utilities for AI provider adapters
 */

/**
 * Default timeout for API requests in milliseconds
 */
export const DEFAULT_TIMEOUT = 30000;

/**
 * Create an AbortController with timeout
 * @param {number} timeout - Timeout in milliseconds
 * @param {AbortSignal} [externalSignal] - External abort signal to combine
 * @returns {{ controller: AbortController, timeoutId: NodeJS.Timeout }}
 */
export function createTimeoutController(timeout, externalSignal) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  if (externalSignal) {
    externalSignal.addEventListener('abort', () => controller.abort());
  }

  return { controller, timeoutId };
}

/**
 * Clean JSON response from markdown code blocks
 * @param {string} text - Raw response text
 * @returns {string} - Clean JSON string
 */
export function cleanJSON(text) {
  if (!text) return '{}';
  let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start !== -1 && end !== -1) return clean.substring(start, end + 1);
  return clean;
}
