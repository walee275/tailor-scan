import type { VisionSample } from "@tailor-scan/core";

export type VisionProvider = {
  sample(frame: CanvasImageSource, timestampMs: number): Promise<VisionSample>;
  close(): void;
};

export type VisionProviderFactory = () => Promise<VisionProvider>;

let factory: VisionProviderFactory | null = null;

export function setDefaultVisionProvider(next: VisionProviderFactory | null): void {
  factory = next;
}

export function getDefaultVisionProvider(): VisionProviderFactory | null {
  return factory;
}
