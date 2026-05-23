# ChatGPT Mobile via GPT Actions

ChatGPT mobile cannot use custom MCP apps directly today. Use a Custom GPT with
GPT Actions pointed at the MemRoOS HTTP bridge instead.

## Endpoints

The bridge is served by the main MemRoOS Next.js app:

- `GET /api/chatgpt/actions/openapi` - OpenAPI schema for the Custom GPT editor
- `POST /api/chatgpt/actions/search` - search MemRoOS memory
- `POST /api/chatgpt/actions/fetch` - expand a search result
- `POST /api/chatgpt/actions/save` - save a memory when explicitly requested

All action endpoints require an API key outside loopback:

```bash
MEMROOS_CHATGPT_ACTIONS_API_KEY="$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')"
```

Configure the Custom GPT Action authentication as **API Key**, send it as a
custom header named `x-api-key`, and paste the generated value there.

## Custom GPT Setup

1. Make sure the MemRoOS app is reachable over HTTPS, for example:

   ```text
   https://your-memroos.example.com
   ```

2. In the GPT editor on ChatGPT web, create a GPT named `MemRoOS`.
3. Add an Action.
4. Import or paste the schema from:

   ```text
   https://your-memroos.example.com/api/chatgpt/actions/openapi
   ```

5. Set authentication:
   - Type: API Key
   - Auth type: Custom
   - Header name: `x-api-key`
   - Value: the `MEMROOS_CHATGPT_ACTIONS_API_KEY`

6. Save the GPT. Then open it from ChatGPT mobile.

## Suggested GPT Instructions

```text
You are MemRoOS Mobile, Luis Calderon's personal memory interface.

Use searchMemroos when Luis asks what he knows, remembers, decided, worked on,
or previously found. Prefer MemRoOS results over generic memory or web browsing
for Luis-specific context.

Use fetchMemroosResult when a search result needs more detail.

Use saveMemroosMemory only when Luis explicitly asks you to remember, save, log,
archive, or add something to MemRoOS. Do not save casual conversation unless he
asks. Summarize what you saved after the action succeeds.
```

## Local Smoke Tests

Local loopback calls do not require the API key unless
`MEMROOS_CHATGPT_ACTIONS_REQUIRE_KEY_LOCAL=true`.

```bash
curl -sS http://127.0.0.1:3002/api/chatgpt/actions/openapi | jq '.info.title'

curl -sS http://127.0.0.1:3002/api/chatgpt/actions/search \
  -H 'Content-Type: application/json' \
  -d '{"query":"MemRoOS MCP","limit":3}' | jq '.results[0]'
```
