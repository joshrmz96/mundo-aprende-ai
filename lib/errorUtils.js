/**
 * Shared error formatting utilities for API handlers
 */

/**
 * Formats error details for logging
 * @param {Error} err - The error object
 * @param {string} adapterId - The adapter identifier
 * @returns {Object} Formatted error details
 */
function formatErrorDetails(err, adapterId) {
  const isTimeout = err && (err.name === 'AbortError' || err.message?.includes('aborted'));
  const isNetworkError = err && (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT');
  
  return {
    adapterId,
    errorType: isTimeout ? 'timeout' : isNetworkError ? 'network' : 'api',
    message: err?.message || String(err),
    code: err?.code || null,
    status: err?.status || null,
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  formatErrorDetails,
};
