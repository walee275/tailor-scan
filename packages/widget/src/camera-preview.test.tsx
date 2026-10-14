import { render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Capture } from "./capture";
import { reachCamera } from "./walk-capture";

describe("camera preview", () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.unstubAllGlobals();
  });

  it("opens the rear camera unmirrored and can switch to a mirrored front camera", async () => {
    const calls: MediaStreamConstraints[] = [];
    let facing: "environment" | "user" = "environment";
    vi.stubGlobal("requestAnimationFrame", () => 1);
    vi.stubGlobal("cancelAnimationFrame", () => undefined);
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async (constraints: MediaStreamConstraints) => {
          calls.push(constraints);
          const requested = requestedFacing(constraints);
          if (requested) {
            facing = requested;
          }
          return fakeStream(facing);
        },
      },
    });

    const host = document.createElement("div");
    document.body.appendChild(host);
    act(() => {
      render(
        <Capture
          sessionId="preview"
          garment="kurta"
          displayUnits="cm"
          onProgress={() => undefined}
          onComplete={() => undefined}
          onCancel={() => undefined}
          onError={() => undefined}
        />,
        host,
      );
    });
    reachCamera(host);
    await act(async () => {
      click(host, "Turn on camera");
      await Promise.resolve();
    });

    expect(calls[0]).toEqual({ video: { facingMode: "environment" }, audio: false });
    expect(host.querySelector(".stage.mirror")).toBeNull();
    expect(host.textContent).toContain("Switch camera");
    expect(host.textContent).toContain("Step 1 of 2: face the camera");

    await act(async () => {
      click(host, "Switch camera");
      await Promise.resolve();
    });
    expect(calls.at(-1)).toEqual({ video: { facingMode: "user" }, audio: false });
    expect(host.querySelector(".stage.mirror")).not.toBeNull();
  });
});

function click(root: ParentNode, name: string): void {
  const button = [...root.querySelectorAll("button")].find((node) => node.textContent?.includes(name));
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`No button named ${name}.`);
  }
  button.click();
}

function requestedFacing(constraints: MediaStreamConstraints): "environment" | "user" | null {
  const video = constraints.video;
  if (!video || typeof video === "boolean" || !("facingMode" in video)) {
    return null;
  }
  return video.facingMode === "user" || video.facingMode === "environment" ? video.facingMode : null;
}

function fakeStream(facing: "environment" | "user"): MediaStream {
  const track = {
    stop() {
      return undefined;
    },
    getSettings: () => ({ facingMode: facing }),
  };
  return {
    getVideoTracks: () => [track],
    getTracks: () => [track],
  } as unknown as MediaStream;
}
