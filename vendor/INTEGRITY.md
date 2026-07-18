# Vendored Third-Party Libraries — Provenance & Integrity

These are the **only** third-party runtime libraries served by the site.
They were vendored (2026-07) to remove the runtime dependency on public CDNs
(`cdn.jsdelivr.net`, `cdnjs.cloudflare.com`, `d3js.org`, `unpkg.com`) so the
enforcing Content-Security-Policy can drop those hosts
(see `docs/security/csp-enforcement-plan-2026-07.md` §7).

Each file was downloaded byte-for-byte from the exact URL the site previously
referenced (major-version pins resolved to the concrete version shown below).
Do not edit these files by hand; to upgrade, download the new upstream file,
replace it, and update the checksums here.

| File | Version | Source URL | License |
|------|---------|------------|---------|
| `chartjs/chart.umd.min.js` | Chart.js 4.4.1 | `https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js` | MIT |
| `chartjs/LICENSE.md` | (v4.4.1 tag) | `https://raw.githubusercontent.com/chartjs/Chart.js/v4.4.1/LICENSE.md` | MIT |
| `d3/d3.v7.min.js` | D3 7.9.0 | `https://d3js.org/d3.v7.min.js` | ISC |
| `d3/LICENSE` | (v7.9.0 tag) | `https://raw.githubusercontent.com/d3/d3/v7.9.0/LICENSE` | ISC |
| `three/three.min.js` | three.js r128 | `https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js` | MIT |
| `three/three.module.js` | three.js 0.160.0 (r160) | `https://unpkg.com/three@0.160.0/build/three.module.js` | MIT |
| `three/addons/controls/OrbitControls.js` | three.js r160 | `https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js` | MIT |
| `three/LICENSE` | (r160 tag; same MIT terms cover r128) | `https://raw.githubusercontent.com/mrdoob/three.js/r160/LICENSE` | MIT |
| `swagger-ui/swagger-ui.css` | swagger-ui-dist 5.32.9 | `https://unpkg.com/swagger-ui-dist@5.32.9/swagger-ui.css` | Apache-2.0 |
| `swagger-ui/swagger-ui-bundle.js` | swagger-ui-dist 5.32.9 | `https://unpkg.com/swagger-ui-dist@5.32.9/swagger-ui-bundle.js` | Apache-2.0 |
| `swagger-ui/swagger-ui-bundle.js.LICENSE.txt` | swagger-ui-dist 5.32.9 | `https://unpkg.com/swagger-ui-dist@5.32.9/swagger-ui-bundle.js.LICENSE.txt` | Apache-2.0 (third-party attribution) |
| `swagger-ui/LICENSE` | (v5.32.9 tag) | `https://raw.githubusercontent.com/swagger-api/swagger-ui/v5.32.9/LICENSE` | Apache-2.0 |

> **License note:** the CSP plan assumed "MIT for all four". Verified actual
> licenses: Chart.js = MIT, three.js = MIT, **D3 = ISC**, **swagger-ui =
> Apache-2.0**. All four are permissive and compatible with redistribution in
> this repo; the license texts are included next to each library.

## Consumers

| Vendored file | Loaded by |
|---------------|-----------|
| `chartjs/chart.umd.min.js` | `templates/flagship/dashboard.html` (→ 196 generated `sites/*/dashboard/index.html`), `platform/public/admin-bookings.html`, `platform/public/advertiser-panel.html` |
| `d3/d3.v7.min.js` | `connections/index.html` |
| `three/three.min.js` | `platform/public/temple-3d.html` |
| `three/three.module.js` + `three/addons/controls/OrbitControls.js` | `oracle.html` (via `<script type="importmap">`) |
| `swagger-ui/swagger-ui.css` + `swagger-ui/swagger-ui-bundle.js` | `api/v1/docs/index.js` (`/api/v1/docs`) |

No other page loads these assets (Chart.js only on dashboards/admin panels,
D3 only on the connections graph, three.js only on the 3-D temple demo and the
oracle hero, Swagger UI only on the API docs page).

## Checksums (sha256)

The block below is in `sha256sum` format (paths relative to this directory);
`test/vendored-libs.test.js` verifies every file against it.

```
d2af8974e95271638772e9e9524db5b9a6f58d6ec2d5d781400447b4a31c681e  chartjs/chart.umd.min.js
5a0877ad6d818529be4f33009d0942cdf7e2ed7656156f4aba7308459a546030  chartjs/LICENSE.md
f2094bbf6141b359722c4fe454eb6c4b0f0e42cc10cc7af921fc158fceb86539  d3/d3.v7.min.js
3e6849627f74ff73c257a3ae1efb574015d94fc1035c05ec3c15805165efcbc4  d3/LICENSE
9274bbcec8d96168626c732b5d31c775aa8cfb7eaa0599bec0c175908a2c1ce2  three/three.min.js
76dea8151bc9352aef3528b4262e249b2604f62543828328db978d060d61a495  three/three.module.js
5a44a9e86a2a0fb11933eed69bc2cd33c76a496854c1aed6ed776efa87d7b064  three/addons/controls/OrbitControls.js
852e0e8699169bf9f6fdc6bda3e682d078dcbc738b5d33e74df594721bff271d  three/LICENSE
ca238f7d7c2cf4480c1e77a9c3b9da915ab216e96ffd354e69076560c650c6de  swagger-ui/swagger-ui.css
303f48967313bee56f30c651b6b90467482a99d2cf1571cde4e44527912eceea  swagger-ui/swagger-ui-bundle.js
9105cfee83332132aa4e45f855baf5e7cf3bd967ca8814beee0c2979ea9de008  swagger-ui/swagger-ui-bundle.js.LICENSE.txt
cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30  swagger-ui/LICENSE
```
