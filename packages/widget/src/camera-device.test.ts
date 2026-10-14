import { describe, expect, it, vi } from "vitest";
import {
  facingFromStream,
  nextFacing,
  openScanCamera,
  shouldMirrorPreview,
  type CameraOpener,
} from "./camera-device";

describe("scan camera", () => {
  it("asks for the rear camera without a microphone", async () => {
    const getUserMedia = vi.fn<CameraOpener>(async () => stream("environment"));
    const opened = await openScanCamera(getUserMedia, "environment");
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(getUserMedia).toHaveBeenCalledWith({ video: { facingMode: "environment" }, audio: false });
    expect(facingFromStream(opened)).toBe("environment");
    expect(shouldMirrorPreview(facingFromStream(opened))).toBe(false);
  });

  it("falls back to any camera when the rear camera is missing", async () => {
    const getUserMedia = vi.fn<CameraOpener>(async (constraints) => {
      const video = constraints.video;
      if (typeof video === "object" && video && "facingMode" in video) {
        throw new DOMException("No rear camera", "OverconstrainedError");
      }
      return stream("user");
    });
    const opened = await openScanCamera(getUserMedia, "environment");
    expect(getUserMedia).toHaveBeenNthCalledWith(2, { video: true, audio: false });
    expect(facingFromStream(opened)).toBe("user");
    expect(shouldMirrorPreview("user")).toBe(true);
    expect(shouldMirrorPreview(null)).toBe(false);
  });

  it("does not ask twice when permission is denied", async () => {
    const getUserMedia = vi.fn<CameraOpener>(async () => {
      throw new DOMException("Denied", "NotAllowedError");
    });
    await expect(openScanCamera(getUserMedia, "environment")).rejects.toThrow(/Denied/);
    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });

  it("switches from the rear camera to the front camera", () => {
    expect(nextFacing("environment")).toBe("user");
    expect(nextFacing("user")).toBe("environment");
    expect(nextFacing(null)).toBe("environment");
  });
});

function stream(facing: "environment" | "user"): MediaStream {
  return {
    getVideoTracks: () => [{ getSettings: () => ({ facingMode: facing }) }],
  } as unknown as MediaStream;
}
