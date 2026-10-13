import { describe, expect, it } from "vitest";
import { isLocalAsset, localVisionAssets } from "./vision-assets";

describe("pose model location", () => {
  it("loads the model and wasm from the widget origin", () => {
    expect(isLocalAsset(localVisionAssets.modelUrl)).toBe(true);
    expect(isLocalAsset(localVisionAssets.wasmUrl)).toBe(true);
    expect(localVisionAssets.modelUrl.endsWith(".task")).toBe(true);
  });
});
