# Security

## Data Model

**Never stored** (session-only, in memory):
- API keys and authentication tokens
- Payment or billing information

**Stored in localStorage**:
- Chat history and AI responses
- Provider configs (name, model, endpoint — no API keys)
- UI preferences, templates, folders, memory entries

## API Key Handling

API keys are entered at runtime and kept only in React state. They are never written to localStorage, never logged, and cleared when the page is closed. The app makes API calls directly from the browser to the configured provider endpoints.

## AI Memory

Memory entries are stored in `localStorage` under `samvada-studio-memory`. They contain extracted user preferences — no API keys, credentials, or sensitive personal data. Memory extraction uses a locally-running Ollama model; nothing is sent to any external service during extraction.

## Reporting a Vulnerability

Open a [GitHub Issue](https://github.com/dhruvinrsoni/samvada-studio/issues) and label it `security`. For sensitive disclosures, contact the maintainer directly via GitHub profile.
