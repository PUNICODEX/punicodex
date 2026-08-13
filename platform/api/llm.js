/**
 * PuniCodex — shared LLM client (OpenAI-compatible).
 *
 * One client for every generative feature (Oracle polish today; the
 * self-hosted PuniCodex student model tomorrow). Any OpenAI-compatible
 * endpoint works: OpenAI, OpenRouter, Together, Fireworks, vLLM, or a local
 * server — the caller passes baseUrl/key/model, this module owns the
 * transport discipline: hard timeout, exactly one backoff retry on 429/5xx,
 * and null-on-failure so callers degrade gracefully instead of erroring
 * user-facing requests.
 */

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_TIMEOUT_MS = 20000;

/**
 * @param {object} opts
 * @param {string} opts.apiKey — bearer key (required; caller checks isConfigured).
 * @param {string} opts.model — model id served by the endpoint.
 * @param {Array<{role: string, content: string}>} opts.messages
 * @param {string} [opts.baseUrl] — OpenAI-compatible base; default OpenAI.
 * @param {number} [opts.temperature]
 * @param {number} [opts.maxTokens]
 * @param {number} [opts.timeoutMs]
 * @returns {Promise<string|null>} message content, or null on any failure.
 */
async function chat({
  apiKey,
  model,
  messages,
  baseUrl = DEFAULT_BASE_URL,
  temperature = 0.2,
  maxTokens = 512,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  if (!apiKey || !model) return null;
  const url = `${String(baseUrl).replace(/\/+$/, '')}/chat/completions`;

  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        // Rate limits and server errors get exactly one retry; everything
        // else (auth, bad request) is final.
        if ((res.status === 429 || res.status >= 500) && attempt === 0) {
          await sleep(750);
          continue;
        }
        return null;
      }
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      return typeof content === 'string' && content.trim() ? content : null;
    } catch {
      if (attempt === 0) {
        await sleep(750);
        continue;
      }
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = { chat, DEFAULT_BASE_URL };
