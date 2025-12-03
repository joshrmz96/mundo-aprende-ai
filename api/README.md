# API Documentation

This API provides text generation, image generation, and text-to-speech (TTS) capabilities using a deterministic fallback system across multiple AI providers.

## Provider Adapters

The API uses a modular adapter system that supports multiple providers with automatic fallback:

### Text Providers
- **gemini** - Google Gemini 1.5 Flash
- **openai** - OpenAI GPT-4o-mini
- **grok** - xAI Grok Beta

### Image Providers
- **pollinations** - Pollinations.ai (free, URL-based)
- **openai** - OpenAI DALL-E 3

### TTS Providers
- **openai** - OpenAI TTS-1
- **murf** - Murf.ai

## Environment Variables

### API Keys

| Variable | Description | Required For |
|----------|-------------|--------------|
| `GEMINI_API_KEY` | Google Gemini API key | Text generation with Gemini |
| `OPENAI_API_KEY` | OpenAI API key | Text, Image, TTS with OpenAI |
| `XAI_API_KEY` | xAI API key | Text generation with Grok |
| `MURF_API_KEY` | Murf.ai API key | TTS with Murf |

### Provider Order Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `TEXT_PROVIDERS` | `gemini,openai,grok` | Comma-separated list of text providers in fallback order |
| `IMAGE_PROVIDERS` | `pollinations,openai` | Comma-separated list of image providers in fallback order |
| `TTS_PROVIDERS` | `openai,murf` | Comma-separated list of TTS providers in fallback order |
| `TIMEOUT_MS` | `30000` | Request timeout in milliseconds |

### Backwards Compatibility

The following legacy environment variables are still supported and will override the provider order:

| Variable | Description |
|----------|-------------|
| `PRIMARY_TEXT_PROVIDER` | Provider to try first for text generation |
| `PRIMARY_IMAGE_PROVIDER` | Provider to try first for image generation |
| `PRIMARY_TTS_PROVIDER` | Provider to try first for TTS |

## API Endpoints

### POST /api/chat

Generate text responses using AI.

**Request:**
```json
{
  "messages": [
    {"role": "user", "content": "Hello"}
  ],
  "system": "You are a helpful assistant."
}
```

**Response:**
```json
{
  "result": "{\"response\": \"Hello! How can I help?\"}",
  "provider": "gemini"
}
```

**Sample curl:**
```bash
curl -X POST https://your-domain.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "What is 2+2?"}],
    "system": "You are a math tutor. Respond with JSON."
  }'
```

### GET /api/image

Generate images from text prompts.

**Query Parameters:**
- `prompt` (required) - Text description of the image to generate

**Response:**
- Redirects to image URL (302) when using URL-based providers
- Returns JSON with base64 data when using base64-based providers:
```json
{
  "base64": "iVBORw0KGgo...",
  "provider": "openai"
}
```

**Sample curl:**
```bash
# Get image URL (redirect)
curl -L "https://your-domain.com/api/image?prompt=a%20cute%20cat"

# Get response headers only (to see redirect)
curl -I "https://your-domain.com/api/image?prompt=a%20cute%20cat"
```

### POST /api/tts

Convert text to speech.

**Request:**
```json
{
  "text": "Hello, how are you?",
  "lang": "en-US"
}
```

**Response:**
- Returns audio/mpeg binary data
- `X-Provider` header indicates which provider was used

**Sample curl:**
```bash
# Save audio to file
curl -X POST https://your-domain.com/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world", "lang": "en-US"}' \
  --output speech.mp3

# Check which provider was used
curl -X POST https://your-domain.com/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Test", "lang": "en-US"}' \
  -I
```

## Fallback Behavior

When a provider fails, the system automatically tries the next provider in the configured order:

1. Each provider is tried in sequence
2. If a provider fails (API error, timeout, missing key), a warning is logged
3. The next provider in the list is attempted
4. If all providers fail, an error response is returned

**Example console output:**
```
[gemini] Gemini API error: 429
[openai] Request succeeded
```

## Timeouts

- Default timeout: 30 seconds
- Image generation timeout: 60 seconds (DALL-E can be slow)
- Configure via `TIMEOUT_MS` environment variable

## Response Normalization

All responses are normalized to consistent formats:

### Text Response
```json
{
  "text": "response content",
  "provider": "provider_id"
}
```

### Image Response
```json
{
  "imageUrl": "https://...",  // URL if available
  "base64": "...",            // Base64 if available
  "provider": "provider_id"
}
```

### TTS Response
```json
{
  "audioUrl": "https://...",  // URL if available
  "base64": "...",            // Base64 if available
  "provider": "provider_id"
}
```

## Running Tests

```bash
npm test
```

The test suite includes mock fetch tests that simulate provider failures to verify the fallback behavior works correctly.
