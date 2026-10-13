import type { GateOutcome } from "@tailor-scan/core";

const statusWord = {
  pass: "Pass",
  fail: "Fix",
  pending: "Wait",
} as const;

export function GateChips(props: { gates: GateOutcome[] }) {
  return (
    <ul class="chips">
      {props.gates.map((gate) => (
        <li key={gate.id} data-status={gate.status}>
          <span class="chip-label">{gate.label}</span>
          <span class="chip-status">{statusWord[gate.status]}</span>
          <span class="chip-prompt">{gate.prompt}</span>
        </li>
      ))}
    </ul>
  );
}
