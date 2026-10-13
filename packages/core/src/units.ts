import type { DisplayUnits } from "./result";

export const CM_PER_INCH = 2.54;

export function inchesToCm(inches: number): number {
  return inches * CM_PER_INCH;
}

export function cmToInches(cm: number): number {
  return cm / CM_PER_INCH;
}

export function feetAndInchesToCm(feet: number, inches: number): number {
  return inchesToCm(feet * 12 + inches);
}

export function roundWireCm(cm: number): number {
  return roundToStep(cm, 0.1);
}

export function roundDisplayCm(cm: number): number {
  return roundToStep(cm, 0.5);
}

export function roundDisplayInches(inches: number): number {
  return roundToStep(inches, 0.25);
}

export function displayLength(
  valueCm: number,
  units: DisplayUnits,
): { value: number; unit: DisplayUnits } {
  if (units === "cm") {
    return { value: roundDisplayCm(valueCm), unit: "cm" };
  }
  return { value: roundDisplayInches(cmToInches(valueCm)), unit: "in" };
}

function roundToStep(value: number, step: number): number {
  const places = decimalPlaces(step);
  const factor = 10 ** places;
  const valueUnits = Math.round((value + Number.EPSILON) * factor);
  const stepUnits = Math.round(step * factor);
  return (Math.round(valueUnits / stepUnits) * stepUnits) / factor;
}

function decimalPlaces(step: number): number {
  const text = step.toString();
  const dot = text.indexOf(".");
  return dot === -1 ? 0 : text.length - dot - 1;
}
