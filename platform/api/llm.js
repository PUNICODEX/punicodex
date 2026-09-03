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

function backoffMs(attempt) {
  // Exponential backoff with jitter: 750ms → 1.5s → 3s (+0–250ms jitter).
  return Math.min(750 * 2 ** attempt, 5000) + Math.floor(Math.random() * 250);
}

function retryAfterMs(res, attempt) {
  const raw = res?.headers?.get?.('retry-after');
  const seconds = raw ? Number(raw) : NaN;
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 8000);
  return backoffMs(attempt);
}

/**
 * Detailed variant of chat(): same transport discipline (hard timeout,
 * bounded jittered retries, Retry-After honored on 429) but reports the
 * failure class so callers can distinguish a rate limit from a timeout from
 * an empty completion instead of guessing at a null.
 *
 * @returns {Promise<{content: string|null, error: string|null}>}
 *   error is one of: unconfigured | http_429 | http_5xx | http_<status> |
 *   timeout | network | empty | null (success).
 */
async function chatDetailed({
  apiKey,
  model,
  messages,
  baseUrl = DEFAULT_BASE_URL,
  temperature = 0.2,
  maxTokens = 512,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxAttempts = 3,
}) {
  if (!apiKey || !model) return { content: null, error: 'unconfigured' };
  const url = `${String(baseUrl).replace(/\/+$/, '')}/chat/completions`;
  let lastError = 'unknown';

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const last = attempt === maxAttempts - 1;
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
        if (res.status === 429) {
          lastError = 'http_429';
          if (!last) {
            await sleep(retryAfterMs(res, attempt));
            continue;
          }
          return { content: null, error: lastError };
        }
        if (res.status >= 500) {
          lastError = 'http_5xx';
          if (!last) {
            await sleep(backoffMs(attempt));
            continue;
          }
          return { content: null, error: lastError };
        }
        // Auth and bad-request failures are final.
        return { content: null, error: `http_${res.status}` };
      }
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      return typeof content === 'string' && content.trim()
        ? { content, error: null }
        : { content: null, error: 'empty' };
    } catch (err) {
      lastError = err?.name === 'AbortError' ? 'timeout' : 'network';
      if (!last) {
        await sleep(backoffMs(attempt));
        continue;
      }
      return { content: null, error: lastError };
    } finally {
      clearTimeout(timer);
    }
  }
  return { content: null, error: lastError };
}

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
async function chat(opts) {
  // Compatibility wrapper: exactly one retry (two attempts), null on failure.
  const { content } = await chatDetailed({ ...opts, maxAttempts: 2 });
  return content;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = { chat, chatDetailed, DEFAULT_BASE_URL };
