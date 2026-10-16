// Shared palette and SVG helpers. Two moods on the portfolio's own colours
// (shubham-kumar-singh.vercel.app): a calm daylight of paper white, warm greys
// and hairline borders, and a night of ink and indigo with stars and a violet
// nebula. Both keep one vermilion accent.

import { measure, takeGlyphDefs, textRun } from "./text.mjs";

export const THEMES = {
  light: {
    name: "light",
    bg: "#ffffff", // card gradient, top left: paper white
    bg2: "#f8f7f5", // card gradient, bottom right: a warm grey, barely there
    elev: "#ffffff",
    line: "#e7e5e4",
    strong: "#d6d3d1",
    fg: "#1c1917",
    muted: "#57534e", // 7.1:1 on the grey end of the card
    accent: "#d83f0b", // the site's #e8430c a touch deeper, so white text on it is 4.5:1
    accentInk: "#c13a0b", // accent for small text, 5.1:1 on the grey end
    accentFg: "#ffffff",
    soft: "rgb(216 63 11 / 0.1)",
    // No glow, wash, sheen or gold: by day the cards are plain paper.
  },
  dark: {
    name: "dark",
    bg: "#0d0d15", // card gradient, top left: indigo ink
    bg2: "#09090a",
    elev: "#121218",
    line: "#25252c",
    strong: "#34343c",
    fg: "#ededec",
    muted: "#a3a3a8", // 8.1:1 on the card
    accent: "#ff5a1f",
    accentInk: "#ff7a47",
    accentFg: "#0a0a0b",
    soft: "rgb(255 90 31 / 0.12)",
    glow: "#7c5cff", // a violet nebula
    wash: "#ff5a1f",
    sheen: "#ffffff",
    gold: "#ffb020",
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

let seq = 0;

/**
 * The card every figure sits on, with its mood: by day plain paper, white
 * into a barely warm grey, by night indigo ink with a violet nebula and a
 * sparse field of stars. Only the header's stars twinkle (`twinkle`, with
 * twice as many); a still image shows all of it, minus the twinkle.
 */
export function card(t, width, height, radius = 22, { decor = true, twinkle = false } = {}) {
  const id = `c${(seq += 1)}`;
  const day = t.name === "light";
  const big = Math.max(width, height);
  const parts = [
    `<defs><linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.bg}"/><stop offset="1" stop-color="${t.bg2}"/></linearGradient>` +
      (day
        ? ""
        : `<radialGradient id="${id}s"><stop offset="0" stop-color="${t.glow}" stop-opacity="0.2"/><stop offset="1" stop-color="${t.glow}" stop-opacity="0"/></radialGradient>` +
          `<radialGradient id="${id}w"><stop offset="0" stop-color="${t.wash}" stop-opacity="0.1"/><stop offset="1" stop-color="${t.wash}" stop-opacity="0"/></radialGradient>` +
          `<clipPath id="${id}k"><rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="${radius}"/></clipPath>`) +
      `</defs>`,
    `<rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="${radius}" fill="url(#${id}g)"/>`,
  ];
  // The night's nebula, a wash in the far corner and the stars.
  if (decor && !day) {
    let inner =
      `<circle cx="${r1(width * 0.88)}" cy="${r1(-height * 0.12)}" r="${r1(big * 0.5)}" fill="url(#${id}s)"/>` +
      `<circle cx="${r1(width * 0.08)}" cy="${r1(height * 1.05)}" r="${r1(big * 0.42)}" fill="url(#${id}w)"/>`;
    // Stars: a deterministic scatter; in the header each has its own twinkle.
    const rand = mulberry32(Math.round(width * 7 + height * 13));
    const count = Math.round((width * height) / (twinkle ? 16000 : 32000));
    for (let i = 0; i < count; i += 1) {
      const x = r1(8 + rand() * (width - 16));
      const y = r1(8 + rand() * (height - 16));
      const r = r1(0.45 + rand() * rand() * 0.9);
      const opacity = r1(0.2 + rand() * 0.35);
      inner += twinkle
        ? `<circle class="tw" cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${opacity}" style="animation-duration:${r1(2.2 + rand() * 3.5)}s;animation-delay:-${r1(rand() * 5)}s"/>`
        : `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${opacity}"/>`;
    }
    parts.push(`<g clip-path="url(#${id}k)">${inner}</g>`);
  }
  // Border, and a fine highlight along the top edge like light on glass.
  parts.push(
    `<rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="${radius}" fill="none" stroke="${t.line}" stroke-width="2"/>`,
    `<path d="M${radius + 6} 2.5H${width - radius - 6}" stroke="#fff" stroke-opacity="${day ? 0.9 : 0.09}" stroke-width="1.5" stroke-linecap="round"/>`,
  );
  if (twinkle && !day) {
    parts.push(`<style>.tw{animation:tw 3s ease-in-out infinite}@keyframes tw{0%,100%{opacity:.12}50%{opacity:.75}}@media (prefers-reduced-motion: reduce){.tw{animation:none}}</style>`);
  }
  return parts.join("");
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

/**
 * A short light that runs around a card's border, Magic-UI style. It is
 * invisible in a still image and switches on once the animation starts.
 */
export function beam(t, width, height, radius, { dur = 8, begin = 0.6, len = 110, color } = {}) {
  const c = color ?? t.accent;
  const [x, y, w, h, r] = [1, 1, width - 2, height - 2, radius];
  const d = `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
  const core = len * 0.55;
  const run = (from) =>
    `<animate attributeName="stroke-dashoffset" values="${from};${from - 1000}" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>`;
  return (
    `<g opacity="0"><set attributeName="opacity" to="1" begin="${begin}s"/>` +
    `<path d="${d}" pathLength="1000" fill="none" stroke="${c}" stroke-opacity="0.2" stroke-width="8" stroke-linecap="round" stroke-dasharray="${len} ${1000 - len}" stroke-dashoffset="1000">${run(1000)}</path>` +
    `<path d="${d}" pathLength="1000" fill="none" stroke="${c}" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="${r1(core)} ${r1(1000 - core)}" stroke-dashoffset="${r1(1000 - (len - core))}">${run(r1(1000 - (len - core)))}</path>` +
    `</g>`
  );
}

/** A soft diagonal band of light that sweeps across a card now and then. */
export function sheen(id, width, height, radius, { dur = 7, begin = 1.2, opacity = 0.07, color = "#fff" } = {}) {
  return (
    `<clipPath id="${id}"><rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="${radius}"/></clipPath>` +
    `<linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${color}" stop-opacity="0"/><stop offset="0.5" stop-color="${color}" stop-opacity="${opacity}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient>` +
    `<g clip-path="url(#${id})"><g transform="skewX(-20)"><rect x="-420" y="-60" width="320" height="${height + 120}" fill="url(#${id}g)" opacity="0">` +
    `<set attributeName="opacity" to="1" begin="${begin}s"/>` +
    `<animate attributeName="x" values="-420;${width + 420};${width + 420}" keyTimes="0;0.42;1" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/></rect></g></g>`
  );
}
