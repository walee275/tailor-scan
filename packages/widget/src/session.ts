import type { DisplayUnits } from "@tailor-scan/core";
import type { OpenOptions, ScanSession } from "./config";
import { defineTailorScan, TailorScanElement } from "./element";

export function open(options: OpenOptions): ScanSession {
  defineTailorScan();
  const target = resolveTarget(options.target);
  const element = document.createElement("tailor-scan") as TailorScanElement;
  element.config = options;
  let completed = false;
  let cancelled = false;
  element.addEventListener("ready", (event) => {
    options.onReady?.(detail<{ sessionId: string }>(event));
  });
  element.addEventListener("progress", (event) => {
    options.onProgress?.(detail(event));
  });
  element.addEventListener("complete", (event) => {
    completed = true;
    options.onComplete?.(detail(event));
  });
  element.addEventListener("cancel", () => {
    cancelled = true;
    options.onCancel?.();
  });
  element.addEventListener("error", (event) => {
    options.onError?.(detail(event));
  });

  const dialog = options.presentation === "modal" ? document.createElement("dialog") : null;
  if (dialog) {
    dialog.append(element);
    target.append(dialog);
    showDialog(dialog);
  } else {
    target.replaceChildren(element);
  }

  return {
    sessionId: element.sessionId,
    setDisplayUnits(units: DisplayUnits) {
      element.setDisplayUnits(units);
    },
    close() {
      element.remove();
      dialog?.close();
      dialog?.remove();
      if (!completed && !cancelled) {
        cancelled = true;
        options.onCancel?.();
      }
    },
  };
}

function resolveTarget(target: string | HTMLElement): HTMLElement {
  if (typeof target !== "string") {
    return target;
  }
  const found = document.querySelector(target);
  if (!(found instanceof HTMLElement)) {
    throw new Error(`Tailor Scan could not find ${target}.`);
  }
  return found;
}

function detail<T>(event: Event): T {
  return (event as CustomEvent<T>).detail;
}

function showDialog(dialog: HTMLDialogElement): void {
  if (typeof dialog.showModal !== "function") {
    return;
  }
  try {
    dialog.showModal();
  } catch {
    // The dialog is already open, or this runtime has no modal support.
  }
}
