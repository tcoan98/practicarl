# PracticarL

A free, browser-based Spanish practice website hosted on GitHub Pages.

## Features

- Username-only browser-local profiles (no passwords)
- Offline branching conversations across weekend plans, restaurants, travel, learning, and hypothetical plans
- Keyword-based topic/intent matching with context-specific branches and clarification requests for very short or unclear replies
- Three approximate difficulty levels, adjusted using sentence-length and language-pattern heuristics
- Natural goodbye detection and manual conversation endings
- Five-question English/Spanish vocabulary quizzes
- Conversation and quiz history, statistics, and JSON data export/import

## Running

Open `index.html` or enable GitHub Pages: Settings → Pages → Deploy from branch → `main` / `(root)`.

## Stage 1 limitations

This version does **not** call a generative AI service or translation API. Its dialogue follows predefined branches and cannot reliably understand arbitrary Spanish, judge grammatical correctness, or provide individualized corrections. The difficulty estimate is a simple heuristic, not a validated proficiency assessment. Only predefined assistant lines have English translations. User sentences are saved verbatim.

Progress is stored in the browser under the chosen username, not synced across devices or protected from other users of the same browser. Export your progress before clearing browser data.

## Future stages

Add a translation service for user sentences and optional grammar checks, then consider a tightly limited generative AI fallback only when rule-based recognition cannot handle a reply.

## Optional Gemini fallback (Cloudflare)

The browser calls `https://practicarl-api.tcoan98.workers.dev/fallback` only when the user opts into AI. The frontend never contains the Gemini key.

### Deploy the Worker

1. Open Cloudflare Dashboard → Workers & Pages → `practicarl-api` → **Edit code**.
2. Replace the default Worker script with the complete contents of [cloudflare-worker.js](cloudflare-worker.js).
3. Save and deploy.
4. Under Settings → Variables and Secrets, confirm an encrypted **Secret** named exactly `GEMINI_API_KEY` is present.
5. Open PracticarL and enable **optional Gemini AI fallback** on the home screen. Test an unexpected response.

The Worker only accepts browser requests with origin `https://tcoan98.github.io`, caps request size and conversation length, and uses a **best-effort** per-IP daily request ceiling (12 per isolate). **Important:** the in-memory counter is not a durable or global hard cap; origin checks can also be forged by non-browser clients. A truly enforceable global budget requires durable rate limiting (e.g., Cloudflare rate-limiting rules or a Durable Object), and provider-side quotas should be configured separately. This is not suitable as an unrestricted public production endpoint without additional abuse protection.

The code uses Gemini `gemini-2.5-flash-lite`; model availability and free-tier quotas can change. If a call fails, PracticarL falls back to offline responses. No automatic paid billing is configured by this code, but review your Google project billing settings independently.

**Privacy:** AI-enabled messages and recent conversation context are transmitted to Google's Gemini API. Do not submit sensitive information. The local username is not sent by the frontend integration. Gemini free-tier data policies may allow data use for product improvement.

### Natural conversation update

With AI enabled, Gemini now handles each conversational reply to preserve context, accept imperfect/mixed-language Spanish, and recast vocabulary naturally. This intentionally uses more API requests than the earlier strict fallback approach (typically one per user turn). The existing offline engine remains a fallback when AI is disabled or unavailable. The best-effort 12-request-per-IP daily limit still applies and may interrupt longer conversations. **After repository changes, manually redeploy the latest `cloudflare-worker.js` in Cloudflare's code editor; GitHub Pages updates do not deploy Worker code.**
