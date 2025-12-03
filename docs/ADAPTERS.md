# AI Provider Adapters

This document describes the AI provider adapter system used in the Mundo Aprende AI platform. The adapter system provides a unified interface for accessing multiple AI providers with automatic fallback support.

## Overview

The adapter system allows the platform to use multiple AI providers for:
- **Text Generation** (Chat/Completion)
- **Image Generation**
- **Text-to-Speech (TTS)**

If the primary provider fails or doesn't support a particular modality, the system automatically falls back to the next provider in the configured order.

## Supported Providers

| Provider | ID | Text | Image | TTS |
|----------|-----|------|-------|-----|
| Google Gemini | `gemini` | ✅ | ❌ | ❌ |
| OpenAI (GPT/DALL-E) | `openai` | ✅ | ✅ | ✅ |
| Grok (xAI) | `grok` | ✅ | ❌ | ❌ |
| Murf AI | `murf` | ❌ | ❌ | ✅ |
| Pollinations | `pollinations` | ❌ | ✅ | ❌ |

## Configuration

### Environment Variables

#### API Keys (Required)

Each provider requires its respective API key to be configured:

```env
GEMINI_API_KEY=your-gemini-api-key
OPENAI_API_KEY=your-openai-api-key
XAI_API_KEY=your-xai-api-key
MURF_API_KEY=your-murf-api-key
```

Note: Pollinations does not require an API key.

#### Provider Order (Optional)

You can customize the fallback order for each modality using environment variables:

```env
# Text generation order (default: gemini,openai,grok)
PROVIDER_TEXT_ORDER=gemini,openai,grok

# Image generation order (default: openai,pollinations)
PROVIDER_IMAGE_ORDER=openai,pollinations

# TTS order (default: openai,murf)
PROVIDER_TTS_ORDER=openai,murf
```

## API Endpoints

### POST /api/chat

Text generation endpoint using the configured provider fallback order.

**Request:**
```json
{
  "messages": [
    {"role": "user", "content": "Hello, how are you?"}
  ],
  "system": "You are a helpful assistant."
}
```

**Response:**
```json
{
  "result": "{\"response\": \"I'm doing well, thank you!\"}"
}
```

### GET /api/image

Image generation endpoint.

**Parameters:**
- `prompt` (required): Image description

**Example:**
```
GET /api/image?prompt=a%20cat%20playing%20piano
```

**Response:** Redirects (302) to the generated image URL.

### POST /api/tts

Text-to-speech endpoint.

**Request:**
```json
{
  "text": "Hello, world!",
  "voice": "nova",
  "lang": "en"
}
```

**Response:** Audio file (audio/mpeg)

## Adapter Interface

Each adapter exports the following functions:

### generateText({ prompt, options, signal })

Generate text from a prompt.

**Parameters:**
- `prompt` (string): The input prompt
- `options` (object, optional):
  - `system` (string): System instruction
  - `messages` (array): Conversation history
  - `jsonMode` (boolean): Request JSON output
  - `timeout` (number): Request timeout in ms
- `signal` (AbortSignal, optional): Abort signal for cancellation

**Returns:** `Promise<string>` - Generated text, or `null` if not supported

### generateImage({ prompt, options, signal })

Generate an image from a prompt.

**Parameters:**
- `prompt` (string): Image description
- `options` (object, optional):
  - `width` (number): Image width
  - `height` (number): Image height
  - `style` (string): Style prefix
  - `timeout` (number): Request timeout in ms
- `signal` (AbortSignal, optional): Abort signal for cancellation

**Returns:** `Promise<string>` - Image URL, or `null` if not supported

### generateTTS({ text, voice, options, signal })

Generate speech from text.

**Parameters:**
- `text` (string): Text to convert to speech
- `voice` (string, optional): Voice ID
- `options` (object, optional):
  - `model` (string): TTS model
  - `timeout` (number): Request timeout in ms
- `signal` (AbortSignal, optional): Abort signal for cancellation

**Returns:** `Promise<Blob>` - Audio blob, or `null` if not supported

## Fallback Behavior

The adapter system uses a deterministic fallback approach:

1. Providers are tried in the configured order
2. If a provider returns `null` (doesn't support the modality), the next provider is tried
3. If a provider throws an error, the error is logged and the next provider is tried
4. If all providers fail, an error is returned with details about each failure

## Example Usage

### Using the Adapter Index

```javascript
import { 
  getAdapter, 
  generateText, 
  generateImage, 
  generateTTS 
} from './api/adapters/index.js';

// Get a specific adapter
const gemini = getAdapter('gemini');

// Or use the unified functions with automatic fallback
const text = await generateText({ 
  prompt: 'Tell me a joke',
  options: { jsonMode: true }
});

const imageUrl = await generateImage({ 
  prompt: 'a sunset over mountains' 
});

const audio = await generateTTS({ 
  text: 'Hello, world!', 
  voice: 'nova' 
});
```

### Using Individual Adapters

```javascript
import * as openai from './api/adapters/openai.js';

const text = await openai.generateText({
  prompt: 'Hello',
  options: {
    system: 'You are a helpful assistant',
    jsonMode: true
  }
});
```

## Testing

Run the adapter tests:

```bash
npm test
```

The test suite includes:
- API key configuration validation
- Correct API endpoint calls
- Response parsing
- Unsupported modality handling
- Fallback order configuration

## Error Handling

Adapters throw descriptive errors that include:
- Provider name
- HTTP status code
- Error message from the API

Example error:
```
OpenAI API error: 401 - Invalid authentication
```

When using the fallback system, if all providers fail, the error includes details from each:
```
All providers failed. Errors: gemini: GEMINI_API_KEY is not configured; openai: rate limit exceeded; grok: network timeout
```

## Adding New Providers

To add a new provider:

1. Create a new adapter file in `/api/adapters/` (e.g., `newprovider.js`)
2. Export the required functions: `generateText`, `generateImage`, `generateTTS`
3. Export `id` and `name` for identification
4. Add the adapter to the registry in `/api/adapters/index.js`
5. Add tests in `/api/adapters/__tests__/`
6. Update this documentation

## Security Notes

- API keys are stored as environment variables and never exposed to clients
- All API calls use HTTPS
- Timeouts are enforced to prevent hanging requests
- AbortController support allows request cancellation
