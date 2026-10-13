import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { localVisionAssets, openWithDelegateFallback, type VisionProvider } from "@tailor-scan/widget";

// Vendored pose landmarker full float16.
// sha256 4eaa5eb7a98365221087693fcc286334cf0858e2eb6e15b506aa4a7ecdcec4ad
// Runtime loads /vision/pose_landmarker_full.task and /vision/wasm from this origin.
export async function createLocalPoseProvider(): Promise<VisionProvider> {
  const fileset = await FilesetResolver.forVisionTasks(localVisionAssets.wasmUrl);
  const opened = await openWithDelegateFallback((delegate) =>
    PoseLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: localVisionAssets.modelUrl,
        delegate,
      },
      runningMode: "VIDEO",
      numPoses: 1,
    }),
  );
  return {
    async sample(frame, timestampMs) {
      const result = opened.value.detectForVideo(frame as HTMLVideoElement, timestampMs);
      const landmarks = result.landmarks[0] ?? [];
      const world = result.worldLandmarks[0] ?? [];
      const sample = {
        landmarks: landmarks.map((point) => ({
          x: point.x,
          y: point.y,
          visibility: point.visibility ?? 0,
        })),
        worldLandmarks: world.map((point) => ({
          x: point.x,
          y: point.y,
          z: point.z,
          visibility: point.visibility ?? 0,
        })),
        mask: null,
        imageWidth: 0,
        imageHeight: 0,
        timestampMs,
        luma: null,
        sharpness: null,
      };
      return sample;
    },
    close() {
      opened.value.close();
    },
  };
}
