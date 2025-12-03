import { GeminiAdapter } from '../gemini.js';
import { OpenAIAdapter } from '../openai.js';
import { GrokAdapter } from '../grok.js';
import { MurfAdapter } from '../murf.js';
import { PollinationsAdapter } from '../pollinations.js';
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

    test('should use default TTS voice', () => {
        delete process.env.OPENAI_TTS_VOICE;
        const adapter = new OpenAIAdapter();
        expect(adapter.ttsVoice).toBe('nova');
    });

    test('should use custom TTS voice from env', () => {
        process.env.OPENAI_TTS_VOICE = 'shimmer';
        const adapter = new OpenAIAdapter();
        expect(adapter.ttsVoice).toBe('shimmer');
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

    test('should use custom voice from env', () => {
        process.env.MURF_VOICE_ES = 'custom-es-voice';
        process.env.MURF_VOICE_EN = 'custom-en-voice';
        const adapter = new MurfAdapter();
        expect(adapter.voiceEs).toBe('custom-es-voice');
        expect(adapter.voiceEn).toBe('custom-en-voice');
    });
});

describe('PollinationsAdapter', () => {
    test('should have correct providerId', () => {
        const adapter = new PollinationsAdapter();
        expect(adapter.providerId).toBe('pollinations');
    });

    test('isConfigured should always return true (no API key needed)', () => {
        const adapter = new PollinationsAdapter();
        expect(adapter.isConfigured()).toBe(true);
    });

    test('generateText should throw not supported error', async () => {
        const adapter = new PollinationsAdapter();
        await expect(adapter.generateText({})).rejects.toThrow('not supported');
    });

    test('generateTTS should throw not supported error', async () => {
        const adapter = new PollinationsAdapter();
        await expect(adapter.generateTTS({})).rejects.toThrow('not supported');
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

    test('createImageAdapters returns adapters in correct order', () => {
        const adapters = createImageAdapters();
        expect(adapters).toHaveLength(2);
        expect(adapters[0].providerId).toBe('openai');
        expect(adapters[1].providerId).toBe('pollinations');
    });

    test('createTTSAdapters returns adapters in correct order', () => {
        const adapters = createTTSAdapters();
        expect(adapters).toHaveLength(2);
        expect(adapters[0].providerId).toBe('openai');
        expect(adapters[1].providerId).toBe('murf');
    });
});
