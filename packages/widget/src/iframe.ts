import { validateScanResult, type ScanResult } from "@tailor-scan/core";
import type { EmbedConfig, ScanError } from "./config";
import { defineTailorScan, TailorScanElement } from "./element";
import {
  acceptHostMessage,
  acceptWidgetMessage,
  HOST_SOURCE,
  PROTOCOL_VERSION,
  WIDGET_SOURCE,
  type WidgetMessageType,
} from "./protocol";

export type IframeSessionOptions = {
  iframe: HTMLIFrameElement;
  sessionId: string;
  widgetOrigin: string;
  config?: EmbedConfig;
  onReady?: (detail: { sessionId: string }) => void;
  onProgress?: (state: { sessionId: string; step: string }) => void;
  onComplete?: (result: ScanResult) => void;
  onCancel?: () => void;
  onError?: (error: ScanError) => void;
};

export function bindIframeSession(options: IframeSessionOptions): { close: () => void } {
  const onMessage = (event: MessageEvent) => {
    const message = acceptWidgetMessage(event, {
      origin: options.widgetOrigin,
      sessionId: options.sessionId,
    });
    if (!message) {
      return;
    }
    if (message.type === "ready") {
      options.onReady?.({ sessionId: options.sessionId });
      return;
    }
    if (message.type === "progress") {
      options.onProgress?.(message.payload as { sessionId: string; step: string });
      return;
    }
    if (message.type === "complete") {
      const parsed = validateScanResult(message.payload);
      if (parsed.ok && parsed.value.sessionId === options.sessionId) {
        options.onComplete?.(parsed.value);
      }
      return;
    }
    if (message.type === "cancel") {
      options.onCancel?.();
      return;
    }
    options.onError?.(message.payload as ScanError);
  };
  window.addEventListener("message", onMessage);
  const sendInit = () => {
    options.iframe.contentWindow?.postMessage(
      {
        source: HOST_SOURCE,
        version: PROTOCOL_VERSION,
        sessionId: options.sessionId,
        type: "init",
        config: options.config ?? {},
      },
      options.widgetOrigin,
    );
  };
  options.iframe.addEventListener("load", sendInit);
  return {
    close() {
      window.removeEventListener("message", onMessage);
    },
  };
}

type IframeEnv = {
  search: string;
  document: Document;
  parent: { postMessage: (message: unknown, origin: string) => void };
  addEventListener: (type: "message", listener: (event: MessageEvent) => void) => void;
};

export function startIframeEmbed(env: IframeEnv = browserEnv()): void {
  defineTailorScan();
  const params = new URLSearchParams(env.search);
  const sessionId = params.get("session") ?? "";
  const parentOrigin = params.get("parentOrigin") ?? "";
  if (!sessionId || !parentOrigin) {
    env.document.body.textContent = "This frame is missing a session id or parent origin.";
    return;
  }
  const post = (type: WidgetMessageType, payload?: unknown) => {
    env.parent.postMessage(
      {
        source: WIDGET_SOURCE,
        version: PROTOCOL_VERSION,
        sessionId,
        type,
        payload,
      },
      parentOrigin,
    );
  };
  env.addEventListener("message", (event) => {
    const message = acceptHostMessage(event, { origin: parentOrigin, sessionId });
    if (!message) {
      return;
    }
    mount(env.document, message.config, sessionId, post);
  });
}

function mount(
  doc: Document,
  config: EmbedConfig,
  sessionId: string,
  post: (type: WidgetMessageType, payload?: unknown) => void,
): void {
  const element = doc.createElement("tailor-scan") as TailorScanElement;
  element.adoptSessionId(sessionId);
  element.config = config;
  listen(element, "ready", () => post("ready", { sessionId }));
  listen(element, "progress", (detail) => post("progress", detail));
  listen(element, "complete", (detail) => post("complete", detail));
  listen(element, "cancel", () => post("cancel"));
  listen(element, "error", (detail) => post("error", detail));
  doc.body.replaceChildren(element);
}

function listen(element: HTMLElement, type: string, handler: (detail: unknown) => void): void {
  element.addEventListener(type, (event) => {
    handler(event instanceof CustomEvent ? event.detail : undefined);
  });
}

function browserEnv(): IframeEnv {
  return {
    search: window.location.search,
    document,
    parent: window.parent,
    addEventListener(type, listener) {
      window.addEventListener(type, listener);
    },
  };
}
