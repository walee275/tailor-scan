const measurements = [
  ["Chhati", "Chest"],
  ["Kamar", "Waist"],
  ["Baazu", "Sleeve"],
  ["Lambai", "Length"],
] as const;

const css = `
:host {
  display: block;
  color: #1c2421;
  font-family: "Iowan Old Style", Palatino, Georgia, serif;
}
.panel {
  box-sizing: border-box;
  border: 1px solid #d5cec2;
  background: #fbf8f2;
  padding: 1.25rem 1.25rem 1rem;
}
.kicker {
  margin: 0;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #5e6a63;
}
h2 {
  margin: 0.35rem 0 0;
  font-size: 1.75rem;
  font-weight: 560;
  letter-spacing: -0.02em;
}
.status, .meta {
  font-family: ui-sans-serif, system-ui, sans-serif;
}
.status {
  margin: 0.65rem 0 0.35rem;
  max-width: 36rem;
  font-size: 0.95rem;
  line-height: 1.45;
  color: #3d4742;
}
.meta {
  margin: 0 0 1rem;
  color: #5e6a63;
  font-size: 0.85rem;
}
ul {
  list-style: none;
  margin: 0 0 1rem;
  padding: 0;
}
li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  column-gap: 1rem;
  padding: 0.75rem 0;
  border-top: 1px solid #e4ddd1;
  font-family: ui-sans-serif, system-ui, sans-serif;
}
.name {
  font-family: "Iowan Old Style", Palatino, Georgia, serif;
  font-size: 1.05rem;
}
.detail {
  color: #5e6a63;
  font-size: 0.8rem;
}
.value {
  grid-row: 1 / span 2;
  align-self: center;
  color: #8a8174;
  font-size: 0.85rem;
}
button {
  border: 0;
  border-radius: 999px;
  background: var(--tailor-accent, #1f3a34);
  color: #fbf8f2;
  font: inherit;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 0.95rem;
  padding: 0.65rem 1rem;
  cursor: pointer;
}
button:disabled {
  cursor: default;
  opacity: 0.7;
}
`;

export function Placeholder(props: {
  displayUnits: string;
  garment: string;
  sent: boolean;
  onSample: () => void;
}) {
  return (
    <>
      <style>{css}</style>
      <section class="panel" aria-labelledby="tailor-scan-title">
        <p class="kicker">Embed preview</p>
        <h2 id="tailor-scan-title">Tailor Scan</h2>
        <p class="status">Guided capture is not connected yet.</p>
        <p class="meta">
          {props.garment} · display {props.displayUnits}
        </p>
        <ul>
          {measurements.map(([name, detail]) => (
            <li key={name}>
              <span class="name">{name}</span>
              <span class="detail">{detail}</span>
              <span class="value">Not measured</span>
            </li>
          ))}
        </ul>
        <button type="button" disabled={props.sent} onClick={props.onSample}>
          {props.sent ? "Sample sent" : "Send sample result"}
        </button>
      </section>
    </>
  );
}
