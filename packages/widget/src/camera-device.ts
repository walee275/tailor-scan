export type CameraFacing = "environment" | "user";

export type CameraOpener = (constraints: MediaStreamConstraints) => Promise<MediaStream>;

const fallbackErrorNames = new Set(["OverconstrainedError", "ConstraintNotSatisfiedError", "NotFoundError"]);

/** A missing rear camera should try any camera. A denied permission should not prompt again. */
export function cameraConstraintErrorCanFallback(error: unknown): boolean {
  return error instanceof DOMException && fallbackErrorNames.has(error.name);
}

export async function openScanCamera(getUserMedia: CameraOpener, facing: CameraFacing): Promise<MediaStream> {
  try {
    return await getUserMedia({ video: { facingMode: facing }, audio: false });
  } catch (error) {
    if (!cameraConstraintErrorCanFallback(error)) {
      throw error;
    }
  }
  return getUserMedia({ video: true, audio: false });
}

export function facingFromStream(stream: {
  getVideoTracks(): Array<{ getSettings?: () => MediaTrackSettings }>;
}): CameraFacing | null {
  const mode = stream.getVideoTracks()[0]?.getSettings?.().facingMode;
  return mode === "user" || mode === "environment" ? mode : null;
}

/** Selfie preview is mirrored. The rear camera stays as the sensor sees it, matching the overlay. */
export function shouldMirrorPreview(facing: CameraFacing | null): boolean {
  return facing === "user";
}

export function nextFacing(facing: CameraFacing | null): CameraFacing {
  return facing === "environment" ? "user" : "environment";
}
