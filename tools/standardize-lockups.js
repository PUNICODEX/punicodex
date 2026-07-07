const fs = require('fs');
const path = require('path');
const glob = require('glob');

const root = process.cwd().replace(/\\/g, '/');
const files = [
  `${root}/css/temple-base.css`,
  ...glob.sync(`${root}/sites/*/styles.css`),
  ...glob.sync(`${root}/sites/*/styles-v2.css`),
].filter((f) => !f.includes('.backup'));

function updateBlock(body, targetHeight, targetMaxWidth) {
  // height
  body = body.replace(/height:\s*\d+px/, `height: ${targetHeight}px`);
  // max-width: add or replace
  if (/max-width:/.test(body)) {
    body = body.replace(/max-width:\s*\d+px/, `max-width: ${targetMaxWidth}px`);
  } else {
    body = body.replace(/(height:\s*\d+px;)/, `$1\n    max-width: ${targetMaxWidth}px;`);
  }
  return body;
}

for (const file of files) {
  let css = fs.readFileSync(file, 'utf8');

  // 1. Root nav height
  css = css.replace(/--nav-height:\s*72px;/g, '--nav-height: 110px;');

  // 2. Desktop nav-logo-img blocks outside media queries first
  css = css.replace(/(\.nav-logo-img\s*\{)([^}]*)(\})/g, (m, pre, inner, post) => {
    return pre + updateBlock(inner, 110, 260) + post;
  });

  // 3. Mobile media query block: adjust logo, nav-inner, and add root override
  css = css.replace(
    /@media\s*\(\s*max-width:\s*768px\s*\)\s*\{([\s\S]*?)\n\}/g,
    (match, body) => {
      // If this media query has nav-related rules, add root override if absent
      if (body.includes('.nav-logo-img') || body.includes('.nav-inner')) {
        if (!body.includes('--nav-height:')) {
          body = `\n    :root {\n        --nav-height: 74px;\n    }\n${body}`;
        } else {
          body = body.replace(/--nav-height:\s*\d+px;/g, '--nav-height: 74px;');
        }
      }

      // nav-logo-img inside media query
      body = body.replace(/(\.nav-logo-img\s*\{)([^}]*)(\})/g, (m, pre, inner, post) => {
        return pre + updateBlock(inner, 74, 184) + post;
      });

      // nav-inner inside media query
      body = body.replace(/(\.nav-inner\s*\{)([^}]*)(\})/g, (m, pre, inner, post) => {
        inner = inner.replace(/height:\s*\d+px/, 'height: 74px');
        return pre + inner + post;
      });

      return `@media (max-width: 768px) {${body}\n}`;
    }
  );

  // 4. Desktop nav-inner height in styles-v2 (only if explicit height: 72px)
  css = css.replace(/(\.nav-inner\s*\{)([^}]*height:\s*)72px([^}]*)(\})/g, (m, pre, h, rest, post) => {
    return pre + h + 'var(--nav-height)' + rest + post;
  });

  fs.writeFileSync(file, css);
  console.log('updated', path.relative(root, file));
}
