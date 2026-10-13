import { describe, expect, it } from "vitest";
import {
  A4_INNER_MM,
  CREDIT_CARD_MM,
  a4SheetRectPt,
  agreeScales,
  buildA4SheetPdf,
  calibrateHeight,
  detectRectangle,
  heightScaleCmPerPx,
  moveCorner,
  quadSizePx,
  referenceMillimeters,
  referenceScaleCmPerPx,
  scaleFromFloor,
  selectCrown,
  selectFloor,
  type CornerQuad,
} from "./calibration";
import { POSE_LANDMARK_COUNT, PoseIndex, type ImageLandmark } from "./gates";
import type { PersonMask } from "./vision";

describe("calibration", () => {
  it("turns a known crown-to-heel span into centimeters per pixel", () => {
    expect(heightScaleCmPerPx(168, 100, 940)).toBeCloseTo(0.2, 5);
    const floor = selectFloor(pose({ heel: 0.94, ankle: 0.9 }), 1000);
    expect(floor?.method).toBe("heel");
    expect(floor?.y).toBeCloseTo(940, 5);
  });

  it("adds 7 cm when only the ankles are visible", () => {
    const landmarks = pose({ heel: 0.9, ankle: 0.9 });
    landmarks[PoseIndex.leftHeel]!.visibility = 0.1;
    landmarks[PoseIndex.rightHeel]!.visibility = 0.1;
    const floor = selectFloor(landmarks, 1000);
    expect(floor?.method).toBe("ankle-plus-7cm");
    expect(floor?.confidence).toBe("medium");
    expect(scaleFromFloor(177, 100, floor!)).toBeCloseTo(0.2125, 5);
  });

  it("rejects a crown that is too far from the nose", () => {
    const mask = paint(40, 50, (x, y) => x >= 14 && x <= 26 && y >= 2 && y <= 30);
    const landmarks = pose({ heel: 0.9, ankle: 0.86 });
    landmarks[PoseIndex.nose] = { x: 0.5, y: 0.4, visibility: 1 };
    landmarks[PoseIndex.leftEar] = { x: 0.4, y: 0.42, visibility: 1 };
    landmarks[PoseIndex.rightEar] = { x: 0.6, y: 0.42, visibility: 1 };
    const close = selectCrown(mask, landmarks, 100, 0.3);
    expect(close?.rejected).toBe(false);
    const far = selectCrown(mask, landmarks, 100, 0.9);
    expect(far?.rejected).toBe(true);
    expect(far?.prompt).toContain("crown");
  });

  it("accepts a printed sheet at body depth and rejects one held toward the lens", () => {
    const bodyHeightPx = 800;
    const good = sheetScene({
      bodyHeightPx,
      longPx: bodyHeightPx * 0.15,
      top: 520,
    });
    const found = detectRectangle(good);
    expect(found?.accepted).toBe(true);
    expect(found?.tooClose).toBe(false);
    const scale = referenceScaleCmPerPx(found!.widthPx, found!.heightPx, A4_INNER_MM);
    expect(scale).toBeCloseTo(26 / found!.longEdgePx, 3);

    const close = detectRectangle(
      sheetScene({ bodyHeightPx, longPx: bodyHeightPx * 0.4, top: 400 }),
    );
    expect(close?.accepted).toBe(false);
    expect(close?.tooClose).toBe(true);
    expect(close?.reason).toContain("too close");
  });

  it("averages agreeing scales and prefers the sheet only when it is coplanar", () => {
    const height = 0.2;
    const near = agreeScales(height, { scaleCmPerPx: height * 1.02, accepted: true });
    expect(near.agreement).toBe("within-3pct");
    expect(near.confidence).toBe("high");
    expect(near.scaleCmPerPx).toBeCloseTo(height * 1.01, 5);
    expect(near.method).toBe("height+a4");

    const sheet = agreeScales(height, { scaleCmPerPx: height * 1.12, accepted: true });
    expect(sheet.agreement).toBe("prefer-reference");
    expect(sheet.method).toBe("a4");
    expect(sheet.scaleCmPerPx).toBeCloseTo(height * 1.12, 5);
    expect(sheet.note).toContain("height may be off");

    const ignored = agreeScales(height, { scaleCmPerPx: height * 1.4, accepted: false });
    expect(ignored.agreement).toBe("prefer-height");
    expect(ignored.scaleCmPerPx).toBe(height);
    expect(ignored.note).toContain("ignored");

    expect(agreeScales(height, null).agreement).toBe("height-only");
  });

  it("keeps the credit card as a manual preset and moves a dragged corner", () => {
    expect(referenceMillimeters("credit-card")).toEqual(CREDIT_CARD_MM);
    expect(CREDIT_CARD_MM).toEqual({ widthMm: 85.6, heightMm: 53.98 });
    const corners: CornerQuad = [
      { x: 10, y: 10 },
      { x: 110, y: 10 },
      { x: 110, y: 60 },
      { x: 10, y: 60 },
    ];
    const moved = moveCorner(corners, 1, { x: 140, y: -5 }, { width: 200, height: 100 });
    expect(moved[1]).toEqual({ x: 140, y: 0 });
    expect(quadSizePx(moved).widthPx).toBeGreaterThan(quadSizePx(corners).widthPx);
  });

  it("builds a one-page PDF whose inner rectangle is 180 by 260 mm", () => {
    const pdf = buildA4SheetPdf();
    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect(pdf).toContain("Do not use Fit to page.");
    expect(pdf).toContain("180 mm by 260 mm");
    expect(a4SheetRectPt.width).toBeCloseTo((180 / 25.4) * 72, 3);
    expect(a4SheetRectPt.height).toBeCloseTo((260 / 25.4) * 72, 3);
    expect(pdf).toContain(`${a4SheetRectPt.width.toFixed(2)} ${a4SheetRectPt.height.toFixed(2)} re S`);
  });

  it("calibrates the recorded-style body from crown and heel", () => {
    const mask = paint(40, 80, (x, y) => x >= 16 && x <= 24 && y >= 8 && y <= 70);
    const landmarks = pose({ heel: 0.88, ankle: 0.84 });
    landmarks[PoseIndex.nose] = { x: 0.5, y: 0.16, visibility: 1 };
    landmarks[PoseIndex.leftEar] = { x: 0.42, y: 0.18, visibility: 1 };
    landmarks[PoseIndex.rightEar] = { x: 0.58, y: 0.18, visibility: 1 };
    const result = calibrateHeight({
      mask,
      landmarks,
      imageHeight: 800,
      enteredHeightCm: 170,
    });
    expect(result.scaleCmPerPx).not.toBeNull();
    expect(result.crown?.rejected).toBe(false);
    expect(result.floor?.method).toBe("heel");
  });
});

function pose(input: { heel: number; ankle: number }): ImageLandmark[] {
  const landmarks = Array.from({ length: POSE_LANDMARK_COUNT }, () => ({
    x: 0.5,
    y: 0.5,
    visibility: 1,
  }));
  landmarks[PoseIndex.leftHeel] = { x: 0.46, y: input.heel, visibility: 1 };
  landmarks[PoseIndex.rightHeel] = { x: 0.54, y: input.heel, visibility: 1 };
  landmarks[PoseIndex.leftAnkle] = { x: 0.46, y: input.ankle, visibility: 1 };
  landmarks[PoseIndex.rightAnkle] = { x: 0.54, y: input.ankle, visibility: 1 };
  return landmarks;
}

function paint(width: number, height: number, on: (x: number, y: number) => boolean): PersonMask {
  const person = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (on(x, y)) {
        person[y * width + x] = 1;
      }
    }
  }
  return { width, height, person };
}

function sheetScene(input: { bodyHeightPx: number; longPx: number; top: number }) {
  const width = 400;
  const height = 900;
  const longPx = Math.round(input.longPx);
  const shortPx = Math.round(longPx * (A4_INNER_MM.widthMm / A4_INNER_MM.heightMm));
  const ink = new Uint8Array(width * height);
  for (let y = input.top; y < input.top + shortPx; y += 1) {
    for (let x = 30; x < 30 + longPx; x += 1) {
      if (y >= 0 && y < height && x < width) {
        ink[y * width + x] = 1;
      }
    }
  }
  return {
    width,
    height,
    ink,
    bodyTop: 40,
    bodyBottom: 860,
    bodyHeightPx: input.bodyHeightPx,
  };
}
