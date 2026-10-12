// Builds every static SVG in assets/: the header, the link buttons, the
// "ask my assistant" card and the four work figures, each in a light and a
// dark version for GitHub's <picture> theme switch.
//
//   node scripts/build.mjs
//
// Motion rule (from GitHub's image proxy and some apps drawing one frame):
// every image is complete with no animation running; motion only adds to it.

import { mkdirSync, writeFileSync } from "node:fs";
import { ask, evals } from "./data.mjs";
import { THEMES, card, corners, doc, gaussian, label, labelWidth, mulberry32, r1, text } from "./lib/svg.mjs";
import { measure, wrap } from "./lib/text.mjs";
import { aboutCard, colophonCard, educationCard, experienceCard, skillsCard } from "./lib/cards.mjs";

const OUT = new URL("../assets/", import.meta.url);
mkdirSync(OUT, { recursive: true });

function save(name, svg) {
  writeFileSync(new URL(name, OUT), svg);
  console.log(`${name.padEnd(26)} ${(svg.length / 1024).toFixed(1)} KB`);
}

const REDUCED = (selectors) => `@media (prefers-reduced-motion: reduce){${selectors}{animation:none}}`;

/* ------------------------------------------------------------------ header */

// The portfolio's hero figure, redrawn as SVG: one sheet of points that sits
// rolled up (a Swiss roll), unrolls flat, scatters into noise and rolls back.
// Same manifold parameters as the site (R2 sequence, the vermilion band).
const ROLL = { a: 1 / 12.6, t0: 1.5 * Math.PI, t1: 4.5 * Math.PI, height: 1.5 };
const BAND = [0.56, 0.65];
const PERIOD = 18; // seconds per loop

function rollPoints(count) {
  const rand = mulberry32(0x5eed);
  const { a, t0, t1, height } = ROLL;
  const yaw = 0.6;
  const pitch = 0.36;
  const pts = [];
  for (let n = 0; n < count; n += 1) {
    const w = (0.5 + 0.7548776662466927 * n) % 1;
    const v = (0.5 + 0.5698402909980532 * n) % 1;
    const t = Math.sqrt(t0 * t0 + w * (t1 * t1 - t0 * t0));
    const jitter = gaussian(rand) * 0.014;
    const sx = a * (Math.cos(t) + t * Math.sin(t)) + jitter;
    const sy = a * (Math.sin(t) - t * Math.cos(t)) + jitter;
    const h = (v - 0.5) * height;
    // Yaw about the screen's vertical axis, then pitch: the classic oblique view.
    const x1 = sx * Math.cos(yaw) + h * Math.sin(yaw);
    const d1 = -sx * Math.sin(yaw) + h * Math.cos(yaw);
    const y2 = sy * Math.cos(pitch) - d1 * Math.sin(pitch);
    const depth = sy * Math.sin(pitch) + d1 * Math.cos(pitch);
    pts.push({ w, v, rx: x1, ry: -y2, depth, gx: gaussian(rand), gy: gaussian(rand), band: w >= BAND[0] && w < BAND[1] });
  }
  return pts;
}

function figure(t, cx, cy, boxW, boxH) {
  const pts = rollPoints(820);
  const xs = pts.map((p) => p.rx);
  const ys = pts.map((p) => p.ry);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const scale = Math.min((boxW * 0.74) / (maxX - minX), (boxH * 0.8) / (maxY - minY));
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;

  const ordered = [...pts.filter((p) => !p.band).sort((p, q) => p.depth - q.depth), ...pts.filter((p) => p.band)];
  const dots = ordered
    .map((p) => {
      const vars = [
        (p.rx - midX) * scale,
        (p.ry - midY) * scale,
        (p.w - 0.5) * boxW * 0.84,
        (0.5 - p.v) * boxH * 0.42,
        p.gx * boxW * 0.17,
        p.gy * boxH * 0.19,
      ].map(Math.round);
      const style = `--a:${vars[0]};--b:${vars[1]};--c:${vars[2]};--e:${vars[3]};--f:${vars[4]};--g:${vars[5]};--d:${r1((1 - p.w) * 1.3)}s`;
      return p.band
        ? `<circle r="2.9" fill="${t.accent}" style="${style}"/>`
        : `<circle r="2.3" opacity="${r1(0.28 + 0.62 * p.w)}" style="${style}"/>`;
    })
    .join("");
  return `<g class="pts" transform="translate(${cx} ${cy})" fill="${t.fg}">${dots}</g>`;
}

function header(t) {
  const W = 1280;
  const H = 420;
  const fig = { x: 700, y: 40, w: 516, h: 312 };
  const left = 64;
  const maxText = fig.x - left - 40;

  const nameSize = Math.min(92, (92 * maxText) / measure("Kumar Singh", "display", 92));
  const line = "Now building systems I can show you the numbers for.";
  const serifSize = Math.min(32, (32 * maxText) / measure(line, "serif", 32));

  const parts = [
    card(t, W, H),
    label("AI & ML engineer · London, UK", 17, left, 92, t.muted).svg,
    text("Shubham", "display", nameSize, left - 4, 188, t.fg, { tracking: -1.2 }).svg,
    text("Kumar Singh", "display", nameSize, left - 4, 282, t.fg, { tracking: -1.2 }).svg,
    text(line, "serif", serifSize, left, 334, t.muted).svg,
    `<circle cx="${left + 6}" cy="378" r="6" fill="${t.accent}"/>`,
    `<circle class="ring" cx="${left + 6}" cy="378" r="6" fill="none" stroke="${t.accent}" stroke-width="2" opacity="0.55"/>`,
    label("Open to AI/ML internships · full-time from Feb 2027", 15, left + 24, 383.5, t.fg).svg,

    corners(fig.x, fig.y, fig.w, fig.h, 18, t.strong),
    `<clipPath id="frame"><rect x="${fig.x + 2}" y="${fig.y + 2}" width="${fig.w - 4}" height="${fig.h - 4}"/></clipPath>`,
    `<g clip-path="url(#frame)">${figure(t, fig.x + fig.w / 2, fig.y + fig.h / 2 + 4, fig.w, fig.h)}</g>`,
    `<rect class="prog" x="${fig.x + 18}" y="${fig.y + fig.h - 1}" width="${fig.w - 36}" height="2" fill="${t.accent}" opacity="0.7"/>`,
  ];

  // Caption: fig. 0, then the three states, lit in step with the loop.
  const capY = 384;
  parts.push(label("fig. 0", 15, fig.x, capY, t.accentInk).svg);
  const words = [
    ["rolled", "l1", t.accentInk],
    ["unrolled", "l2", t.muted],
    ["noise", "l3", t.muted],
  ];
  const size = 15;
  const sep = labelWidth(" · ", size);
  const widths = words.map(([w]) => labelWidth(w, size));
  let x = fig.x + fig.w - (widths.reduce((s, v) => s + v, 0) + sep * 2);
  words.forEach(([word, cls, fill], i) => {
    parts.push(label(word, size, x, capY, fill, { cls }).svg);
    x += widths[i];
    if (i < words.length - 1) {
      parts.push(label(" · ", size, x, capY, t.muted).svg);
      x += sep;
    }
  });

  const A = t.accentInk;
  const M = t.muted;
  const css = `
    .pts circle{transform:translate(calc(var(--a)*1px),calc(var(--b)*1px));animation:cyc ${PERIOD}s cubic-bezier(.65,0,.35,1) var(--d) infinite}
    @keyframes cyc{
      0%,22%{transform:translate(calc(var(--a)*1px),calc(var(--b)*1px))}
      42%,58%{transform:translate(calc(var(--c)*1px),calc(var(--e)*1px))}
      70%,76%{transform:translate(calc(var(--f)*1px),calc(var(--g)*1px))}
      96%,100%{transform:translate(calc(var(--a)*1px),calc(var(--b)*1px))}}
    .l1{animation:l1 ${PERIOD}s linear infinite}
    @keyframes l1{0%,29%{fill:${A}}35%,93%{fill:${M}}99%,100%{fill:${A}}}
    .l2{animation:l2 ${PERIOD}s linear infinite}
    @keyframes l2{0%,37%{fill:${M}}43%,61%{fill:${A}}67%,100%{fill:${M}}}
    .l3{animation:l3 ${PERIOD}s linear infinite}
    @keyframes l3{0%,65%{fill:${M}}71%,81%{fill:${A}}87%,100%{fill:${M}}}
    .ring{transform-box:fill-box;transform-origin:center;animation:ring 2.4s ease-out infinite}
    @keyframes ring{0%{transform:scale(1);opacity:.55}100%{transform:scale(2.8);opacity:0}}
    .prog{transform-box:fill-box;transform-origin:0 50%;animation:prog ${PERIOD}s linear infinite}
    @keyframes prog{from{transform:scaleX(0)}to{transform:scaleX(1)}}
    ${REDUCED(".pts circle,.l1,.l2,.l3,.ring,.prog")}
  `;
  return doc({
    width: W,
    height: H,
    title: "Shubham Kumar Singh, AI and ML engineer in London",
    desc: "Now building systems I can show you the numbers for. Open to AI and ML internships, and full-time roles from February 2027. The figure is a Swiss roll of points that unrolls into a flat sheet, scatters into noise and rolls back up.",
    css,
    body: parts.join("\n"),
  });
}

/* ----------------------------------------------------------------- buttons */

const ICONS = {
  arrow: (c) => `<path d="M9 23L23 9M12 9H23V20" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
  live: (c, cls) => `<circle cx="16" cy="16" r="6" fill="${c}"/><circle class="${cls}" cx="16" cy="16" r="6" fill="none" stroke="${c}" stroke-width="2" opacity="0.6"/>`,
  linkedin: (c) => `<rect x="5" y="5" width="22" height="22" rx="5" fill="none" stroke="${c}" stroke-width="3"/><path d="M11 14V22M11 10.2V10.4M15.5 22V14M15.5 17.5C15.5 15 17 14 18.6 14C20.4 14 21.5 15.2 21.5 17.5V22" fill="none" stroke="${c}" stroke-width="2.6" stroke-linecap="round"/>`,
  mail: (c) => `<rect x="4" y="8" width="24" height="17" rx="3" fill="none" stroke="${c}" stroke-width="3"/><path d="M5.5 10L16 18L26.5 10" fill="none" stroke="${c}" stroke-width="3" stroke-linejoin="round"/>`,
  doc: (c) => `<path d="M8 4H19L25 10V28H8Z" fill="none" stroke="${c}" stroke-width="3" stroke-linejoin="round"/><path d="M19 4V10H25M12 16H21M12 21H21" fill="none" stroke="${c}" stroke-width="2.6" stroke-linecap="round"/>`,
};

function button(t, { label: str, icon, primary }) {
  const size = 27;
  const h = 88;
  const textW = measure(str, "display", size, -0.2);
  const w = Math.ceil(32 + 32 + 16 + textW + 36);
  const bg = primary ? t.accent : t.bg;
  const fg = primary ? t.accentFg : t.fg;
  const parts = [
    `<rect x="1.5" y="1.5" width="${w - 3}" height="${h - 3}" rx="${(h - 3) / 2}" fill="${bg}" stroke="${primary ? t.accent : t.strong}" stroke-width="3"/>`,
    `<g transform="translate(32 ${h / 2 - 16})">${ICONS[icon](fg, "ping")}</g>`,
    text(str, "display", size, 32 + 32 + 16, h / 2 + 9.5, fg, { tracking: -0.2 }).svg,
  ];
  const css =
    icon === "live"
      ? `.ping{transform-box:fill-box;transform-origin:center;animation:ping 2.4s ease-out infinite}
         @keyframes ping{0%{transform:scale(1);opacity:.6}100%{transform:scale(2.4);opacity:0}}
         ${REDUCED(".ping")}`
      : "";
  return doc({ width: w, height: h, title: str, desc: str, css, body: parts.join("\n") });
}

const BUTTONS = [
  { file: "portfolio", label: "Portfolio", icon: "arrow" },
  { file: "assistant", label: "Ask my AI assistant", icon: "live", primary: true },
  { file: "linkedin", label: "LinkedIn", icon: "linkedin" },
  { file: "email", label: "Email", icon: "mail" },
  { file: "cv", label: "CV", icon: "doc" },
];

/* ---------------------------------------------------------------- ask card */

function askCard(t) {
  const W = 1280;
  const pad = 64;
  const answerSize = 25;
  const lineH = 39;
  const lines = wrap(ask.answer, "text", answerSize, 1060);
  const qSize = 25;
  const qW = measure(ask.question, "text", qSize) + 56;

  let y = 74;
  const parts = [];
  parts.push(`<circle cx="${pad + 6}" cy="${y - 6}" r="6" fill="${t.accent}"/>`);
  parts.push(`<circle class="ping" cx="${pad + 6}" cy="${y - 6}" r="6" fill="none" stroke="${t.accent}" stroke-width="2" opacity="0.6"/>`);
  parts.push(label("Ask my assistant", 16, pad + 24, y, t.fg).svg);
  parts.push(label(`a real answer · ${ask.capturedAt}`, 16, W - pad, y, t.muted, { anchor: "end" }).svg);
  y += 40;
  parts.push(text("It answers from my own case studies, decision records and code, and lists the sources it used.", "text", 19, pad, y, t.muted).svg);

  y += 30;
  const qX = W - pad - qW;
  parts.push(`<rect x="${r1(qX)}" y="${y}" width="${r1(qW)}" height="58" rx="29" fill="${t.elev}" stroke="${t.strong}" stroke-width="2"/>`);
  parts.push(text(ask.question, "text", qSize, qX + 28, y + 38, t.fg).svg);

  y += 58 + 62;
  lines.forEach((ln, i) => {
    parts.push(text(ln, "text", answerSize, pad, y + i * lineH, t.fg).svg);
  });
  const last = lines.at(-1);
  const caretX = pad + measure(last, "text", answerSize) + 6;
  const caretY = y + (lines.length - 1) * lineH;
  parts.push(`<rect class="caret" x="${r1(caretX)}" y="${caretY - 22}" width="3" height="27" fill="${t.accent}"/>`);

  y = caretY + 56;
  parts.push(label("Sources", 15, pad, y, t.muted).svg);
  const sourceSize = 19;
  ask.sources.forEach((src, i) => {
    const sy = y + 32 + i * 31;
    parts.push(text(String(i + 1), "mono", 16, pad, sy, t.accentInk).svg);
    parts.push(text(src, "text", sourceSize, pad + 28, sy, t.muted).svg);
  });

  const H = y + 32 + ask.sources.length * 31 + 34;
  parts.push(text("Ask your own question", "display", 22, W - pad - 30, H - 42, t.accentInk, { anchor: "end" }).svg);
  parts.push(`<g transform="translate(${r1(W - pad - 22)} ${H - 62}) scale(0.75)">${ICONS.arrow(t.accentInk)}</g>`);

  const css = `
    .ping{transform-box:fill-box;transform-origin:center;animation:ping 2.4s ease-out infinite}
    @keyframes ping{0%{transform:scale(1);opacity:.6}100%{transform:scale(2.4);opacity:0}}
    .caret{animation:blink 1.1s steps(1) infinite}
    @keyframes blink{0%,60%{opacity:1}61%,100%{opacity:0}}
    ${REDUCED(".ping,.caret")}
  `;
  return doc({
    width: W,
    height: H,
    title: `Asked my assistant: ${ask.question}`,
    desc: `${ask.answer} Sources: ${ask.sources.join("; ")}.`,
    css,
    body: [card(t, W, H), ...parts].join("\n"),
  });
}

/* ------------------------------------------------------------ work figures */

const CW = 560;
const CH = 384;

/**
 * Stations on a track. A packet runs along it and lights each station as it
 * arrives; `holdAt` makes it wait at one station (the human approval step).
 */
function track(t, stations, { holdAt = -1 } = {}) {
  const x0 = 46;
  const x1 = CW - 46;
  const y = 252;
  const last = stations.length - 1;
  const step = (x1 - x0) / last;
  const dur = 4.8;
  const hold = holdAt >= 0 ? 0.2 : 0;
  const travel = 0.8 - hold;
  const arrival = stations.map((_, i) => (i / last) * travel + (holdAt >= 0 && i > holdAt ? hold : 0));
  const kt = (v) => String(Math.round(Math.min(Math.max(v, 0), 1) * 1000) / 1000);

  // Packet timeline: arrive at each station in turn, wait if this is the
  // holding station, then rest at the end until the loop restarts.
  const times = [];
  const xs = [];
  stations.forEach((_, i) => {
    times.push(arrival[i]);
    xs.push(x0 + i * step);
    if (i === holdAt) {
      times.push(arrival[i] + hold);
      xs.push(x0 + i * step);
    }
  });
  times.push(1);
  xs.push(x1);

  const parts = [`<path d="M${x0} ${y}H${x1}" stroke="${t.strong}" stroke-width="2"/>`];
  stations.forEach((name, i) => {
    const sx = x0 + i * step;
    const on = Math.max(arrival[i], 0.001);
    const off = Math.min(on + (i === holdAt ? hold + 0.06 : 0.12), 0.999);
    parts.push(
      `<circle cx="${r1(sx)}" cy="${y}" r="9" fill="${t.bg}" stroke="${t.fg}" stroke-width="2.5">` +
        `<animate attributeName="fill" dur="${dur}s" repeatCount="indefinite" calcMode="discrete" keyTimes="0;${kt(on)};${kt(off)}" values="${t.bg};${t.accent};${t.bg}"/></circle>`,
    );
    const end = i === 0 || i === last;
    const anchor = i === 0 ? "start" : i === last ? "end" : "middle";
    const lx = i === 0 ? sx - 9 : i === last ? sx + 9 : sx;
    parts.push(label(name, 14, lx, i % 2 === 1 ? y - 26 : y + 40, end ? t.fg : t.muted, { anchor }).svg);
  });
  parts.push(
    `<circle r="6" fill="${t.accent}"><animateTransform attributeName="transform" type="translate" dur="${dur}s" repeatCount="indefinite" keyTimes="${times.map(kt).join(";")}" values="${xs.map((v) => `${r1(v)} ${y}`).join(";")}"/></circle>`,
  );
  return parts.join("");
}

function featureTiles(t) {
  // RFE took the model from 12 engineered features to 8: four tiles drop out.
  const n = 12;
  const size = 30;
  const gap = 10;
  const x0 = (CW - (n * size + (n - 1) * gap)) / 2;
  const y = 222;
  const drop = [3, 7, 9, 11];
  const parts = [];
  for (let i = 0; i < n; i += 1) {
    const k = drop.indexOf(i);
    const anim =
      k < 0
        ? ""
        : `<animate attributeName="opacity" dur="6s" repeatCount="indefinite" keyTimes="0;${0.18 + k * 0.1};${0.24 + k * 0.1};0.86;0.94;1" values="1;1;0.16;0.16;1;1"/>`;
    parts.push(`<rect x="${r1(x0 + i * (size + gap))}" y="${y}" width="${size}" height="${size}" rx="6" fill="${k < 0 ? t.fg : t.accent}">${anim}</rect>`);
  }
  parts.push(label("12 engineered features", 14, x0, y + size + 32, t.muted).svg);
  parts.push(label("8 after RFE", 14, CW - x0, y + size + 32, t.accentInk, { anchor: "end" }).svg);
  return parts.join("");
}

function hourRing(t) {
  // A 24-hour dial with the finding marked: tipping peaks from 10pm to 2am.
  const cx = 96;
  const cy = 262;
  const r = 46;
  const angle = (hour) => (hour / 24) * 2 * Math.PI - Math.PI / 2;
  const pt = (hour, rad) => [cx + rad * Math.cos(angle(hour)), cy + rad * Math.sin(angle(hour))];
  const parts = [`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${t.strong}" stroke-width="2"/>`];
  for (let h = 0; h < 24; h += 1) {
    const [ax, ay] = pt(h, r - (h % 6 === 0 ? 10 : 5));
    const [bx, by] = pt(h, r);
    parts.push(`<path d="M${r1(ax)} ${r1(ay)}L${r1(bx)} ${r1(by)}" stroke="${t.muted}" stroke-width="2"/>`);
  }
  const [sx, sy] = pt(22, r);
  const [ex, ey] = pt(26, r);
  parts.push(`<path d="M${r1(sx)} ${r1(sy)}A${r} ${r} 0 0 1 ${r1(ex)} ${r1(ey)}" fill="none" stroke="${t.accent}" stroke-width="7" stroke-linecap="round"/>`);
  parts.push(
    `<path class="hand" d="M${cx} ${cy}L${cx} ${cy - r + 14}" stroke="${t.fg}" stroke-width="3" stroke-linecap="round"/>`,
    `<circle cx="${cx}" cy="${cy}" r="4.5" fill="${t.fg}"/>`,
  );
  const tx = cx + r + 40;
  const maxW = CW - tx - 36;
  parts.push(text("Tips peak from 10pm to 2am.", "text", 21, tx, cy - 14, t.fg).svg);
  wrap("Card payments tip far more than cash.", "text", 18, maxW).forEach((ln, i) => {
    parts.push(text(ln, "text", 18, tx, cy + 14 + i * 25, t.muted).svg);
  });
  return parts.join("");
}

function workCard(t, fig) {
  const pad = 36;
  const parts = [card(t, CW, CH, 20)];
  const fl = label(`fig. ${fig.n}`, 14, pad, 50, t.accentInk);
  parts.push(fl.svg);
  parts.push(label(` · ${fig.kind}`, 14, pad + fl.width, 50, t.muted).svg);
  parts.push(text(fig.title, "display", 32, pad - 1, 98, t.fg, { tracking: -0.6 }).svg);
  const summary = wrap(fig.summary, "text", 19, CW - pad * 2);
  if (summary.length > 2) throw new Error(`fig. ${fig.n}: summary needs ${summary.length} lines, max 2`);
  summary.forEach((ln, i) => parts.push(text(ln, "text", 19, pad, 134 + i * 27, t.muted).svg));
  parts.push(fig.motif(t));

  parts.push(`<path d="M${pad} 306H${CW - pad}" stroke="${t.line}" stroke-width="2"/>`);
  const LABEL = 13;
  const avail = CW - pad * 2;
  const widths = fig.metrics.map(([value, name]) =>
    Math.max(measure(value, "display", 25, -0.4), labelWidth(name.replace("²", "2"), LABEL)),
  );
  const colW = avail / fig.metrics.length;
  const packed = widths.some((w) => w > colW - 16);
  const gap = packed ? (avail - widths.reduce((a, w) => a + w, 0)) / Math.max(fig.metrics.length - 1, 1) : 0;
  if (packed && gap < 18) throw new Error(`fig. ${fig.n}: metrics do not fit`);
  let mx = pad;
  fig.metrics.forEach(([value, name], i) => {
    parts.push(text(value, "display", 25, mx, 344, t.fg, { tracking: -0.4 }).svg);
    parts.push(...metricLabel(name, mx, 369, t.muted, LABEL));
    mx += packed ? widths[i] + gap : colW;
  });

  const css = `
    .hand{transform-box:view-box;transform-origin:96px 262px;animation:spin 8s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    ${REDUCED(".hand")}
  `;
  return doc({
    width: CW,
    height: CH,
    title: `fig. ${fig.n}: ${fig.title}`,
    desc: `${fig.summary} ${fig.metrics.map(([v, k]) => `${v} ${k.replace("²", " squared")}`).join(", ")}.`,
    css: fig.motif === hourRing ? css : "",
    body: parts.join("\n"),
  });
}

/** A mono label that can carry a superscript two (R²): none of the cuts has the glyph. */
function metricLabel(name, x, y, fill, size) {
  const [before, after = ""] = name.split("²");
  const a = label(before, size, x, y, fill);
  if (!name.includes("²")) return [a.svg];
  const sup = label("2", size * 0.72, x + a.width + 1, y - size * 0.45, fill);
  const rest = after ? label(after, size, x + a.width + 1 + sup.width + 2, y, fill).svg : "";
  return [a.svg, sup.svg, rest];
}

async function figures() {
  const e = await evals();
  return [
    {
      n: 1,
      file: "work-assistant",
      kind: "flagship · live",
      title: "Portfolio Assistant",
      summary: "Answers recruiter questions about my work and traces every claim to a source document.",
      motif: (t) => track(t, ["question", "bm25 + vectors", "rrf + rerank", "answer"]),
      metrics: [
        [String(e.cases), "golden eval cases"],
        [e.recall10.toFixed(2), "recall@10"],
        [e.injections, "injections resisted"],
      ],
    },
    {
      n: 2,
      file: "work-access",
      kind: "production · Capgemini",
      title: "LLM-drafted access requests",
      summary: "Read prose access tickets and drafted the Active Directory change. The model interpreted; I authorised.",
      motif: (t) => track(t, ["ticket", "llm drafts", "I approve", "directory"], { holdAt: 2 }),
      metrics: [
        ["2 to 5 h", "saved a week"],
        ["100%", "human approval"],
      ],
    },
    {
      n: 3,
      file: "work-delivery",
      kind: "ML · regression",
      title: "Delivery-time prediction",
      summary: "Linear regression over Porter orders. Cutting from 12 features to 8 with RFE lowered the score.",
      motif: featureTiles,
      metrics: [
        ["175,777", "orders"],
        ["0.8800", "test R² · 12 features"],
        ["2.33 min", "MAE"],
      ],
    },
    {
      n: 4,
      file: "work-taxis",
      kind: "data · EDA",
      title: "Optimising NYC taxis",
      summary: "EDA of 2023 taxi trips. Three figures turned out to use placeholder data, so I published corrections.",
      motif: hourRing,
      metrics: [
        ["489,542", "trips analysed"],
        ["12", "months of 2023"],
        ["3", "figures corrected"],
      ],
    },
  ];
}

/* -------------------------------------------------------------------- main */

const figs = await figures();
for (const t of Object.values(THEMES)) {
  save(`header-${t.name}.svg`, header(t));
  for (const b of BUTTONS) save(`btn-${b.file}-${t.name}.svg`, button(t, b));
  save(`ask-${t.name}.svg`, askCard(t));
  save(`about-${t.name}.svg`, aboutCard(t));
  save(`experience-${t.name}.svg`, experienceCard(t));
  save(`skills-${t.name}.svg`, skillsCard(t));
  save(`education-${t.name}.svg`, educationCard(t));
  save(`colophon-${t.name}.svg`, colophonCard(t));
  for (const f of figs) save(`${f.file}-${t.name}.svg`, workCard(t, f));
}
