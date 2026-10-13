import { render } from "preact";
import type { DisplayUnits, ScanResult } from "@tailor-scan/core";
import { Capture } from "./capture";
import type { EmbedConfig, ScanError } from "./config";
import { readAttributes } from "./config";

export class TailorScanElement extends HTMLElement {
  readonly #root: ShadowRoot;
  #config: EmbedConfig = {};
  #explicitConfig = false;
  #sessionId = createSessionId();

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: "open" });
  }

  get sessionId(): string {
    return this.#sessionId;
  }

  adoptSessionId(sessionId: string): void {
    this.#sessionId = sessionId;
  }

  set config(value: EmbedConfig) {
    this.#explicitConfig = true;
    this.#config = { ...value };
    this.#paint();
  }

  setDisplayUnits(units: DisplayUnits): void {
    this.#config = { ...this.#config, displayUnits: units };
    this.#paint();
  }

  connectedCallback(): void {
    if (!this.#explicitConfig) {
      this.#config = { ...readAttributes(this), ...this.#config };
    }
    this.#paint();
    this.#emit("ready", { sessionId: this.#sessionId });
  }

  disconnectedCallback(): void {
    render(null, this.#root);
  }

  #paint(): void {
    const accent = this.#config.theme?.accent ?? "#1f3a34";
    this.style.setProperty("--tailor-accent", accent);
    render(
      <Capture
        sessionId={this.#sessionId}
        garment={this.#config.garment ?? "kurta"}
        displayUnits={this.#config.displayUnits ?? "cm"}
        sleevePath={this.#config.sleevePath}
        hemAnchor={this.#config.hemAnchor}
        easePresets={this.#config.easePresets}
        exportKeypoints={this.#config.exportKeypoints}
        sizeChart={this.#config.sizeChart}
        onProgress={this.#progress}
        onComplete={this.#complete}
        onCancel={this.#cancel}
        onError={this.#error}
        onDisplayUnits={this.#displayUnits}
      />,
      this.#root,
    );
  }

  #progress = (step: string): void => {
    this.#emit("progress", { sessionId: this.#sessionId, step });
  };

  #complete = (result: ScanResult): void => {
    this.#emit("complete", { ...result, sessionId: this.#sessionId });
  };

  #cancel = (): void => {
    this.#emit("cancel");
  };

  #error = (error: ScanError): void => {
    this.#emit("error", error);
  };

  #displayUnits = (units: DisplayUnits): void => {
    if (this.#config.displayUnits === units) {
      return;
    }
    this.#config = { ...this.#config, displayUnits: units };
    this.#paint();
  };

  #emit(type: string, detail?: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }
}

export function defineTailorScan(): void {
  if (customElements.get("tailor-scan")) {
    return;
  }
  customElements.define("tailor-scan", TailorScanElement);
}

function createSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().slice(0, 8);
  }
  return Math.random().toString(16).slice(2, 10);
}
