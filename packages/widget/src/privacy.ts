export function requestAllowed(url: string, method: string, pageOrigin = "https://shop.example"): boolean {
  if (method.toUpperCase() !== "GET" && method.toUpperCase() !== "HEAD") {
    return false;
  }
  let parsed: URL;
  try {
    parsed = new URL(url, pageOrigin);
  } catch {
    return false;
  }
  if (parsed.origin !== pageOrigin) {
    return false;
  }
  const path = parsed.pathname;
  if (path.startsWith("/vision/")) {
    return path.endsWith(".task") || path.endsWith(".wasm") || path.endsWith(".js") || path.includes("/wasm");
  }
  if (path.endsWith(".pdf")) {
    return true;
  }
  return path.endsWith(".js") || path.endsWith(".mjs") || path.endsWith(".css");
}

export function bindSessionTeardown(stop: () => void): () => void {
  const onHide = () => stop();
  window.addEventListener("pagehide", onHide);
  return () => window.removeEventListener("pagehide", onHide);
}

export function blurHead(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  head: { x: number; y: number; radius: number },
): void {
  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;
  const indexes: number[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if ((x - head.x) ** 2 + (y - head.y) ** 2 > head.radius ** 2) {
        continue;
      }
      const index = (y * width + x) * 4;
      indexes.push(index);
      red += pixels[index] ?? 0;
      green += pixels[index + 1] ?? 0;
      blue += pixels[index + 2] ?? 0;
      count += 1;
    }
  }
  if (count === 0) {
    return;
  }
  const flat = [Math.round(red / count), Math.round(green / count), Math.round(blue / count)];
  for (const index of indexes) {
    pixels[index] = flat[0] ?? 0;
    pixels[index + 1] = flat[1] ?? 0;
    pixels[index + 2] = flat[2] ?? 0;
  }
}
