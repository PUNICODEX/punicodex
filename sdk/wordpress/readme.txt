=== PUNYCODEX Authenticity Shield ===
Contributors: punycodex
Donate link: https://punycodex.com/about/authenticity.html
Tags: security, unicode, homograph, phishing, idn
Requires at least: 6.0
Tested up to: 6.5
Requires PHP: 8.0
Stable tag: 1.0.0
License: ISC
License URI: https://opensource.org/licenses/ISC

Warns authors before publishing punycode or visually deceptive Unicode links.

== Description ==

PUNYCODEX Authenticity Shield helps WordPress site owners avoid accidentally
publishing punycode or mixed-script links that could be used in homograph
phishing attacks.

The plugin:

* Scans post content before publication.
* Flags hostnames starting with `xn--` (punycode).
* Detects mixed-script hostnames such as Latin + Cyrillic.
* Provides a block-editor integration for real-time warnings.

For enterprise threat intelligence, SIEM connectors, and browser-wide
protection, visit <https://punycodex.com/about/authenticity.html>.

== Installation ==

1. Upload the plugin files to `/wp-content/plugins/punycodex-authenticity/`.
2. Activate the plugin through the 'Plugins' menu in WordPress.
3. The plugin begins scanning links automatically.

== Frequently Asked Questions ==

= Does the plugin make external API calls? =

The base plugin operates locally. The optional block-editor integration can
call the PUNYCODEX public API for deeper analysis if enabled by an
administrator.

= What is a homograph attack? =

A homograph attack registers a domain that visually resembles a trusted name
by replacing one or more characters with lookalikes from another script, for
example Cyrillic `а` for Latin `a`.

== Changelog ==

= 1.0.0 =
* Initial release.
* Publish-time punycode and mixed-script detection.
* Block-editor scaffolding.
