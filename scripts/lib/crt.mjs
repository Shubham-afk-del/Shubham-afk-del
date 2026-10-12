// A green-phosphor CRT that "runs" neofetch: my pixel portrait on the left,
// the day's facts and live numbers on the right. The screen powers on, the
// command types itself, the output prints line by line, and the tube
// collapses to a line and powers off before the loop starts again.
//
// Motion rule: with no animation at all the screen shows everything (the
// SMIL animations only hide things at the start of each loop).

import { readFileSync } from "node:fs";
import { doc, r1 } from "./svg.mjs";
import { measure, textRun } from "./text.mjs";

const portrait = JSON.parse(readFileSync(new URL("../portrait.json", import.meta.url), "utf8"));

const BEZEL = {
  light: { top: "#ece6d7", bottom: "#d9d1bd", recess: "#bfb5a0", label: "#6e6654", seam: "#cfc6b0" },
  dark: { top: "#232327", bottom: "#151518", recess: "#0b0b0d", label: "#8d8d96", seam: "#2e2e33" },
};
const PH = {
  bg: "#04160b",
  edge: "#010603",
  dim: "#2b9a52",
  text: "#62f596",
  bright: "#d4ffe1",
  amber: "#ffb35c",
  levels: ["", "#16612f", "#2aa553", "#62e690", "#cbffd9"],
};

const P = 16; // seconds per loop
const W = 1280;
const H = 680;
const SCREEN = { x: 40, y: 40, w: 1200, h: 552, r: 30 };
const SIZE = 20; // terminal text size
const ADV = measure("0", "mono", SIZE); // one character: the font is monospaced
const kt = (seconds) => String(Math.round((seconds / P) * 10000) / 10000);

/** A run of terminal text, drawn from glyph outlines, as a <g>. */
function line(str, x, y, fill) {
  const run = textRun(str, "mono", SIZE, x, y);
  return `<g fill="${fill}" transform="${run.transform}">${run.uses}</g>`;
}

/** Reveal `inner` left to right between t0 and t1, in character steps when `chars` is given. */
function typed(id, inner, x, y, width, t0, t1, chars) {
  let anim;
  if (chars) {
    const steps = [...Array(chars + 1).keys()];
    const times = steps.map((i) => t0 + ((t1 - t0) * i) / chars);
    anim = `<animate attributeName="width" dur="${P}s" repeatCount="indefinite" calcMode="discrete" keyTimes="0;${times.map(kt).join(";")}" values="0;${steps.map((i) => r1(i * ADV + (i === chars ? 6 : 0))).join(";")}"/>`;
  } else {
    anim = `<animate attributeName="width" dur="${P}s" repeatCount="indefinite" keyTimes="0;${kt(t0)};${kt(t1)};1" values="0;0;${r1(width)};${r1(width)}"/>`;
  }
  return (
    `<clipPath id="${id}"><rect x="${x - 2}" y="${y - 24}" width="${r1(width)}" height="32">${anim}</rect></clipPath>` +
    `<g clip-path="url(#${id})">${inner}</g>`
  );
}

/** Rows of same-level cells merged into one path per level. */
function portraitPaths(x0, y0, cell) {
  const d = ["", "", "", "", ""];
  portrait.levels.forEach((row, r) => {
    let c = 0;
    while (c < row.length) {
      const level = Number(row[c]);
      let end = c;
      while (end + 1 < row.length && row[end + 1] === row[c]) end += 1;
      if (level) d[level] += `M${x0 + c * cell} ${y0 + r * cell}h${(end - c + 1) * cell}v${cell - 2}h-${(end - c + 1) * cell}z`;
      c = end + 1;
    }
  });
  return d.map((path, level) => (level && path ? `<path fill="${PH.levels[level]}" d="${path}"/>` : "")).join("");
}

/**
 * @param theme  "light" | "dark" (only the bezel changes)
 * @param info   [label, value][] for the right-hand column
 * @param stamp  text for the bezel's chin, e.g. "updated daily · 12 Oct 2026, 06:23 London"
 */
export function crt(theme, { info, stamp, title, desc }) {
  const b = BEZEL[theme];
  const sx = SCREEN.x;
  const sy = SCREEN.y;
  const cx = sx + SCREEN.w / 2;
  const cy = sy + SCREEN.h / 2;
  const left = sx + 38;
  const prompt = "shubham@london:~$ ";
  const promptW = measure(prompt, "mono", SIZE);
  const parts = [];

  // Bezel and screen glass.
  parts.push(
    `<defs>` +
      `<linearGradient id="bz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${b.top}"/><stop offset="1" stop-color="${b.bottom}"/></linearGradient>` +
      `<radialGradient id="tube" cx="50%" cy="46%" r="72%"><stop offset="0" stop-color="${PH.bg}"/><stop offset="1" stop-color="${PH.edge}"/></radialGradient>` +
      `<radialGradient id="vig" cx="50%" cy="50%" r="72%"><stop offset="0.62" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.62"/></radialGradient>` +
      `<linearGradient id="band" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9dffbf" stop-opacity="0"/><stop offset="0.5" stop-color="#9dffbf" stop-opacity="0.07"/><stop offset="1" stop-color="#9dffbf" stop-opacity="0"/></linearGradient>` +
      `<linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.09"/><stop offset="0.35" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
      `<pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect y="2" width="4" height="2" fill="#000" opacity="0.3"/></pattern>` +
      `<filter id="glow" x="-3%" y="-3%" width="106%" height="106%"><feGaussianBlur stdDeviation="2.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` +
      `<filter id="led" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="3"/></filter>` +
      `<clipPath id="screen"><rect x="${sx}" y="${sy}" width="${SCREEN.w}" height="${SCREEN.h}" rx="${SCREEN.r}"/></clipPath>` +
      `</defs>`,
    `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="38" fill="url(#bz)" stroke="${b.seam}" stroke-width="2"/>`,
    `<rect x="${sx - 12}" y="${sy - 12}" width="${SCREEN.w + 24}" height="${SCREEN.h + 24}" rx="${SCREEN.r + 10}" fill="${b.recess}"/>`,
    `<rect x="${sx}" y="${sy}" width="${SCREEN.w}" height="${SCREEN.h}" rx="${SCREEN.r}" fill="url(#tube)"/>`,
  );

  // Everything the tube draws.
  const out = [];
  out.push(line(prompt, left, sy + 50, PH.text));
  out.push(typed("cmd", line("neofetch", left + promptW, sy + 50, PH.bright), left + promptW, sy + 50, 8 * ADV + 6, 0.8, 1.8, 8));

  const cell = 6;
  const px = left;
  const py = sy + 76;
  const pw = portrait.cols * cell;
  const ph = portrait.rows * cell;
  out.push(
    `<clipPath id="pic"><rect x="${px}" y="${py}" width="${pw}" height="${ph}"><animate attributeName="height" dur="${P}s" repeatCount="indefinite" keyTimes="0;${kt(2)};${kt(3.3)};1" values="0;0;${ph};${ph}"/></rect></clipPath>`,
    `<g clip-path="url(#pic)">${portraitPaths(px, py, cell)}</g>`,
    `<rect x="${px}" y="${py}" width="${pw}" height="3" fill="${PH.bright}" opacity="0"><animate attributeName="y" dur="${P}s" repeatCount="indefinite" keyTimes="0;${kt(2)};${kt(3.3)};1" values="${py};${py};${py + ph};${py + ph}"/><animate attributeName="opacity" dur="${P}s" repeatCount="indefinite" calcMode="discrete" keyTimes="0;${kt(2)};${kt(3.3)}" values="0;0.9;0"/></rect>`,
  );

  const ix = px + pw + 46;
  const labelW = 11 * ADV;
  let y = py + 22;
  const header = "shubham@london";
  out.push(typed("h0", line(header, ix, y, PH.bright), ix, y, header.length * ADV + 6, 2.2, 2.45));
  y += 29;
  const rule = "·".repeat(header.length);
  out.push(typed("h1", line(rule, ix, y, PH.dim), ix, y, rule.length * ADV + 6, 2.45, 2.6));
  info.forEach(([name, value], i) => {
    y += 29;
    const t0 = 2.7 + i * 0.24;
    const width = (11 + value.length) * ADV + 6;
    out.push(typed(`l${i}`, line(name, ix, y, PH.dim) + line(value, ix + labelW, y, i === info.length - 1 ? PH.amber : PH.text), ix, y, width, t0, t0 + 0.2));
  });

  // The palette strip, like neofetch's colour blocks.
  y += 22;
  const blocks = [...PH.levels.slice(1), PH.text, PH.amber, "#ff5a1f"];
  blocks.forEach((fill, i) => {
    const t = 2.7 + info.length * 0.24 + 0.1 + i * 0.06;
    out.push(
      `<rect x="${ix + i * 40}" y="${y}" width="36" height="20" fill="${fill}"><animate attributeName="opacity" dur="${P}s" repeatCount="indefinite" calcMode="discrete" keyTimes="0;${kt(t)}" values="0;1"/></rect>`,
    );
  });

  // Back at the prompt, with a blinking block cursor.
  const tLast = 2.7 + info.length * 0.24 + 0.8;
  const lastY = sy + SCREEN.h - 30;
  out.push(
    `<g opacity="1">${line(prompt, left, lastY, PH.text)}<rect class="cur" x="${r1(left + promptW + 2)}" y="${lastY - 19}" width="${ADV}" height="23" fill="${PH.text}"/>` +
      `<animate attributeName="opacity" dur="${P}s" repeatCount="indefinite" calcMode="discrete" keyTimes="0;${kt(tLast)}" values="0;1"/></g>`,
  );

  // Power on (a bright line opening to the full picture), power off at the end.
  const tube =
    `<g transform="translate(${cx} ${cy})"><g>` +
    `<animateTransform attributeName="transform" type="scale" dur="${P}s" repeatCount="indefinite" keyTimes="0;${kt(0.45)};${kt(15.1)};${kt(15.4)};${kt(15.6)};1" values="1 0.004;1 1;1 1;1 0.004;0.003 0.004;0.003 0.004"/>` +
    `<g transform="translate(${-cx} ${-cy})"><g class="flick" filter="url(#glow)">${out.join("")}</g></g></g></g>`;

  parts.push(
    `<g clip-path="url(#screen)">`,
    tube,
    `<rect class="band" x="${sx}" y="${sy - 140}" width="${SCREEN.w}" height="140" fill="url(#band)"/>`,
    `<rect x="${sx}" y="${sy}" width="${SCREEN.w}" height="${SCREEN.h}" fill="url(#scan)"/>`,
    `<rect x="${sx}" y="${sy}" width="${SCREEN.w}" height="${SCREEN.h}" fill="url(#vig)"/>`,
    `<rect x="${sx}" y="${sy}" width="${SCREEN.w}" height="${SCREEN.h}" fill="#bfffd2" opacity="0"><animate attributeName="opacity" dur="${P}s" repeatCount="indefinite" keyTimes="0;${kt(0.25)};${kt(0.7)};1" values="0;0.32;0;0"/></rect>`,
    `<path d="M${sx} ${sy + 40}Q${sx} ${sy} ${sx + 40} ${sy}H${sx + 560}Q${sx + 260} ${sy + 120} ${sx} ${sy + 300}Z" fill="url(#glass)"/>`,
    `</g>`,
  );

  // The chin: refresh stamp and a power LED.
  const chin = H - 44;
  const stampRun = textRun(stamp.toUpperCase(), "mono", 15, sx + 8, chin + 5, { tracking: 1.8 });
  parts.push(`<g fill="${b.label}" transform="${stampRun.transform}">${stampRun.uses}</g>`);
  const pwr = textRun("POWER", "mono", 15, W - sx - 8, chin + 5, { tracking: 1.8, anchor: "end" });
  parts.push(`<g fill="${b.label}" transform="${pwr.transform}">${pwr.uses}</g>`);
  const ledX = W - sx - 8 - measure("POWER", "mono", 15, 1.8) - 22;
  parts.push(
    `<circle class="led" cx="${r1(ledX)}" cy="${chin}" r="9" fill="#3dff7a" filter="url(#led)" opacity="0.8"/>`,
    `<circle cx="${r1(ledX)}" cy="${chin}" r="5" fill="#b9ffcf"/>`,
  );

  const css = `
    .flick{animation:flick 4.2s linear infinite}
    @keyframes flick{0%,100%{opacity:1}4%{opacity:.9}6%{opacity:1}48%{opacity:.96}51%{opacity:1}77%{opacity:.88}78%{opacity:1}}
    .band{animation:band 6.5s linear infinite}
    @keyframes band{from{transform:translateY(0)}to{transform:translateY(${SCREEN.h + 140}px)}}
    .cur{animation:blink 1.06s steps(1) infinite}
    @keyframes blink{0%,55%{opacity:1}56%,100%{opacity:0}}
    .led{animation:led 2.8s ease-in-out infinite}
    @keyframes led{0%,100%{opacity:.85}50%{opacity:.35}}
    @media (prefers-reduced-motion: reduce){.flick,.band,.cur,.led{animation:none}}
  `;
  return doc({ width: W, height: H, title, desc, css, body: parts.join("\n") });
}
