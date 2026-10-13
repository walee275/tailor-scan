import { PoseIndex, type ImageLandmark } from "./gates";
import type { CalibrationAgreement, CalibrationMethod, Confidence } from "./result";
import type { PersonMask } from "./vision";

export const A4_INNER_MM = { widthMm: 180, heightMm: 260 } as const;
export const CREDIT_CARD_MM = { widthMm: 85.6, heightMm: 53.98 } as const;

const a4Aspect = A4_INNER_MM.heightMm / A4_INNER_MM.widthMm;
const aspectTolerance = 0.08;
const minLongFraction = 0.12;
const maxLongFraction = 0.22;

export type ReferencePresetId = "a4-inner" | "credit-card" | "custom";

export type Millimeters = { widthMm: number; heightMm: number };

export function referenceMillimeters(
  preset: ReferencePresetId,
  custom?: Millimeters,
): Millimeters | null {
  if (preset === "a4-inner") {
    return A4_INNER_MM;
  }
  if (preset === "credit-card") {
    return CREDIT_CARD_MM;
  }
  if (!custom || !(custom.widthMm > 0) || !(custom.heightMm > 0)) {
    return null;
  }
  return custom;
}

export function heightScaleCmPerPx(enteredHeightCm: number, crownY: number, floorY: number): number | null {
  const span = floorY - crownY;
  if (!(enteredHeightCm > 0) || !(span > 0)) {
    return null;
  }
  return enteredHeightCm / span;
}

export type FloorPick = {
  y: number;
  method: "heel" | "ankle-plus-7cm";
  confidence: Confidence;
};

export function selectFloor(landmarks: ImageLandmark[], imageHeight: number): FloorPick | null {
  const heels = visible(landmarks, [PoseIndex.leftHeel, PoseIndex.rightHeel]);
  if (heels.length > 0) {
    return { y: lowest(heels, imageHeight), method: "heel", confidence: "high" };
  }
  const ankles = visible(landmarks, [PoseIndex.leftAnkle, PoseIndex.rightAnkle]);
  if (ankles.length === 0) {
    return null;
  }
  return { y: lowest(ankles, imageHeight), method: "ankle-plus-7cm", confidence: "medium" };
}

export function scaleFromFloor(
  enteredHeightCm: number,
  crownY: number,
  floor: FloorPick,
): number | null {
  if (floor.method === "heel") {
    return heightScaleCmPerPx(enteredHeightCm, crownY, floor.y);
  }
  const span = floor.y - crownY;
  if (!(enteredHeightCm > 7) || !(span > 0)) {
    return null;
  }
  return (enteredHeightCm - 7) / span;
}

export type CrownPick = {
  y: number;
  noseDistanceCm: number | null;
  rejected: boolean;
  prompt: string | null;
};

export function selectCrown(
  mask: PersonMask,
  landmarks: ImageLandmark[],
  imageHeight: number,
  scaleCmPerPx?: number | null,
): CrownPick | null {
  const nose = landmarks[PoseIndex.nose];
  if (!nose || imageHeight <= 0 || mask.height <= 0) {
    return null;
  }
  const left = landmarks[PoseIndex.leftEar]?.x ?? nose.x - 0.04;
  const right = landmarks[PoseIndex.rightEar]?.x ?? nose.x + 0.04;
  const x0 = Math.max(0, Math.floor((Math.min(left, right) - 0.02) * mask.width));
  const x1 = Math.min(mask.width - 1, Math.ceil((Math.max(left, right) + 0.02) * mask.width));
  const noseRow = Math.round(nose.y * mask.height);
  let top = -1;
  for (let row = 0; row < noseRow; row += 1) {
    for (let column = x0; column <= x1; column += 1) {
      if (mask.person[row * mask.width + column]) {
        top = row;
        break;
      }
    }
    if (top >= 0) {
      break;
    }
  }
  if (top < 0) {
    return {
      y: Math.max(0, nose.y * imageHeight - 0.08 * imageHeight),
      noseDistanceCm: null,
      rejected: true,
      prompt: "Drag the crown marker to the top of the head.",
    };
  }
  const y = (top / mask.height) * imageHeight;
  const distanceCm =
    scaleCmPerPx == null ? null : Math.abs(nose.y * imageHeight - y) * scaleCmPerPx;
  const rejected = distanceCm != null && (distanceCm < 8 || distanceCm > 16);
  return {
    y,
    noseDistanceCm: distanceCm,
    rejected,
    prompt: rejected ? "Drag the crown marker to the top of the head. Hats and high buns are rejected." : null,
  };
}

export type Corner = { x: number; y: number };
export type CornerQuad = [Corner, Corner, Corner, Corner];

export function moveCorner(
  corners: CornerQuad,
  index: 0 | 1 | 2 | 3,
  point: Corner,
  bounds: { width: number; height: number },
): CornerQuad {
  const next = corners.map((corner) => ({ ...corner })) as CornerQuad;
  next[index] = {
    x: Math.min(bounds.width, Math.max(0, point.x)),
    y: Math.min(bounds.height, Math.max(0, point.y)),
  };
  return next;
}

export function quadSizePx(corners: CornerQuad): { widthPx: number; heightPx: number } {
  return {
    widthPx: (distance(corners[0], corners[1]) + distance(corners[3], corners[2])) / 2,
    heightPx: (distance(corners[0], corners[3]) + distance(corners[1], corners[2])) / 2,
  };
}

export function referenceScaleCmPerPx(
  widthPx: number,
  heightPx: number,
  size: Millimeters,
): number | null {
  if (!(widthPx > 0) || !(heightPx > 0)) {
    return null;
  }
  const shortPx = Math.min(widthPx, heightPx);
  const longPx = Math.max(widthPx, heightPx);
  const shortMm = Math.min(size.widthMm, size.heightMm);
  const longMm = Math.max(size.widthMm, size.heightMm);
  return ((shortMm / 10) / shortPx + (longMm / 10) / longPx) / 2;
}

export type BinaryScene = {
  width: number;
  height: number;
  ink: Uint8Array;
  bodyTop: number;
  bodyBottom: number;
  bodyHeightPx: number;
};

export type RectangleDetection = {
  corners: CornerQuad;
  widthPx: number;
  heightPx: number;
  longEdgePx: number;
  aspect: number;
  insideBody: boolean;
  tooClose: boolean;
  accepted: boolean;
  reason: string | null;
};

export function detectRectangle(scene: BinaryScene): RectangleDetection | null {
  let minX = scene.width;
  let minY = scene.height;
  let maxX = -1;
  let maxY = -1;
  let count = 0;
  for (let y = 0; y < scene.height; y += 1) {
    for (let x = 0; x < scene.width; x += 1) {
      if (!scene.ink[y * scene.width + x]) {
        continue;
      }
      count += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (count === 0 || maxX < minX) {
    return null;
  }
  const widthPx = maxX - minX + 1;
  const heightPx = maxY - minY + 1;
  const longEdgePx = Math.max(widthPx, heightPx);
  const shortEdgePx = Math.min(widthPx, heightPx);
  const aspect = longEdgePx / shortEdgePx;
  const area = widthPx * heightPx;
  const solid = count / area >= 0.8;
  const aspectOk = Math.abs(aspect - a4Aspect) / a4Aspect <= aspectTolerance;
  const insideBody = minY >= scene.bodyTop && maxY <= scene.bodyBottom;
  const tooSmall = longEdgePx < scene.bodyHeightPx * minLongFraction;
  const tooClose = longEdgePx > scene.bodyHeightPx * maxLongFraction;
  const accepted = solid && aspectOk && insideBody && !tooSmall && !tooClose;
  return {
    corners: [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY },
    ],
    widthPx,
    heightPx,
    longEdgePx,
    aspect,
    insideBody,
    tooClose,
    accepted,
    reason: rectangleReason({ solid, aspectOk, insideBody, tooSmall, tooClose }),
  };
}

export type ScaleChoice = {
  scaleCmPerPx: number;
  method: CalibrationMethod;
  agreement: CalibrationAgreement;
  confidence: Confidence;
  note: string;
};

export function agreeScales(
  heightScale: number,
  reference: { scaleCmPerPx: number; accepted: boolean } | null,
): ScaleChoice {
  if (!reference || !(heightScale > 0)) {
    return {
      scaleCmPerPx: heightScale,
      method: "height",
      agreement: "height-only",
      confidence: "medium",
      note: "Height only. Girth ranges stay wide.",
    };
  }
  const delta = Math.abs(reference.scaleCmPerPx - heightScale) / heightScale;
  if (reference.accepted && delta <= 0.03) {
    return {
      scaleCmPerPx: (heightScale + reference.scaleCmPerPx) / 2,
      method: "height+a4",
      agreement: "within-3pct",
      confidence: "high",
      note: "Height and the printed sheet agree.",
    };
  }
  if (reference.accepted) {
    return {
      scaleCmPerPx: reference.scaleCmPerPx,
      method: "a4",
      agreement: "prefer-reference",
      confidence: "medium",
      note: "The sheet and the entered height disagree. The entered height may be off.",
    };
  }
  return {
    scaleCmPerPx: heightScale,
    method: "height",
    agreement: "prefer-height",
    confidence: "medium",
    note: "The sheet was ignored. Drag the corners if the outline is wrong.",
  };
}

export type HeightCalibration = {
  crown: CrownPick | null;
  floor: FloorPick | null;
  scaleCmPerPx: number | null;
  confidence: Confidence;
};

export function calibrateHeight(input: {
  mask: PersonMask | null;
  landmarks: ImageLandmark[];
  imageHeight: number;
  enteredHeightCm: number;
  crownShiftPx?: number;
}): HeightCalibration {
  const floor = selectFloor(input.landmarks, input.imageHeight);
  const located =
    input.mask == null ? null : selectCrown(input.mask, input.landmarks, input.imageHeight, null);
  const crownY = located == null ? null : located.y + (input.crownShiftPx ?? 0);
  const scale = floor == null || crownY == null ? null : scaleFromFloor(input.enteredHeightCm, crownY, floor);
  const noseY = (input.landmarks[PoseIndex.nose]?.y ?? 0) * input.imageHeight;
  const noseDistanceCm = scale == null || crownY == null ? null : Math.abs(noseY - crownY) * scale;
  const rejected = noseDistanceCm != null && (noseDistanceCm < 8 || noseDistanceCm > 16);
  const crown =
    located == null
      ? null
      : {
          ...located,
          y: crownY ?? located.y,
          noseDistanceCm,
          rejected: located.rejected || rejected,
          prompt:
            located.rejected || rejected
              ? "Drag the crown marker to the top of the head. Hats and high buns are rejected."
              : null,
        };
  return {
    crown,
    floor,
    scaleCmPerPx: scale,
    confidence: floor?.confidence === "high" && crown?.rejected !== true ? "medium" : "low",
  };
}

const pageWidthPt = 595.28;
const pageHeightPt = 841.89;

export function buildA4SheetPdf(): string {
  const mmToPt = 72 / 25.4;
  const rectW = 180 * mmToPt;
  const rectH = 260 * mmToPt;
  const x = (pageWidthPt - rectW) / 2;
  const y = (pageHeightPt - rectH) / 2;
  const stream = [
    "0.8 w",
    `${x.toFixed(2)} ${y.toFixed(2)} ${rectW.toFixed(2)} ${rectH.toFixed(2)} re S`,
    "BT /F1 14 Tf 48 800 Td (Print at 100% scale. Do not use Fit to page.) Tj ET",
    "BT /F1 12 Tf 48 778 Td (Inner rectangle 180 mm by 260 mm.) Tj ET",
  ].join("\n");
  const chunks = ["%PDF-1.4\n"];
  const offsets = [0];
  const add = (body: string) => {
    offsets.push(chunks.join("").length);
    chunks.push(body);
  };
  add("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n");
  add("2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj\n");
  add(
    `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidthPt} ${pageHeightPt}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n`,
  );
  add(`4 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream\nendobj\n`);
  add("5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n");
  const xrefAt = chunks.join("").length;
  let xref = "xref\n0 6\n0000000000 65535 f \n";
  for (let index = 1; index <= 5; index += 1) {
    xref += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer << /Size 6 /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`;
  return chunks.join("") + xref;
}

export const a4SheetRectPt = {
  width: 180 * (72 / 25.4),
  height: 260 * (72 / 25.4),
};

function visible(landmarks: ImageLandmark[], indexes: number[]): ImageLandmark[] {
  return indexes
    .map((index) => landmarks[index])
    .filter((point): point is ImageLandmark => Boolean(point && point.visibility >= 0.6));
}

function lowest(points: ImageLandmark[], imageHeight: number): number {
  return Math.max(...points.map((point) => point.y)) * imageHeight;
}

function distance(a: Corner, b: Corner): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function rectangleReason(flags: {
  solid: boolean;
  aspectOk: boolean;
  insideBody: boolean;
  tooSmall: boolean;
  tooClose: boolean;
}): string | null {
  if (!flags.solid) {
    return "That mark is not a solid rectangle.";
  }
  if (!flags.aspectOk) {
    return "That rectangle is not the printed 180 by 260 mm mark.";
  }
  if (!flags.insideBody) {
    return "Place the sheet beside the legs, at the same depth as the body.";
  }
  if (flags.tooClose) {
    return "The sheet is too close to the camera.";
  }
  if (flags.tooSmall) {
    return "The sheet is too small in the frame.";
  }
  return null;
}
