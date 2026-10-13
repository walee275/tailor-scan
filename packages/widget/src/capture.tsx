import { useEffect, useLayoutEffect, useReducer, useRef, useState } from "preact/hooks";
import {
  calibrateHeight,
  laplacianVariance,
  liveGates,
  meanLuma,
  PoseIndex,
  previewScaleCmPerPx,
  selectStations,
  type DisplayUnits,
  type GarmentId,
  type GateOutcome,
  type HemAnchor,
  type ScanResult,
  type SleevePath,
} from "@tailor-scan/core";
import type { EmbedConfig, ScanError } from "./config";
import {
  captureReducer,
  captureStepProgress,
  createCaptureState,
  parseHeightCm,
  parseManualNumbers,
  manualFields,
  type CaptureState,
  type ManualField,
} from "./flow";
import { GateChips } from "./chips";
import { CalibrationPanel } from "./calibration-panel";
import { createManualResult } from "./manual-result";
import { createCameraResult } from "./camera-result";
import { ReviewEditor } from "./review-editor";
import { createGuide, runRecordedGuide, stepGuide, type GuideSnapshot } from "./pose-guide";
import { drawSkeleton } from "./skeleton";
import { blurHead, bindSessionTeardown } from "./privacy";
import { getDefaultVisionProvider, type VisionProvider } from "./vision-host";

const prompts = [
  "Prop the phone at about navel height, lens level, about 2 to 3 meters away.",
  "On a laptop, raise the lid on books so the lens is not looking up from the desk.",
  "Step back until your head and feet are both in frame.",
  "Hold still.",
  "Move your arms a little away from your sides.",
  "Turn further until your chest points to the side.",
];

const fieldCopy: Record<ManualField, { label: string; detail: string }> = {
  chhati: { label: "Chhati", detail: "Chest" },
  kamar: { label: "Kamar", detail: "Waist" },
  baazu: { label: "Baazu", detail: "Sleeve length" },
  lambai: { label: "Lambai", detail: "Garment length" },
};

const css = `
:host {
  display: block;
  color: #1c2421;
  font-family: "Iowan Old Style", Palatino, Georgia, serif;
}
.panel {
  box-sizing: border-box;
  border: 1px solid #d5cec2;
  background: #fbf8f2;
  padding: 1.25rem 1.25rem 1rem;
}
.kicker, .step, .status, .meta, label, button, .error, li {
  font-family: ui-sans-serif, system-ui, sans-serif;
}
.kicker, .step {
  margin: 0;
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #5e6a63;
}
.step { margin-top: 0.85rem; letter-spacing: 0.08em; }
h2 {
  margin: 0.35rem 0 0;
  font-size: 1.75rem;
  font-weight: 560;
  letter-spacing: -0.02em;
}
.status {
  margin: 0.65rem 0 0;
  max-width: 38rem;
  font-size: 0.95rem;
  line-height: 1.45;
  color: #3d4742;
}
.meta, .hint {
  margin: 0.45rem 0 0;
  color: #5e6a63;
  font-size: 0.85rem;
  line-height: 1.4;
}
.fields, .choices {
  display: grid;
  gap: 0.75rem;
  margin-top: 1rem;
}
.field { display: grid; gap: 0.3rem; font-size: 0.9rem; }
.choice {
  display: flex;
  gap: 0.55rem;
  align-items: flex-start;
  font-size: 0.92rem;
  line-height: 1.35;
}
input[type="text"], input[type="number"], select {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #d5cec2;
  background: #fff;
  color: inherit;
  font: inherit;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 1rem;
  padding: 0.55rem 0.65rem;
}
.pair { display: grid; gap: 0.75rem; }
ul {
  list-style: none;
  margin: 0.75rem 0 0;
  padding: 0;
}
ul.prompts {
  max-height: none;
}
li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  column-gap: 1rem;
  padding: 0.7rem 0;
  border-top: 1px solid #e4ddd1;
  font-size: 0.92rem;
}
.prompt {
  display: block;
  padding: 0.45rem 0;
  border-top: 0;
}
.name { font-family: "Iowan Old Style", Palatino, Georgia, serif; font-size: 1.05rem; }
.detail { color: #5e6a63; font-size: 0.8rem; }
.value { grid-row: 1 / span 2; align-self: center; font-size: 0.85rem; }
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
}
button {
  border: 0;
  border-radius: 999px;
  background: var(--tailor-accent, #1f3a34);
  color: #fbf8f2;
  font: inherit;
  font-size: 0.95rem;
  padding: 0.65rem 1rem;
  cursor: pointer;
}
button.secondary {
  background: transparent;
  color: var(--tailor-accent, #1f3a34);
  box-shadow: inset 0 0 0 1px currentColor;
}
button:disabled { cursor: default; opacity: 0.55; }
.error {
  margin: 0.75rem 0 0;
  color: #8a3d32;
  font-size: 0.9rem;
}
.stage {
  position: relative;
  margin-top: 0.75rem;
  background: #1c2421;
  min-height: 8rem;
}
.stage video,
.stage canvas {
  display: block;
  width: 100%;
  max-height: 16rem;
}
.stage canvas {
  position: absolute;
  inset: 0;
  height: 100%;
  pointer-events: none;
}
.calibration { margin-top: 0.85rem; }
.pad {
  position: relative;
  margin-top: 0.75rem;
  height: 9rem;
  background: #1c2421;
  touch-action: none;
}
.loft {
  display: block;
  width: 100%;
  max-width: 22rem;
  margin-top: 0.85rem;
  background: #1c2421;
}
table.measure {
  width: 100%;
  margin-top: 0.85rem;
  border-collapse: collapse;
  font-size: 0.88rem;
}
table.measure th,
table.measure td {
  text-align: left;
  padding: 0.45rem 0.35rem;
  border-top: 1px solid #e4ddd1;
  vertical-align: top;
}
.tape {
  width: 9rem;
  margin-top: 0.75rem;
}
.tape path {
  fill: none;
  stroke: #1f3a34;
  stroke-width: 1.4;
}
.tape text {
  fill: #5e6a63;
  font-size: 8px;
}
.chips {
  display: grid;
  gap: 0.45rem;
  margin: 0.85rem 0 0;
}
.chips li {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr);
  gap: 0.45rem 0.6rem;
  align-items: baseline;
  border-top: 0;
  padding: 0.35rem 0;
  font-size: 0.82rem;
}
.chip-label { font-weight: 650; }
.chip-status {
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.chips li[data-status="fail"] .chip-status { color: #8a3d32; }
.chips li[data-status="pass"] .chip-status { color: #1f3a34; }
.chip-prompt { color: #3d4742; }
.guide-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.9rem 0 0;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 0.85rem;
}
.guide {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  background: var(--tailor-accent, #1f3a34);
  animation: tailor-pulse 1.6s ease-in-out infinite;
}
.sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
@media (min-width: 40rem) {
  .pair { grid-template-columns: 1fr 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  .guide { animation: none; }
}
@keyframes tailor-pulse {
  50% { opacity: 0.35; }
}
`;

export function Capture(props: {
  sessionId: string;
  garment: GarmentId;
  displayUnits: DisplayUnits;
  sleevePath?: SleevePath;
  hemAnchor?: HemAnchor;
  easePresets?: EmbedConfig["easePresets"];
  exportKeypoints?: boolean;
  sizeChart?: EmbedConfig["sizeChart"];
  createVisionProvider?: () => Promise<VisionProvider>;
  onProgress: (step: string) => void;
  onComplete: (result: ScanResult) => void;
  onCancel: () => void;
  onError: (error: ScanError) => void;
  onDisplayUnits?: (units: DisplayUnits) => void;
}) {
  const [state, dispatch] = useReducer(
    captureReducer,
    { garment: props.garment, displayUnits: props.displayUnits },
    createCaptureState,
  );
  const [spoken, setSpoken] = useState("");
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [gates, setGates] = useState<GateOutcome[]>(() => emptyGates());
  const [guide, setGuide] = useState<GuideSnapshot | null>(null);
  const [imageScale, setImageScale] = useState<number | null>(null);
  const [cameraResult, setCameraResult] = useState<ScanResult | null>(null);
  const [draft, setDraft] = useState<ScanResult | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const replayTimer = useRef<number | null>(null);
  const stepRef = useRef(state.step);
  stepRef.current = state.step;

  useLayoutEffect(() => {
    dispatch({ type: "set-garment", garment: props.garment });
  }, [props.garment]);

  useLayoutEffect(() => {
    dispatch({ type: "set-units", units: props.displayUnits });
  }, [props.displayUnits]);

  useEffect(() => {
    if (state.step === "consent" || state.step === "done" || state.step === "cancelled") {
      return;
    }
    props.onProgress(state.step);
  }, [state.step, props.onProgress]);

  useEffect(() => {
    if (state.step === "camera") {
      return;
    }
    stopTracks(streamRef.current);
    streamRef.current = null;
  }, [state.step]);

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (video && stream) {
      video.srcObject = stream;
    }
  }, [state.camera]);

  useEffect(() => {
    if (state.step !== "camera" || state.camera !== "live") {
      return;
    }
    let stopped = false;
    let busy = false;
    let last = 0;
    let provider: VisionProvider | null = null;
    let guideState = createGuide();
    const factory = props.createVisionProvider ?? getDefaultVisionProvider();
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (factory) {
      void factory()
        .then((opened) => {
          if (stopped) {
            opened.close();
            return;
          }
          provider = opened;
        })
        .catch((error: unknown) => {
          if (stopped) {
            return;
          }
          props.onError({
            code: "model-load-failed",
            message: error instanceof Error ? error.message : "The pose model did not load.",
          });
        });
    }
    const tick = (now: number) => {
      if (stopped) {
        return;
      }
      if (context && !busy && now - last > 250) {
        last = now;
        const video = videoRef.current;
        if (video && video.videoWidth > 0 && video.videoHeight > 0) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          context.drawImage(video, 0, 0);
          const frame = context.getImageData(0, 0, canvas.width, canvas.height);
          const luma = meanLuma(frame.data);
          const sharpness = laplacianVariance(frame.data, canvas.width, canvas.height);
          busy = true;
          void Promise.resolve(provider ? provider.sample(video, now) : null)
            .then((sampled) => {
              if (stopped) {
                return;
              }
              if (!sampled) {
                setGates(
                  liveGates({
                    luma,
                    laplacian: sharpness,
                    imageHeight: canvas.height,
                    landmarks: null,
                    recent: [],
                  }),
                );
                return;
              }
              guideState = stepGuide(
                guideState,
                { ...sampled, luma, sharpness, imageWidth: canvas.width, imageHeight: canvas.height },
                now,
              );
              setGuide(guideState);
              setGates(guideState.gates);
            })
            .finally(() => {
              busy = false;
            });
        }
      }
      requestAnimationFrame(tick);
    };
    const frameId = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      cancelAnimationFrame(frameId);
      provider?.close();
    };
  }, [state.step, state.camera, props.createVisionProvider, props.onError]);

  useEffect(() => {
    const unbind = bindSessionTeardown(() => {
      stopTracks(streamRef.current);
      streamRef.current = null;
    });
    return () => {
      unbind();
      stopTracks(streamRef.current);
      streamRef.current = null;
      if (replayTimer.current != null) {
        window.clearInterval(replayTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const sample = guide?.side ?? guide?.front ?? guide?.burst.at(-1);
    if (!canvas || !sample) {
      return;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    canvas.width = 320;
    canvas.height = 240;
    const front = guide?.front;
    const heightCal =
      front?.mask == null || state.heightCm == null
        ? null
        : calibrateHeight({
            mask: front.mask,
            landmarks: front.landmarks,
            imageHeight: front.imageHeight,
            enteredHeightCm: state.heightCm,
          });
    const imageCmPerPx = imageScale ?? heightCal?.scaleCmPerPx ?? null;
    const stations =
      front?.mask == null
        ? null
        : selectStations({
            mask: front.mask,
            landmarks: front.landmarks,
            scaleCmPerPx:
              imageCmPerPx == null
                ? previewScaleCmPerPx(front.mask, front.landmarks, state.heightCm ?? 170)
                : imageCmPerPx * (front.imageWidth / front.mask.width),
            frontOnly: guide?.side == null,
          });
    const video = videoRef.current;
    const liveFrame = Boolean(video && video.readyState >= 2 && video.videoWidth > 0);
    if (liveFrame && video) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const nose = sample.landmarks[PoseIndex.nose];
      if (nose) {
        const frame = context.getImageData(0, 0, canvas.width, canvas.height);
        blurHead(frame.data, canvas.width, canvas.height, {
          x: nose.x * canvas.width,
          y: nose.y * canvas.height,
          radius: canvas.width * 0.12,
        });
        context.putImageData(frame, 0, 0);
      }
    }
    drawSkeleton(
      context,
      sample.landmarks,
      canvas.width,
      canvas.height,
      stations?.chest?.fraction ?? null,
      stations?.waist?.fraction ?? null,
      liveFrame,
    );
    if (heightCal?.crown) {
      const y = (heightCal.crown.y / sample.imageHeight) * canvas.height;
      context.strokeStyle = "#f4efe4";
      context.beginPath();
      context.moveTo(canvas.width * 0.42, y);
      context.lineTo(canvas.width * 0.58, y);
      context.stroke();
    }
  }, [guide, imageScale, state.heightCm]);

  const stepProgress = captureStepProgress(state);
  const typed = parseManualNumbers(state);
  const manualPreview = buildPreview(state, props, typed);
  const preview =
    state.reading === "camera" && (state.step === "review" || state.step === "done")
      ? {
          result: cameraResult,
          error: cameraResult ? null : "The camera estimates are not ready.",
        }
      : manualPreview;

  function reviewCamera(): void {
    if (!guide?.front || state.heightCm == null || state.clothingFit === "") {
      return;
    }
    const result = createCameraResult({
      sessionId: props.sessionId,
      displayUnits: state.displayUnits,
      garment: state.garment,
      heightCm: state.heightCm,
      clothingFit: state.clothingFit,
      front: guide.front,
      side: guide.side,
      sleevePath: props.sleevePath,
      hemAnchor: props.hemAnchor,
      easePresets: props.easePresets,
      exportKeypoints: props.exportKeypoints,
      sizeChart: props.sizeChart,
    });
    if (!result) {
      dispatch({
        type: "fail",
        message: "The pose did not produce a chest and waist. You can type the measurements.",
      });
      return;
    }
    setCameraResult(result);
    dispatch({ type: "review-camera" });
  }

  function replayRecordedPose(): void {
    if (replayTimer.current != null) {
      window.clearInterval(replayTimer.current);
    }
    const frames = runRecordedGuide();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const last = frames[frames.length - 1];
    if (!last) {
      return;
    }
    if (reduced) {
      setGuide(last);
      setGates(last.gates);
      return;
    }
    let index = 0;
    replayTimer.current = window.setInterval(() => {
      const frame = frames[index];
      if (!frame) {
        if (replayTimer.current != null) {
          window.clearInterval(replayTimer.current);
        }
        return;
      }
      setGuide(frame);
      setGates(frame.gates);
      index += 1;
    }, 80);
  }

  async function enableCamera(): Promise<void> {
    dispatch({ type: "camera-request" });
    const devices = navigator.mediaDevices;
    if (!devices?.getUserMedia) {
      dispatch({ type: "camera-missing" });
      props.onError({ code: "camera-missing", message: "This browser has no camera." });
      return;
    }
    try {
      const stream = await devices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      if (stepRef.current !== "camera") {
        stopTracks(stream);
        return;
      }
      streamRef.current = stream;
      dispatch({ type: "camera-live" });
    } catch (error) {
      const missing =
        error instanceof DOMException &&
        (error.name === "NotFoundError" || error.name === "NotSupportedError");
      if (missing) {
        dispatch({ type: "camera-missing" });
        props.onError({ code: "camera-missing", message: "This browser has no camera." });
        return;
      }
      dispatch({ type: "camera-denied" });
      props.onError({ code: "camera-denied", message: "Camera access was blocked." });
    }
  }

  function send(): void {
    const result = draft ?? preview.result;
    if (!result) {
      dispatch({
        type: "fail",
        message: preview.error ?? "These measurements could not be checked.",
      });
      return;
    }
    stopTracks(streamRef.current);
    streamRef.current = null;
    props.onComplete(result);
    dispatch({ type: "confirm" });
  }

  const continueDisabled =
    (state.step === "consent" && !state.consentChecked) ||
    (state.step === "order" && !state.adult) ||
    (state.step === "body" && (parseHeightCm(state) == null || state.clothingFit === "")) ||
    (state.step === "manual" && typed == null) ||
    (state.step === "review" && (draft ?? preview.result) == null);

  return (
    <>
      <style>{css}</style>
      <section class="panel" aria-labelledby="tailor-scan-title">
        <p class="kicker">Tailor measurements</p>
        <h2 id="tailor-scan-title">Tailor Scan</h2>
        <p class="step">
          {stepProgress == null
            ? state.step === "cancelled"
              ? "Cancelled"
              : "Sent"
            : `Step ${stepProgress.current} of ${stepProgress.total}`}
        </p>
        <p class="meta">
          {state.garment} · display {props.displayUnits}
        </p>
        {state.step === "consent" ? <Consent state={state} dispatch={dispatch} /> : null}
        {state.step === "cancelled" ? (
          <p class="status">Cancelled. The shop receives nothing.</p>
        ) : null}
        {state.step === "order" ? (
          <Order
            state={state}
            dispatch={dispatch}
            hasChart={Boolean(props.sizeChart?.length)}
            onDisplayUnits={props.onDisplayUnits}
          />
        ) : null}
        {state.step === "body" ? <Body state={state} dispatch={dispatch} /> : null}
        {state.step === "camera" ? (
          <Camera
            state={state}
            videoRef={videoRef}
            canvasRef={canvasRef}
            gates={gates}
            guide={guide}
            onImageScale={setImageScale}
          />
        ) : null}
        {state.step === "manual" ? <Manual state={state} dispatch={dispatch} /> : null}
        {state.step === "review" && (draft ?? preview.result) ? (
          <ReviewEditor
            result={(draft ?? preview.result)!}
            easePresets={props.easePresets}
            onChange={setDraft}
          />
        ) : null}
        {state.step === "done" ? <p class="status">Measurements sent. The camera is off.</p> : null}
        {state.error || preview.error ? (
          <p class="error" role="alert">
            {state.error ?? preview.error}
          </p>
        ) : null}
        <div class="actions">
          {state.step !== "consent" && state.step !== "done" && state.step !== "cancelled" ? (
            <button
              type="button"
              class="secondary"
              onClick={() => {
                setDraft(null);
                dispatch({ type: "back" });
              }}
            >
              Back
            </button>
          ) : null}
          {state.step === "consent" ? (
            <button
              type="button"
              class="secondary"
              onClick={() => {
                dispatch({ type: "decline" });
                props.onCancel();
              }}
            >
              No thanks
            </button>
          ) : null}
          {state.step === "camera" ? (
            <button
              type="button"
              class="secondary"
              disabled={state.camera === "requesting"}
              onClick={() => void enableCamera()}
            >
              {state.camera === "requesting" ? "Asking for the camera…" : "Turn on camera"}
            </button>
          ) : null}
          {state.step === "camera" ? (
            <button type="button" class="secondary" onClick={replayRecordedPose}>
              Replay recorded pose
            </button>
          ) : null}
          {state.step === "camera" && guide?.phase === "done" ? (
            <button type="button" onClick={reviewCamera}>
              Review camera estimates
            </button>
          ) : null}
          {state.step !== "done" && state.step !== "cancelled" ? (
            <button
              type="button"
              disabled={continueDisabled || state.camera === "requesting"}
              onClick={() => advance(state, dispatch, send)}
            >
              {primaryLabel(state)}
            </button>
          ) : null}
          <button type="button" class="secondary" onClick={() => setSpoken(scriptFor(state))}>
            Read this step
          </button>
        </div>
        <p class="sr" aria-live="polite">
          {spoken}
        </p>
      </section>
    </>
  );
}

function Consent(props: {
  state: CaptureState;
  dispatch: (action: Parameters<typeof captureReducer>[1]) => void;
}) {
  return (
    <>
      <p class="status">
        The camera stays on this device. Pictures are not uploaded. If you confirm, the shop
        receives Chhati, Kamar, Baazu, and Lambai only.
      </p>
      <div class="choices">
        <label class="choice">
          <input
            type="checkbox"
            name="consent"
            checked={props.state.consentChecked}
            onChange={(event) =>
              props.dispatch({
                type: "check-consent",
                checked: event.currentTarget.checked,
              })
            }
          />
          I have read this. The camera stays on this device, and pictures are not uploaded.
        </label>
      </div>
    </>
  );
}

function Order(props: {
  state: CaptureState;
  hasChart: boolean;
  dispatch: (action: Parameters<typeof captureReducer>[1]) => void;
  onDisplayUnits?: (units: DisplayUnits) => void;
}) {
  return (
    <>
      <p class="status">Choose the garment and the units you want to read. This tool is for adults.</p>
      <div class="fields">
        <div class="pair">
          <label class="field">
            Garment
            <select
              name="garment"
              value={props.state.garment}
              onChange={(event) =>
                props.dispatch({
                  type: "set-garment",
                  garment: event.currentTarget.value as GarmentId,
                })
              }
            >
              <option value="shirt">Shirt</option>
              <option value="kurta">Kurta</option>
              <option value="kameez">Kameez</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          <label class="field">
            Units
            <select
              name="units"
              value={props.state.displayUnits}
              onChange={(event) => {
                const units = event.currentTarget.value as DisplayUnits;
                props.dispatch({ type: "set-units", units });
                props.onDisplayUnits?.(units);
              }}
            >
              <option value="cm">Centimeters</option>
              <option value="in">Inches</option>
            </select>
          </label>
        </div>
        <label class="choice">
          <input
            type="checkbox"
            name="adult"
            checked={props.state.adult}
            onChange={(event) =>
              props.dispatch({ type: "set-adult", adult: event.currentTarget.checked })
            }
          />
          I am an adult.
        </label>
        {props.hasChart ? (
          <p class="hint">This shop sent a size chart. Matching sizes are included when you send.</p>
        ) : null}
      </div>
    </>
  );
}

function Body(props: {
  state: CaptureState;
  dispatch: (action: Parameters<typeof captureReducer>[1]) => void;
}) {
  return (
    <>
      <p class="status">
        Enter your height as you are dressed now, including shoes if you will wear them. Tie hair
        up, empty pockets, and take off a dupatta or open jacket.
      </p>
      <div class="fields">
        <div class="choices">
          <label class="choice">
            <input
              type="radio"
              name="height-mode"
              value="cm"
              checked={props.state.heightMode === "cm"}
              onChange={() => props.dispatch({ type: "set-height-mode", mode: "cm" })}
            />
            Centimeters
          </label>
          <label class="choice">
            <input
              type="radio"
              name="height-mode"
              value="ft"
              checked={props.state.heightMode === "ft"}
              onChange={() => props.dispatch({ type: "set-height-mode", mode: "ft" })}
            />
            Feet and inches
          </label>
        </div>
        {props.state.heightMode === "cm" ? (
          <label class="field">
            Height in centimeters
            <input
              type="number"
              name="height-cm"
              inputMode="decimal"
              min="50"
              max="250"
              value={props.state.heightCmText}
              onInput={(event) =>
                props.dispatch({ type: "set-height-cm", value: event.currentTarget.value })
              }
            />
          </label>
        ) : (
          <div class="pair">
            <label class="field">
              Feet
              <input
                type="number"
                name="height-feet"
                inputMode="numeric"
                min="3"
                max="8"
                value={props.state.heightFeetText}
                onInput={(event) =>
                  props.dispatch({ type: "set-height-feet", value: event.currentTarget.value })
                }
              />
            </label>
            <label class="field">
              Inches
              <input
                type="number"
                name="height-inches"
                inputMode="decimal"
                min="0"
                max="11"
                value={props.state.heightInchesText}
                onInput={(event) =>
                  props.dispatch({ type: "set-height-inches", value: event.currentTarget.value })
                }
              />
            </label>
          </div>
        )}
        <fieldset class="choices">
          <legend class="status">Are these clothes close-fitting?</legend>
          <label class="choice">
            <input
              type="radio"
              name="clothing"
              value="close"
              checked={props.state.clothingFit === "close"}
              onChange={() => props.dispatch({ type: "set-clothing", fit: "close" })}
            />
            Yes, they are close-fitting
          </label>
          <label class="choice">
            <input
              type="radio"
              name="clothing"
              value="loose"
              checked={props.state.clothingFit === "loose"}
              onChange={() => props.dispatch({ type: "set-clothing", fit: "loose" })}
            />
            No, they are loose
          </label>
          <label class="choice">
            <input
              type="radio"
              name="clothing"
              value="unknown"
              checked={props.state.clothingFit === "unknown"}
              onChange={() => props.dispatch({ type: "set-clothing", fit: "unknown" })}
            />
            Not sure
          </label>
        </fieldset>
      </div>
    </>
  );
}

function Camera(props: {
  state: CaptureState;
  videoRef: { current: HTMLVideoElement | null };
  canvasRef: { current: HTMLCanvasElement | null };
  gates: GateOutcome[];
  guide: GuideSnapshot | null;
  onImageScale: (scaleCmPerPx: number | null) => void;
}) {
  const front = props.guide?.front ?? null;
  const height =
    front?.mask == null || props.state.heightCm == null
      ? null
      : calibrateHeight({
          mask: front.mask,
          landmarks: front.landmarks,
          imageHeight: front.imageHeight,
          enteredHeightCm: props.state.heightCm,
        });
  return (
    <>
      <p class="status">
        {props.guide?.prompt ??
          "A second person holding the phone is the easier path. You can type the measurements if the camera is unavailable."}
      </p>
      <div class="stage">
        {props.state.camera === "live" ? (
          <video ref={props.videoRef} autoPlay muted playsInline aria-label="Camera preview" />
        ) : null}
        <canvas ref={props.canvasRef} aria-hidden="true" />
      </div>
      <GateChips gates={props.gates} />
      <p class="guide-row">
        <span class="guide" aria-hidden="true" />
        Position
      </p>
      <ul class="prompts">
        {prompts.map((prompt) => (
          <li class="prompt" key={prompt}>
            {prompt}
          </li>
        ))}
      </ul>
      {props.state.camera === "denied" ? (
        <p class="error" role="alert">
          Camera access was blocked. In the browser site settings, allow the camera for this page,
          then try again. You can also type the measurements.
        </p>
      ) : null}
      {props.state.camera === "missing" ? (
        <p class="error" role="alert">
          This browser has no camera. Type the measurements instead.
        </p>
      ) : null}
      <p class="hint">
        The preview stays on this device. The face is flattened on the preview and does not leave this
        page. Replay uses a recorded pose. A live camera loads the local pose model when this page
        provides one.
      </p>
      <CalibrationPanel
        heightScaleCmPerPx={height?.scaleCmPerPx ?? null}
        sample={front}
        onImageScale={props.onImageScale}
      />
    </>
  );
}

function Manual(props: {
  state: CaptureState;
  dispatch: (action: Parameters<typeof captureReducer>[1]) => void;
}) {
  const unit = props.state.entryUnits === "in" ? "inches" : "centimeters";
  return (
    <>
      <p class="status">
        Use a tape if you have one. Enter each measurement in {unit}. These numbers are what the
        shop receives.
      </p>
      <div class="fields pair">
        {manualFields.map((field) => (
          <label class="field" key={field}>
            {fieldCopy[field].label}
            <span class="detail">{fieldCopy[field].detail}</span>
            <input
              type="number"
              name={field}
              inputMode="decimal"
              min="0"
              value={props.state.manual[field]}
              onInput={(event) =>
                props.dispatch({ type: "set-manual", field, value: event.currentTarget.value })
              }
            />
          </label>
        ))}
      </div>
    </>
  );
}

function advance(
  state: CaptureState,
  dispatch: (action: Parameters<typeof captureReducer>[1]) => void,
  send: () => void,
): void {
  if (state.step === "consent") {
    dispatch({ type: "accept-consent" });
  } else if (state.step === "order") {
    dispatch({ type: "continue-order" });
  } else if (state.step === "body") {
    dispatch({ type: "continue-body" });
  } else if (state.step === "camera") {
    dispatch({ type: "skip-camera" });
  } else if (state.step === "manual") {
    dispatch({ type: "submit-manual" });
  } else if (state.step === "review") {
    send();
  }
}

function primaryLabel(state: CaptureState): string {
  if (state.step === "camera") {
    return "Enter measurements instead";
  }
  if (state.step === "manual") {
    return "Review measurements";
  }
  if (state.step === "review") {
    return "Send measurements";
  }
  return "Continue";
}

function scriptFor(state: CaptureState): string {
  if (state.step === "camera") {
    return `Camera. ${prompts.join(" ")}`;
  }
  if (state.step === "consent") {
    return "Consent. The camera stays on this device. Pictures are not uploaded.";
  }
  if (state.step === "cancelled") {
    return "Cancelled. The shop receives nothing.";
  }
  if (state.step === "order") {
    return "Order setup. Choose a garment and units, and confirm you are an adult.";
  }
  if (state.step === "body") {
    return "Body setup. Enter height as dressed now, including shoes, and say if the clothes are close-fitting.";
  }
  if (state.step === "manual") {
    return "Type Chhati, Kamar, Baazu, and Lambai.";
  }
  if (state.step === "review") {
    return "Review the typed measurements, then send them.";
  }
  return "Measurements sent.";
}

function buildPreview(
  state: CaptureState,
  props: {
    sleevePath?: SleevePath;
    hemAnchor?: HemAnchor;
    easePresets?: EmbedConfig["easePresets"];
    exportKeypoints?: boolean;
    sizeChart?: EmbedConfig["sizeChart"];
    sessionId?: string;
  },
  typed: ReturnType<typeof parseManualNumbers>,
): { result: ScanResult | null; error: string | null } {
  if (state.step !== "review" && state.step !== "done") {
    return { result: null, error: null };
  }
  if (typed == null || state.heightCm == null || state.clothingFit === "") {
    return { result: null, error: "Enter all four measurements before sending." };
  }
  try {
    return {
      result: createManualResult({
        sessionId: props.sessionId ?? "session",
        displayUnits: state.entryUnits,
        garment: state.garment,
        heightCm: state.heightCm,
        clothingFit: state.clothingFit,
        chhati: typed.chhati,
        kamar: typed.kamar,
        baazu: typed.baazu,
        lambai: typed.lambai,
        sleevePath: props.sleevePath,
        hemAnchor: props.hemAnchor,
        easePresets: props.easePresets,
        exportKeypoints: props.exportKeypoints,
        sizeChart: props.sizeChart,
      }),
      error: null,
    };
  } catch (error) {
    return {
      result: null,
      error: error instanceof Error ? error.message : "These measurements could not be checked.",
    };
  }
}

function emptyGates(): GateOutcome[] {
  return liveGates({
    luma: null,
    laplacian: null,
    imageHeight: 0,
    landmarks: null,
    recent: [],
  });
}

function stopTracks(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => {
    track.stop();
  });
}
