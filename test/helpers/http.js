/**
 * Shared HTTP harness for invoking Vercel serverless handlers in tests.
 */

const http = require('node:http');
const { URL } = require('node:url');

/**
 * Invoke a handler as if it were called by Vercel.
 *
 * @param {Function} handler - The module.exports handler.
 * @param {string} method - HTTP method.
 * @param {string} url - Full URL including query string.
 * @param {object} options
 * @param {object} [options.headers={}]
 * @param {object} [options.body=null]
 * @param {object} [options.params={}] - Dynamic route parameters (e.g. { id: 'zeus' }).
 * @param {string} [options.path] - Override req.path; defaults to pathname minus /api/v2 or /api/v1 prefix.
 * @returns {Promise<{status: number, body: any, headers: Record<string,string>}>}
 */
function invoke(handler, method, url, options = {}) {
  return new Promise((resolve) => {
    const parsed = new URL(url, 'http://localhost');
    const req = new http.IncomingMessage(null);
    req.method = method;
    req.url = url;
    req.headers = options.headers || {};
    // `body` = pre-parsed object (Vercel JSON); `rawBody` = unparsed string
    // body (e.g. application/csp-report) for handlers that read raw text.
    req.body = options.rawBody !== undefined ? options.rawBody : options.body || null;
    req.query = Object.fromEntries(parsed.searchParams);
    if (options.params) {
      Object.assign(req.query, options.params);
    }

    const pathname = parsed.pathname;
    req.path = options.path ?? (pathname.replace(/^\/api\/v\d+/, '') || '');

    const res = new http.ServerResponse(req);
    let statusCode = 200;
    const responseHeaders = {};
    let responseBody = null;
    let ended = false;

    res.setHeader = (name, value) => {
      responseHeaders[name.toLowerCase()] = String(value);
      return res;
    };
    res.status = (code) => {
      statusCode = code;
      return res;
    };
    res.json = (data) => {
      responseBody = data;
      if (!ended) {
        ended = true;
        resolve({ status: statusCode, body: responseBody, headers: responseHeaders });
      }
    };
    res.send = (data) => {
      responseBody = data;
      if (!ended) {
        ended = true;
        resolve({ status: statusCode, body: responseBody, headers: responseHeaders });
      }
    };
    res.end = () => {
      if (!ended) {
        ended = true;
        resolve({ status: statusCode, body: responseBody, headers: responseHeaders });
      }
    };

    const result = handler(req, res);
    if (result && typeof result.then === 'function') {
      result.catch((err) => {
        if (!ended) {
          ended = true;
          resolve({ status: 500, body: { error: err.message }, headers: responseHeaders });
        }
      });
    }
  });
}

function authHeader(apiKey) {
  return { authorization: `Bearer ${apiKey}` };
}

function adminHeader(adminToken) {
  return { 'x-admin-token': adminToken };
}

function jsonBody(payload) {
  return {
    body: payload,
    headers: { 'content-type': 'application/json' },
  };
}

module.exports = {
  invoke,
  authHeader,
  adminHeader,
  jsonBody,
};
