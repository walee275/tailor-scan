export const localVisionAssets = {
  wasmUrl: "/vision/wasm",
  modelUrl: "/vision/pose_landmarker_full.task",
} as const;

export function isLocalAsset(url: string): boolean {
  return url.startsWith("/") && !url.includes("://");
}
