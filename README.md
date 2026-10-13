# Tailor Scan

Tailor Scan is an embeddable web widget that turns a guided camera capture into traditional tailor measurements for remote apparel orders: **Chhati** (chest), **Kamar** (waist), **Baazu** (sleeve length), and **Lambai** (garment length). A customer or tailor can then add fitted-to-relaxed ease on top of those estimates.

It is for e-commerce apparel brands, boutique tailors taking remote orders, and domestic tailors receiving international orders. The widget runs in the browser. There is no app to install.

The demo hosts two embed shells that return a sample measurement result: `TailorScan.open` on the page, and an iframe that checks message origin and session id. `packages/core` holds the result contract. Camera capture and measurement math are specified in [PLAN.md](PLAN.md) and are not built yet.

## Layout

- `packages/widget` — `<tailor-scan>` custom element, `TailorScan.open`, and the iframe postMessage protocol. Preact renders inside an open shadow root.
- `apps/demo` — static host page used as the integration fixture.
- `packages/core` — result schema, unit conversion, ease, and size-chart overlap. No camera or girth math yet.

## Run the demo

Requires Node.js 22.

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123). Click “Send sample result” on the inline widget and inside the iframe. Each shell prints the same kind of JSON. Messages from any other origin are ignored.

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

`npm run build` writes the widget library to `packages/widget/dist` (`tailor-scan.js` and `tailor-scan.iife.js`) and the demo to `apps/demo/dist`.
