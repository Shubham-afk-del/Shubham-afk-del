// The text sections of the profile, drawn as cards: about with four numbers
// at a glance, experience and education side by side, skills with
// certifications, and the colophon. Motion runs once on load (only the
// experience comet comes back) and only ever starts from a state that the
// static image already shows in full.

import { about, certifications, education, experience, skills } from "../data.mjs";
import { card, doc, label, r1, text } from "./svg.mjs";
import { measure, wrap } from "./text.mjs";

const W = 1280;
const PAD = 64;

function heading(t, name, y, right, x = PAD) {
  const parts = [
    `<circle cx="${x + 6}" cy="${y - 6}" r="6" fill="${t.accent}"/>`,
    label(name, 16, x + 24, y, t.fg).svg,
  ];
  if (right) parts.push(label(right, 15, W - PAD, y, t.muted, { anchor: "end" }).svg);
  return parts.join("");
}

/**
 * A mono label in lines of at most `width` px, in its capitals and tracking,
 * balanced: the narrowest width that still needs no extra line, so a name
 * such as Tech Mahindra stays on one line instead of leaving a short last one.
 */
function labelLines(str, size, width) {
  const upper = str.toUpperCase();
  const count = wrap(upper, "mono", size, width, size * 0.12).length;
  let [lo, hi] = [0, width];
  while (hi - lo > 0.5) {
    const mid = (lo + hi) / 2;
    if (wrap(upper, "mono", size, mid, size * 0.12).length > count) lo = mid;
    else hi = mid;
  }
  return wrap(upper, "mono", size, hi, size * 0.12);
}

/** The one phrase of my story that gets an underline, drawn once. */
const MARK = "I approved every one";

/**
 * Four numbers beside the story: 3+ years across the roles in data.mjs, the
 * 2 to 5 h from the access-request figure, recall@10 from the assistant's
 * committed evals, and the IIIT Bangalore diploma's 96.25%.
 */
const glance = (e) => [
  ["3+ yrs", "enterprise IT at Capgemini and Tech Mahindra"],
  ["2 to 5 h", "saved a week by my LLM access tool"],
  [e.recall10.toFixed(2), "recall@10 on my RAG assistant"],
  ["96.25%", "PG Diploma, IIIT Bangalore"],
];

export function aboutCard(t, e) {
  const size = 22;
  const lh = 35;
  const grid = 736; // the tiles start here; the story stops 36 px short of them
  const textW = grid - 36 - PAD;
  const gap = 16;
  const tileW = (W - PAD - grid - gap) / 2;
  const inset = 17;
  const top = 112;
  const parts = [heading(t, "About", 74), label("At a glance", 16, grid, 74, t.muted).svg];

  let marks = "";
  let y = 136;
  about.forEach((para, p) => {
    const fill = p === about.length - 1 ? t.accentInk : t.fg;
    wrap(para, "text", size, textW).forEach((ln) => {
      parts.push(text(ln, "text", size, PAD, y, fill).svg);
      const at = ln.indexOf(MARK);
      if (at >= 0) {
        const x1 = PAD + measure(ln.slice(0, at), "text", size);
        const x2 = PAD + measure(ln.slice(0, at + MARK.length), "text", size);
        marks += `<path class="mark" d="M${r1(x1)} ${y + 8}Q${r1((x1 + x2) / 2)} ${y + 12} ${r1(x2)} ${y + 7}" fill="none" stroke="${t.accent}" stroke-width="3" stroke-linecap="round" pathLength="100" stroke-dasharray="100 100"/>`;
      }
      y += lh;
    });
    y += 14;
  });
  const storyEnd = y - lh - 14;

  // The tiles fill the story's height: the number on top, its label at the
  // foot. They rise into place one after another, once.
  const tileH = Math.max(176, Math.round((storyEnd + 8 - top - gap) / 2));
  glance(e).forEach(([value, name], i) => {
    const x = grid + (i % 2) * (tileW + gap);
    const ty = top + Math.floor(i / 2) * (tileH + gap);
    const lines = labelLines(name, 15, tileW - inset * 2);
    parts.push(
      `<g class="tile" style="animation-delay:${r1(0.2 + i * 0.12)}s">` +
        `<rect x="${x}" y="${ty}" width="${tileW}" height="${tileH}" rx="16" fill="${t.elev}" fill-opacity="0.6" stroke="${t.line}" stroke-width="2"/>` +
        text(value, "display", 50, x + inset, ty + 70, t.fg, { tracking: -1 }).svg +
        lines.map((ln, k) => label(ln, 15, x + inset, ty + tileH - 24 - (lines.length - 1 - k) * 22, t.muted).svg).join("") +
        `</g>`,
    );
  });

  const H = Math.max(storyEnd + 50, top + tileH * 2 + gap + 44);
  const css = `
    .tile{animation:rise .8s cubic-bezier(.2,.8,.2,1) both}
    @keyframes rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
    .mark{animation:draw .7s ease-out 1.1s both}
    @keyframes draw{from{stroke-dashoffset:100}to{stroke-dashoffset:0}}
    @media (prefers-reduced-motion: reduce){.tile,.mark{animation:none}}
  `;
  const desc = `${about.join(" ")} At a glance: ${glance(e)
    .map(([value, name]) => `${value} ${name}`)
    .join("; ")}.`;
  return doc({ width: W, height: H, title: "About", desc, css, body: [card(t, W, H), marks, ...parts].join("\n") });
}

/** The one note kept under a role: the LLM tool. */
const KEY_NOTE = /Python tool/;

/**
 * Experience on a timeline, education beside it. The rail draws itself and
 * a comet runs down it now and then; the 96.25% ring fills once.
 */
export function careerCard(t) {
  const split = 704; // the education column
  const parts = [heading(t, "Experience", 74), heading(t, "Education", 74, "", split)];

  const lineX = PAD + 6;
  const tx = PAD + 40;
  const noteW = split - 40 - tx;
  let y = 140;
  const dots = [];
  experience.forEach((job, i) => {
    dots.push(y - 8);
    parts.push(text(job.role, "display", 24, tx, y, t.fg, { tracking: -0.4 }).svg);
    y += 30;
    const where = text(`${job.company} · ${job.place} · `, "mono", 15, tx, y, t.muted);
    parts.push(where.svg, text(job.dates, "mono", 15, tx + where.width, y, job.current ? t.accentInk : t.muted).svg);
    for (const note of job.notes.filter((n) => KEY_NOTE.test(n))) {
      y += 6;
      wrap(note, "text", 20, noteW).forEach((ln) => {
        y += 29;
        parts.push(text(ln, "text", 20, tx, y, t.fg).svg);
      });
    }
    y += i === experience.length - 1 ? 0 : 52;
  });
  const top = dots[0];
  const bottom = dots.at(-1);
  parts.unshift(
    `<path class="rail" d="M${lineX} ${top}V${bottom}" stroke="${t.strong}" stroke-width="2" pathLength="100" stroke-dasharray="100 100"/>`,
  );
  dots.forEach((cy, i) => {
    parts.push(
      experience[i].current
        ? `<circle cx="${lineX}" cy="${cy}" r="8" fill="${t.accent}"/>`
        : `<circle cx="${lineX}" cy="${cy}" r="7" fill="${t.bg}" stroke="${t.fg}" stroke-width="2.5"/>`,
    );
  });
  // The comet: down the rail, a fade, then a rest before the next run.
  parts.push(
    `<defs><linearGradient id="comet" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.accent}" stop-opacity="0"/><stop offset="1" stop-color="${t.accent}" stop-opacity="0.9"/></linearGradient></defs>`,
    `<g opacity="0"><set attributeName="opacity" to="1" begin="1.8s"/>` +
      `<animateTransform attributeName="transform" type="translate" dur="7s" begin="1.8s" repeatCount="indefinite" keyTimes="0;0.55;1" values="0 0;0 ${r1(bottom - top)};0 ${r1(bottom - top)}" calcMode="spline" keySplines=".45 0 .55 1;0 0 1 1"/>` +
      `<animate attributeName="opacity" dur="7s" begin="1.8s" repeatCount="indefinite" keyTimes="0;0.05;0.5;0.56;1" values="0;1;1;0;0"/>` +
      `<rect x="${lineX - 2}" y="${top - 46}" width="4" height="46" rx="2" fill="url(#comet)"/>` +
      `<circle cx="${lineX}" cy="${top}" r="9" fill="${t.accent}" opacity="0.25"/><circle cx="${lineX}" cy="${top}" r="4.5" fill="${t.accent}"/></g>`,
  );

  // Education: title, school, then dates and result, on one line when they fit.
  const ex = split + 24;
  const ew = W - PAD - ex;
  let ey = 140;
  education.forEach((ed, i) => {
    parts.push(text(ed.title, "display", 21, ex, ey, t.fg, { tracking: -0.3 }).svg);
    // The MSc's school line names the dissertation, which gets a line of its own.
    const school = measure(ed.school, "text", 18) > ew ? ed.school.split(" · ").map((s, k) => (k ? s[0].toUpperCase() + s.slice(1) : s)) : [ed.school];
    let ly = ey;
    school.forEach((ln) => {
      ly += 25;
      parts.push(text(ln, "text", 18, ex, ly, t.muted).svg);
    });
    ly += 25;
    const result = ed.highlight ? t.accentInk : t.fg;
    const when = text(`${ed.when} · `, "mono", 15, ex, ly, t.muted);
    if (!ed.highlight && when.width + measure(ed.result, "mono", 15) <= ew) {
      parts.push(when.svg, text(ed.result, "mono", 15, ex + when.width, ly, result).svg);
    } else {
      parts.push(text(ed.when, "mono", 15, ex, ly, t.muted).svg);
      ly += 25;
      parts.push(text(ed.result, "mono", 15, ex, ly, result).svg);
    }
    if (ed.highlight) {
      // 96.25% as a ring that fills, at the column's right edge.
      const R = 22;
      const [gx, gy] = [W - PAD - R - 3, ey + 32];
      parts.push(
        `<circle cx="${gx}" cy="${gy}" r="${R}" fill="none" stroke="${t.line}" stroke-width="5.5"/>`,
        `<circle class="gauge" cx="${gx}" cy="${gy}" r="${R}" fill="none" stroke="${t.accent}" stroke-width="5.5" stroke-linecap="round" pathLength="100" stroke-dasharray="96.25 100" transform="rotate(-90 ${gx} ${gy})"/>`,
        text("96", "display", 15, gx, gy + 5.5, t.fg, { anchor: "middle" }).svg,
      );
    }
    ey = ly + (i === education.length - 1 ? 0 : 46);
  });

  const H = Math.max(y, ey) + 44;
  const css = `
    .rail{animation:draw 1.6s ease-out both}
    @keyframes draw{from{stroke-dashoffset:100}to{stroke-dashoffset:0}}
    .gauge{animation:fill 1.8s cubic-bezier(.2,.8,.2,1) .4s both}
    @keyframes fill{from{stroke-dashoffset:96.25}to{stroke-dashoffset:0}}
    @media (prefers-reduced-motion: reduce){.rail,.gauge{animation:none}}
  `;
  const desc =
    `Experience. ${experience.map((j) => `${j.role}, ${j.company}, ${j.place}, ${j.dates}.${j.notes.filter((n) => KEY_NOTE.test(n)).map((n) => ` ${n}`).join("")}`).join(" ")} ` +
    `Education. ${education.map((ed) => `${ed.title}, ${ed.school}, ${ed.when}, ${ed.result}.`).join(" ")}`;
  return doc({ width: W, height: H, title: "Experience and education", desc, css, body: [card(t, W, H), ...parts].join("\n") });
}

export function skillsCard(t) {
  const parts = [heading(t, "Skills", 74, "rated against evidence")];
  const note = "Strong means production use on my own, working means I've shipped something real with it, and familiar means coursework or tutorials. I don't round up.";
  let y = 128;
  wrap(note, "text", 22, W - PAD * 2).forEach((ln) => {
    parts.push(text(ln, "text", 22, PAD, y, t.muted).svg);
    y += 33;
  });
  y += 22;
  const colX = PAD + 190;
  const maxX = W - PAD;
  let n = 0;

  /** One row of chips after its label, wrapping when it reaches the edge. */
  const row = (name, items, { size, h, fill, stroke, ink, tick = false, accent = false }) => {
    parts.push(label(name, 15, PAD, y + h / 2 + 5.5, accent ? t.accentInk : t.muted).svg);
    const inset = tick ? 40 : 18;
    let x = colX;
    items.forEach((item) => {
      const w = measure(item, "text", size) + inset + 18;
      if (x + w > maxX) {
        x = colX;
        y += h + 12;
      }
      const mark = tick
        ? `<path d="M${r1(x + 16)} ${y + h / 2}l4.5 4.5l9 -10" fill="none" stroke="${t.accent}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`
        : "";
      parts.push(
        `<g class="chip" style="animation-delay:${r1(0.15 + n * 0.04)}s"><rect x="${r1(x)}" y="${y}" width="${r1(w)}" height="${h}" rx="${h / 2}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>` +
          `${mark}${text(item, "text", size, x + inset, y + h / 2 + r1(size * 0.36), ink).svg}</g>`,
      );
      x += w + 12;
      n += 1;
    });
    y += h + 26;
  };

  const levels = {
    strong: { fill: t.accent, stroke: t.accent, ink: t.accentFg, accent: true },
    working: { fill: t.elev, stroke: t.strong, ink: t.fg },
    familiar: { fill: "none", stroke: t.line, ink: t.muted },
  };
  for (const [level, names] of Object.entries(skills)) row(level, names, { size: 22, h: 50, ...levels[level] });
  // Certifications: smaller chips, each with a tick, under a rule; the
  // issuers are in the alt text.
  parts.push(`<path d="M${PAD} ${y - 4}H${W - PAD}" stroke="${t.line}" stroke-width="2"/>`);
  y += 18;
  row(
    "certifications",
    certifications.map((c) => c.name),
    { size: 20, h: 44, fill: "none", stroke: t.strong, ink: t.fg, tick: true },
  );

  const H = y - 26 + 46;
  const css = `
    .chip{transform-box:fill-box;transform-origin:center;animation:pop .5s cubic-bezier(.2,.9,.3,1.3) both}
    @keyframes pop{from{opacity:0;transform:scale(.86)}to{opacity:1;transform:scale(1)}}
    @media (prefers-reduced-motion: reduce){.chip{animation:none}}
  `;
  const desc =
    `${note} Strong: ${skills.strong.join(", ")}. Working: ${skills.working.join(", ")}. Familiar: ${skills.familiar.join(", ")}. ` +
    `Certifications: ${certifications.map((c) => `${c.name}, ${c.issuer}, ${c.date}`).join("; ")}.`;
  return doc({ width: W, height: H, title: "Skills and certifications", desc, css, body: [card(t, W, H), ...parts].join("\n") });
}

export function colophonCard(t) {
  // One sentence a line, centred.
  const lines = [
    "The header is the Swiss roll from my portfolio's hero: it unrolls into a flat sheet, scatters into noise and rolls back up.",
    "The terminal and the contribution graph are redrawn every morning from live data.",
    "Every figure here is drawn by the scripts in this repo.",
  ];
  const size = 19;
  const parts = [];
  let y = 56;
  for (const ln of lines) {
    for (const row of wrap(ln, "text", size, W - PAD * 2)) {
      parts.push(text(row, "text", size, W / 2, y, t.muted, { anchor: "middle" }).svg);
      y += 31;
    }
  }
  const H = y + 12;
  return doc({ width: W, height: H, title: "How this page is made", desc: lines.join(" "), body: [card(t, W, H, 18), ...parts].join("\n") });
}
