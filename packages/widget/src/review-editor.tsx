import { useEffect, useRef, useState } from "preact/hooks";
import {
  cuttingCm,
  defaultEaseLimits,
  displayLength,
  inchesToCm,
  roundWireCm,
  type DisplayUnits,
  type EasePresets,
  type Measurement,
  type ScanResult,
} from "@tailor-scan/core";
import type { LoftHandle } from "./loft";
import { withDisplayUnits, withEasePatch, withOverride, withPreset } from "./review-edit";

const rows = [
  ["chhati", "Chhati", "easeChestCm"],
  ["kamar", "Kamar", "easeWaistCm"],
  ["baazu", "Baazu", "sleeveLengthDeltaCm"],
  ["lambai", "Lambai", "garmentLengthDeltaCm"],
] as const;

export function ReviewEditor(props: {
  result: ScanResult;
  easePresets?: EasePresets | null;
  onChange: (result: ScanResult) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loftRef = useRef<LoftHandle | null>(null);
  const [meshNote, setMeshNote] = useState("The drape preview is loading.");
  const result = props.result;
  const garment = result.garmentMeasurements;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    let cancelled = false;
    void import("./loft")
      .then((mod) => mod.mountLoft(canvas, loftDims(result)))
      .then((handle) => {
        if (cancelled) {
          handle.dispose();
          return;
        }
        loftRef.current = handle;
        setMeshNote("Drag across the preview to turn it. Ease changes the garment, not the body estimate.");
      })
      .catch(() => {
        if (!cancelled) {
          setMeshNote("The drape preview needs WebGL. The table is still the measurement the shop receives.");
        }
      });
    return () => {
      cancelled = true;
      loftRef.current?.dispose();
      loftRef.current = null;
    };
  }, []);

  useEffect(() => {
    loftRef.current?.update(loftDims(result));
  }, [garment.chhatiCm, garment.kamarCm, garment.baazuCm, garment.lambaiCm, result.fit.flare, result]);

  return (
    <div class="review">
      <h3>Estimated measurements</h3>
      <p class="status">
        {result.measurements[0].source === "user"
          ? "These numbers were typed. Ranges stay on the error budget until a tape study is checked in."
          : "These are estimates. The range is an error budget, not a finished tape measure."}{" "}
        {result.measurements[2].sleevePath === "nape-to-wrist"
          ? "Baazu runs from the nape to the wrist."
          : "Baazu runs from the shoulder to the wrist."}{" "}
        Lambai ends at the {result.measurements[3].hemAnchor}.
      </p>
      <svg class="tape" viewBox="0 0 160 120" role="img" aria-label="Tape paths">
        <path d="M80 18 L80 108" />
        <path d="M48 42 H112" />
        <path d="M58 68 H102" />
        <path d="M70 28 L42 86" />
        <path d="M90 28 L118 86" />
        <text x="116" y="40">Chhati</text>
        <text x="106" y="66">Kamar</text>
        <text x="8" y="16">Nape</text>
      </svg>
      <div class="actions">
        <button type="button" class="secondary" onClick={() => props.onChange(withDisplayUnits(result, "cm"))}>
          Centimeters
        </button>
        <button type="button" class="secondary" onClick={() => props.onChange(withDisplayUnits(result, "in"))}>
          Inches
        </button>
        {(["fitted", "regular", "relaxed"] as const).map((preset) => (
          <button
            key={preset}
            type="button"
            class="secondary"
            onClick={() => props.onChange(withPreset(result, preset, props.easePresets ?? null))}
          >
            {preset}
          </button>
        ))}
      </div>
      <table class="measure">
        <thead>
          <tr>
            <th>Measurement</th>
            <th>Body</th>
            <th>Ease</th>
            <th>Garment</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([id, label, easeKey]) => {
            const measurement = result.measurements.find((item) => item.id === id)!;
            const ease = result.fit[easeKey];
            const garmentCm = garment[`${id}Cm`];
            return (
              <tr key={id}>
                <th scope="row">{label}</th>
                <td data-col="body" data-id={id}>
                  {show(cuttingCm(measurement), result.displayUnits)}
                  {measurement.rangeCm ? (
                    <span class="detail">
                      {" "}
                      {show(measurement.rangeCm[0], result.displayUnits)}–
                      {show(measurement.rangeCm[1], result.displayUnits)}
                    </span>
                  ) : null}
                </td>
                <td data-col="ease" data-id={id}>
                  {signed(ease, result.displayUnits)}
                </td>
                <td data-col="garment" data-id={id}>
                  {show(garmentCm, result.displayUnits)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div class="fields">
        {rows.map(([id, label, easeKey]) => (
          <label class="field" key={id}>
            {label} ease
            <input
              type="range"
              name={easeKey}
              min={defaultEaseLimits[easeKey].min}
              max={defaultEaseLimits[easeKey].max}
              step="0.5"
              value={result.fit[easeKey]}
              onInput={(event) =>
                props.onChange(withEasePatch(result, { [easeKey]: Number(event.currentTarget.value) }))
              }
            />
          </label>
        ))}
        <label class="field">
          Flare
          <select
            name="flare"
            value={result.fit.flare}
            onChange={(event) =>
              props.onChange({
                ...result,
                fit: { ...result.fit, flare: event.currentTarget.value as ScanResult["fit"]["flare"] },
              })
            }
          >
            <option value="none">None</option>
            <option value="straight">Straight</option>
            <option value="aline">A-line</option>
          </select>
        </label>
        {result.measurements.map((measurement) => (
          <label class="field" key={measurement.id}>
            Override {measurement.label}
            <input
              type="number"
              name={`override-${measurement.id}`}
              step="0.1"
              value={overrideText(measurement, result.displayUnits)}
              onInput={(event) => props.onChange(applyOverride(result, measurement.id, event.currentTarget.value))}
            />
          </label>
        ))}
      </div>
      <canvas
        ref={canvasRef}
        class="loft"
        width={320}
        height={220}
        aria-label="Garment drape preview"
        data-chest={garment.chhatiCm}
        data-waist={garment.kamarCm}
        data-sleeve={garment.baazuCm}
        data-length={garment.lambaiCm}
        data-flare={result.fit.flare}
      />
      <p class="hint">{meshNote}</p>
    </div>
  );
}

function loftDims(result: ScanResult) {
  return {
    chestCm: result.garmentMeasurements.chhatiCm,
    waistCm: result.garmentMeasurements.kamarCm,
    sleeveCm: result.garmentMeasurements.baazuCm,
    lengthCm: result.garmentMeasurements.lambaiCm,
    flare: result.fit.flare,
  };
}

function show(valueCm: number, units: DisplayUnits): string {
  const shown = displayLength(valueCm, units);
  return `${shown.value} ${shown.unit}`;
}

function signed(valueCm: number, units: DisplayUnits): string {
  const shown = displayLength(Math.abs(valueCm), units);
  const sign = valueCm > 0 ? "+" : valueCm < 0 ? "−" : "";
  return `${sign}${shown.value} ${shown.unit}`;
}

function overrideText(measurement: Measurement, units: DisplayUnits): string {
  if (measurement.overrideCm == null) {
    return "";
  }
  return units === "in" ? String(displayLength(measurement.overrideCm, "in").value) : String(measurement.overrideCm);
}

function applyOverride(result: ScanResult, id: Measurement["id"], text: string): ScanResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return withOverride(result, id, null);
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    return result;
  }
  const cm = result.displayUnits === "in" ? inchesToCm(value) : value;
  return withOverride(result, id, roundWireCm(cm));
}
