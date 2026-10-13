# Tailor Scan

Tailor Scan is an embeddable web widget that turns a guided camera capture into traditional tailor measurements for remote apparel orders: **Chhati** (chest), **Kamar** (waist), **Baazu** (sleeve length), and **Lambai** (garment length). A customer or tailor can then add fitted-to-relaxed ease on top of those estimates.

It is for e-commerce apparel brands, boutique tailors taking remote orders, and domestic tailors receiving international orders. The widget runs in the browser. There is no app to install.

This repository is at the scaffold milestone. The demo mounts a placeholder `<tailor-scan>` element. Camera capture, measurement math, and the embed contract are specified in [PLAN.md](PLAN.md) and are not built yet.

## Layout

- `packages/widget` — Vite library that defines `<tailor-scan>`. Preact renders inside an open shadow root. Importing the package registers the element.
- `apps/demo` — static host page used as the integration fixture.
- `packages/core` — measurement math. Added in the next milestone.

## Run the demo

Requires Node.js 22.

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123). The page shows the placeholder widget: the four measurement names, each marked not measured.

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

`npm run build` writes the widget library to `packages/widget/dist` (`tailor-scan.js` and `tailor-scan.iife.js`) and the demo to `apps/demo/dist`.
