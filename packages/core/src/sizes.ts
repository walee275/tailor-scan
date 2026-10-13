import { ContractError, cuttingCm } from "./ease";
import type { CentimeterRange, MeasurementId, OverlappingSize } from "./result";

export type SizeChartEntry = {
  id: string;
  label: string;
  measurementId: MeasurementId;
  minCm: number;
  maxCm: number;
};

export type SizedMeasurement = {
  id: MeasurementId;
  valueCm: number;
  overrideCm: number | null;
  rangeCm: CentimeterRange | null;
};

export function overlappingSizes(
  measurements: readonly SizedMeasurement[],
  chart: readonly SizeChartEntry[],
): OverlappingSize[] {
  const byId = new Map(measurements.map((measurement) => [measurement.id, measurement]));
  const matches: OverlappingSize[] = [];
  for (const size of chart) {
    if (size.minCm > size.maxCm) {
      throw new ContractError(`Size ${size.id} has minCm above maxCm.`);
    }
    const measurement = byId.get(size.measurementId);
    if (!measurement) {
      continue;
    }
    const [low, high] = span(measurement);
    if (low <= size.maxCm && size.minCm <= high) {
      matches.push({
        id: size.id,
        label: size.label,
        measurementId: size.measurementId,
      });
    }
  }
  return matches;
}

function span(measurement: SizedMeasurement): CentimeterRange {
  if (!measurement.rangeCm) {
    const point = cuttingCm(measurement);
    return [point, point];
  }
  const [first, second] = measurement.rangeCm;
  return first <= second ? [first, second] : [second, first];
}
