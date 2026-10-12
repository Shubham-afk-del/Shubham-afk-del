// Sets text as vector outlines, using the glyph data in scripts/fonts/*.json.
//
// GitHub shows these SVGs through <img>, where a web font may or may not load,
// so every word is drawn from outlines instead. Each glyph is defined once per
// document (in font units) and placed with <use>, which keeps text-heavy
// cards small. Layout is advance widths plus the pair kerning HarfBuzz
// reported for each font, which is all Latin text needs.

import { readFileSync } from "node:fs";

const FONT_DIR = new URL("../fonts/", import.meta.url);
const PREFIX = { display: "d", text: "t", mono: "m", serif: "s" };
const fonts = new Map();
const used = new Map(); // glyph id -> path data, for the document being built

export function font(name) {
  if (!fonts.has(name)) {
    fonts.set(name, JSON.parse(readFileSync(new URL(`${name}.json`, FONT_DIR), "utf8")));
  }
  return fonts.get(name);
}

const num = (value, places = 1) => {
  const f = 10 ** places;
  const rounded = Math.round(value * f) / f;
  return Object.is(rounded, -0) ? "0" : String(rounded);
};

const STAND_INS = { "\u2013": "-", "\u2014": "-", "\u2212": "-", "\u2192": ">", "\u00d7": "x" };

/** The glyph for `ch`, falling back to its unaccented letter (é → e), then "?". */
function glyphOf(f, ch) {
  return f.glyphs[ch] ?? f.glyphs[STAND_INS[ch]] ?? f.glyphs[ch.normalize("NFD")[0]] ?? f.glyphs["?"];
}

/** Advance positions (in px) for each character of `text`. */
function layout(text, f, size, tracking) {
  const scale = size / f.upm;
  const chars = [...text];
  const xs = [];
  let x = 0;
  chars.forEach((ch, i) => {
    xs.push(x);
    const next = chars[i + 1];
    const kern = next === undefined ? 0 : (f.kern[ch + next] ?? 0);
    x += (glyphOf(f, ch).adv + kern) * scale + (next === undefined ? 0 : tracking);
  });
  return { chars, xs, width: x, scale };
}

/** Width of `text` in px at `size`, with `tracking` px added between letters. */
export function measure(text, fontName, size, tracking = 0) {
  return layout(text, font(fontName), size, tracking).width;
}

/**
 * A run of text with its baseline starting at (x, y), as the transform and
 * <use> elements of one <g>. `anchor` works like SVG's text-anchor.
 */
export function textRun(text, fontName, size, x, y, { tracking = 0, anchor = "start" } = {}) {
  const f = font(fontName);
  const { chars, xs, width, scale } = layout(text, f, size, tracking);
  const x0 = anchor === "middle" ? x - width / 2 : anchor === "end" ? x - width : x;
  let uses = "";
  chars.forEach((ch, i) => {
    const glyph = glyphOf(f, ch);
    if (glyph.d.length === 0) return; // spaces draw nothing
    const drawn = Object.keys(f.glyphs).find((k) => f.glyphs[k] === glyph);
    const id = `${PREFIX[fontName]}${drawn.codePointAt(0)}`;
    if (!used.has(id)) used.set(id, glyph.d.map(([op, ...pts]) => op + pts.join(" ")).join(""));
    const ux = Math.round(xs[i] / scale);
    uses += `<use href="#${id}"${ux ? ` x="${ux}"` : ""}/>`;
  });
  const s = num(scale, 6);
  return { transform: `translate(${num(x0)} ${num(y)}) scale(${s} -${s})`, uses, width };
}

/** The <defs> for every glyph placed since the last call, then a fresh start. */
export function takeGlyphDefs() {
  const defs = used.size ? `<defs>${[...used].map(([id, d]) => `<path id="${id}" d="${d}"/>`).join("")}</defs>` : "";
  used.clear();
  return defs;
}

/** Greedy word wrap to `maxWidth` px. */
export function wrap(text, fontName, size, maxWidth, tracking = 0) {
  const lines = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(next, fontName, size, tracking) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Shorten `text` with an ellipsis until it fits `maxWidth`. */
export function fit(text, fontName, size, maxWidth, tracking = 0) {
  if (measure(text, fontName, size, tracking) <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && measure(`${cut}…`, fontName, size, tracking) > maxWidth) {
    cut = cut.slice(0, -1).trimEnd();
  }
  return `${cut}…`;
}
