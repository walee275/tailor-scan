import type { EmbedConfig } from "./config";
import { isCalibration, isGarment } from "./config";

export const PROTOCOL_VERSION = 1;
export const HOST_SOURCE = "tailor-scan-host";
export const WIDGET_SOURCE = "tailor-scan";

const widgetTypes = ["ready", "progress", "complete", "cancel", "error"] as const;

export type WidgetMessageType = (typeof widgetTypes)[number];

export type HostMessage = {
  source: typeof HOST_SOURCE;
  version: typeof PROTOCOL_VERSION;
  sessionId: string;
  type: "init";
  config: EmbedConfig;
};

export type WidgetMessage = {
  source: typeof WIDGET_SOURCE;
  version: typeof PROTOCOL_VERSION;
  sessionId: string;
  type: WidgetMessageType;
  payload?: unknown;
};

export function acceptHostMessage(
  event: { origin: string; data: unknown },
  expected: { origin: string; sessionId: string },
): HostMessage | null {
  if (event.origin !== expected.origin) {
    return null;
  }
  if (!isRecord(event.data)) {
    return null;
  }
  if (event.data.source !== HOST_SOURCE || event.data.version !== PROTOCOL_VERSION) {
    return null;
  }
  if (event.data.type !== "init" || event.data.sessionId !== expected.sessionId) {
    return null;
  }
  return {
    source: HOST_SOURCE,
    version: PROTOCOL_VERSION,
    sessionId: expected.sessionId,
    type: "init",
    config: readConfig(event.data.config),
  };
}

export function acceptWidgetMessage(
  event: { origin: string; data: unknown },
  expected: { origin: string; sessionId: string },
): WidgetMessage | null {
  if (event.origin !== expected.origin) {
    return null;
  }
  if (!isRecord(event.data)) {
    return null;
  }
  if (event.data.source !== WIDGET_SOURCE || event.data.version !== PROTOCOL_VERSION) {
    return null;
  }
  if (event.data.sessionId !== expected.sessionId || !isWidgetType(event.data.type)) {
    return null;
  }
  return {
    source: WIDGET_SOURCE,
    version: PROTOCOL_VERSION,
    sessionId: expected.sessionId,
    type: event.data.type,
    payload: event.data.payload,
  };
}

function isWidgetType(value: unknown): value is WidgetMessageType {
  return typeof value === "string" && widgetTypes.includes(value as WidgetMessageType);
}

function readConfig(value: unknown): EmbedConfig {
  if (!isRecord(value)) {
    return {};
  }
  const config: EmbedConfig = {};
  if (value.displayUnits === "cm" || value.displayUnits === "in") {
    config.displayUnits = value.displayUnits;
  }
  if (isGarment(value.garment)) {
    config.garment = value.garment;
  }
  if (value.calibration && isCalibration(value.calibration)) {
    config.calibration = value.calibration;
  }
  if (value.exportKeypoints === true) {
    config.exportKeypoints = true;
  }
  if (isRecord(value.theme) && typeof value.theme.accent === "string") {
    config.theme = { accent: value.theme.accent };
  }
  return config;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
