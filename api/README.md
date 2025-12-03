# API Documentation

This directory contains the API endpoints for the Mundo Aprende AI platform. The API uses a robust multi-provider architecture with deterministic fallback order for resilient content generation.

## Architecture Overview

The API uses an adapter-based system that allows multiple AI providers to be configured for each modality (text, image, TTS). If one provider fails, the system automatically falls back to the next provider in the configured order.

## Provider Fallback Order

### Text Generation
1. **Gemini** (Google) - Primary
2. **OpenAI** (ChatGPT) - Secondary
3. **Grok** (xAI) - Tertiary

### Image Generation
1. **Gemini** (if available) - Primary
2. **OpenAI** (DALL-E) - Secondary
3. **Pollinations** - Fallback (free, no API key required)

### Text-to-Speech (TTS)
1. **OpenAI** - Primary
2. **Gemini** - Secondary
3. **Murf** - Tertiary

## Environment Variables

Configure the following environment variables in your Vercel project or `.env` file:

### Provider Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `TEXT_PROVIDERS` | Comma-separated list of text generation providers | `gemini,openai,grok` |
| `IMAGE_PROVIDERS` | Comma-separated list of image generation providers | `gemini,openai` |
| `TTS_PROVIDERS` | Comma-separated list of TTS providers | `openai,gemini,murf` |
| `TIMEOUT_MS` | Request timeout in milliseconds (default: 30000) | `30000` |

### API Keys

| Variable | Provider | Required For |
|----------|----------|--------------|
| `GEMINI_API_KEY` | Google Gemini | Text, Image |
| `OPENAI_API_KEY` | OpenAI | Text, Image, TTS |
| `XAI_API_KEY` | Grok (xAI) | Text |
| `MURF_API_KEY` | Murf.ai | TTS |

## API Endpoints

### POST `/api/chat`

Generate text content using the configured text providers.

**Request Body:**
```json
{
  "messages": [
    { "role": "user", "content": "Hello" }
  ],
  "system": "You are a helpful assistant."
}
```

**Response:**
```json
{
  "result": "{ ... JSON response ... }",
  "provider": "gemini"
}
```

### GET `/api/image`

Generate an image based on a text prompt.

**Query Parameters:**
- `prompt` (required): Description of the image to generate

**Example:**
```
GET /api/image?prompt=a%20friendly%20robot%20teaching%20math
```

**Response:** Redirects to the generated image URL or returns image data directly.

### POST `/api/tts`

Convert text to speech audio.

**Request Body:**
```json
{
  "text": "Hello, world!",
  "voice": "nova",
  "lang": "en-US"
}
```

**Response:** Returns audio data as `audio/mpeg` binary stream.

## Adapters

The adapter system is located in `/api/adapters/`:

- `gemini.js` - Google Gemini adapter
- `openai.js` - OpenAI adapter (ChatGPT, DALL-E, TTS)
- `grok.js` - Grok (xAI) adapter
- `murf.js` - Murf.ai adapter (TTS only)
- `index.js` - Adapter loader and fallback execution

### Using Adapters Directly

```javascript
import { getAdapter, executeWithFallback } from './adapters/index.js';

// Get a specific adapter
const gemini = getAdapter('gemini');
const result = await gemini.generateText({ prompt: 'Hello' });

// Or use automatic fallback
const result = await executeWithFallback('text', 'generateText', {
  prompt: 'Hello',
  options: { system: 'Be helpful' }
});
```

## Vercel Configuration

To deploy to Vercel, add the required environment variables in your Vercel project settings:

1. Go to your project dashboard
2. Navigate to Settings → Environment Variables
3. Add each API key for the providers you want to use
4. Optionally configure `TEXT_PROVIDERS`, `IMAGE_PROVIDERS`, `TTS_PROVIDERS` to customize the fallback order

## Error Handling

- All endpoints return appropriate HTTP status codes
- Error responses include a JSON body with an `error` field
- If all providers fail, a 500 error is returned with details
- TTS endpoint returns 500 to allow frontend fallback to browser native speech

## Timeouts

Each provider request respects the `TIMEOUT_MS` environment variable (default: 30 seconds). If a provider times out, the system moves to the next provider in the fallback chain.
