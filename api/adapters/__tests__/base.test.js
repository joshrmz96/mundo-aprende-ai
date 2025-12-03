import { BaseAdapter, cleanJSON, executeWithFallback } from '../base.js';

describe('cleanJSON', () => {
    test('should return empty object for null/undefined input', () => {
        expect(cleanJSON(null)).toBe('{}');
        expect(cleanJSON(undefined)).toBe('{}');
        expect(cleanJSON('')).toBe('{}');
    });

    test('should remove markdown code blocks', () => {
        const input = '```json\n{"key": "value"}\n```';
        expect(cleanJSON(input)).toBe('{"key": "value"}');
    });

    test('should extract JSON from text with surrounding content', () => {
        const input = 'Here is the response: {"key": "value"} - end';
        expect(cleanJSON(input)).toBe('{"key": "value"}');
    });

    test('should handle clean JSON input', () => {
        const input = '{"key": "value"}';
        expect(cleanJSON(input)).toBe('{"key": "value"}');
    });

    test('should handle nested JSON', () => {
        const input = '{"outer": {"inner": "value"}}';
        expect(cleanJSON(input)).toBe('{"outer": {"inner": "value"}}');
    });
});

describe('BaseAdapter', () => {
    test('should throw error for unimplemented isConfigured', () => {
        const adapter = new BaseAdapter('test');
        expect(() => adapter.isConfigured()).toThrow('isConfigured() must be implemented');
    });

    test('should throw error for unimplemented generateText', async () => {
        const adapter = new BaseAdapter('test');
        await expect(adapter.generateText({})).rejects.toThrow('generateText() must be implemented');
    });

    test('should throw error for unimplemented generateImage', async () => {
        const adapter = new BaseAdapter('test');
        await expect(adapter.generateImage({})).rejects.toThrow('generateImage() must be implemented');
    });

    test('should throw error for unimplemented generateTTS', async () => {
        const adapter = new BaseAdapter('test');
        await expect(adapter.generateTTS({})).rejects.toThrow('generateTTS() must be implemented');
    });

    test('should store providerId', () => {
        const adapter = new BaseAdapter('my-provider');
        expect(adapter.providerId).toBe('my-provider');
    });
});

describe('executeWithFallback', () => {
    // Mock adapter implementation for testing
    class MockAdapter extends BaseAdapter {
        constructor(providerId, shouldSucceed = true, isConfiguredValue = true) {
            super(providerId);
            this.shouldSucceed = shouldSucceed;
            this.isConfiguredValue = isConfiguredValue;
        }

        isConfigured() {
            return this.isConfiguredValue;
        }
    }

    test('should return result from first successful adapter', async () => {
        const adapters = [
            new MockAdapter('first', true),
            new MockAdapter('second', true)
        ];

        const result = await executeWithFallback(adapters, async (adapter) => {
            return `Result from ${adapter.providerId}`;
        });

        expect(result.result).toBe('Result from first');
        expect(result.providerId).toBe('first');
    });

    test('should fallback to next adapter on failure', async () => {
        const adapters = [
            new MockAdapter('first', false),
            new MockAdapter('second', true)
        ];

        const result = await executeWithFallback(adapters, async (adapter) => {
            if (adapter.providerId === 'first') {
                throw new Error('First failed');
            }
            return `Result from ${adapter.providerId}`;
        });

        expect(result.result).toBe('Result from second');
        expect(result.providerId).toBe('second');
    });

    test('should skip unconfigured adapters', async () => {
        const adapters = [
            new MockAdapter('first', true, false), // not configured
            new MockAdapter('second', true, true)  // configured
        ];

        const result = await executeWithFallback(adapters, async (adapter) => {
            return `Result from ${adapter.providerId}`;
        });

        expect(result.result).toBe('Result from second');
        expect(result.providerId).toBe('second');
    });

    test('should throw error when all adapters fail', async () => {
        const adapters = [
            new MockAdapter('first', false),
            new MockAdapter('second', false)
        ];

        await expect(executeWithFallback(adapters, async (adapter) => {
            throw new Error(`${adapter.providerId} failed`);
        })).rejects.toThrow('All providers failed');
    });

    test('should throw error when all adapters are unconfigured', async () => {
        const adapters = [
            new MockAdapter('first', true, false),
            new MockAdapter('second', true, false)
        ];

        await expect(executeWithFallback(adapters, async () => {
            return 'should not reach here';
        })).rejects.toThrow('All providers failed');
    });

    test('should maintain deterministic order of fallback', async () => {
        const callOrder = [];
        const adapters = [
            new MockAdapter('gemini', false),
            new MockAdapter('openai', false),
            new MockAdapter('grok', true)
        ];

        const result = await executeWithFallback(adapters, async (adapter) => {
            callOrder.push(adapter.providerId);
            if (adapter.providerId !== 'grok') {
                throw new Error(`${adapter.providerId} failed`);
            }
            return `Result from ${adapter.providerId}`;
        });

        expect(callOrder).toEqual(['gemini', 'openai', 'grok']);
        expect(result.providerId).toBe('grok');
    });
});
