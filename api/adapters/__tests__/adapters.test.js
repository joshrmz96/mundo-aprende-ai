/**
 * Tests for AI Provider Adapters
 * 
 * These tests verify the adapter interfaces and fallback logic.
 * API calls are mocked to avoid real API calls during testing.
 */

import { jest } from '@jest/globals';

// Mock global fetch before importing adapters
global.fetch = jest.fn();

// Import adapters after mocking fetch
import * as gemini from '../gemini.js';
import * as openai from '../openai.js';
import * as grok from '../grok.js';
import * as murf from '../murf.js';
import * as pollinations from '../pollinations.js';
import * as adapterIndex from '../index.js';

describe('Gemini Adapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-gemini-key';
  });

  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  describe('generateText', () => {
    it('should throw error when API key is not configured', async () => {
      delete process.env.GEMINI_API_KEY;
      await expect(gemini.generateText({ prompt: 'test' }))
        .rejects.toThrow('GEMINI_API_KEY is not configured');
    });

    it('should make correct API call with prompt', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'response text' }] } }]
        })
      });

      const result = await gemini.generateText({ prompt: 'test prompt' });
      
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('generativelanguage.googleapis.com'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );
      expect(result).toBe('response text');
    });

    it('should handle JSON mode and clean response', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: '```json\n{"key": "value"}\n```' }] } }]
        })
      });

      const result = await gemini.generateText({ 
        prompt: 'test', 
        options: { jsonMode: true } 
      });
      
      expect(result).toBe('{"key": "value"}');
    });
  });

  describe('generateImage', () => {
    it('should return null (not supported)', async () => {
      const result = await gemini.generateImage({ prompt: 'test' });
      expect(result).toBeNull();
    });
  });

  describe('generateTTS', () => {
    it('should return null (not supported)', async () => {
      const result = await gemini.generateTTS({ text: 'test' });
      expect(result).toBeNull();
    });
  });
});

describe('OpenAI Adapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-openai-key';
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  describe('generateText', () => {
    it('should throw error when API key is not configured', async () => {
      delete process.env.OPENAI_API_KEY;
      await expect(openai.generateText({ prompt: 'test' }))
        .rejects.toThrow('OPENAI_API_KEY is not configured');
    });

    it('should make correct API call', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'response text' } }]
        })
      });

      const result = await openai.generateText({ prompt: 'test prompt' });
      
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-openai-key'
          })
        })
      );
      expect(result).toBe('response text');
    });
  });

  describe('generateImage', () => {
    it('should throw error when API key is not configured', async () => {
      delete process.env.OPENAI_API_KEY;
      await expect(openai.generateImage({ prompt: 'test' }))
        .rejects.toThrow('OPENAI_API_KEY is not configured');
    });

    it('should return image URL on success', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ url: 'https://example.com/image.png' }]
        })
      });

      const result = await openai.generateImage({ prompt: 'test' });
      expect(result).toBe('https://example.com/image.png');
    });
  });

  describe('generateTTS', () => {
    it('should throw error when API key is not configured', async () => {
      delete process.env.OPENAI_API_KEY;
      await expect(openai.generateTTS({ text: 'test' }))
        .rejects.toThrow('OPENAI_API_KEY is not configured');
    });

    it('should return audio blob on success', async () => {
      const mockBlob = new Blob(['audio data'], { type: 'audio/mpeg' });
      global.fetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob
      });

      const result = await openai.generateTTS({ text: 'test' });
      expect(result).toEqual(mockBlob);
    });
  });
});

describe('Grok Adapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.XAI_API_KEY = 'test-xai-key';
  });

  afterEach(() => {
    delete process.env.XAI_API_KEY;
  });

  describe('generateText', () => {
    it('should throw error when API key is not configured', async () => {
      delete process.env.XAI_API_KEY;
      await expect(grok.generateText({ prompt: 'test' }))
        .rejects.toThrow('XAI_API_KEY is not configured');
    });

    it('should make correct API call', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'grok response' } }]
        })
      });

      const result = await grok.generateText({ prompt: 'test' });
      
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.x.ai/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-xai-key'
          })
        })
      );
      expect(result).toBe('grok response');
    });
  });

  describe('generateImage', () => {
    it('should return null (not supported)', async () => {
      const result = await grok.generateImage({ prompt: 'test' });
      expect(result).toBeNull();
    });
  });

  describe('generateTTS', () => {
    it('should return null (not supported)', async () => {
      const result = await grok.generateTTS({ text: 'test' });
      expect(result).toBeNull();
    });
  });
});

describe('Murf Adapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MURF_API_KEY = 'test-murf-key';
  });

  afterEach(() => {
    delete process.env.MURF_API_KEY;
  });

  describe('generateText', () => {
    it('should return null (not supported)', async () => {
      const result = await murf.generateText({ prompt: 'test' });
      expect(result).toBeNull();
    });
  });

  describe('generateImage', () => {
    it('should return null (not supported)', async () => {
      const result = await murf.generateImage({ prompt: 'test' });
      expect(result).toBeNull();
    });
  });

  describe('generateTTS', () => {
    it('should throw error when API key is not configured', async () => {
      delete process.env.MURF_API_KEY;
      await expect(murf.generateTTS({ text: 'test' }))
        .rejects.toThrow('MURF_API_KEY is not configured');
    });

    it('should return audio blob on success', async () => {
      const mockBlob = new Blob(['audio data'], { type: 'audio/mpeg' });
      
      // Mock the initial API call
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          audioFile: 'https://example.com/audio.mp3'
        })
      });
      
      // Mock the audio file fetch
      global.fetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob
      });

      const result = await murf.generateTTS({ text: 'test' });
      expect(result).toEqual(mockBlob);
    });
  });
});

describe('Pollinations Adapter', () => {
  describe('generateText', () => {
    it('should return null (not supported)', async () => {
      const result = await pollinations.generateText({ prompt: 'test' });
      expect(result).toBeNull();
    });
  });

  describe('generateImage', () => {
    it('should return correctly formatted URL', async () => {
      const result = await pollinations.generateImage({ 
        prompt: 'a cat',
        options: { width: 800, height: 600 }
      });
      
      expect(result).toContain('image.pollinations.ai');
      expect(result).toContain('a%20cat');
      expect(result).toContain('width=800');
      expect(result).toContain('height=600');
    });

    it('should use default dimensions', async () => {
      const result = await pollinations.generateImage({ prompt: 'test' });
      
      expect(result).toContain('width=600');
      expect(result).toContain('height=400');
    });
  });

  describe('generateTTS', () => {
    it('should return null (not supported)', async () => {
      const result = await pollinations.generateTTS({ text: 'test' });
      expect(result).toBeNull();
    });
  });
});

describe('Adapter Index', () => {
  describe('getAdapter', () => {
    it('should return correct adapters by ID', () => {
      expect(adapterIndex.getAdapter('gemini')).toBeDefined();
      expect(adapterIndex.getAdapter('openai')).toBeDefined();
      expect(adapterIndex.getAdapter('grok')).toBeDefined();
      expect(adapterIndex.getAdapter('murf')).toBeDefined();
      expect(adapterIndex.getAdapter('pollinations')).toBeDefined();
    });

    it('should return null for unknown adapter', () => {
      expect(adapterIndex.getAdapter('unknown')).toBeNull();
    });
  });

  describe('getProviderOrder functions', () => {
    it('should return default text order', () => {
      const order = adapterIndex.getTextProviderOrder();
      expect(order).toEqual(['gemini', 'openai', 'grok']);
    });

    it('should return default image order', () => {
      const order = adapterIndex.getImageProviderOrder();
      expect(order).toEqual(['openai', 'pollinations']);
    });

    it('should return default TTS order', () => {
      const order = adapterIndex.getTTSProviderOrder();
      expect(order).toEqual(['openai', 'murf']);
    });

    it('should use environment variable when set', () => {
      process.env.PROVIDER_TEXT_ORDER = 'openai,grok,gemini';
      const order = adapterIndex.getTextProviderOrder();
      expect(order).toEqual(['openai', 'grok', 'gemini']);
      delete process.env.PROVIDER_TEXT_ORDER;
    });
  });

  describe('getAllAdapters', () => {
    it('should return all adapters', () => {
      const adapters = adapterIndex.getAllAdapters();
      expect(Object.keys(adapters)).toContain('gemini');
      expect(Object.keys(adapters)).toContain('openai');
      expect(Object.keys(adapters)).toContain('grok');
      expect(Object.keys(adapters)).toContain('murf');
      expect(Object.keys(adapters)).toContain('pollinations');
    });
  });
});
