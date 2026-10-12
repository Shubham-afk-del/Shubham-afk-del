// Shared palette and SVG helpers. Colours are the portfolio's own tokens
// (shubham-kumar-singh.vercel.app): warm paper or ink, one vermilion accent.

import { measure, takeGlyphDefs, textRun } from "./text.mjs";

export const THEMES = {
  light: {
    name: "light",
    bg: "#f4f2ee",
    elev: "#faf9f6",
    line: "#e2ded6",
    strong: "#cfcac0",
    fg: "#121211",
    muted: "#55534d", // 7.0:1 on bg
    accent: "#d43d0a",
    accentInk: "#b5350a", // accent for small text, 5.4:1 on bg
    accentFg: "#ffffff",
    soft: "rgb(212 61 10 / 0.1)",
  },
  dark: {
    name: "dark",
    bg: "#0a0a0b",
    elev: "#111113",
    line: "#242427",
    strong: "#323236",
    fg: "#ededec",
    muted: "#a3a3a8", // 8.1:1 on bg
    accent: "#ff5a1f",
    accentInk: "#ff7a47",
    accentFg: "#0a0a0b",
    soft: "rgb(255 90 31 / 0.12)",
  },
};

export const esc = (value) =>
  String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const r1 = (value) => Math.round(value * 10) / 10;

/** A complete SVG document. Motion lives in `css` and must only ever be additive. */
export function doc({ width, height, title, desc, css = "", body }) {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-labelledby="title desc">`,
    `<title id="title">${esc(title)}</title>`,
    `<desc id="desc">${esc(desc)}</desc>`,
    css ? `<style>${css.replace(/\s*\n\s*/g, " ")}</style>` : "",
    takeGlyphDefs(),
    body,
    "</svg>",
    "",
  ].join("\n");
}

/** Text drawn from glyph outlines, as one <g>. Returns { svg, width }. */
export function text(str, fontName, size, x, y, fill, { tracking = 0, anchor = "start", cls = "", opacity } = {}) {
  const run = textRun(str, fontName, size, x, y, { tracking, anchor });
  const attrs = [cls && `class="${cls}"`, fill && `fill="${fill}"`, opacity !== undefined && `opacity="${opacity}"`]
    .filter(Boolean)
    .join(" ");
  return { svg: `<g ${attrs} transform="${run.transform}">${run.uses}</g>`, width: run.width };
}

/** Width of a mono label, without drawing it. */
export function labelWidth(str, size) {
  return measure(str.toUpperCase(), "mono", size, size * 0.12);
}

/** Mono label in capitals with the site's letter-spacing. */
export function label(str, size, x, y, fill, opts = {}) {
  return text(str.toUpperCase(), "mono", size, x, y, fill, { tracking: size * 0.12, ...opts });
}

/** The card every figure sits on. */
export function card(t, width, height, radius = 22) {
  return `<rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="${radius}" fill="${t.bg}" stroke="${t.line}" stroke-width="2"/>`;
}

/** Crop-mark corners around a figure, like the portfolio's fig. 1. */
export function corners(x, y, w, h, len, stroke) {
  const p = [
    `M${x} ${y + len}V${y}H${x + len}`,
    `M${x + w - len} ${y}H${x + w}V${y + len}`,
    `M${x + w} ${y + h - len}V${y + h}H${x + w - len}`,
    `M${x + len} ${y + h}H${x}V${y + h - len}`,
  ].join("");
  return `<path d="${p}" fill="none" stroke="${stroke}" stroke-width="2"/>`;
}

/** Deterministic PRNG (mulberry32), the same one the portfolio's hero uses. */
export function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gaussian(rand) {
  let u = rand();
  while (u < 1e-12) u = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}
