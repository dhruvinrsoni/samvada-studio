# Troubleshooting

## CORS Errors (OpenAI / Anthropic / Azure)

**Symptom:** `CORS policy: No 'Access-Control-Allow-Origin' header`

OpenAI and Anthropic intentionally block direct browser access. You need a proxy.

**Local dev:**
```bash
npm run proxy:insecure
# Then set proxy URL to http://localhost:8080 in provider settings
```

**Hosted (GitHub Pages):** Deploy a Cloudflare Worker, or switch to Google Gemini (no proxy needed).

---

## Ollama Not Working

**Start Ollama:**
```bash
ollama serve
```

**Pull a model:**
```bash
ollama pull llama3.2
ollama list   # see installed models
```

**Check it's running:**
```bash
curl http://localhost:11434/api/tags
```

If you get a 404, the model name in provider settings doesn't match an installed model. Update it in Admin → provider → Model dropdown.

---

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `CORS policy: No 'Access-Control-Allow-Origin'` | No proxy for OpenAI/Anthropic | Run proxy or switch to Gemini/Ollama |
| `404 Not Found` on first message | Ollama not running or model not installed | `ollama serve` + `ollama pull <model>` |
| `LLM provider is not properly configured` | Missing API key or endpoint | Admin → provider → check key/endpoint |
| `No LLM provider selected` | No default set | Admin → provider → Set as Default |
| `Provider is disabled` | Provider toggled off | Admin → provider → enable toggle |
| API key not persisting | Incognito mode or storage blocked | Use normal browser window |
| Slow responses (Ollama) | Model too large for hardware | Switch to a smaller model (`phi`, `mistral`) |

---

## Firewall / Port Issues

If Ollama times out, check port 11434 isn't blocked:

```bash
# Windows
netstat -ano | findstr :11434

# Mac/Linux
lsof -i :11434
```

Allow the port in your firewall or change Ollama's port.

---

## Still stuck?

Open browser DevTools (F12 → Console) and check for error messages. File an issue at [github.com/dhruvinrsoni/samvada-studio](https://github.com/dhruvinrsoni/samvada-studio/issues) with the error message, browser, and OS.
