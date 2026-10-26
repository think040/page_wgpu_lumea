export const WORDMARK_FONT = "Syncopate";

export type WordMask = {
  /** Filled pixel centers, x in [-1, 1], y scaled by the same factor (up is +). */
  points: Float32Array;
  /** Width / height of the glyph bounding box. */
  aspect: number;
  /** Half a pixel in normalized units, used to jitter samples inside a pixel. */
  jitter: number;
};

/** Waits for the display font, but never longer than `timeoutMs`. */
export async function loadWordmarkFont(timeoutMs = 2500) {
  if (typeof document === "undefined" || !document.fonts) return;
  await Promise.race([
    document.fonts.load(`700 200px "${WORDMARK_FONT}"`).catch(() => undefined),
    new Promise((r) => setTimeout(r, timeoutMs)),
  ]);
}

/** Rasterizes the word and returns its filled pixels as normalized points. */
export function sampleWord(word: string): WordMask {
  const text = word.trim() || "LUMEA";
  const fontPx = 200;
  const font = `700 ${fontPx}px "${WORDMARK_FONT}", "Arial Black", "Helvetica Neue", sans-serif`;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.font = font;
  const pad = 24;
  canvas.width = Math.ceil(ctx.measureText(text).width) + pad * 2;
  canvas.height = Math.ceil(fontPx * 1.3);
  ctx.font = font;
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";
  ctx.fillText(text, pad, canvas.height / 2);

  const { width: w, height: h } = canvas;
  const pixels = ctx.getImageData(0, 0, w, h).data;
  const step = 2;
  const raw: number[] = [];
  let minX = w;
  let maxX = 0;
  let minY = h;
  let maxY = 0;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      if (pixels[(y * w + x) * 4 + 3] < 128) continue;
      raw.push(x, y);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  const halfW = Math.max(1, (maxX - minX) / 2);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const points = new Float32Array(raw.length);
  for (let i = 0; i < raw.length; i += 2) {
    points[i] = (raw[i] - cx) / halfW;
    points[i + 1] = -(raw[i + 1] - cy) / halfW;
  }
  return { points, aspect: (maxX - minX) / Math.max(1, maxY - minY), jitter: step / halfW / 2 };
}
