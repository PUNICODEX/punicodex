/**
 * GET /api/v1/docs
 * Interactive OpenAPI documentation via Swagger UI.
 */

const { createApiHandler } = require('../../../platform/api/api-handler.js');

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PuniCodex API v1 Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
  <style>
    body { margin: 0; }
    .topbar { display: none; }
    /* Brand integration §4.13 — the Lattice crowns the API surface. */
    .pc-docs-bar { display: flex; align-items: center; gap: 14px; padding: 10px 20px; background: #0A0A0C; border-bottom: 1px solid rgba(212, 175, 55, 0.22); }
    .pc-docs-bar img { width: 48px; height: 48px; display: block; }
    .pc-docs-bar a { color: #D4AF37; font: 600 15px/1.2 system-ui, sans-serif; letter-spacing: 0.06em; text-decoration: none; }
    .pc-docs-bar span { display: block; color: #9A968C; font: 400 12px/1.4 system-ui, sans-serif; }
  </style>
</head>
<body>
  <header class="pc-docs-bar">
    <picture><source srcset="/assets/brand/13-page-visuals/api/api-lattice.webp" type="image/webp"><img src="/assets/brand/13-page-visuals/api/api-lattice.png" alt="The Lattice — the machine graph that serves the canon" width="256" height="256"></picture>
    <div>
      <a href="/">PuniCodex</a>
      <span>Enterprise Unicode Names API — v1 interactive documentation</span>
    </div>
  </header>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/api/v1/openapi.json',
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.presets.standalone],
      layout: 'BaseLayout',
    });
  </script>
</body>
</html>`;

module.exports = createApiHandler(async (req, res) => {
  if (req.method !== 'GET') {
    const { error } = require('../../../platform/api/api-response.js');
    error(res, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', { status: 405 });
    return;
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(HTML);
});
