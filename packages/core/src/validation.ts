import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const measurementIds = ["chhati", "kamar", "baazu", "lambai"] as const;
export type MeasurementId = (typeof measurementIds)[number];

export type PairedRow = {
  subject: string;
  tapeCm: Record<MeasurementId, number>;
  estimateCm: Record<MeasurementId, number>;
};

export type ValidationSession = {
  sessionId: string;
  rows: PairedRow[];
};

export type MeasurementScore = {
  maeCm: number;
  p80Cm: number;
};

export type ValidationReport = {
  rows: number;
  measurements: Record<MeasurementId, MeasurementScore>;
  meetsPublishedTargets: boolean;
  claimsTargetsMet: false;
  rangeBasis: "error-budget";
  note: string;
};

const targets: Record<MeasurementId, { mae: number; p80: number }> = {
  chhati: { mae: 4, p80: 6 },
  kamar: { mae: 4, p80: 6 },
  baazu: { mae: 2.5, p80: 4 },
  lambai: { mae: 2.5, p80: 4 },
};

export function absoluteErrors(rows: PairedRow[], id: MeasurementId): number[] {
  return rows.map((row) => Math.abs(row.estimateCm[id] - row.tapeCm[id]));
}

export function meanAbsoluteError(errors: number[]): number {
  if (errors.length === 0) {
    return 0;
  }
  return errors.reduce((sum, error) => sum + error, 0) / errors.length;
}

/** Nearest rank: sort, then take the error at ceil(0.8 * n). */
export function percentile80(errors: number[]): number {
  if (errors.length === 0) {
    return 0;
  }
  const sorted = [...errors].sort((a, b) => a - b);
  const rank = Math.ceil(0.8 * sorted.length);
  return sorted[rank - 1] ?? 0;
}

export function summarizeSessions(sessions: ValidationSession[]): ValidationReport {
  const rows = sessions.flatMap((session) => session.rows);
  const measurements = Object.fromEntries(
    measurementIds.map((id) => {
      const errors = absoluteErrors(rows, id);
      return [id, { maeCm: meanAbsoluteError(errors), p80Cm: percentile80(errors) }];
    }),
  ) as Record<MeasurementId, MeasurementScore>;
  const meetsPublishedTargets = measurementIds.every((id) => {
    const score = measurements[id];
    const target = targets[id];
    return score.maeCm < target.mae && score.p80Cm <= target.p80;
  });
  return {
    rows: rows.length,
    measurements,
    meetsPublishedTargets,
    claimsTargetsMet: false,
    rangeBasis: "error-budget",
    note: "This is not a tape study. Targets are not claimed. The UI keeps rangeBasis error-budget.",
  };
}

export function loadSessions(directory: string): ValidationSession[] {
  return readdirSync(directory)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => JSON.parse(readFileSync(join(directory, name), "utf8")) as ValidationSession);
}

export function formatReport(report: ValidationReport): string {
  const lines = [
    `Rows: ${report.rows}`,
    ...measurementIds.map((id) => {
      const score = report.measurements[id];
      return `${id}: MAE ${score.maeCm} cm, 80th percentile ${score.p80Cm} cm`;
    }),
    report.note,
  ];
  return lines.join("\n");
}

const entry = process.argv[1] ?? "";
if (entry.endsWith("validation.ts")) {
  const directory = process.argv[2] ?? join(process.cwd(), "validation/sessions");
  console.log(formatReport(summarizeSessions(loadSessions(directory))));
}
