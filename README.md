# Tailor Scan

Tailor Scan is an embeddable web widget that turns a guided camera capture into traditional tailor measurements for remote apparel orders: **Chhati** (chest), **Kamar** (waist), **Baazu** (sleeve length), and **Lambai** (garment length). A customer or tailor can then add fitted-to-relaxed ease on top of those estimates.

It is for e-commerce apparel brands, boutique tailors taking remote orders, and domestic tailors receiving international orders. The widget runs in the browser. There is no app to install.

The demo hosts two embed shells: `TailorScan.open` on the page, and an iframe that checks message origin and session id. Each shell walks consent, order setup, and body setup, then accepts typed measurements when the camera is skipped. The result uses `source: "user"`. `packages/core` holds the result contract. The camera step can replay a recorded pose or, when the page provides it, run the local Pose Landmarker. The model and WASM are served from this origin. After the arms are clear of the torso, chest and waist station lines are drawn on the kept pose. A printable A4 sheet and a corner marker cross-check the height scale. After a front and side pose, the widget can send estimated Chhati, Kamar, Baazu, and Lambai in centimeters. The review step shows body, ease, and garment columns, and a drape preview that follows the garment ease. Typing the four numbers is still available. Privacy hardening and the tape study are specified in [PLAN.md](PLAN.md) and are not built yet.

## Layout

- `packages/widget` — `<tailor-scan>` custom element, capture flow, `TailorScan.open`, and the iframe postMessage protocol. Preact renders inside an open shadow root.
- `apps/demo` — static host page used as the integration fixture.
- `packages/core` — result schema, units, ease, stations, calibration, and the measurement engine.

## Run the demo

Requires Node.js 22.

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123). In each shell, accept consent, confirm you are an adult, and enter height and clothing. “Replay recorded pose” walks the front and side guide without a camera. “Enter measurements instead” still types the four measurements and sends `source: "user"`. Messages from any other origin are ignored.

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

`npm run build` writes the widget library to `packages/widget/dist` (`tailor-scan.js` and `tailor-scan.iife.js`) and the demo to `apps/demo/dist`.
