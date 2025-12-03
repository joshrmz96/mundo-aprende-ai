// Test for environment variable validation
// Run with: node test/env-validator.test.js

const assert = require('assert');

async function run() {
  console.log('Starting environment validator tests...');

  // Store original env
  const originalEnv = { ...process.env };

  // Clear relevant env vars for testing
  const envVarsToTest = [
    'TTS_PROVIDERS',
    'PRIMARY_TTS_API_URL',
    'TEXT_PROVIDERS',
    'PRIMARY_TEXT_API_URL',
    'IMAGE_PROVIDERS',
    'PRIMARY_IMAGE_API_URL',
    'TIMEOUT_MS',
  ];
  
  envVarsToTest.forEach(key => delete process.env[key]);

  // Require the validator after clearing env
  // Need to clear require cache to get fresh module
  delete require.cache[require.resolve('../lib/envValidator')];
  const { validateEnvVars, validateProviderEnv, validateAllEnvVars } = require('../lib/envValidator');

  // Test 1: validateEnvVars with missing variables
  try {
    const result = validateEnvVars({ 
      testVar1: 'NON_EXISTENT_VAR_1',
      testVar2: 'NON_EXISTENT_VAR_2'
    }, 'TEST');
    
    assert.strictEqual(result.missing.length, 2, 'Expected 2 missing variables');
    assert.strictEqual(result.warnings.length, 2, 'Expected 2 warnings');
    assert.ok(result.warnings[0].includes('[TEST]'), 'Warning should include category');
    console.log('Test 1 passed: validateEnvVars identifies missing variables');
  } catch (err) {
    console.error('Test 1 failed:', err);
    process.exit(1);
  }

  // Test 2: validateEnvVars with set variables
  try {
    process.env.TEST_VAR_SET = 'some_value';
    const result = validateEnvVars({ 
      testVarSet: 'TEST_VAR_SET'
    }, 'TEST');
    
    assert.strictEqual(result.configured.length, 1, 'Expected 1 configured variable');
    assert.strictEqual(result.missing.length, 0, 'Expected 0 missing variables');
    console.log('Test 2 passed: validateEnvVars identifies configured variables');
    delete process.env.TEST_VAR_SET;
  } catch (err) {
    console.error('Test 2 failed:', err);
    process.exit(1);
  }

  // Test 3: validateProviderEnv for unconfigured provider
  try {
    const result = validateProviderEnv('testprovider');
    assert.ok(result.missing.length > 0, 'Expected missing env vars for unconfigured provider');
    assert.ok(result.warnings.length > 0, 'Expected warnings for unconfigured provider');
    console.log('Test 3 passed: validateProviderEnv identifies unconfigured provider');
  } catch (err) {
    console.error('Test 3 failed:', err);
    process.exit(1);
  }

  // Test 4: validateProviderEnv for configured provider
  try {
    process.env.PROVIDER_MYPROVIDER_API_URL = 'https://api.example.com';
    process.env.PROVIDER_MYPROVIDER_API_KEY = 'test-key';
    const result = validateProviderEnv('myprovider');
    assert.ok(result.configured.length >= 2, 'Expected at least 2 configured vars');
    assert.strictEqual(result.warnings.length, 0, 'Expected no warnings for configured provider');
    console.log('Test 4 passed: validateProviderEnv identifies configured provider');
    delete process.env.PROVIDER_MYPROVIDER_API_URL;
    delete process.env.PROVIDER_MYPROVIDER_API_KEY;
  } catch (err) {
    console.error('Test 4 failed:', err);
    process.exit(1);
  }

  // Test 5: validateAllEnvVars returns combined results
  try {
    const { results, allWarnings, hasAnyProviderConfig } = validateAllEnvVars();
    assert.ok(results.TTS, 'Should have TTS results');
    assert.ok(results.TEXT, 'Should have TEXT results');
    assert.ok(results.IMAGE, 'Should have IMAGE results');
    assert.ok(results.GENERAL, 'Should have GENERAL results');
    assert.ok(Array.isArray(allWarnings), 'allWarnings should be an array');
    assert.strictEqual(typeof hasAnyProviderConfig, 'boolean', 'hasAnyProviderConfig should be boolean');
    console.log('Test 5 passed: validateAllEnvVars returns proper structure');
  } catch (err) {
    console.error('Test 5 failed:', err);
    process.exit(1);
  }

  // Restore original env
  Object.keys(process.env).forEach(key => {
    if (!originalEnv.hasOwnProperty(key)) {
      delete process.env[key];
    }
  });
  Object.assign(process.env, originalEnv);

  console.log('All environment validator tests passed.');
}

run();
