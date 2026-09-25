/* Metadata-only Realtime observability. No conversation content is accepted or forwarded.
   The WebRTC conversation runs in the browser, so it reports only allowlisted timing
   and usage fields here. Langfuse credentials stay in the Vercel function. */
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { LangfuseSpanProcessor } = require('@langfuse/otel');
const { startObservation } = require('@langfuse/tracing');
const MODEL = 'gpt-realtime-2.1-mini';

const processor = new LangfuseSpanProcessor();
const sdk = new NodeSDK({ spanProcessors: [processor] });
if (process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY) sdk.start();

function bounded(value, max) {
  return Number.isSafeInteger(value) && value >= 0 && value <= max ? value : undefined;
}
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  // Browser same-origin request; a strict payload allowlist below is the privacy boundary.
  if (req.headers.origin && req.headers.origin !== `https://${req.headers.host}` &&
      req.headers.origin !== 'http://localhost:3000') return res.status(403).end();
  if (!process.env.LANGFUSE_PUBLIC_KEY || !process.env.LANGFUSE_SECRET_KEY) return res.status(204).end();
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  if (JSON.stringify(body).length > 1024 || body.type !== 'voice_response') return res.status(400).end();
  const durationMs = bounded(body.duration_ms, 3600000);
  const inputTokens = bounded(body.input_tokens, 1000000);
  const outputTokens = bounded(body.output_tokens, 1000000);
  const audioInputTokens = bounded(body.audio_input_tokens, 1000000);
  const audioOutputTokens = bounded(body.audio_output_tokens, 1000000);
  const result = body.result === 'completed' || body.result === 'cancelled' || body.result === 'failed' ? body.result : 'unknown';
  try {
    const generation = startObservation('proof-voice-response', {
      model: MODEL,
      metadata: {
        result,
        ...(durationMs !== undefined ? { duration_ms: durationMs } : {}),
        source: 'browser-realtime-metadata'
      },
      usageDetails: {
        ...(inputTokens !== undefined ? { input: inputTokens } : {}),
        ...(outputTokens !== undefined ? { output: outputTokens } : {}),
        ...(audioInputTokens !== undefined ? { audio_input: audioInputTokens } : {}),
        ...(audioOutputTokens !== undefined ? { audio_output: audioOutputTokens } : {})
      }
      // No input, output, transcript, audio, user ID, or arbitrary body fields.
    }, { asType: 'generation' });
    generation.end();
    await processor.forceFlush();
  } catch (e) {
    // Observability must never break the voice session or echo secrets to clients.
    return res.status(204).end();
  }
  return res.status(204).end();
};
