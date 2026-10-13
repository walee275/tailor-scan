import fixture from "../fixtures/result-v1.json";
import type { ScanResult } from "./result";
import { validateScanResult } from "./schema";

export function sampleScanResult(): ScanResult {
  const validated = validateScanResult(structuredClone(fixture));
  if (!validated.ok) {
    throw new Error("The built-in sample result does not match the schema.");
  }
  return validated.value;
}
