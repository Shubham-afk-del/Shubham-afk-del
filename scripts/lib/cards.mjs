// The text sections of the profile, drawn as cards so the whole README reads
// dark whatever theme the visitor uses: about, experience, skills, education
// with certifications, and the colophon. Motion runs once on load and only
// ever starts from a state that the static image already shows in full.

import { about, certifications, education, experience, skills } from "../data.mjs";
import { beam, card, doc, label, r1, sheen, text } from "./svg.mjs";
import { measure, wrap } from "./text.mjs";

const W = 1280;
const PAD = 64;

function heading(t, name, y, right) {
  const parts = [
    `<circle cx="${PAD + 6}" cy="${y - 6}" r="6" fill="${t.accent}"/>`,
    label(name, 16, PAD + 24, y, t.fg).svg,
  ];
  if (right) parts.push(label(right, 15, W - PAD, y, t.muted, { anchor: "end" }).svg);
  return parts.join("");
}

/** Words of one line as separate runs, so they can light up one after another. */
function words(line, font, size, x, y, fill, delay0, step) {
  let out = "";
  let cursor = 0;
  const list = line.split(" ");
  list.forEach((word, i) => {
    const before = list.slice(0, i).join(" ");
    cursor = i === 0 ? 0 : measure(`${before} `, font, size);
    const run = text(word, font, size, x + cursor, y, fill, { cls: "w" });
    out += run.svg.replace('class="w"', `class="w" style="animation-delay:${r1(delay0 + i * step)}s"`);
  });
  return { svg: out, count: list.length };
}

const MARKS = ["fifty incidents a day", "I approved every one"];

export function aboutCard(t) {
  const size = 25;
  const lh = 40;
  const maxW = W - PAD * 2;
  const parts = [heading(t, "About", 74, "London, UK")];
  const underlines = [];
  let y = 136;
  let delay = 0.2;
  about.forEach((para, p) => {
    const fill = p === about.length - 1 ? t.accentInk : t.fg;
    wrap(para, "text", size, maxW).forEach((ln) => {
      const w = words(ln, "text", size, PAD, y, fill, delay, 0.035);
      parts.push(w.svg);
      for (const phrase of MARKS) {
        const at = ln.indexOf(phrase);
        if (at < 0) continue;
        const x1 = PAD + measure(ln.slice(0, at), "text", size);
        const x2 = PAD + measure(ln.slice(0, at + phrase.length), "text", size);
        const wordsBefore = ln.slice(0, at + phrase.length).split(" ").length;
        underlines.push(
          `<path class="mark" d="M${r1(x1)} ${y + 9}Q${r1((x1 + x2) / 2)} ${y + 13} ${r1(x2)} ${y + 8}" fill="none" stroke="${t.accent}" stroke-width="3.5" stroke-linecap="round" pathLength="100" stroke-dasharray="100 100" style="animation-delay:${r1(delay + wordsBefore * 0.035 + 0.15)}s"/>`,
        );
      }
      delay += w.count * 0.035;
      y += lh;
    });
    y += 18;
  });
  const H = y + 26;
  // A big outlined numeral drifting behind the text (the portfolio's section numbers).
  const ghost = `<g class="ghost">${text("01", "display", 300, W - PAD + 10, H - 30, "none", { anchor: "end" }).svg.replace(
    'fill="none"',
    `fill="none" stroke="${t.fg}" stroke-width="6" stroke-opacity="0.08"`,
  )}</g>`;
  const css = `
    .w{animation:rise .7s ease-out both}
    @keyframes rise{from{opacity:.14}to{opacity:1}}
    .mark{animation:draw .6s ease-out both}
    @keyframes draw{from{stroke-dashoffset:100}to{stroke-dashoffset:0}}
    .ghost{animation:float 9s ease-in-out infinite alternate}
    @keyframes float{to{transform:translate(-18px,-10px)}}
    @media (prefers-reduced-motion: reduce){.w,.mark,.ghost{animation:none}}
  `;
  return doc({
    width: W,
    height: H,
    title: "About",
    desc: about.join(" "),
    css,
    body: [card(t, W, H), ghost, ...underlines, ...parts, beam(t, W, H, 22, { dur: 11, begin: 0.5, len: 90 })].join("\n"),
  });
}

export function experienceCard(t) {
  const parts = [heading(t, "Experience", 74, "3+ years in enterprise IT")];
  const lineX = PAD + 8;
  const tx = PAD + 44;
  const noteW = W - PAD - tx;
  let y = 138;
  const dots = [];
  experience.forEach((job, i) => {
    dots.push(y - 8);
    parts.push(text(job.role, "display", 25, tx, y, t.fg, { tracking: -0.4 }).svg);
    parts.push(label(job.dates, 14, W - PAD, y, job.current ? t.accentInk : t.muted, { anchor: "end" }).svg);
    y += 30;
    parts.push(text(`${job.company} · ${job.place}`, "text", 18, tx, y, t.muted).svg);
    y += 8;
    job.notes.forEach((note) => {
      wrap(note, "text", 18, noteW - 22).forEach((ln, k) => {
        y += 28;
        if (k === 0) parts.push(`<circle cx="${tx + 4}" cy="${y - 6}" r="3" fill="${t.strong}"/>`);
        parts.push(text(ln, "text", 18, tx + 20, y, t.fg).svg);
      });
    });
    y += i === experience.length - 1 ? 0 : 50;
  });
  const top = dots[0];
  const bottom = dots.at(-1);
  parts.unshift(
    `<path class="rail" d="M${lineX} ${top}V${bottom}" stroke="${t.strong}" stroke-width="2" pathLength="100" stroke-dasharray="100 100"/>`,
  );
  dots.forEach((cy, i) => {
    const current = experience[i].current;
    parts.push(
      current
        ? `<circle cx="${lineX}" cy="${cy}" r="8" fill="${t.accent}"/><circle class="ping" cx="${lineX}" cy="${cy}" r="8" fill="none" stroke="${t.accent}" stroke-width="2" opacity="0.6"/>`
        : `<circle cx="${lineX}" cy="${cy}" r="7" fill="${t.bg}" stroke="${t.fg}" stroke-width="2.5"/>`,
    );
  });
  const H = y + 46;
  parts.push(
    `<g opacity="0"><set attributeName="opacity" to="1" begin="1.8s"/>` +
      `<animateTransform attributeName="transform" type="translate" dur="5.5s" begin="1.8s" repeatCount="indefinite" keyTimes="0;0.65;1" values="0 0;0 ${r1(bottom - top)};0 ${r1(bottom - top)}" calcMode="spline" keySplines=".45 0 .55 1;0 0 1 1"/>` +
      `<animate attributeName="opacity" dur="5.5s" begin="1.8s" repeatCount="indefinite" keyTimes="0;0.06;0.6;0.66;1" values="0;1;1;0;0"/>` +
      `<rect x="${lineX - 2}" y="${top - 46}" width="4" height="46" rx="2" fill="url(#comet)"/>` +
      `<circle cx="${lineX}" cy="${top}" r="9" fill="${t.accent}" opacity="0.25"/><circle cx="${lineX}" cy="${top}" r="4.5" fill="${t.accent}"/></g>`,
    `<defs><linearGradient id="comet" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.accent}" stop-opacity="0"/><stop offset="1" stop-color="${t.accent}" stop-opacity="0.9"/></linearGradient></defs>`,
    beam(t, W, H, 22, { dur: 12, begin: 1, len: 80 }),
  );
  const css = `
    .rail{animation:draw 1.6s ease-out both}
    @keyframes draw{from{stroke-dashoffset:100}to{stroke-dashoffset:0}}
    .ping{transform-box:fill-box;transform-origin:center;animation:ping 2.4s ease-out infinite}
    @keyframes ping{0%{transform:scale(1);opacity:.6}100%{transform:scale(2.4);opacity:0}}
    @media (prefers-reduced-motion: reduce){.rail,.ping{animation:none}}
  `;
  const desc = experience.map((j) => `${j.role}, ${j.company}, ${j.place}, ${j.dates}. ${j.notes.join(" ")}`).join(" ");
  return doc({ width: W, height: H, title: "Experience", desc, css, body: [card(t, W, H), ...parts].join("\n") });
}

export function skillsCard(t) {
  const parts = [heading(t, "Skills", 74, "rated against evidence")];
  const note = "Strong means production use on my own, working means I've shipped something real with it, and familiar means coursework or tutorials. I don't round up.";
  let y = 124;
  wrap(note, "text", 19, W - PAD * 2).forEach((ln) => {
    parts.push(text(ln, "text", 19, PAD, y, t.muted).svg);
    y += 29;
  });
  y += 26;
  const colX = PAD + 170;
  const maxX = W - PAD;
  const size = 19;
  const h = 44;
  let n = 0;
  for (const [level, names] of Object.entries(skills)) {
    parts.push(label(level, 15, PAD, y + 28, level === "strong" ? t.accentInk : t.muted).svg);
    let x = colX;
    names.forEach((name) => {
      const w = measure(name, "text", size) + 36;
      if (x + w > maxX) {
        x = colX;
        y += h + 12;
      }
      const style = {
        strong: { fill: t.accent, stroke: t.accent, ink: t.accentFg },
        working: { fill: t.elev, stroke: t.strong, ink: t.fg },
        familiar: { fill: "none", stroke: t.line, ink: t.muted },
      }[level];
      const halo =
        level === "strong"
          ? `<rect class="halo" x="${r1(x - 5)}" y="${y - 5}" width="${r1(w + 10)}" height="${h + 10}" rx="${h / 2 + 5}" fill="none" stroke="${t.accent}" stroke-width="2" opacity="0"/>`
          : "";
      parts.push(
        `<g class="chip" style="animation-delay:${r1(0.15 + n * 0.05)}s">${halo}<rect x="${r1(x)}" y="${y}" width="${r1(w)}" height="${h}" rx="${h / 2}" fill="${style.fill}" stroke="${style.stroke}" stroke-width="2"/>` +
          `${text(name, "text", size, x + 18, y + 29, style.ink).svg}</g>`,
      );
      x += w + 12;
      n += 1;
    });
    y += h + 30;
  }
  const H = y + 14;
  parts.push(sheen("ss", W, H, 22, { dur: 6.5, begin: 2.2, opacity: 0.09 }), beam(t, W, H, 22, { dur: 10, begin: 1.4, len: 90 }));
  const css = `
    .chip{transform-box:fill-box;transform-origin:center;animation:pop .5s cubic-bezier(.2,.9,.3,1.3) both}
    @keyframes pop{from{opacity:0;transform:scale(.86)}to{opacity:1;transform:scale(1)}}
    .halo{animation:halo 2.6s ease-in-out infinite}
    @keyframes halo{0%,100%{opacity:0}50%{opacity:.7}}
    @media (prefers-reduced-motion: reduce){.chip,.halo{animation:none}}
  `;
  const desc = `${note} Strong: ${skills.strong.join(", ")}. Working: ${skills.working.join(", ")}. Familiar: ${skills.familiar.join(", ")}.`;
  return doc({ width: W, height: H, title: "Skills", desc, css, body: [card(t, W, H), ...parts].join("\n") });
}

export function educationCard(t) {
  const parts = [heading(t, "Education", 74, "certifications")];
  const split = 770;
  parts.push(`<path d="M${split - 34} 112V${112 + education.length * 92 - 20}" stroke="${t.line}" stroke-width="2"/>`);
  let y = 134;
  education.forEach((e) => {
    parts.push(text(e.title, "display", 21, PAD, y, t.fg, { tracking: -0.3 }).svg);
    parts.push(text(e.school, "text", 17, PAD, y + 26, t.muted).svg);
    const when = label(e.when, 13, PAD, y + 52, t.muted);
    parts.push(when.svg);
    parts.push(label(e.result, 13, PAD + when.width + 22, y + 52, e.highlight ? t.accentInk : t.fg).svg);
    y += 92;
  });
  let cy = 134;
  certifications.forEach((c, i) => {
    parts.push(
      `<path class="tick" d="M${split} ${cy - 7}l5 5l10 -11" fill="none" stroke="${t.accent}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" pathLength="100" stroke-dasharray="100 100" style="animation-delay:${r1(0.6 + i * 0.25)}s"/>`,
    );
    parts.push(text(c.name, "text", 18, split + 28, cy, t.fg).svg);
    parts.push(label(`${c.issuer} · ${c.date}`, 12, split + 28, cy + 24, t.muted).svg);
    cy += 72;
  });
  // IIIT Bangalore: 96.25% as a ring that fills.
  const rx = split - 90;
  const ry = 134 + 92 + 14;
  const R = 26;
  parts.push(
    `<circle cx="${rx}" cy="${ry}" r="${R}" fill="none" stroke="${t.line}" stroke-width="6"/>`,
    `<circle class="gauge" cx="${rx}" cy="${ry}" r="${R}" fill="none" stroke="${t.accent}" stroke-width="6" stroke-linecap="round" pathLength="100" stroke-dasharray="96.25 100" transform="rotate(-90 ${rx} ${ry})"/>`,
    text("96", "display", 18, rx, ry + 6.5, t.fg, { anchor: "middle" }).svg,
  );
  const H = Math.max(y, cy) + 6;
  parts.push(beam(t, W, H, 22, { dur: 11, begin: 0.9, len: 90 }));
  const css = `
    .tick{animation:draw .5s ease-out both}
    .gauge{animation:fill 1.8s cubic-bezier(.2,.8,.2,1) both .4s}
    @keyframes draw{from{stroke-dashoffset:100}to{stroke-dashoffset:0}}
    @keyframes fill{from{stroke-dashoffset:96.25}to{stroke-dashoffset:0}}
    @media (prefers-reduced-motion: reduce){.tick,.gauge{animation:none}}
  `;
  const desc = `${education.map((e) => `${e.title}, ${e.school}, ${e.when}, ${e.result}.`).join(" ")} Certifications: ${certifications.map((c) => `${c.name}, ${c.issuer}, ${c.date}`).join("; ")}.`;
  return doc({ width: W, height: H, title: "Education and certifications", desc, css, body: [card(t, W, H), ...parts].join("\n") });
}

export function colophonCard(t) {
  const lines = [
    "The header is the Swiss roll from my portfolio's hero: it unrolls into a flat sheet, scatters into noise and rolls back up.",
    "The terminal and the contribution graph are redrawn every morning from live data. Every figure here is drawn by the scripts in this repo.",
  ];
  const parts = [];
  let y = 54;
  lines.forEach((ln) => {
    parts.push(text(ln, "text", 17, W / 2, y, t.muted, { anchor: "middle" }).svg);
    y += 30;
  });
  const H = y + 14;
  parts.push(sheen("cs", W, H, 18, { dur: 8, begin: 2, opacity: 0.08 }), beam(t, W, H, 18, { dur: 9, begin: 1.2, len: 120 }));
  return doc({ width: W, height: H, title: "How this page is made", desc: lines.join(" "), body: [card(t, W, H, 18), ...parts].join("\n") });
}
