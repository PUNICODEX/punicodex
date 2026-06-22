# PUNYCODEX Authenticity Shield — WordPress Plugin

Warns WordPress authors before publishing punycode or visually deceptive Unicode links.

## Features

- **Publish-time scanning:** Blocks posts that contain suspicious punycode or mixed-script URLs.
- **Mixed-script detection:** Detects hostnames that combine Latin with Cyrillic, Greek, Arabic, or other scripts.
- **Block editor integration:** JavaScript scaffolding for real-time inline warnings.
- **Zero configuration:** Works out of the box once activated.

## Installation

1. Copy this directory to `wp-content/plugins/punycodex-authenticity/`.
2. Activate the plugin in WordPress Admin → Plugins.
3. Create or edit a post containing a suspicious link to see the warning.

## Enterprise API

For advanced classification, forensics reports, SIEM export, and enterprise
policy, use the [PUNYCODEX Authenticity API](https://punycodex.com/api/v1/docs).

## Development

Build the block-editor script:

```bash
cd sdk/wordpress
npm install
npm run build
```

## License

ISC — see `punycodex-authenticity.php` header.
