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
  </style>
</head>
<body>
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
