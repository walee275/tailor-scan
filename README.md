# Tailor Scan

Tailor Scan is an embeddable web widget that turns a guided camera capture into traditional tailor measurements for remote apparel orders: **Chhati** (chest), **Kamar** (waist), **Baazu** (sleeve length), and **Lambai** (garment length). A customer or tailor can then add fitted-to-relaxed ease on top of those estimates.

It is for e-commerce apparel brands, boutique tailors taking remote orders, and domestic tailors receiving international orders. The widget runs in the browser. There is no app to install.

The demo hosts two embed shells: `TailorScan.open` on the page, and an iframe that checks message origin and session id. Each shell walks consent, order setup, and body setup, then accepts typed measurements when the camera is skipped. The result uses `source: "user"`. `packages/core` holds the result contract. The camera step can replay a recorded pose or run the local Pose Landmarker. After the arms are clear of the torso, chest and waist station lines are drawn on the kept pose. A printable A4 sheet and a corner marker cross-check the height scale. After a front and side pose, the widget can send estimated Chhati, Kamar, Baazu, and Lambai in centimeters. The review step shows body, ease, and garment columns, and a drape preview that follows the garment ease. Typing the four numbers is still available. The widget does not upload pictures. The tape study is specified in [PLAN.md](PLAN.md) and is not checked in.

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

## Integrator checklist

- Ask for consent before the camera starts, and keep a manual path for customers who decline.
- Use the measurements for the garment order the customer is placing. Do not resell them or use them to recognize the person later.
- Keep the result only as long as the order needs it. The widget does not store pictures.
- `exportKeypoints` stays off unless the shop has a separate reason to receive landmarks. Pictures do not leave the device (`imagesLeftDevice` is false).
- Host the script, the pose model, and the WASM files yourself. The widget does not POST frames.

Subresource integrity for the built script changes every build. Hash the file you ship:

```bash
openssl dgst -sha384 -binary packages/widget/dist/tailor-scan.iife.js | openssl base64 -A
```

## Privacy

The capture flow may request the widget script, the local pose model, its WASM files, and the optional calibration PDF. It does not upload images. Hiding or leaving the page stops the camera tracks. The preview flattens the face before anything is drawn over it, and that image stays in the canvas.
