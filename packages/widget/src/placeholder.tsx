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
  padding: 1.25rem 1.25rem 0.4rem;
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
.status {
  margin: 0.65rem 0 1rem;
  max-width: 36rem;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 0.95rem;
  line-height: 1.45;
  color: #3d4742;
}
ul {
  list-style: none;
  margin: 0;
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
`;

export function Placeholder() {
  return (
    <>
      <style>{css}</style>
      <section class="panel" aria-labelledby="tailor-scan-title">
        <p class="kicker">Embed preview</p>
        <h2 id="tailor-scan-title">Tailor Scan</h2>
        <p class="status">Guided capture is not connected yet.</p>
        <ul>
          {measurements.map(([name, detail]) => (
            <li key={name}>
              <span class="name">{name}</span>
              <span class="detail">{detail}</span>
              <span class="value">Not measured</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
