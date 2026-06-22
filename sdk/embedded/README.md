# PÚNYCODEX Authenticity — Embedded / IoT

Sample firmware integrations for routers and IoT gateways.

- `router/iot_dns_filter.c` — C stub that checks DNS names before resolution.

Production firmware should link a WASM or native port of the confusable atlas
and brand seed from `sdk/js/src/mobile-classifier.js`.
