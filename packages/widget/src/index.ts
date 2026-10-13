export { readAttributes, type EmbedConfig, type OpenOptions, type ScanSession } from "./config";
export { defineTailorScan, TailorScanElement } from "./element";
export { bindIframeSession, startIframeEmbed } from "./iframe";
export {
  acceptHostMessage,
  acceptWidgetMessage,
  HOST_SOURCE,
  PROTOCOL_VERSION,
  WIDGET_SOURCE,
} from "./protocol";
export { open } from "./session";

import { bindIframeSession } from "./iframe";
import { defineTailorScan } from "./element";
import { open } from "./session";

defineTailorScan();

export const TailorScan = {
  open,
  bindIframeSession,
};
