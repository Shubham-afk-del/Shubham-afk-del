// Builds every static SVG in assets/: the header, the link buttons, the
// featured assistant card, the work figures and (through lib/cards.mjs) the
// text cards, each in a light and a dark version for GitHub's <picture> theme
// switch.
//
//   node scripts/build.mjs
//
// Motion rule (from GitHub's image proxy and some apps drawing one frame):
// every image is complete with no animation running; motion only adds to it.
// Only the header and the featured card carry a border beam, and loops run
// 6 s or slower with a rest in each.

import { mkdirSync, writeFileSync } from "node:fs";
import { ask, evals, pmfby } from "./data.mjs";
import { THEMES, beam, card, corners, doc, gaussian, label, labelWidth, mulberry32, r1, sheen, text } from "./lib/svg.mjs";
import { measure, wrap } from "./lib/text.mjs";
import { aboutCard, careerCard, colophonCard, skillsCard } from "./lib/cards.mjs";

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
  const day = t.name === "light";
  const fig = { x: 700, y: 40, w: 516, h: 312 };
  const left = 64;
  const maxText = fig.x - left - 40;

  const nameSize = Math.min(92, (92 * maxText) / measure("Kumar Singh", "display", 92));
  const line = "Now building systems I can show you the numbers for.";
  const serifSize = Math.min(32, (32 * maxText) / measure(line, "serif", 32));
  const name = (fill) =>
    text("Shubham", "display", nameSize, left - 4, 188, fill, { tracking: -1.2 }).svg +
    text("Kumar Singh", "display", nameSize, left - 4, 282, fill, { tracking: -1.2 }).svg;

  // Aurora: soft radial glows that drift behind the figure and the name. By
  // night vermilion, gold and pink; by day only a faint vermilion haze.
  const glows = day
    ? [[t.accent, 0.08], [t.accent, 0.05], [t.accent, 0.04]]
    : [[t.accent, 0.26], ["#ffb020", 0.16], ["#ff2e88", 0.12]];
  // The light across the name runs from vermilion into gold by night, and stays vermilion by day.
  const shine = day ? t.accent : "#ffc24d";
  const aurora =
    `<defs>` +
    glows
      .map(([color, opacity], i) => `<radialGradient id="au${i + 1}"><stop offset="0" stop-color="${color}" stop-opacity="${opacity}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`)
      .join("") +
    `<clipPath id="cardclip"><rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="21"/></clipPath>` +
    `<linearGradient id="nshine" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${t.accent}" stop-opacity="0"/><stop offset="0.45" stop-color="${t.accent}" stop-opacity="0.95"/><stop offset="0.6" stop-color="${shine}" stop-opacity="0.95"/><stop offset="1" stop-color="${shine}" stop-opacity="0"/></linearGradient>` +
    `<mask id="namemask"><g fill="#fff">${name("#fff")}</g></mask>` +
    `</defs>` +
    `<g clip-path="url(#cardclip)">` +
    `<circle class="au a1" cx="960" cy="190" r="260" fill="url(#au1)"/>` +
    `<circle class="au a2" cx="1130" cy="330" r="200" fill="url(#au2)"/>` +
    `<circle class="au a3" cx="300" cy="90" r="300" fill="url(#au3)"/>` +
    `</g>`;

  // Dust: a few faint motes rising through the card. By day they rest
  // hidden and show only in motion: still, on white, they read as specks.
  const rand = mulberry32(0xd057);
  let dust = "";
  for (let i = 0; i < 18; i += 1) {
    const x = r1(40 + rand() * (W - 80));
    const y = r1(80 + rand() * (H - 120));
    const rad = r1(0.9 + rand() * 1.6);
    const dur = r1(7 + rand() * 7);
    const delay = r1(rand() * 8);
    dust += `<circle class="mote" cx="${x}" cy="${y}" r="${rad}" fill="${i % 4 === 0 ? t.accent : t.fg}"${day ? ' opacity="0"' : ""} style="animation-duration:${dur}s;animation-delay:-${delay}s"/>`;
  }

  const parts = [
    card(t, W, H, 22, { twinkle: true }),
    aurora,
    `<g clip-path="url(#cardclip)" opacity="0.55">${dust}</g>`,
    label("AI & ML engineer · London, UK", 17, left, 92, t.muted).svg,
    name(t.fg),
    // A light that sweeps across the name: a moving band, masked by the letters.
    `<g mask="url(#namemask)"><g transform="skewX(-14)"><rect x="-420" y="96" width="300" height="210" fill="url(#nshine)" opacity="0">` +
      `<set attributeName="opacity" to="1" begin="1.2s"/>` +
      `<animate attributeName="x" values="-420;900;900" keyTimes="0;0.4;1" dur="6.5s" begin="1.2s" repeatCount="indefinite"/></rect></g></g>`,
    text(line, "serif", serifSize, left, 334, t.muted).svg,
    `<circle cx="${left + 6}" cy="378" r="6" fill="${t.accent}"/>`,
    `<circle class="ring" cx="${left + 6}" cy="378" r="6" fill="none" stroke="${t.accent}" stroke-width="2" opacity="0.55"/>`,
    label("Open to AI/ML internships · full-time from Feb 2027", 15, left + 24, 383.5, t.fg).svg,

    corners(fig.x, fig.y, fig.w, fig.h, 18, t.strong),
    `<clipPath id="frame"><rect x="${fig.x + 2}" y="${fig.y + 2}" width="${fig.w - 4}" height="${fig.h - 4}"/></clipPath>`,
    `<g clip-path="url(#frame)">${figure(t, fig.x + fig.w / 2, fig.y + fig.h / 2 + 4, fig.w, fig.h)}</g>`,
    `<rect class="prog" x="${fig.x + 18}" y="${fig.y + fig.h - 1}" width="${fig.w - 36}" height="2" fill="${t.accent}" opacity="0.7"/>`,
    beam(t, W, H, 22, { dur: 9, begin: 0.4, len: 120 }),
    // The second beam is gold by night; by day both are vermilion.
    beam(t, W, H, 22, { dur: 9, begin: 4.9, len: 120, color: day ? t.accent : "#ffb020" }),
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
    .au{transform-box:fill-box;transform-origin:center}
    .a1{animation:d1 17s ease-in-out infinite alternate}
    .a2{animation:d2 13s ease-in-out infinite alternate}
    .a3{animation:d3 21s ease-in-out infinite alternate}
    @keyframes d1{to{transform:translate(-90px,40px) scale(1.18)}}
    @keyframes d2{to{transform:translate(-160px,-60px) scale(.85)}}
    @keyframes d3{to{transform:translate(140px,50px) scale(1.12)}}
    .mote{animation:mote 10s linear infinite}
    @keyframes mote{0%{transform:translateY(20px);opacity:0}20%{opacity:.9}80%{opacity:.9}100%{transform:translateY(-70px);opacity:0}}
    ${REDUCED(".pts circle,.l1,.l2,.l3,.ring,.prog,.au,.mote")}
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

/** A live dot's ring: one pulse, then a rest, every 6 s. */
const PING = `.ping{transform-box:fill-box;transform-origin:center;animation:ping 6s ease-out infinite}
  @keyframes ping{0%{transform:scale(1);opacity:.6}30%,100%{transform:scale(2.4);opacity:0}}`;

function button(t, { label: str, icon, primary }) {
  const size = 27;
  const h = 88;
  const day = t.name === "light";
  const textW = measure(str, "display", size, -0.2);
  const w = Math.ceil(32 + 32 + 16 + textW + 36);
  const fg = primary ? t.accentFg : t.fg;
  // By night a raised pill: the primary warms from vermilion toward orange,
  // the others run from ink into indigo. By day a flat one: vermilion for the
  // primary, white with a hairline border for the others. The primary gets a
  // sheen now and then, softer by day.
  const stops = day ? null : primary ? [t.accent, "#ff8a3d"] : ["#17171d", "#0d0d11"];
  const stroke = day && !primary ? 2 : 3; // the outline sits just inside the edge
  const parts = [
    stops
      ? `<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${stops[0]}"/><stop offset="1" stop-color="${stops[1]}"/></linearGradient></defs>`
      : "",
    `<rect x="${stroke / 2}" y="${stroke / 2}" width="${w - stroke}" height="${h - stroke}" rx="${(h - stroke) / 2}" fill="${stops ? "url(#bg)" : primary ? t.accent : t.elev}" stroke="${primary ? t.accent : t.strong}" stroke-width="${stroke}"/>`,
    // A fine highlight along the top edge; a white pill has nothing for it to show on.
    primary || !day
      ? `<path d="M${h / 2} 4.5H${w - h / 2}" stroke="#fff" stroke-opacity="${primary ? 0.45 : 0.12}" stroke-width="2" stroke-linecap="round"/>`
      : "",
    primary ? sheen("bs", w, h, (h - 2) / 2, { dur: 6.5, begin: 1, opacity: day ? 0.3 : 0.45 }) : "",
    `<g transform="translate(32 ${h / 2 - 16})">${ICONS[icon](fg, "ping")}</g>`,
    text(str, "display", size, 32 + 32 + 16, h / 2 + 9.5, fg, { tracking: -0.2 }).svg,
  ];
  const css = icon === "live" ? `${PING} ${REDUCED(".ping")}` : "";
  return doc({ width: w, height: h, title: str, desc: str, css, body: parts.filter(Boolean).join("\n") });
}

const BUTTONS = [
  { file: "portfolio", label: "Portfolio", icon: "arrow" },
  { file: "assistant", label: "Ask my AI assistant", icon: "live", primary: true },
  { file: "linkedin", label: "LinkedIn", icon: "linkedin" },
  { file: "email", label: "Email", icon: "mail" },
  { file: "cv", label: "CV", icon: "doc" },
];

/* ----------------------------------------------------------- featured card */

/**
 * The flagship, with the real exchange replayed beside it: the question pops
 * in, a packet runs the retrieval track while the assistant "thinks", the
 * answer streams word by word, then the sources slide in. Every element is
 * visible in a still image; the SMIL timeline only hides things before their
 * moment.
 */
function featuredCard(t, e) {
  const W = 1280;
  const pad = 64;
  const P = 18; // seconds per replay
  const OUT = 17.2; // everything fades before the next replay
  const kt = (sec) => String(Math.round((sec / P) * 10000) / 10000);
  const appear = (at, { dx = 0, dy = 0 } = {}) => {
    const fade = `<animate attributeName="opacity" dur="${P}s" repeatCount="indefinite" keyTimes="0;${kt(at)};${kt(at + 0.3)};${kt(OUT)};${kt(OUT + 0.5)};1" values="0;0;1;1;0;0"/>`;
    const move =
      dx || dy
        ? `<animateTransform attributeName="transform" type="translate" dur="${P}s" repeatCount="indefinite" keyTimes="0;${kt(at)};${kt(at + 0.45)};1" values="${dx} ${dy};${dx} ${dy};0 0;0 0" calcMode="spline" keySplines="0 0 1 1;.2 .9 .3 1;0 0 1 1"/>`
        : "";
    return fade + move;
  };
  const colW = 488; // the story column; the chat panel takes the rest
  const px = 600;
  const pw = W - pad - px;
  const asked = 0.4; // the question pops in
  const think = [1, 3.3]; // the packet's run, and the dots while it lasts

  // The panel: the question, the streamed answer and its sources.
  const inner = 28;
  const cx = px + inner;
  const cw = pw - inner * 2;
  const chat = [];
  const qSize = 22;
  const qW = measure(ask.question, "text", qSize) + 52;
  const qX = px + pw - inner - qW;
  let y = 104 + inner;
  chat.push(
    `<g>${appear(asked, { dx: 40 })}<rect x="${r1(qX)}" y="${y}" width="${r1(qW)}" height="52" rx="26" fill="${t.accent}" fill-opacity="0.1" stroke="${t.accent}" stroke-opacity="0.4" stroke-width="1.5"/>` +
      `${text(ask.question, "text", qSize, qX + 26, y + 34, t.fg).svg}</g>`,
  );
  y += 52 + 54;

  // Thinking: three dots bounce where the answer will start, then give way.
  const start = think[1];
  chat.push(
    `<g opacity="0"><animate attributeName="opacity" dur="${P}s" repeatCount="indefinite" calcMode="discrete" keyTimes="0;${kt(think[0])};${kt(start)}" values="0;1;0"/>` +
      [0, 1, 2].map((i) => `<circle class="dot" cx="${cx + 8 + i * 20}" cy="${y - 8}" r="5.5" fill="${t.accent}" style="animation-delay:${i * 0.16}s"/>`).join("") +
      `</g>`,
  );

  // The answer, streamed a word at a time, with a caret riding its end.
  const size = 22;
  const lineH = 33;
  const lines = wrap(ask.answer, "text", size, cw);
  const STEP = 0.058;
  const stops = [];
  let n = 0;
  lines.forEach((ln, i) => {
    const ly = y + i * lineH;
    const list = ln.split(" ");
    list.forEach((word, k) => {
      const x = cx + (k === 0 ? 0 : measure(`${list.slice(0, k).join(" ")} `, "text", size));
      const at = start + n * STEP;
      chat.push(`<g>${appear(at)}${text(word, "text", size, x, ly, t.fg).svg}</g>`);
      stops.push([at, r1(x + measure(word, "text", size) + 3), ly]);
      n += 1;
    });
  });
  const done = start + n * STEP;
  chat.push(
    `<g opacity="0"><animate attributeName="opacity" dur="${P}s" repeatCount="indefinite" calcMode="discrete" keyTimes="0;${kt(start)};${kt(done + 0.5)}" values="0;1;0"/>` +
      `<g transform="translate(${cx} ${y})"><animateTransform attributeName="transform" type="translate" dur="${P}s" repeatCount="indefinite" calcMode="discrete" keyTimes="0;${stops.map(([at]) => kt(at)).join(";")}" values="${cx} ${y};${stops.map(([, x, ly]) => `${x} ${ly}`).join(";")}"/>` +
      `<rect y="-21" width="3" height="26" fill="${t.accent}"/></g></g>`,
  );

  y += (lines.length - 1) * lineH + 52;
  chat.push(`<g>${appear(done + 0.3)}${label("Sources", 15, cx, y, t.muted).svg}</g>`);
  y += 34;
  const sourceSize = 20;
  ask.sources.forEach((src, i) => {
    const rows = wrap(src, "text", sourceSize, cw - 30);
    chat.push(
      `<g>${appear(done + 0.55 + i * 0.22, { dx: -26 })}${text(String(i + 1), "mono", 16, cx, y, t.accentInk).svg}` +
        `${rows.map((ln, k) => text(ln, "text", sourceSize, cx + 30, y + k * 27, t.muted).svg).join("")}</g>`,
    );
    y += (rows.length - 1) * 27 + 40;
  });
  const panelEnd = y - 40 + inner + 4;

  // The story column: kicker, title, summary, the track, the numbers and a way in.
  const parts = [
    `<circle cx="${pad + 6}" cy="68" r="6" fill="${t.accent}"/>`,
    `<circle class="ping" cx="${pad + 6}" cy="68" r="6" fill="none" stroke="${t.accent}" stroke-width="2" opacity="0.6"/>`,
  ];
  const kicker = label("featured", 16, pad + 24, 74, t.fg);
  parts.push(kicker.svg, label(" · live", 16, pad + 24 + kicker.width, 74, t.accentInk).svg);
  parts.push(label(`a real answer · ${ask.capturedAt}`, 15, W - pad, 74, t.muted, { anchor: "end" }).svg);
  parts.push(text("Portfolio Assistant", "display", 54, pad - 2, 158, t.fg, { tracking: -1 }).svg);
  const summary = wrap("Answers recruiter questions about my work and traces every claim to a source document.", "text", 22, colW);
  summary.forEach((ln, i) => parts.push(text(ln, "text", 22, pad, 206 + i * 33, t.muted).svg));
  parts.push(
    track(t, ["question", "rrf merge", "llm rerank", "answer"], {
      fork: true,
      x0: pad + 12,
      x1: pad + colW - 12,
      y: 356,
      size: 15,
      small: 15,
      legs: [1.9, 1, 1],
      below: [2],
      dur: P,
      go: think[0],
      end: think[1],
      out: OUT,
    }),
  );

  // The eval numbers, under a rule, each over a label of up to two lines.
  const rule = 452;
  parts.push(`<path d="M${pad} ${rule}H${pad + colW}" stroke="${t.line}" stroke-width="2"/>`);
  const metrics = [
    [String(e.cases), "golden eval cases"],
    [e.recall10.toFixed(2), "recall@10"],
    [e.injections, "injections resisted"],
  ];
  const mW = colW / metrics.length;
  metrics.forEach(([value, name], i) => {
    const mx = pad + i * mW;
    parts.push(text(value, "display", 40, mx, rule + 54, t.fg, { tracking: -0.6 }).svg);
    wrap(name.toUpperCase(), "mono", 15, mW - 18, 1.8).forEach((ln, k) => parts.push(label(ln, 15, mx, rule + 84 + k * 22, t.muted).svg));
  });

  // The call to action sits on the panel's bottom line.
  const H = Math.max(panelEnd, rule + 214) + 52;
  const ctaY = H - 52 - 58;
  const cta = "Ask it a question";
  const ctaW = measure(cta, "display", 24, -0.2);
  parts.push(
    `<rect x="${pad}" y="${ctaY}" width="${r1(ctaW + 26 + 12 + 28 + 24)}" height="58" rx="29" fill="${t.accent}" fill-opacity="0.1" stroke="${t.accent}" stroke-width="2"/>`,
    text(cta, "display", 24, pad + 26, ctaY + 37.5, t.accentInk, { tracking: -0.2 }).svg,
    `<g transform="translate(${r1(pad + 26 + ctaW + 10)} ${ctaY + 15}) scale(0.875)">${ICONS.arrow(t.accentInk)}</g>`,
  );

  const panel = `<rect x="${px}" y="104" width="${pw}" height="${H - 52 - 104}" rx="18" fill="${t.elev}" fill-opacity="${t.name === "light" ? 0.7 : 0.75}" stroke="${t.line}" stroke-width="2"/>`;
  const css = `
    ${PING}
    .dot{animation:bounce .9s ease-in-out infinite}
    @keyframes bounce{0%,100%{transform:translateY(0);opacity:.45}40%{transform:translateY(-9px);opacity:1}}
    ${REDUCED(".ping,.dot")}
  `;
  return doc({
    width: W,
    height: H,
    title: "Featured: Portfolio Assistant",
    desc:
      "Answers recruiter questions about my work and traces every claim to a source document. A question goes through BM25 and vector search, reciprocal rank fusion and an LLM reranker before the answer is written. " +
      `${e.cases} golden eval cases, recall at 10 of ${e.recall10.toFixed(2)}, ${e.injections.replace("/", " of ")} prompt injections resisted. ` +
      `A real exchange, captured ${ask.capturedAt}. ${ask.question} ${ask.answer} Sources: ${ask.sources.join("; ")}.`,
    css,
    body: [card(t, W, H), panel, ...chat, ...parts, beam(t, W, H, 22, { dur: 10, begin: 0.8, len: 100 })].join("\n"),
  });
}

/* ------------------------------------------------------------ work figures */

const CW = 560;
const CH = 384;

/**
 * Stations on a track. A glowing packet runs along it and lights each station
 * (with a ripple) as it arrives. `holdAt` makes the packet wait at one station,
 * where a check mark stamps itself (the human approval step). `fork` splits
 * the packet into two searches on its way to the second station (BM25 and
 * vectors, side by side), and they merge again there. `legs` weights the
 * gaps between stations, `below` lists the stations labelled under the line,
 * and `size` and `small` set the station and lane labels. Times are seconds
 * of a `dur` loop: the packet leaves at `go` and reaches the last station at
 * `end`, so a card can run it in step with the rest of its story, and `out`
 * fades it away until the loop starts again.
 */
function track(t, stations, { holdAt = -1, fork = false, x0 = 46, x1 = CW - 46, y = 252, size = 14, small = size - 2, legs, below, dur = 6, go = 0.3, end = 4.5, out } = {}) {
  const last = stations.length - 1;
  const weights = legs ?? stations.slice(1).map(() => 1);
  const sum = weights.reduce((s, v) => s + v, 0);
  const sx = [x0];
  weights.forEach((v) => sx.push(sx.at(-1) + ((x1 - x0) * v) / sum));
  const hold = holdAt >= 0 ? 1.1 : 0; // seconds the packet waits for approval
  const pace = (end - go - hold) / (x1 - x0); // seconds per px
  const arrival = sx.map((x, i) => go + (x - x0) * pace + (holdAt >= 0 && i > holdAt ? hold : 0));
  const at = (sec) => String(Math.round(Math.min(Math.max(sec / dur, 0), 1) * 10000) / 10000);
  const anim = (attr, keys, values) =>
    `<animate attributeName="${attr}" dur="${dur}s" repeatCount="indefinite" keyTimes="${keys.map(at).join(";")}" values="${values.join(";")}"/>`;

  const times = [0];
  const xs = [x0];
  sx.forEach((x, i) => {
    if (arrival[i] > 0) {
      times.push(arrival[i]);
      xs.push(x);
    }
    if (i === holdAt) {
      times.push(arrival[i] + hold);
      xs.push(x);
    }
  });
  times.push(dur);
  xs.push(x1);
  const motion = `<animateTransform attributeName="transform" type="translate" dur="${dur}s" repeatCount="indefinite" keyTimes="${times.map(at).join(";")}" values="${xs.map((v) => `${r1(v)} ${y}`).join(";")}"/>`;

  // With a fork, the two lanes leave the line a quarter of the way to the
  // second station and meet again on it; the line itself skips that stretch.
  const [fa, fb] = fork ? [sx[0] + (sx[1] - sx[0]) * 0.25, sx[1]] : [x1, x1];
  const split = go + (fa - x0) * pace;
  const rail = fork ? `M${r1(x0)} ${y}H${r1(fa)}M${r1(fb)} ${y}H${r1(x1)}` : `M${r1(x0)} ${y}H${r1(x1)}`;
  const parts = [
    `<defs><linearGradient id="trail" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${t.accent}" stop-opacity="0"/><stop offset="1" stop-color="${t.accent}" stop-opacity="0.9"/></linearGradient></defs>`,
    `<path d="${rail}" stroke="${t.strong}" stroke-width="2"/>`,
    `<path d="${rail}" stroke="${t.accent}" stroke-width="2" stroke-dasharray="2 12" stroke-linecap="round" opacity="0.55"/>`,
  ];

  if (fork) {
    // The packet splits into two searches side by side, then they merge.
    const span = fb - fa;
    const lane = (dy) => `M${r1(fa)} ${y}C${r1(fa + span * 0.3)} ${y + dy} ${r1(fb - span * 0.3)} ${y + dy} ${r1(fb)} ${y}`;
    for (const dy of [-36, 36]) {
      parts.push(`<path d="${lane(dy)}" fill="none" stroke="${t.strong}" stroke-width="1.6" stroke-dasharray="3 5"/>`);
      parts.push(
        `<circle r="5" fill="${t.accent}" opacity="0"><animate attributeName="opacity" dur="${dur}s" repeatCount="indefinite" calcMode="discrete" keyTimes="0;${at(split)};${at(arrival[1])}" values="0;1;0"/>` +
          `<animateMotion dur="${dur}s" repeatCount="indefinite" calcMode="linear" keyTimes="0;${at(split)};${at(arrival[1])};1" keyPoints="0;0;1;1" path="${lane(dy)}"/></circle>`,
      );
    }
    parts.push(label("bm25", small, fa + span / 2, y - 42, t.muted, { anchor: "middle" }).svg);
    parts.push(label("vectors", small, fa + span / 2, y + 42 + small * 0.74, t.muted, { anchor: "middle" }).svg);
  }

  stations.forEach((name, i) => {
    const x = sx[i];
    const on = Math.max(arrival[i], 0.005);
    const off = on + (i === holdAt ? hold + 0.3 : 0.6);
    parts.push(
      `<circle cx="${r1(x)}" cy="${y}" r="9" fill="none" stroke="${t.accent}" stroke-width="2" opacity="0">` +
        anim("r", [0, on, on + 0.8, dur], [9, 9, 24, 24]) +
        anim("opacity", [0, on, on + 0.02, on + 0.8, dur], [0, 0, 0.9, 0, 0]) +
        `</circle>`,
      `<circle cx="${r1(x)}" cy="${y}" r="9" fill="${t.bg}" stroke="${t.fg}" stroke-width="2.5">` +
        `<animate attributeName="fill" dur="${dur}s" repeatCount="indefinite" calcMode="discrete" keyTimes="0;${at(on)};${at(off)}" values="${t.bg};${t.accent};${t.bg}"/></circle>`,
    );
    const edge = i === 0 || i === last;
    const anchor = i === 0 ? "start" : i === last ? "end" : "middle";
    const lx = i === 0 ? x - 9 : i === last ? x + 9 : x;
    const above = below ? !below.includes(i) : fork ? edge : i % 2 === 1;
    parts.push(label(name, size, lx, above ? y - size - 12 : y + size + 26, edge ? t.fg : t.muted, { anchor }).svg);
    if (i === holdAt) {
      // The approval: a check mark draws itself while the packet waits.
      const c = `M${r1(x - 9)} ${y - 34}l7 7l13 -15`;
      parts.push(
        `<path d="${c}" fill="none" stroke="${t.accent}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" pathLength="100" stroke-dasharray="100 100" opacity="0">` +
          anim("stroke-dashoffset", [0, on, on + 0.4, dur], [100, 100, 0, 0]) +
          anim("opacity", [0, on, on + 0.05, off + 0.5, off + 0.8, dur], [0, 0, 1, 1, 0, 0]) +
          `</path>`,
      );
    }
  });

  // The packet, with a fading trail behind it while it moves. A still image
  // shows it resting at the first station; the animation replaces that
  // position as it runs. It hides while the fork's two searches run, and
  // `out` fades it at the end.
  const fade = out === undefined ? "" : anim("opacity", [0, out, out + 0.5, dur], [1, 1, 0, 0]);
  const hide = fork
    ? `<animate attributeName="opacity" dur="${dur}s" repeatCount="indefinite" calcMode="discrete" keyTimes="0;${at(split)};${at(arrival[1])}" values="1;0;1"/>`
    : "";
  parts.push(
    `<g transform="translate(${r1(x0)} ${y})">${motion}${fade}<g>${hide}<rect x="-46" y="-3" width="44" height="6" rx="3" fill="url(#trail)" opacity="0">` +
      `<animate attributeName="opacity" dur="${dur}s" repeatCount="indefinite" calcMode="discrete" keyTimes="0;${at(go)};${at(end)}" values="0;1;0"/></rect>` +
      `<circle r="11" fill="${t.accent}" opacity="0.22"/><circle r="6" fill="${t.accent}"/><circle r="2.4" fill="#fff6dc"/></g></g>`,
  );
  return parts.join("");
}

function featureTiles(t) {
  // RFE took the model from 12 engineered features to 8: four tiles fall out.
  const n = 12;
  const size = 30;
  const gap = 10;
  const x0 = (CW - (n * size + (n - 1) * gap)) / 2;
  const y = 222;
  const drop = [3, 7, 9, 11];
  const D = 6;
  const parts = [];
  for (let i = 0; i < n; i += 1) {
    const k = drop.indexOf(i);
    const x = r1(x0 + i * (size + gap));
    if (k < 0) {
      parts.push(`<rect class="keep" x="${x}" y="${y}" width="${size}" height="${size}" rx="6" fill="${t.fg}" style="animation-delay:${r1(i * 0.12)}s"/>`);
      continue;
    }
    const t0 = 0.16 + k * 0.1;
    const t1 = t0 + 0.12;
    const cx = r1(x0 + i * (size + gap) + size / 2);
    const cy = y + size / 2;
    parts.push(
      `<g><animateTransform attributeName="transform" type="translate" dur="${D}s" repeatCount="indefinite" keyTimes="0;${t0};${t1};0.88;0.9;1" values="0 0;0 0;${k % 2 ? 8 : -8} 24;${k % 2 ? 8 : -8} 24;0 0;0 0"/>` +
        `<animate attributeName="opacity" dur="${D}s" repeatCount="indefinite" keyTimes="0;${t0};${r1((t0 + t1) / 2 * 1000) / 1000};0.88;0.92;1" values="1;1;0;0;1;1"/>` +
        `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="6" fill="${t.accent}">` +
        `<animateTransform attributeName="transform" type="rotate" dur="${D}s" repeatCount="indefinite" keyTimes="0;${t0};${t1};1" values="0 ${cx} ${cy};0 ${cx} ${cy};${k % 2 ? 38 : -38} ${cx} ${cy};${k % 2 ? 38 : -38} ${cx} ${cy}"/></rect></g>`,
    );
  }
  parts.push(label("12 engineered features", 14, x0, y + size + 32, t.muted).svg);
  parts.push(label("8 after RFE", 14, CW - x0, y + size + 32, t.accentInk, { anchor: "end" }).svg);
  return parts.join("");
}

/** keyTimes value for a moment `at` (0 to 1) of a loop. */
const kt = (at) => String(Math.round(Math.min(Math.max(at, 0), 1) * 100000) / 100000);

/** A multiplication sign drawn as two strokes: none of the cuts has the glyph. */
function times(x, y, size, stroke) {
  const h = size * 0.19;
  const cx = x + h + size * 0.07;
  const cy = y - size * 0.34;
  const d = `M${r1(cx - h)} ${r1(cy - h)}L${r1(cx + h)} ${r1(cy + h)}M${r1(cx + h)} ${r1(cy - h)}L${r1(cx - h)} ${r1(cy + h)}`;
  return { svg: `<path d="${d}" stroke="${stroke}" stroke-width="${r1(size * 0.11)}" stroke-linecap="round"/>`, width: 2 * h + size * 0.14 };
}

/** A factor such as 12.05×, set in the display face. */
function factor(value, size, x, y, fill, { anchor = "start" } = {}) {
  const w = measure(value, "display", size, -0.2);
  const total = w + times(0, 0, size, fill).width;
  const x0 = anchor === "end" ? x - total : x;
  return text(value, "display", size, x0, y, fill, { tracking: -0.2 }).svg + times(x0 + w, y, size, fill).svg;
}

function overfitSlope(t) {
  // Accuracy on the training claims against held-out ones. The tuned forest
  // starts on top and finishes below the logistic regression. Two comets run
  // the lines together, and their crossing flares as the forest drops through.
  const xa = 150;
  const xb = 370;
  const top = 204;
  const bottom = 292;
  const y = (v) => bottom - ((v - 0.8) / 0.2) * (bottom - top);
  const D = 6.5;
  const [s, e] = [0.1, 0.44];
  const forest = { train: 0.982, held: 0.813 };
  const logit = { train: 0.875, held: 0.847 };
  const path = (m) => `M${xa} ${r1(y(m.train))}L${xb} ${r1(y(m.held))}`;
  const live = (from, to) => `<animate attributeName="opacity" dur="${D}s" repeatCount="indefinite" calcMode="discrete" keyTimes="0;${kt(from)};${kt(to)}" values="0;1;0"/>`;

  // Where the lines cross, as a share of the way across.
  const [a1, b1, a2, b2] = [y(forest.train), y(forest.held), y(logit.train), y(logit.held)];
  const f = (a2 - a1) / (b1 - a1 - (b2 - a2));
  const cross = [xa + f * (xb - xa), a1 + f * (b1 - a1)];
  const tc = s + f * (e - s);

  const comet = (m, color) => {
    const d = path(m);
    const dash = (len, width, opacity) =>
      `<path d="${d}" pathLength="100" fill="none" stroke="${color}" stroke-width="${width}" stroke-opacity="${opacity}" stroke-linecap="round" stroke-dasharray="${len} 300" stroke-dashoffset="${len}" opacity="0">` +
      `<animate attributeName="stroke-dashoffset" dur="${D}s" repeatCount="indefinite" keyTimes="0;${kt(s)};${kt(e)};1" values="${len};${len};${len - 100};${len - 100}"/>${live(s, e + 0.02)}</path>`;
    return (
      dash(28, 10, 0.16) +
      dash(13, 3.6, 0.85) +
      `<circle r="5.5" fill="${color}" opacity="0">${live(s, e)}<animateMotion dur="${D}s" repeatCount="indefinite" calcMode="linear" keyTimes="0;${kt(s)};${kt(e)};1" keyPoints="0;0;1;1" path="${d}"/></circle>`
    );
  };
  const ripple = (cx, cy, at, to = 24) =>
    `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="6" fill="none" stroke="${t.accent}" stroke-width="2" opacity="0">` +
    `<animate attributeName="r" dur="${D}s" repeatCount="indefinite" keyTimes="0;${kt(at)};${kt(at + 0.14)};1" values="6;6;${to};${to}"/>` +
    `<animate attributeName="opacity" dur="${D}s" repeatCount="indefinite" keyTimes="0;${kt(at)};${kt(at + 0.005)};${kt(at + 0.14)};1" values="0;0;0.9;0;0"/></circle>`;

  const parts = [
    `<path d="M${xa} ${top - 8}V${bottom + 6}M${xb} ${top - 8}V${bottom + 6}" stroke="${t.line}" stroke-width="2"/>`,
    label("training", 12, xa, top - 20, t.muted, { anchor: "middle" }).svg,
    label("held out", 12, xb, top - 20, t.muted, { anchor: "middle" }).svg,
    `<path d="${path(forest)}" stroke="${t.fg}" stroke-opacity="0.42" stroke-width="2.5" stroke-dasharray="7 6" stroke-linecap="round"/>`,
    `<path d="${path(logit)}" stroke="${t.accent}" stroke-width="3" stroke-linecap="round"/>`,
    comet(forest, t.fg),
    comet(logit, t.accent),
    ripple(cross[0], cross[1], tc, 28),
    ripple(xb, y(logit.held), e),
  ];
  // Once the comets land, a bracket measures what the forest lost.
  const bx = xb - 12;
  const [g0, g1] = [r1(y(forest.train)), r1(y(forest.held))];
  const draw = (from) =>
    `<animate attributeName="stroke-dashoffset" dur="${D}s" repeatCount="indefinite" keyTimes="0;${kt(from)};${kt(from + 0.06)};1" values="100;100;0;0"/>`;
  parts.push(
    `<g><animate attributeName="opacity" dur="${D}s" repeatCount="indefinite" keyTimes="0;${kt(e)};${kt(e + 0.01)};0.92;0.97;1" values="0;0;1;1;0;0"/>` +
      `<path d="M${xa + 8} ${g0}H${bx}" stroke="${t.fg}" stroke-opacity="0.35" stroke-width="1.5" stroke-dasharray="2 4"/>` +
      `<path d="M${bx - 5} ${g0}H${bx}V${g1}H${bx - 5}" fill="none" stroke="${t.accent}" stroke-width="2" stroke-linejoin="round" pathLength="100" stroke-dasharray="100 100">${draw(e + 0.05)}</path>` +
      `<g><animate attributeName="opacity" dur="${D}s" repeatCount="indefinite" keyTimes="0;${kt(e + 0.11)};${kt(e + 0.15)};1" values="0;0;1;1"/>` +
      `${label(`-${(forest.train - forest.held).toFixed(3)}`, 12, bx - 8, r1((g0 + g1) / 2 - 4), t.accentInk, { anchor: "end" }).svg}</g></g>`,
  );
  for (const [m, win] of [[forest, false], [logit, true]]) {
    for (const x of [xa, xb]) {
      const cy = r1(y(x === xa ? m.train : m.held));
      parts.push(
        win
          ? `<circle cx="${x}" cy="${cy}" r="5.5" fill="${t.accent}"/>`
          : `<circle cx="${x}" cy="${cy}" r="5" fill="${t.bg}" stroke="${t.fg}" stroke-opacity="0.6" stroke-width="2"/>`,
      );
    }
    const ink = win ? t.fg : t.muted;
    parts.push(text(m.train.toFixed(3), "display", 16, xa - 14, y(m.train) + 6, ink, { anchor: "end", tracking: -0.2 }).svg);
    // The two held-out scores sit 0.034 apart: nudge their labels apart a little.
    const ly = y(m.held) + 6 + (win ? -3 : 3);
    const v = text(m.held.toFixed(3), "display", 16, xb + 14, ly, ink, { tracking: -0.2 });
    parts.push(v.svg, label(win ? "logistic" : "forest", 12, xb + 14 + v.width + 8, ly, win ? t.accentInk : t.muted).svg);
  }
  return parts.join("");
}

function oddsBars(t) {
  // Odds of staying from the final model, on a log scale around 1x (no
  // effect). The bars grow out of that axis one after another, then hold.
  const ax = 300;
  const k = 60; // px per unit of log odds
  const rows = [
    ["senior vs entry", 12.054],
    ["remote work", 5.616],
    ["overtime", 0.723],
    ["poor work-life", 0.294],
  ];
  const y0 = 214;
  const pitch = 24;
  const bh = 12;
  const D = 6.5;
  const cap = y0 - 25;
  const one = measure("1", "mono", 12) + times(0, 0, 12, t.fg).width;
  const parts = [
    `<path d="M${ax} ${y0 - 17}V${y0 + (rows.length - 1) * pitch + 12}" stroke="${t.strong}" stroke-width="2"/>`,
    text("1", "mono", 12, ax - one / 2, cap, t.fg).svg,
    times(ax - one / 2 + measure("1", "mono", 12), cap, 12, t.fg).svg,
    label("less likely to stay", 12, ax - 22, cap, t.muted, { anchor: "end" }).svg,
    label("more likely to stay", 12, ax + 22, cap, t.muted).svg,
  ];
  rows.forEach(([name, odds], i) => {
    const cy = y0 + i * pitch;
    const w = r1(Math.abs(Math.log(odds)) * k);
    const up = odds > 1;
    const t0 = 0.06 + i * 0.07;
    const t1 = t0 + 0.12;
    parts.push(label(name, 12, 36, cy + 4.5, t.muted).svg);
    parts.push(
      `<g transform="translate(${ax} 0)"><g>` +
        `<animateTransform attributeName="transform" type="scale" dur="${D}s" repeatCount="indefinite" calcMode="spline" keyTimes="0;${kt(t0)};${kt(t1)};0.9;0.95;1" values="0 1;0 1;1 1;1 1;0 1;0 1" keySplines="0 0 1 1;.2 .8 .3 1;0 0 1 1;.6 0 .8 .4;0 0 1 1"/>` +
        `<rect x="${up ? 0 : -w}" y="${cy - bh / 2}" width="${w}" height="${bh}" rx="4" fill="${up ? t.accent : t.muted}"${up ? "" : ' fill-opacity="0.5"'}/></g></g>`,
      `<g><animate attributeName="opacity" dur="${D}s" repeatCount="indefinite" keyTimes="0;${kt(t1 - 0.03)};${kt(t1 + 0.03)};0.9;0.93;1" values="0;0;1;1;0;0"/>` +
        `${factor(odds.toFixed(2), 16, up ? ax + w + 8 : ax - w - 8, cy + 6, up ? t.fg : t.muted, { anchor: up ? "start" : "end" })}</g>`,
    );
    // A ripple where each bar that raises the odds comes to rest.
    if (up)
      parts.push(
        `<circle cx="${r1(ax + w)}" cy="${cy}" r="6" fill="none" stroke="${t.accent}" stroke-width="2" opacity="0">` +
          `<animate attributeName="r" dur="${D}s" repeatCount="indefinite" keyTimes="0;${kt(t1 - 0.02)};${kt(t1 + 0.12)};1" values="6;6;20;20"/>` +
          `<animate attributeName="opacity" dur="${D}s" repeatCount="indefinite" keyTimes="0;${kt(t1 - 0.02)};${kt(t1)};${kt(t1 + 0.12)};1" values="0;0;0.8;0;0"/></circle>`,
      );
  });
  return parts.join("");
}

/* ----------------------------------------------------- the wide SQL figure */

const WW = 1126; // two cards and the gap between them, at the same scale
const WH = 424;

// Two of the six columns of the per-year query in summary_queries.sql.
const QUERY = [
  "SELECT",
  "    srcYear,",
  "    ROUND(SUM(GrossPremiumAmountToBePaid) / 100)",
  "        AS gross_premium_crore,",
  "    ROUND(100 * SUM(FarmersPremiumAmount)",
  "              / SUM(GrossPremiumAmountToBePaid), 1)",
  "        AS farmers_share_pct",
  "FROM FarmersInsuranceData",
  "GROUP BY srcYear",
  "ORDER BY srcYear;",
];

const SYNTAX = {
  light: { kw: "#c13a0b", fn: "#9a5b00", num: "#6f4bd8", panel: "#ffffff", bar: "#f5f5f4" },
  dark: { kw: "#ff7a47", fn: "#ffb020", num: "#b39cff", panel: "#0a0a0f", bar: "#121219" },
};

/** One line of SQL as coloured runs, laid out on the mono grid. */
function sqlLine(t, line, x, y, adv) {
  const c = SYNTAX[t.name];
  let out = "";
  let col = 0;
  for (const [tok] of line.matchAll(/\s+|[A-Za-z_]\w*|\d+|./g)) {
    if (tok.trim()) {
      const fill = /^(SELECT|AS|FROM|GROUP|BY|ORDER)$/.test(tok)
        ? c.kw
        : /^(ROUND|SUM)$/.test(tok)
          ? c.fn
          : /^\d+$/.test(tok)
            ? c.num
            : /^\w+$/.test(tok)
              ? t.fg
              : t.muted;
      out += text(tok, "mono", 13, x + col * adv, y, fill).svg;
    }
    col += tok.length;
  }
  return out;
}

function farmersMotif(t) {
  // The query types itself into an editor, runs, and its result builds the
  // chart on the left: gross premium by year with the part farmers paid. The
  // bars nearly double while the farmers' slice stays about the same.
  const P = 12;
  const at = (sec) => kt(sec / P);
  const OUT = 11.2;
  const appear = (sec) =>
    `<animate attributeName="opacity" dur="${P}s" repeatCount="indefinite" keyTimes="0;${at(sec)};${at(sec + 0.3)};${at(OUT)};${at(OUT + 0.45)};1" values="0;0;1;1;0;0"/>`;
  const c = SYNTAX[t.name];
  const adv = measure("0", "mono", 13);

  // The editor.
  const ex = 540;
  const ey = 34;
  const ew = WW - 36 - ex;
  const eh = 296;
  const codeX = ex + 52;
  const lineY = (i) => ey + 34 + 30 + i * 20;
  const parts = [
    `<rect x="${ex}" y="${ey}" width="${ew}" height="${eh}" rx="14" fill="${c.panel}" stroke="${t.line}" stroke-width="2"/>`,
    `<path d="M${ex + 1} ${ey + 34}V${ey + 14}A13 13 0 0 1 ${ex + 14} ${ey + 1}H${ex + ew - 14}A13 13 0 0 1 ${ex + ew - 1} ${ey + 14}V${ey + 34}Z" fill="${c.bar}"/>`,
    `<path d="M${ex} ${ey + 34}H${ex + ew}" stroke="${t.line}" stroke-width="2"/>`,
    ...["#ff5f57", "#febc2e", "#28c840"].map((dot, i) => `<circle cx="${ex + 22 + i * 17}" cy="${ey + 17}" r="5" fill="${dot}" opacity="0.85"/>`),
    text("summary_queries.sql", "mono", 12, ex + 82, ey + 21.5, t.muted).svg,
  ];

  // Typing: each line is revealed a character at a time behind a clip, and
  // one caret follows along. A still image shows the finished query.
  const rate = 2.6 / QUERY.reduce((n, ln) => n + ln.trim().length, 0);
  let clock = 0.6;
  const caret = [];
  const code = [];
  QUERY.forEach((ln, i) => {
    const indent = ln.length - ln.trimStart().length;
    const n = ln.length - indent;
    const keys = [0];
    const widths = [0];
    for (let ch = 1; ch <= n; ch += 1) {
      const when = clock + (ch - 1) * rate;
      keys.push(when);
      widths.push(r1((indent + ch) * adv + 3));
      caret.push([when, codeX + (indent + ch) * adv + 1, lineY(i)]);
    }
    clock += n * rate + 0.05;
    const y = lineY(i);
    code.push(
      `<clipPath id="ty${i}"><rect x="${codeX - 2}" y="${y - 15}" width="${r1(ln.length * adv + 5)}" height="20">` +
        `<animate attributeName="width" dur="${P}s" repeatCount="indefinite" calcMode="discrete" keyTimes="${keys.map((k, j) => (j ? at(k) : "0")).join(";")}" values="${widths.join(";")}"/></rect></clipPath>`,
      text(String(i + 1), "mono", 12, codeX - 18, y, t.muted, { anchor: "end", opacity: 0.55 }).svg,
      `<g clip-path="url(#ty${i})">${sqlLine(t, ln, codeX, y, adv)}</g>`,
    );
  });
  const typed = clock;
  const [, lastX, lastY] = caret.at(-1);
  const band = QUERY.map((_, i) => lineY(i) - 15);
  parts.push(
    `<g><animate attributeName="opacity" dur="${P}s" repeatCount="indefinite" keyTimes="0;${at(OUT)};${at(OUT + 0.45)};1" values="1;1;0;0"/>` +
      // The current line, lit faintly as the caret moves down.
      `<rect x="${ex + 2}" y="${band.at(-1)}" width="${ew - 4}" height="20" fill="${t.accent}" opacity="0.07">` +
      `<animate attributeName="y" dur="${P}s" repeatCount="indefinite" calcMode="discrete" keyTimes="0;${QUERY.slice(1).map((_, i) => at(caret.find((p) => p[2] === lineY(i + 1))[0])).join(";")}" values="${band.join(";")}"/></rect>` +
      code.join("") +
      `<g transform="translate(${r1(lastX)} ${lastY - 13})">` +
      `<animateTransform attributeName="transform" type="translate" dur="${P}s" repeatCount="indefinite" calcMode="discrete" keyTimes="0;${caret.map(([w]) => at(w)).join(";")}" values="${r1(codeX)} ${lineY(0) - 13};${caret.map(([, x, y]) => `${r1(x)} ${y - 13}`).join(";")}"/>` +
      `<rect width="2" height="16" fill="${t.accent}"/></g></g>`,
  );

  // Run: the play button flashes and the result line comes up.
  const runAt = typed + 0.3;
  const rx = ex + ew - 30;
  const ry = ey + 17;
  parts.push(
    `<path d="M${rx - 5} ${ry - 7}L${rx + 7} ${ry}L${rx - 5} ${ry + 7}Z" fill="${t.muted}" stroke="${t.muted}" stroke-width="2" stroke-linejoin="round">` +
      `<animate attributeName="fill" dur="${P}s" repeatCount="indefinite" calcMode="discrete" keyTimes="0;${at(runAt)};${at(runAt + 0.9)}" values="${t.muted};${t.accent};${t.muted}"/>` +
      `<animate attributeName="stroke" dur="${P}s" repeatCount="indefinite" calcMode="discrete" keyTimes="0;${at(runAt)};${at(runAt + 0.9)}" values="${t.muted};${t.accent};${t.muted}"/></path>`,
    `<circle cx="${rx + 1}" cy="${ry}" r="11" fill="none" stroke="${t.accent}" stroke-width="2" opacity="0">` +
      `<animate attributeName="r" dur="${P}s" repeatCount="indefinite" keyTimes="0;${at(runAt)};${at(runAt + 0.8)};1" values="11;11;26;26"/>` +
      `<animate attributeName="opacity" dur="${P}s" repeatCount="indefinite" keyTimes="0;${at(runAt)};${at(runAt + 0.02)};${at(runAt + 0.8)};1" values="0;0;0.8;0;0"/></circle>`,
    `<path d="M${ex} ${ey + eh - 44}H${ex + ew}" stroke="${t.line}" stroke-width="2"/>`,
    `<g>${appear(runAt + 0.1)}` +
      `<path d="M${codeX - 1} ${ey + eh - 26}l5 5l10 -11" fill="none" stroke="${t.accent}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>` +
      `${label("4 rows in set", 12, codeX + 24, ey + eh - 17, t.fg).svg}</g>`,
  );

  // The chart, under the summary on the left.
  const x0 = 36;
  const x1 = 500;
  const base = 314;
  const hMax = 82;
  const max = Math.max(...pmfby.map((d) => d.gross));
  const slot = (x1 - x0) / pmfby.length;
  const bw = 58;
  parts.push(
    `<defs><linearGradient id="barg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.name === "light" ? t.strong : "#4a4a56"}"/><stop offset="1" stop-color="${t.name === "light" ? t.line : "#24242b"}"/></linearGradient></defs>`,
    `<rect x="${x0}" y="188" width="10" height="10" rx="2" fill="${t.accent}"/>`,
    label("farmers' share", 12, x0 + 18, 197.5, t.accentInk).svg,
    label("gross premium, crore rupees", 12, x1, 197.5, t.muted, { anchor: "end" }).svg,
    `<path d="M${x0} ${base}H${x1}" stroke="${t.strong}" stroke-width="2"/>`,
  );
  pmfby.forEach((d, i) => {
    const cx = r1(x0 + slot * (i + 0.5));
    const h = r1((d.gross / max) * hMax);
    const hf = r1((d.farmers / max) * hMax);
    const rise = runAt + 0.35 + i * 0.22;
    const r = 5;
    const bar = `M${-bw / 2} 0V${r - h}Q${-bw / 2} ${-h} ${-bw / 2 + r} ${-h}H${bw / 2 - r}Q${bw / 2} ${-h} ${bw / 2} ${r - h}V0Z`;
    parts.push(
      // A placeholder marks where each bar will stand until the query runs.
      `<g transform="translate(${cx} ${base - 1})"><path d="${bar}" fill="${t.line}"/><g>` +
        `<animateTransform attributeName="transform" type="scale" dur="${P}s" repeatCount="indefinite" calcMode="spline" keyTimes="0;${at(rise)};${at(rise + 0.55)};${at(OUT)};${at(OUT + 0.45)};1" values="1 0;1 0;1 1;1 1;1 0;1 0" keySplines="0 0 1 1;.2 .9 .3 1;0 0 1 1;.6 0 .8 .4;0 0 1 1"/>` +
        `<path d="${bar}" fill="url(#barg)"/><rect x="${-bw / 2}" y="${-hf}" width="${bw}" height="${hf}" fill="${t.accent}"/></g></g>`,
      `<g>${appear(rise + 0.4)}` +
        `${text(`${d.share}%`, "display", 17, cx, base - h - 10, t.accentInk, { anchor: "middle", tracking: -0.2 }).svg}` +
        `${text(d.gross.toLocaleString("en-US"), "mono", 12, cx, base - h + 17, t.fg, { anchor: "middle" }).svg}</g>`,
      label(String(d.year), 12, cx, base + 19, t.muted, { anchor: "middle" }).svg,
    );
  });
  return parts.join("");
}

function workCard(t, fig) {
  // A wide figure spans both columns, with its text on the left.
  const [W, H] = fig.wide ? [WW, WH] : [CW, CH];
  const pad = 36;
  const rule = H - 78;
  const parts = [card(t, W, H, 20)];
  const fl = label(`fig. ${fig.n}`, 14, pad, 50, t.accentInk);
  parts.push(fl.svg);
  parts.push(label(` · ${fig.kind}`, 14, pad + fl.width, 50, t.muted).svg);
  parts.push(text(fig.title, "display", 32, pad - 1, 98, t.fg, { tracking: -0.6 }).svg);
  const summary = wrap(fig.summary, "text", 19, fig.wide ? 464 : CW - pad * 2);
  if (summary.length > 2) throw new Error(`fig. ${fig.n}: summary needs ${summary.length} lines, max 2`);
  summary.forEach((ln, i) => parts.push(text(ln, "text", 19, pad, 134 + i * 27, t.muted).svg));
  parts.push(fig.motif(t));

  parts.push(`<path d="M${pad} ${rule}H${W - pad}" stroke="${t.line}" stroke-width="2"/>`);
  const LABEL = 13;
  const avail = W - pad * 2;
  const widths = fig.metrics.map(([value, name]) =>
    Math.max(measure(value, "display", 25, -0.4), labelWidth(name.replace("²", "2"), LABEL)),
  );
  const colW = avail / fig.metrics.length;
  const packed = widths.some((w) => w > colW - 16);
  const gap = packed ? (avail - widths.reduce((a, w) => a + w, 0)) / Math.max(fig.metrics.length - 1, 1) : 0;
  if (packed && gap < 18) throw new Error(`fig. ${fig.n}: metrics do not fit`);
  let mx = pad;
  fig.metrics.forEach(([value, name], i) => {
    parts.push(text(value, "display", 25, mx, rule + 38, t.fg, { tracking: -0.4 }).svg);
    parts.push(...metricLabel(name, mx, rule + 63, t.muted, LABEL));
    mx += packed ? widths[i] + gap : colW;
  });

  const css = `
    .keep{animation:glow 6s ease-in-out infinite}
    @keyframes glow{0%,20%,100%{opacity:1}60%{opacity:.82}}
    ${REDUCED(".keep")}
  `;
  return doc({
    width: W,
    height: H,
    title: `fig. ${fig.n}: ${fig.title}`,
    desc: `${fig.summary} ${fig.metrics.map(([v, k]) => `${v} ${k.replace("²", " squared")}`).join(", ")}.`,
    css,
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

/** The selected work, in page order. */
function figures() {
  return [
    {
      n: 1,
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
      // Fraudulent-Claim-Detection: README and notebook outputs, validation set of 300 claims.
      n: 2,
      file: "work-fraud",
      kind: "case study · classification",
      title: "Fraudulent claim detection",
      summary: "A tuned random forest hit 0.982 accuracy in training, then lost to plain logistic regression on held-out claims.",
      motif: overfitSlope,
      metrics: [
        ["1,000", "motor claims"],
        ["84%", "frauds caught"],
        ["0.855", "held-out AUC"],
      ],
    },
    {
      // Employee-Retention-Prediction: README and notebook outputs, odds ratios of the final model.
      n: 3,
      file: "work-retention",
      kind: "case study · explainable ML",
      title: "Predicting employee retention",
      summary: "Logistic regression on employee records, read as odds ratios so HR can see what goes with staying.",
      motif: oddsBars,
      metrics: [
        ["74,610", "employee records"],
        ["0.739", "held-out accuracy"],
        ["0.825", "held-out AUC"],
      ],
    },
    {
      n: 4,
      file: "work-delivery",
      kind: "case study · regression",
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
      // Farmers-Insurance-SQL: README, summary_queries.sql and data.csv.
      n: 5,
      file: "work-farmers",
      wide: true,
      kind: "case study · SQL",
      title: "Farmers' insurance in SQL",
      summary: "29 questions on India's crop insurance scheme, answered in MySQL and rechecked in pandas.",
      motif: farmersMotif,
      metrics: [
        ["1,870", "district-year records"],
        ["27", "states and territories"],
        ["43,007", "crore rupees of premium"],
        ["13.1%", "paid by farmers"],
      ],
    },
  ];
}

/* -------------------------------------------------------------------- main */

const e = await evals();
const figs = figures();
for (const t of Object.values(THEMES)) {
  save(`header-${t.name}.svg`, header(t));
  BUTTONS.forEach((b) => save(`btn-${b.file}-${t.name}.svg`, button(t, b)));
  save(`about-${t.name}.svg`, aboutCard(t, e));
  save(`featured-${t.name}.svg`, featuredCard(t, e));
  for (const f of figs) save(`${f.file}-${t.name}.svg`, workCard(t, f));
  save(`career-${t.name}.svg`, careerCard(t));
  save(`skills-${t.name}.svg`, skillsCard(t));
  save(`colophon-${t.name}.svg`, colophonCard(t));
}
