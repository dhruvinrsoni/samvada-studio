# LLM Providers

## Supported Providers

| Provider | Authentication | CORS Proxy Needed | Notes |
|----------|----------------|-------------------|-------|
| **OpenAI** | `Authorization: Bearer` | Yes | Dynamic model list |
| **Anthropic** | `x-api-key` header | Yes | Hardcoded models, `anthropic-version` header required |
| **Google Gemini** | Query param `?key=` | No | Dynamic model list |
| **Ollama** | None | No | Local service, dynamic via `/api/tags` |
| **Azure OpenAI** | `api-key` header | Yes | Deployment-based, `api-version` query param required |
| **Custom** | `Authorization: Bearer` | Depends | OpenAI-compatible format assumed |

## CORS

OpenAI, Anthropic, and Azure OpenAI don't allow direct browser access. You need a proxy:

- **Local dev**: `npm run proxy:insecure` → set proxy URL to `http://localhost:8080`
- **Hosted**: Deploy a Cloudflare Worker (free tier works)
- **No proxy**: Use Google Gemini or Ollama

## Provider Notes

**OpenAI** — Fetches model list from `/v1/models`, filters for chat models.

**Anthropic** — No model listing API; validates key with a test call, models are hardcoded. System prompt sent separately from messages.

**Google Gemini** — Fetches models with `generateContent` capability. Auto-corrects old endpoint format. Key goes in URL (`?key=`).

**Ollama** — Checks if service is running before each call. Verifies model is installed. Shows `ollama pull` command in error messages. 3-second connection timeout.

**Azure OpenAI** — "Model" field is actually the deployment name. Endpoint format: `https://{resource}.openai.azure.com/openai/deployments/{deployment}/chat/completions?api-version=2024-02-01`

**Custom** — Tries response paths: `choices[0].message.content`, then `response`, then `text`. Use for any OpenAI-compatible endpoint.

## Adding a New Provider

1. Add type to `src/types/index.ts` (`LLMProviderType`)
2. Add label, default endpoint, and default models to `src/components/admin/ProviderForm.tsx`
3. Add `case 'your-provider':` handler in `src/utils/llmService.ts`
4. Add model-fetching function and hook it into `ProviderForm.tsx` `useEffect`

See existing providers in `src/utils/llmService.ts` for reference.
