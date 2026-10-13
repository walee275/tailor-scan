import type { ImageLandmark } from "./gates";

export type WorldLandmark = {
  x: number;
  y: number;
  z: number;
  visibility: number;
};

export type PersonMask = {
  width: number;
  height: number;
  person: Uint8Array;
};

export type VisionSample = {
  landmarks: ImageLandmark[];
  worldLandmarks: WorldLandmark[];
  mask: PersonMask | null;
  imageWidth: number;
  imageHeight: number;
  timestampMs: number;
  luma: number | null;
  sharpness: number | null;
};
