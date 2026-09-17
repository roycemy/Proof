/* Proof realtime session minter. Runs on Vercel (Node serverless function).
   Mints a short-lived OpenAI Realtime client secret so the browser never
   touches the provider key. Requires OPENAI_API_KEY in the project env. */
const REALTIME_MODEL = 'gpt-realtime-2.1-mini';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    res.status(503).json({ error: 'Proof realtime is not configured yet: set OPENAI_API_KEY in the Vercel project environment variables.' });
    return;
  }
  try {
    const upstream = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ session: { type: 'realtime', model: REALTIME_MODEL } })
    });
    const data = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: (data && data.error && data.error.message) || 'The realtime provider rejected the session request.' });
      return;
    }
    res.status(200).json(data);
  } catch (err) {
    res.status(502).json({ error: 'Could not reach the realtime provider.' });
  }
};
