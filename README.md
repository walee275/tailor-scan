# Tailor Scan

Tailor Scan is an embeddable web widget that turns a guided camera capture into traditional tailor measurements for remote apparel orders: **Chhati** (chest), **Kamar** (waist), **Baazu** (sleeve length), and **Lambai** (garment length). A customer or tailor can then add fitted-to-relaxed ease on top of those estimates.

It is for e-commerce apparel brands, boutique tailors taking remote orders, and domestic tailors receiving international orders. The widget runs in the browser. There is no app to install.

The demo hosts two embed shells: `TailorScan.open` on the page, and an iframe that checks message origin and session id. Each shell walks consent, order setup, and body setup, then accepts typed measurements when the camera is skipped. The result uses `source: "user"`. `packages/core` holds the result contract. Frame quality gates run as pure checks, and the camera step shows a chip for light, sharpness, full body, distance, and stillness. Pose and measurement math are specified in [PLAN.md](PLAN.md) and are not built yet.

## Layout

- `packages/widget` — `<tailor-scan>` custom element, capture flow, `TailorScan.open`, and the iframe postMessage protocol. Preact renders inside an open shadow root.
- `apps/demo` — static host page used as the integration fixture.
- `packages/core` — result schema, unit conversion, ease, and size-chart overlap. No girth math yet.

## Run the demo

Requires Node.js 22.

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123). In each shell, accept consent, confirm you are an adult, enter height and clothing, choose “Enter measurements instead”, type the four measurements, and send them. The page prints JSON whose measurements have `source: "user"`. Messages from any other origin are ignored.

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

`npm run build` writes the widget library to `packages/widget/dist` (`tailor-scan.js` and `tailor-scan.iife.js`) and the demo to `apps/demo/dist`.
