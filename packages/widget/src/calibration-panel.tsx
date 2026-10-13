import { useState } from "preact/hooks";
import {
  agreeScales,
  buildA4SheetPdf,
  moveCorner,
  quadSizePx,
  referenceMillimeters,
  referenceScaleCmPerPx,
  type CornerQuad,
  type ReferencePresetId,
  type VisionSample,
} from "@tailor-scan/core";

export function CalibrationPanel(props: {
  heightScaleCmPerPx: number | null;
  sample: VisionSample | null;
  onImageScale: (scaleCmPerPx: number | null) => void;
}) {
  const frame = {
    width: props.sample?.imageWidth ?? 640,
    height: props.sample?.imageHeight ?? 800,
  };
  const [preset, setPreset] = useState<ReferencePresetId>("a4-inner");
  const [customWidth, setCustomWidth] = useState("180");
  const [customHeight, setCustomHeight] = useState("260");
  const [corners, setCorners] = useState<CornerQuad>(() => defaultCorners(frame.width, frame.height));
  const [marked, setMarked] = useState(false);
  const [drag, setDrag] = useState<0 | 1 | 2 | 3 | null>(null);
  const size = referenceMillimeters(preset, {
    widthMm: Number(customWidth),
    heightMm: Number(customHeight),
  });
  const pixels = quadSizePx(corners);
  const referenceScale = size == null ? null : referenceScaleCmPerPx(pixels.widthPx, pixels.heightPx, size);
  const choice =
    props.heightScaleCmPerPx == null
      ? null
      : agreeScales(
          props.heightScaleCmPerPx,
          marked && referenceScale != null ? { scaleCmPerPx: referenceScale, accepted: true } : null,
        );

  function publish(nextMarked: boolean, nextCorners: CornerQuad, nextPreset: ReferencePresetId, width: string, height: string): void {
    const nextSize = referenceMillimeters(nextPreset, {
      widthMm: Number(width),
      heightMm: Number(height),
    });
    const nextPixels = quadSizePx(nextCorners);
    const nextReference = nextSize == null ? null : referenceScaleCmPerPx(nextPixels.widthPx, nextPixels.heightPx, nextSize);
    if (!nextMarked || nextReference == null || props.heightScaleCmPerPx == null) {
      props.onImageScale(props.heightScaleCmPerPx);
      return;
    }
    props.onImageScale(
      agreeScales(props.heightScaleCmPerPx, { scaleCmPerPx: nextReference, accepted: true }).scaleCmPerPx,
    );
  }

  function downloadSheet(): void {
    const pdf = buildA4SheetPdf();
    const blob = new Blob([pdf], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "tailor-scan-a4-sheet.pdf";
    link.click();
    URL.revokeObjectURL(url);
  }

  function pointerToFrame(event: PointerEvent): { x: number; y: number } {
    const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / Math.max(1, bounds.width)) * frame.width;
    const y = ((event.clientY - bounds.top) / Math.max(1, bounds.height)) * frame.height;
    return { x, y };
  }

  return (
    <div class="calibration">
      <p class="hint">
        Print the sheet at 100% scale. The measured mark is the inner 180 mm by 260 mm rectangle, so
        printer margins do not change it.
      </p>
      <button type="button" class="secondary" onClick={downloadSheet}>
        Download A4 sheet
      </button>
      <label class="field">
        Reference
        <select
          name="reference"
          value={preset}
          onChange={(event) => {
            const next = event.currentTarget.value as ReferencePresetId;
            setPreset(next);
            publish(marked, corners, next, customWidth, customHeight);
          }}
        >
          <option value="a4-inner">A4 inner rectangle, 180 by 260 mm</option>
          <option value="credit-card">Credit card, 85.60 by 53.98 mm</option>
          <option value="custom">Custom size</option>
        </select>
      </label>
      {preset === "credit-card" ? (
        <p class="hint">A card only helps when it appears large and next to the body.</p>
      ) : null}
      {preset === "custom" ? (
        <div class="pair">
          <label class="field">
            Width mm
            <input
              type="number"
              name="reference-width"
              value={customWidth}
              onInput={(event) => {
                const next = event.currentTarget.value;
                setCustomWidth(next);
                publish(marked, corners, preset, next, customHeight);
              }}
            />
          </label>
          <label class="field">
            Height mm
            <input
              type="number"
              name="reference-height"
              value={customHeight}
              onInput={(event) => {
                const next = event.currentTarget.value;
                setCustomHeight(next);
                publish(marked, corners, preset, customWidth, next);
              }}
            />
          </label>
        </div>
      ) : null}
      <div
        class="pad"
        onPointerMove={(event) => {
          if (drag == null) {
            return;
          }
          const next = moveCorner(corners, drag, pointerToFrame(event), frame);
          setCorners(next);
          publish(marked, next, preset, customWidth, customHeight);
        }}
        onPointerUp={() => setDrag(null)}
        onPointerLeave={() => setDrag(null)}
      >
        {corners.map((corner, index) => (
          <button
            key={index}
            type="button"
            class="handle"
            aria-label={`Corner ${index + 1}`}
            style={{ left: `${(corner.x / frame.width) * 100}%`, top: `${(corner.y / frame.height) * 100}%` }}
            onPointerDown={(event) => {
              event.preventDefault();
              setDrag(index as 0 | 1 | 2 | 3);
            }}
          />
        ))}
      </div>
      <button
        type="button"
        class="secondary"
        onClick={() => {
          setMarked(true);
          publish(true, corners, preset, customWidth, customHeight);
        }}
      >
        Use marked rectangle
      </button>
      <p class="hint" data-calibration={choice?.agreement ?? "pending"}>
        {choice?.note ?? "Replay or capture a pose to compare the sheet with your height."}{" "}
        {marked && size
          ? `Marked ${pixels.widthPx.toFixed(0)} by ${pixels.heightPx.toFixed(0)} px for ${size.widthMm.toFixed(2)} by ${size.heightMm.toFixed(2)} mm.`
          : "Drag the corners around a sheet or card in the full-body frame."}
      </p>
    </div>
  );
}

function defaultCorners(width: number, height: number): CornerQuad {
  const longPx = height * 0.15;
  const shortPx = longPx * (180 / 260);
  const x = width * 0.08;
  const y = height * 0.62;
  return [
    { x, y },
    { x: x + shortPx, y },
    { x: x + shortPx, y: y + longPx },
    { x, y: y + longPx },
  ];
}
