'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const repoRoot = path.resolve(__dirname, '..');
const openapiPath = path.join(repoRoot, 'openapi', 'openapi.yaml');
const docsDir = path.join(repoRoot, 'docs');
const outputJsonPath = path.join(docsDir, 'openapi.json');
const outputHtmlPath = path.join(docsDir, 'index.html');

async function main() {
  try {
    const spec = await loadOpenApi();
    validateSpec(spec);
    await fs.promises.mkdir(docsDir, { recursive: true });
    await fs.promises.writeFile(outputJsonPath, JSON.stringify(spec, null, 2));
    await fs.promises.writeFile(outputHtmlPath, buildHtmlPage());
    console.log('Swagger UI assets regenerated in', docsDir);
  } catch (err) {
    console.error('Failed to regenerate Swagger UI:', err.message);
    process.exitCode = 1;
  }
}

async function loadOpenApi() {
  const raw = await fs.promises.readFile(openapiPath, 'utf8');
  if (!raw.trim()) throw new Error('OpenAPI document is empty.');
  return yaml.load(raw);
}

function validateSpec(spec) {
  if (!spec || typeof spec !== 'object') {
    throw new Error('OpenAPI document did not parse into an object.');
  }
  if (!spec.openapi) {
    throw new Error('OpenAPI document is missing the "openapi" property.');
  }
  if (!spec.info) {
    throw new Error('OpenAPI document is missing the "info" section.');
  }
  if (!spec.paths) {
    throw new Error('OpenAPI document is missing the "paths" section.');
  }
}

function buildHtmlPage() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>UNS Runtime API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      body { margin: 0; background: #fafafa; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" crossorigin></script>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js" crossorigin></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: './openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        layout: 'BaseLayout',
        docExpansion: 'none',
        defaultModelExpandDepth: 1,
        tagsSorter: 'alpha'
      });
    </script>
  </body>
</html>`;
}

main();
