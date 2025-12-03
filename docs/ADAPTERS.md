# Provider Adapters

This module implements provider-specific adapters with deterministic fallback order for text, image, and TTS generation.

## Supported Providers

| Provider ID | Text Generation | Image Generation | TTS (Text-to-Speech) |
|------------|-----------------|------------------|---------------------|
| `gemini`   | ✅ Primary      | ❌               | ❌                  |
| `openai`   | ✅ Secondary    | ✅ Primary       | ✅ Primary          |
| `grok`     | ✅ Tertiary     | ❌               | ❌                  |
| `murf`     | ❌              | ❌               | ✅ Fallback         |

## Environment Variables

Configure the following environment variables in your Vercel project or `.env` file:

| Variable         | Required For | Description                    |
|-----------------|--------------|--------------------------------|
| `GEMINI_API_KEY` | Gemini       | Google AI Gemini API key       |
| `OPENAI_API_KEY` | OpenAI       | OpenAI API key for ChatGPT, DALL-E, TTS |
| `XAI_API_KEY`    | Grok         | xAI Grok API key               |
| `MURF_API_KEY`   | Murf         | Murf AI API key for TTS        |

## Fallback Order

### Text Generation (`/api/chat`)
1. **Gemini** (primary) - Google's Gemini 1.5 Flash model
2. **OpenAI** (secondary) - GPT-4o-mini model
3. **Grok** (tertiary) - xAI's Grok beta model

### Image Generation (`/api/image`)
1. **OpenAI** (primary) - DALL-E 3 model
2. **Pollinations** (fallback) - Free service, no API key required

### TTS Generation (`/api/tts`)
1. **OpenAI** (primary) - TTS-1 model with Nova voice
2. **Murf** (fallback) - Murf AI TTS service

## Architecture

### Base Adapter
All provider adapters extend the `BaseAdapter` class which defines the interface:

```javascript
class BaseAdapter {
    constructor(providerId);
    isConfigured();      // Check if API key is present
    generateText(options);  // Text completion
    generateImage(options); // Image generation
    generateTTS(options);   // Text-to-speech
}
```

### Deterministic Fallback
The `executeWithFallback` function tries adapters in order until one succeeds:

```javascript
import { executeWithFallback, createTextAdapters } from './adapters/index.js';

const adapters = createTextAdapters(); // Returns [Gemini, OpenAI, Grok]
const { result, providerId } = await executeWithFallback(
    adapters,
    (adapter) => adapter.generateText({ messages, system })
);
```

## API Endpoints

### POST `/api/chat`
Text generation with deterministic fallback order.

**Request:**
```json
{
    "messages": [{"role": "user", "content": "Hello"}],
    "system": "You are a helpful assistant."
}
```

**Response:**
```json
{
    "result": "{\"response\": \"Hello! How can I help?\"}",
    "providerId": "gemini"
}
```

### GET `/api/image?prompt=<prompt>`
Image generation with OpenAI DALL-E, falling back to Pollinations.

**Response:** Redirects to generated image URL (302)

### POST `/api/tts`
Text-to-speech with OpenAI primary and Murf fallback.

**Request:**
```json
{
    "text": "Hello world",
    "lang": "en"
}
```

**Response:** Audio blob (audio/mpeg) with `X-Provider-Id` header

## Adding New Providers

1. Create a new adapter file in `/api/adapters/`:

```javascript
import { BaseAdapter } from './base.js';

export class NewProviderAdapter extends BaseAdapter {
    constructor() {
        super('new-provider');
        this.apiKey = process.env.NEW_PROVIDER_API_KEY;
    }

    isConfigured() {
        return Boolean(this.apiKey);
    }

    async generateText({ messages, system }) {
        // Implementation
    }

    // ... other methods
}
```

2. Export from `/api/adapters/index.js`

3. Add to the appropriate factory function (e.g., `createTextAdapters()`)

## Testing

Run tests with:
```bash
npm test
```

Tests cover:
- Base adapter interface
- JSON cleaning utility
- Deterministic fallback execution
- Individual adapter configuration checks
- Factory function ordering

## Error Handling

When all providers fail, the API returns a 500 error with details:
```json
{
    "error": "All AIs failed",
    "details": "All providers failed: [{\"providerId\":\"gemini\",\"error\":\"API error\"}...]"
}
```

For image generation, if OpenAI fails, the system automatically falls back to the free Pollinations service.

For TTS, if all providers fail, the frontend should fall back to the browser's native speech synthesis.
