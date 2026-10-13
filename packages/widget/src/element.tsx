import { render } from "preact";
import { Placeholder } from "./placeholder";

export class TailorScanElement extends HTMLElement {
  readonly #root: ShadowRoot;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: "open" });
  }

  connectedCallback(): void {
    render(<Placeholder />, this.#root);
  }

  disconnectedCallback(): void {
    render(null, this.#root);
  }
}

export function defineTailorScan(): void {
  if (customElements.get("tailor-scan")) {
    return;
  }
  customElements.define("tailor-scan", TailorScanElement);
}
