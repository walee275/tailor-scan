import { act } from "preact/test-utils";

export function enterManualResult(
  root: ParentNode,
  values: { chhati: string; kamar: string; baazu: string; lambai: string } = {
    chhati: "96.4",
    kamar: "84",
    baazu: "63.5",
    lambai: "102",
  },
): void {
  reachManual(root);
  setInput(root, "chhati", values.chhati);
  setInput(root, "kamar", values.kamar);
  setInput(root, "baazu", values.baazu);
  setInput(root, "lambai", values.lambai);
  clickButton(root, "Review measurements");
  clickButton(root, "Send measurements");
}

export function reachCamera(root: ParentNode): void {
  setChecked(root, "consent", true);
  clickButton(root, "Continue");
  setChecked(root, "adult", true);
  clickButton(root, "Continue");
  setRadio(root, "height-mode", "cm");
  setInput(root, "height-cm", "172");
  setRadio(root, "clothing", "close");
  clickButton(root, "Continue");
}

export function reachManual(root: ParentNode): void {
  reachCamera(root);
  clickButton(root, "Enter measurements instead");
}

function clickButton(root: ParentNode, name: string): void {
  const button = [...root.querySelectorAll("button")].find((node) => node.textContent?.includes(name));
  if (!(button instanceof HTMLButtonElement) || button.disabled) {
    throw new Error(`No enabled button named ${name}.`);
  }
  act(() => {
    button.click();
  });
}

function setChecked(root: ParentNode, name: string, checked: boolean): void {
  const input = root.querySelector<HTMLInputElement>(`input[name="${name}"]`);
  if (!input) {
    throw new Error(`No checkbox ${name}.`);
  }
  if (input.checked === checked) {
    return;
  }
  act(() => {
    input.click();
  });
}

function setRadio(root: ParentNode, name: string, value: string): void {
  const input = root.querySelector<HTMLInputElement>(`input[name="${name}"][value="${value}"]`);
  if (!input) {
    throw new Error(`No radio ${name}=${value}.`);
  }
  act(() => {
    input.click();
  });
}

function setInput(root: ParentNode, name: string, value: string): void {
  const input = root.querySelector<HTMLInputElement>(`input[name="${name}"]`);
  if (!input) {
    throw new Error(`No input ${name}.`);
  }
  act(() => {
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
