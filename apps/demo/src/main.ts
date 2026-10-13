import { setDefaultVisionProvider, TailorScan } from "@tailor-scan/widget";
import { createLocalPoseProvider } from "./pose-provider";
import "./styles.css";

setDefaultVisionProvider(createLocalPoseProvider);

const inline = document.querySelector<HTMLElement>("#inline-result");
const framed = document.querySelector<HTMLElement>("#iframe-result");

TailorScan.open({
  target: "#inline-slot",
  presentation: "inline",
  displayUnits: "cm",
  garment: "kurta",
  calibration: "both",
  theme: { accent: "#1f3a34" },
  onComplete(result) {
    show(inline, result);
  },
  onCancel() {
    show(inline, "Cancelled. The shop receives nothing.");
  },
});

const iframe = document.querySelector<HTMLIFrameElement>("#scan-frame");
const sessionId = "demo-iframe";
const origin = window.location.origin;

if (iframe) {
  iframe.src = `/embed.html?session=${sessionId}&parentOrigin=${encodeURIComponent(origin)}`;
  TailorScan.bindIframeSession({
    iframe,
    sessionId,
    widgetOrigin: origin,
    config: {
      displayUnits: "cm",
      garment: "kurta",
      calibration: "both",
      theme: { accent: "#1f3a34" },
    },
    onComplete(result) {
      show(framed, result);
    },
    onCancel() {
      show(framed, "Cancelled. The shop receives nothing.");
    },
  });
}

function show(node: HTMLElement | null, value: unknown): void {
  if (!node) {
    return;
  }
  node.textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2);
}
