import { GeminiAdapter } from '../gemini.js';
import { OpenAIAdapter } from '../openai.js';
import { GrokAdapter } from '../grok.js';
import { MurfAdapter } from '../murf.js';
import { createTextAdapters, createImageAdapters, createTTSAdapters } from '../index.js';

// Save original env
const originalEnv = process.env;

beforeEach(() => {
    // Reset env for each test
    process.env = { ...originalEnv };
});

afterAll(() => {
    process.env = originalEnv;
});

describe('GeminiAdapter', () => {
    test('should have correct providerId', () => {
        const adapter = new GeminiAdapter();
        expect(adapter.providerId).toBe('gemini');
    });

    test('isConfigured should return false when no API key', () => {
        delete process.env.GEMINI_API_KEY;
        const adapter = new GeminiAdapter();
        expect(adapter.isConfigured()).toBe(false);
    });

    test('isConfigured should return true when API key exists', () => {
        process.env.GEMINI_API_KEY = 'test-key';
        const adapter = new GeminiAdapter();
        expect(adapter.isConfigured()).toBe(true);
    });

    test('generateImage should throw not supported error', async () => {
        const adapter = new GeminiAdapter();
        await expect(adapter.generateImage({})).rejects.toThrow('not supported');
    });

    test('generateTTS should throw not implemented error', async () => {
        const adapter = new GeminiAdapter();
        await expect(adapter.generateTTS({})).rejects.toThrow('not implemented');
    });
});

describe('OpenAIAdapter', () => {
    test('should have correct providerId', () => {
        const adapter = new OpenAIAdapter();
        expect(adapter.providerId).toBe('openai');
    });

    test('isConfigured should return false when no API key', () => {
        delete process.env.OPENAI_API_KEY;
        const adapter = new OpenAIAdapter();
        expect(adapter.isConfigured()).toBe(false);
    });

    test('isConfigured should return true when API key exists', () => {
        process.env.OPENAI_API_KEY = 'test-key';
        const adapter = new OpenAIAdapter();
        expect(adapter.isConfigured()).toBe(true);
    });
});

describe('GrokAdapter', () => {
    test('should have correct providerId', () => {
        const adapter = new GrokAdapter();
        expect(adapter.providerId).toBe('grok');
    });

    test('isConfigured should return false when no API key', () => {
        delete process.env.XAI_API_KEY;
        const adapter = new GrokAdapter();
        expect(adapter.isConfigured()).toBe(false);
    });

    test('isConfigured should return true when API key exists', () => {
        process.env.XAI_API_KEY = 'test-key';
        const adapter = new GrokAdapter();
        expect(adapter.isConfigured()).toBe(true);
    });

    test('generateImage should throw not supported error', async () => {
        const adapter = new GrokAdapter();
        await expect(adapter.generateImage({})).rejects.toThrow('not supported');
    });

    test('generateTTS should throw not supported error', async () => {
        const adapter = new GrokAdapter();
        await expect(adapter.generateTTS({})).rejects.toThrow('not supported');
    });
});

describe('MurfAdapter', () => {
    test('should have correct providerId', () => {
        const adapter = new MurfAdapter();
        expect(adapter.providerId).toBe('murf');
    });

    test('isConfigured should return false when no API key', () => {
        delete process.env.MURF_API_KEY;
        const adapter = new MurfAdapter();
        expect(adapter.isConfigured()).toBe(false);
    });

    test('isConfigured should return true when API key exists', () => {
        process.env.MURF_API_KEY = 'test-key';
        const adapter = new MurfAdapter();
        expect(adapter.isConfigured()).toBe(true);
    });

    test('generateText should throw not supported error', async () => {
        const adapter = new MurfAdapter();
        await expect(adapter.generateText({})).rejects.toThrow('not supported');
    });

    test('generateImage should throw not supported error', async () => {
        const adapter = new MurfAdapter();
        await expect(adapter.generateImage({})).rejects.toThrow('not supported');
    });
});

describe('Adapter Factory Functions', () => {
    test('createTextAdapters returns adapters in correct order', () => {
        const adapters = createTextAdapters();
        expect(adapters).toHaveLength(3);
        expect(adapters[0].providerId).toBe('gemini');
        expect(adapters[1].providerId).toBe('openai');
        expect(adapters[2].providerId).toBe('grok');
    });

    test('createImageAdapters returns OpenAI adapter', () => {
        const adapters = createImageAdapters();
        expect(adapters).toHaveLength(1);
        expect(adapters[0].providerId).toBe('openai');
    });

    test('createTTSAdapters returns adapters in correct order', () => {
        const adapters = createTTSAdapters();
        expect(adapters).toHaveLength(2);
        expect(adapters[0].providerId).toBe('openai');
        expect(adapters[1].providerId).toBe('murf');
    });
});
