import {
  applyEase,
  calibrateHeight,
  compareWaistToChest,
  estimateGirth,
  estimateLambai,
  estimateSleeve,
  overlappingSizes,
  resolveEase,
  roundWireCm,
  selectStations,
  torsoWidthPx,
  validateScanResult,
  PoseIndex,
  type ArmBones,
  type ClothingFit,
  type DisplayUnits,
  type EasePresets,
  type GarmentId,
  type HemAnchor,
  type ScanResult,
  type SizeChartEntry,
  type SleevePath,
  type VisionSample,
} from "@tailor-scan/core";

export function createCameraResult(input: {
  sessionId: string;
  displayUnits: DisplayUnits;
  garment: GarmentId;
  heightCm: number;
  clothingFit: ClothingFit;
  front: VisionSample;
  side: VisionSample | null;
  sleevePath?: SleevePath;
  hemAnchor?: HemAnchor;
  easePresets?: EasePresets | null;
  exportKeypoints?: boolean;
  sizeChart?: SizeChartEntry[];
}): ScanResult | null {
  if (!input.front.mask) {
    return null;
  }
  const frontCal = calibrateHeight({
    mask: input.front.mask,
    landmarks: input.front.landmarks,
    imageHeight: input.front.imageHeight,
    enteredHeightCm: input.heightCm,
  });
  if (frontCal.scaleCmPerPx == null) {
    return null;
  }
  const frontMaskScale = frontCal.scaleCmPerPx * (input.front.imageWidth / input.front.mask.width);
  const frontOnly = input.side?.mask == null;
  const stations = selectStations({
    mask: input.front.mask,
    landmarks: input.front.landmarks,
    scaleCmPerPx: frontMaskScale,
    frontOnly,
  });
  if (stations.blocked || !stations.chest || !stations.waist) {
    return null;
  }
  const sideScale = sideScaleOf(input.side, input.heightCm);
  const chestDepth = depthCm(input.side, sideScale, stations.chest.fraction);
  const waistDepth = depthCm(input.side, sideScale, stations.waist.fraction);
  const calibration = "height-only" as const;
  const chest = estimateGirth(
    {
      id: "chhati",
      widthCm: stations.chest.widthPx * frontMaskScale,
      depthCm: chestDepth,
      onEdge: stations.chest.onEdge,
    },
    { clothingFit: input.clothingFit, calibration, frontOnly: chestDepth == null },
  );
  const waist = estimateGirth(
    {
      id: "kamar",
      widthCm: stations.waist.widthPx * frontMaskScale,
      depthCm: waistDepth,
      onEdge: stations.waist.onEdge,
    },
    { clothingFit: input.clothingFit, calibration, frontOnly: waistDepth == null },
  );
  const waistNote = compareWaistToChest(waist.valueCm, chest.valueCm);
  const sleeve = sleeveFrom(input.front, frontCal.scaleCmPerPx, input.heightCm, input.sleevePath ?? "shoulder-to-wrist");
  const hem = input.hemAnchor ?? (input.garment === "kurta" || input.garment === "kameez" ? "knee" : "hip");
  const length = estimateLambai({
    napeY: napePixelY(input.front),
    hemY: hemPixelY(input.front, hem),
    frontScaleCmPerPx: frontCal.scaleCmPerPx,
    calibration,
  });
  if (!sleeve || !(length.valueCm > 0)) {
    return null;
  }
  const warnings = [...chest.warnings, ...waist.warnings, ...sleeve.warnings];
  if (waistNote) {
    warnings.push(waistNote);
  }
  const fit = resolveEase(input.garment, "regular", input.easePresets ?? null);
  const measurements = [
    measurement("chhati", "Chhati", chest, stations.chest.fraction),
    measurement("kamar", "Kamar", waist, stations.waist.fraction),
    {
      id: "baazu" as const,
      label: "Baazu",
      source: "camera" as const,
      method: sleeve.method,
      sleevePath: input.sleevePath ?? "shoulder-to-wrist",
      valueCm: sleeve.valueCm,
      rangeCm: sleeve.rangeCm,
      rangeBasis: "error-budget" as const,
      confidence: sleeve.confidence,
      leftCm: sleeve.leftCm,
      rightCm: sleeve.rightCm,
      overrideCm: null,
    },
    {
      id: "lambai" as const,
      label: "Lambai",
      source: "camera" as const,
      method: "nape-to-hem" as const,
      lengthAnchor: "nape" as const,
      hemAnchor: hem,
      valueCm: length.valueCm,
      rangeCm: length.rangeCm,
      rangeBasis: "error-budget" as const,
      confidence: "medium" as const,
      overrideCm: null,
    },
  ];
  const validated = validateScanResult({
    schema: "tailor-scan.result.v1",
    sessionId: input.sessionId,
    capturedAt: new Date().toISOString(),
    displayUnits: input.displayUnits,
    garment: input.garment,
    subject: {
      heightCm: roundWireCm(input.heightCm),
      clothingFit: input.clothingFit,
      adultDeclaration: true,
    },
    calibration: {
      method: "height",
      frontScaleCmPerPx: frontCal.scaleCmPerPx,
      sideScaleCmPerPx: sideScale,
      agreement: "height-only",
      confidence: "medium",
    },
    measurements,
    fit,
    garmentMeasurements: applyEase(
      {
        chhatiCm: chest.valueCm,
        kamarCm: waist.valueCm,
        baazuCm: sleeve.valueCm,
        lambaiCm: length.valueCm,
      },
      fit,
    ),
    sizes: input.sizeChart ? overlappingSizes(measurements, input.sizeChart) : [],
    quality: {
      front: "pass",
      side: frontOnly ? "skipped" : "pass",
      warnings,
    },
    privacy: {
      imagesLeftDevice: false,
      keypointsIncluded: input.exportKeypoints === true,
    },
  });
  return validated.ok ? validated.value : null;
}

function measurement(
  id: "chhati" | "kamar",
  label: string,
  estimate: ReturnType<typeof estimateGirth>,
  fraction: number,
) {
  return {
    id,
    label,
    source: "camera" as const,
    method: estimate.method,
    valueCm: estimate.valueCm,
    rangeCm: estimate.rangeCm,
    rangeBasis: "error-budget" as const,
    confidence: estimate.confidence,
    stationFraction: fraction,
    overrideCm: null,
  };
}

function sideScaleOf(sample: VisionSample | null, heightCm: number): number | null {
  if (!sample?.mask) {
    return null;
  }
  return calibrateHeight({
    mask: sample.mask,
    landmarks: sample.landmarks,
    imageHeight: sample.imageHeight,
    enteredHeightCm: heightCm,
  }).scaleCmPerPx;
}

function depthCm(sample: VisionSample | null, scale: number | null, fraction: number): number | null {
  if (!sample?.mask || scale == null) {
    return null;
  }
  const maskScale = scale * (sample.imageWidth / sample.mask.width);
  const width = torsoWidthPx({
    mask: sample.mask,
    landmarks: sample.landmarks,
    scaleCmPerPx: maskScale,
    fraction,
  });
  return width == null ? null : width * maskScale;
}

function sleeveFrom(
  sample: VisionSample,
  scaleCmPerPx: number,
  heightCm: number,
  sleevePath: SleevePath,
) {
  const left = bones(sample, "left");
  const right = bones(sample, "right");
  const stature = worldStature(sample);
  if (!left || !right || stature == null) {
    return null;
  }
  const shoulderPx =
    Math.abs(
      (sample.landmarks[PoseIndex.rightShoulder]?.x ?? 0) -
        (sample.landmarks[PoseIndex.leftShoulder]?.x ?? 0),
    ) * sample.imageWidth;
  return estimateSleeve({
    enteredHeightCm: heightCm,
    worldStatureCm: stature,
    left,
    right,
    leftPixelCm: pixelArmCm(sample, "left", scaleCmPerPx),
    rightPixelCm: pixelArmCm(sample, "right", scaleCmPerPx),
    shoulderWidthCm: shoulderPx * scaleCmPerPx,
    sleevePath,
    calibration: "height-only",
  });
}

function bones(sample: VisionSample, side: "left" | "right"): ArmBones | null {
  const shoulder = sample.worldLandmarks[side === "left" ? PoseIndex.leftShoulder : PoseIndex.rightShoulder];
  const elbow = sample.worldLandmarks[side === "left" ? PoseIndex.leftElbow : PoseIndex.rightElbow];
  const wrist = sample.worldLandmarks[side === "left" ? PoseIndex.leftWrist : PoseIndex.rightWrist];
  if (!shoulder || !elbow || !wrist) {
    return null;
  }
  return { shoulder, elbow, wrist };
}

function worldStature(sample: VisionSample): number | null {
  const nose = sample.worldLandmarks[PoseIndex.nose];
  const heel = lowerWorld(sample, PoseIndex.leftHeel, PoseIndex.rightHeel);
  const imageNose = sample.landmarks[PoseIndex.nose];
  const heelPx = lowerImage(sample, PoseIndex.leftHeel, PoseIndex.rightHeel);
  if (!nose || !heel || !imageNose || heelPx == null) {
    return null;
  }
  const worldSpan = Math.hypot(nose.x - heel.x, nose.y - heel.y, nose.z - heel.z);
  const nosePx = imageNose.y * sample.imageHeight;
  const imageSpan = Math.abs(heelPx - nosePx);
  if (!(worldSpan > 0) || !(imageSpan > 0)) {
    return null;
  }
  const crownPx = nosePx - imageSpan * 0.08;
  return (worldSpan * (heelPx - crownPx)) / imageSpan;
}

function pixelArmCm(sample: VisionSample, side: "left" | "right", scale: number): number {
  const shoulder = side === "left" ? PoseIndex.leftShoulder : PoseIndex.rightShoulder;
  const elbow = side === "left" ? PoseIndex.leftElbow : PoseIndex.rightElbow;
  const wrist = side === "left" ? PoseIndex.leftWrist : PoseIndex.rightWrist;
  return (segmentPx(sample, shoulder, elbow) + segmentPx(sample, elbow, wrist)) * scale;
}

function segmentPx(sample: VisionSample, start: number, end: number): number {
  const a = sample.landmarks[start];
  const b = sample.landmarks[end];
  if (!a || !b) {
    return 0;
  }
  return Math.hypot((a.x - b.x) * sample.imageWidth, (a.y - b.y) * sample.imageHeight);
}

function napePixelY(sample: VisionSample): number {
  const left = sample.landmarks[PoseIndex.leftShoulder];
  const right = sample.landmarks[PoseIndex.rightShoulder];
  if (!left || !right) {
    return 0;
  }
  const mid = ((left.y + right.y) / 2) * sample.imageHeight;
  const width = Math.abs(right.x - left.x) * sample.imageWidth;
  return mid - width * 0.15;
}

function hemPixelY(sample: VisionSample, hem: HemAnchor): number {
  if (hem === "knee") {
    return lowerImage(sample, PoseIndex.leftKnee, PoseIndex.rightKnee) ?? 0;
  }
  if (hem === "ankle" || hem === "custom") {
    return lowerImage(sample, PoseIndex.leftAnkle, PoseIndex.rightAnkle) ?? 0;
  }
  return lowerImage(sample, PoseIndex.leftHip, PoseIndex.rightHip) ?? 0;
}

function lowerImage(sample: VisionSample, left: number, right: number): number | null {
  const points = [sample.landmarks[left], sample.landmarks[right]].filter((point) => point);
  if (points.length === 0) {
    return null;
  }
  return Math.max(...points.map((point) => point!.y)) * sample.imageHeight;
}

function lowerWorld(sample: VisionSample, left: number, right: number) {
  const points = [sample.worldLandmarks[left], sample.worldLandmarks[right]].filter((point) => point);
  return points.sort((a, b) => a!.y - b!.y)[0] ?? null;
}
