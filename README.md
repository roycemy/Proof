# Proof

Type one messy sentence, get a founder plan. Proof shapes a rough idea (or helps you find one in a short guided conversation), matches the idea and the founder with the right entrepreneurship framework, and turns it into a tailored first-week plan.

## Run it

Open `index.html` in a browser, or serve the folder with any static server. It is plain HTML/CSS/JS - no build step.

## Real-time voice

The voice conversation uses OpenAI's Realtime API (`gpt-realtime-2.1-mini`, speech-to-speech over WebRTC). The browser never sees a provider key: `api/realtime/session.js` is a small Vercel serverless function that mints short-lived client secrets using the `OPENAI_API_KEY` environment variable set in the Vercel project. Until that variable is set, the endpoint returns a clear "not configured" response and the app says so instead of faking voice.

Deploy: import this repo into Vercel (free tier). No build step - static files plus the `/api` function work with zero configuration. Set `OPENAI_API_KEY` in the Vercel project's Environment Variables, then redeploy.

## Honest limits

- Accounts are local to the browser (passwords are hashed, stored in localStorage). They do not sync across devices, and clearing site data deletes them.
- LinkedIn sign-in and LinkedIn import are not connected - they are shown as unavailable rather than faked.
- The guided ideation and coach are rules-based local experiences, not live AI models.

