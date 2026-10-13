import { render } from "preact";
import type { DisplayUnits } from "@tailor-scan/core";
import type { EmbedConfig } from "./config";
import { readAttributes } from "./config";
import { createMockResult } from "./mock-result";
import { Placeholder } from "./placeholder";

export class TailorScanElement extends HTMLElement {
  readonly #root: ShadowRoot;
  #config: EmbedConfig = {};
  #explicitConfig = false;
  #sessionId = createSessionId();
  #sent = false;

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
      <Placeholder
        displayUnits={this.#config.displayUnits ?? "cm"}
        garment={this.#config.garment ?? "kurta"}
        sent={this.#sent}
        onSample={this.#sendSample}
      />,
      this.#root,
    );
  }

  #sendSample = (): void => {
    if (this.#sent) {
      return;
    }
    const result = createMockResult(this.#config, this.#sessionId);
    this.#sent = true;
    this.#paint();
    this.#emit("progress", { sessionId: this.#sessionId, step: "sample" });
    this.#emit("complete", result);
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
