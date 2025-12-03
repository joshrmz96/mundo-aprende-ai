/**
 * Environment variable validation helper.
 * Validates required and optional environment variables at startup
 * and logs warnings for missing configurations.
 */

const ENV_CONFIG = {
  // TTS-related environment variables
  TTS: {
    providers: 'TTS_PROVIDERS',
    primaryUrl: 'PRIMARY_TTS_API_URL',
    primaryEndpoint: 'PRIMARY_TTS_API_ENDPOINT',
    primaryKey: 'PRIMARY_TTS_API_KEY',
    defaultVoice: 'DEFAULT_TTS_VOICE',
    audioFallback: 'AUDIO_FALLBACK_PROVIDER',
  },
  // Text/Chat-related environment variables
  TEXT: {
    providers: 'TEXT_PROVIDERS',
    primaryUrl: 'PRIMARY_TEXT_API_URL',
    primaryEndpoint: 'PRIMARY_TEXT_API_ENDPOINT',
    primaryKey: 'PRIMARY_TEXT_API_KEY',
  },
  // Image-related environment variables
  IMAGE: {
    providers: 'IMAGE_PROVIDERS',
    primaryUrl: 'PRIMARY_IMAGE_API_URL',
    primaryEndpoint: 'PRIMARY_IMAGE_API_ENDPOINT',
    primaryKey: 'PRIMARY_IMAGE_API_KEY',
  },
  // General settings
  GENERAL: {
    timeout: 'TIMEOUT_MS',
  },
};

// Provider-specific environment variable patterns
const PROVIDER_ENV_PATTERNS = {
  url: 'PROVIDER_{ID}_API_URL',
  key: 'PROVIDER_{ID}_API_KEY',
  endpoint: 'PROVIDER_{ID}_API_ENDPOINT',
};

/**
 * Validates a set of environment variables and returns validation results.
 * @param {Object} envVars - Object with environment variable names to validate
 * @param {string} category - Category name for logging (e.g., 'TTS', 'TEXT')
 * @returns {Object} Validation result with warnings and missing variables
 */
function validateEnvVars(envVars, category) {
  const result = {
    warnings: [],
    missing: [],
    configured: [],
  };

  for (const [name, envName] of Object.entries(envVars)) {
    const value = process.env[envName];
    if (!value || !value.trim()) {
      result.missing.push(envName);
      result.warnings.push(`[${category}] Environment variable '${envName}' is not set`);
    } else {
      result.configured.push(envName);
    }
  }

  return result;
}

/**
 * Validates provider-specific environment variables.
 * @param {string} providerId - The provider ID to check
 * @returns {Object} Validation result with warnings for the specific provider
 */
function validateProviderEnv(providerId) {
  const result = {
    warnings: [],
    configured: [],
    missing: [],
  };

  const id = providerId.toUpperCase();
  for (const [name, pattern] of Object.entries(PROVIDER_ENV_PATTERNS)) {
    const envName = pattern.replace('{ID}', id);
    const value = process.env[envName];
    if (!value || !value.trim()) {
      result.missing.push(envName);
    } else {
      result.configured.push(envName);
    }
  }

  // Only warn if no URL is configured at all
  const urlEnv = PROVIDER_ENV_PATTERNS.url.replace('{ID}', id);
  if (!process.env[urlEnv] && !process.env[`${providerId}_API_URL`]) {
    result.warnings.push(`Provider '${providerId}': No API URL configured (checked ${urlEnv})`);
  }

  return result;
}

/**
 * Runs validation for all categories and logs warnings.
 * Should be called at application startup.
 * @returns {Object} Combined validation results
 */
function validateAllEnvVars() {
  const results = {
    TTS: validateEnvVars(ENV_CONFIG.TTS, 'TTS'),
    TEXT: validateEnvVars(ENV_CONFIG.TEXT, 'TEXT'),
    IMAGE: validateEnvVars(ENV_CONFIG.IMAGE, 'IMAGE'),
    GENERAL: validateEnvVars(ENV_CONFIG.GENERAL, 'GENERAL'),
  };

  const allWarnings = [];
  let hasAnyProviderConfig = false;

  for (const [category, result] of Object.entries(results)) {
    // Check if at least one provider configuration exists for each category
    const providersEnv = ENV_CONFIG[category]?.providers;
    if (providersEnv && process.env[providersEnv]) {
      hasAnyProviderConfig = true;
    }

    // Collect all warnings
    allWarnings.push(...result.warnings);
  }

  return {
    results,
    allWarnings,
    hasAnyProviderConfig,
  };
}

/**
 * Logs validation warnings to console.
 * @param {boolean} verbose - If true, logs all warnings; otherwise only critical ones
 */
function logValidationWarnings(verbose = false) {
  const { allWarnings, hasAnyProviderConfig } = validateAllEnvVars();

  if (allWarnings.length > 0) {
    if (verbose) {
      console.warn('[EnvValidator] Environment configuration warnings:');
      allWarnings.forEach(warning => console.warn(`  - ${warning}`));
    }

    if (!hasAnyProviderConfig) {
      console.warn('[EnvValidator] Warning: No provider configurations detected. Using default fallback providers.');
    }
  }
}

module.exports = {
  ENV_CONFIG,
  PROVIDER_ENV_PATTERNS,
  validateEnvVars,
  validateProviderEnv,
  validateAllEnvVars,
  logValidationWarnings,
};
