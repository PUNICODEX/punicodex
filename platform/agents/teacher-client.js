/**
 * Teacher Client — minimal OpenAI-compatible chat client.
 *
 * Private to the teacher-distillation pipeline
 * (`scripts/generate-teacher-corpus.js`); not used by any other module.
 *
 * Configuration is entirely env-driven:
 *   TEACHER_BASE_URL  OpenAI-compatible API base (default https://api.openai.com/v1)
 *   TEACHER_API_KEY   bearer token
 *   TEACHER_MODEL     model name to request
 *
 * The client never throws: any failure (missing config, network error,
 * timeout, non-2xx status, malformed body) resolves to null so the pipeline
 * can log the rejection and continue with the next entry.
 */

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const TIMEOUT_MS = 20000;
const DEFAULT_RETRY_DELAY_MS = 1000;

function getConfig() {
  return {
    baseUrl: (process.env.TEACHER_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, ''),
    apiKey: process.env.TEACHER_API_KEY || '',
    model: process.env.TEACHER_MODEL || '',
  };
}

function isConfigured() {
  const { apiKey, model } = getConfig();
  return Boolean(apiKey && model);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function postChat(url, apiKey, body, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: controller.signal,
  }).finally(() => clearTimeout(timer));
}

/**
 * Send a chat completion request. Returns the assistant message content
 * string, or null on any failure. Retries exactly once (after a short
 * backoff) on HTTP 429 or 5xx responses.
 */
async function chat(messages, options = {}) {
  const {
    temperature = 0.2,
    maxTokens = 1500,
    retryDelayMs = DEFAULT_RETRY_DELAY_MS,
    timeoutMs = TIMEOUT_MS,
  } = options;
  const { baseUrl, apiKey, model } = getConfig();
  if (!apiKey || !model || !Array.isArray(messages) || messages.length === 0) {
    return null;
  }

  const url = `${baseUrl}/chat/completions`;
  const body = { model, messages, temperature, max_tokens: maxTokens };

  for (let attempt = 0; attempt < 2; attempt++) {
    let res;
    try {
      res = await postChat(url, apiKey, body, timeoutMs);
    } catch (_e) {
      // Network error or abort (timeout): no retry, fail soft.
      return null;
    }

    if (res.status === 429 || res.status >= 500) {
      if (attempt === 0) {
        await sleep(retryDelayMs);
        continue;
      }
      return null;
    }
    if (!res.ok) return null;

    try {
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      return typeof content === 'string' ? content : null;
    } catch (_e) {
      return null;
    }
  }
  return null;
}

module.exports = { chat, isConfigured, getConfig };
