// My contribution graph, drawn like GitHub's own (same palette, layout and
// labels, from the GraphQL calendar), with a snake that runs through it.
//
// The loop: the cells pop in, a fire-coloured snake comes out of a portal,
// slithers through every day of the year and paints it green, eats each day I
// actually contributed (and grows), dives into a second portal, a shine
// crosses the now-green map, and the graph fades back to the real data.
// With no animation running, the image is just the real graph.
//
//   GITHUB_TOKEN=... node scripts/contrib.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { USER } from "./data.mjs";
import { doc, r1 } from "./lib/svg.mjs";
import { measure, textRun } from "./lib/text.mjs";

const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const CACHE = new URL("./cache/calendar.json", import.meta.url);

async function calendar() {
  try {
    if (!TOKEN) throw new Error("no token");
    const query = `query { user(login: "${USER}") { contributionsCollection { contributionCalendar { totalContributions weeks { contributionDays { date weekday contributionCount contributionLevel } } } } } }`;
    const res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(20000),
    });
    const json = await res.json();
    const cal = json.data.user.contributionsCollection.contributionCalendar;
    writeFileSync(CACHE, `${JSON.stringify(cal)}\n`);
    return cal;
  } catch (error) {
    console.warn(`calendar: using the cached copy (${error.message})`);
    return JSON.parse(readFileSync(CACHE, "utf8"));
  }
}

// GitHub's own colours, read from the profile page in October 2026.
const THEMES = {
  light: {
    name: "light",
    cells: ["#eff2f5", "#aceebb", "#4ac26b", "#2da44e", "#116329"],
    cellStroke: "rgb(31 35 40 / 0.06)",
    bg: "#ffffff",
    line: "#d1d9e0",
    fg: "#1f2328",
    muted: "#59636e",
    snack: "#bf5a00",
    portal: "#8250df",
  },
  dark: {
    name: "dark",
    cells: ["#151b23", "#033a16", "#196c2e", "#2ea043", "#56d364"],
    cellStroke: "rgb(240 246 252 / 0.04)",
    bg: "#0d1117",
    line: "#3d444d",
    fg: "#f0f6fc",
    muted: "#9198a1",
    snack: "#ffd84d",
    portal: "#a371f7",
  },
};
const LEVEL = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };

const P = 24; // seconds per loop
const T_IN = 1.7; // snake leaves the first portal
const T_OUT = 16.2; // head reaches the second portal
const T_SHINE = [16.6, 18.0];
const T_RESTORE = [18.4, 22.0];
const W = 1280;
const CELL = 16;
const GAP = 5;
const PITCH = CELL + GAP;
const kt = (seconds) => Math.round((seconds / P) * 100000) / 100000;

/** Smooth value noise in [0, 1) so the painted greens look like a lived-in graph. */
function noise(x, y) {
  const h = (i, j) => {
    let n = Math.imul(i * 374761393 + j * 668265263, 1274126177) >>> 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177) >>> 0;
    return (n % 10000) / 10000;
  };
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const s = (t) => t * t * (3 - 2 * t);
  const a = h(xi, yi) + (h(xi + 1, yi) - h(xi, yi)) * s(fx);
  const b = h(xi, yi + 1) + (h(xi + 1, yi + 1) - h(xi, yi + 1)) * s(fx);
  return a + (b - a) * s(fy);
}

function paintLevel(col, row) {
  const v = 0.6 * noise(col / 3.2, row / 2.4) + 0.4 * noise(col / 1.3 + 17, row / 1.1 + 5);
  return v < 0.3 ? 1 : v < 0.52 ? 2 : v < 0.74 ? 3 : 4;
}

/** Arc length of a polyline sampled from `fn(t)` for t in [0, 1]. */
function arcLength(fn, steps = 64) {
  let len = 0;
  let [px, py] = fn(0);
  for (let i = 1; i <= steps; i += 1) {
    const [x, y] = fn(i / steps);
    len += Math.hypot(x - px, y - py);
    px = x;
    py = y;
  }
  return len;
}

const quad = (a, c, b) => (t) => [
  (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0],
  (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1],
];
const cubic = (a, c1, c2, b) => (t) => [
  (1 - t) ** 3 * a[0] + 3 * (1 - t) ** 2 * t * c1[0] + 3 * (1 - t) * t * t * c2[0] + t ** 3 * b[0],
  (1 - t) ** 3 * a[1] + 3 * (1 - t) ** 2 * t * c1[1] + 3 * (1 - t) * t * t * c2[1] + t ** 3 * b[1],
];

function build(cal) {
  const weeks = cal.weeks;
  const gridW = weeks.length * PITCH - GAP;
  const x0 = Math.round((W - gridW) / 2 + 18);
  const y0 = 122;
  const center = (col, row) => [x0 + col * PITCH + CELL / 2, y0 + row * PITCH + CELL / 2];

  const cells = [];
  weeks.forEach((week, col) => {
    week.contributionDays.forEach((day) => {
      cells.push({ col, row: day.weekday, level: LEVEL[day.contributionLevel] ?? 0, count: day.contributionCount, date: day.date });
    });
  });

  // Serpentine order: down the even weeks, up the odd ones.
  const order = [...cells].sort((a, b) => a.col - b.col || (a.col % 2 === 0 ? a.row - b.row : b.row - a.row));

  // Path through every cell centre with a gentle wiggle, U-turns between weeks,
  // and a lead-in from portal A and a lead-out into portal B.
  const segs = [];
  const first = center(order[0].col, order[0].row);
  const portalA = [first[0], first[1] - 46];
  segs.push({ d: `L${r1(first[0])} ${r1(first[1])}`, len: 46 });
  order[0].s = 46;
  let total = 46;
  for (let i = 1; i < order.length; i += 1) {
    const a = center(order[i - 1].col, order[i - 1].row);
    const b = center(order[i].col, order[i].row);
    let seg;
    if (order[i].col === order[i - 1].col) {
      const wig = (i % 2 === 0 ? 1 : -1) * 6;
      const c = [a[0] + wig, (a[1] + b[1]) / 2];
      seg = { d: `Q${r1(c[0])} ${r1(c[1])} ${r1(b[0])} ${r1(b[1])}`, len: arcLength(quad(a, c, b)) };
    } else {
      const down = order[i - 1].col % 2 === 0; // the even week ran downwards, so the turn bulges below
      const k = (down ? 1 : -1) * PITCH * 0.75;
      const c1 = [a[0], a[1] + k];
      const c2 = [b[0], b[1] + k];
      seg = {
        d: `C${r1(c1[0])} ${r1(c1[1])} ${r1(c2[0])} ${r1(c2[1])} ${r1(b[0])} ${r1(b[1])}`,
        len: arcLength(cubic(a, c1, c2, b)),
      };
    }
    segs.push(seg);
    total += seg.len;
    order[i].s = total;
  }
  const lastCell = order.at(-1);
  const last = center(lastCell.col, lastCell.row);
  const outDir = lastCell.col % 2 === 0 ? 1 : -1;
  const portalB = [last[0], last[1] + outDir * 46];
  segs.push({ d: `L${r1(portalB[0])} ${r1(portalB[1])}`, len: 46 });
  total += 46;
  const pathD = `M${r1(portalA[0])} ${r1(portalA[1])}${segs.map((s) => s.d).join("")}`;

  // Timeline: constant speed from portal A to portal B.
  const v = total / (T_OUT - T_IN);
  const tAt = (s) => T_IN + s / v;
  const snacks = order.filter((c) => c.level > 0);
  const L0 = PITCH * 4;
  const GROW = PITCH * 1.6;
  const Lf = L0 + GROW * snacks.length;
  const tTailGone = T_OUT + Lf / v;

  return { cells, order, snacks, x0, y0, gridW, pathD, total, v, tAt, L0, GROW, Lf, tTailGone, portalA, portalB, center };
}

function render(t, cal, g) {
  const H = 340;
  const N = 10000; // pathLength units
  const u = (px) => r1((px / g.total) * N);
  const parts = [];

  parts.push(
    `<defs>` +
      `<linearGradient id="fire" gradientUnits="userSpaceOnUse" x1="${g.x0}" y1="0" x2="${g.x0 + g.gridW}" y2="0">` +
      `<stop offset="0" stop-color="#ff2e88"/><stop offset="0.35" stop-color="#ff4d2e"/><stop offset="0.7" stop-color="#ff9a1f"/><stop offset="1" stop-color="#ffd23f"/></linearGradient>` +
      `<radialGradient id="head" cx="35%" cy="35%" r="75%"><stop offset="0" stop-color="#fff1b8"/><stop offset="0.45" stop-color="#ffb13d"/><stop offset="1" stop-color="#ff4d2e"/></radialGradient>` +
      `<linearGradient id="shine" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
      `<filter id="blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter>` +
      `<clipPath id="grid"><rect x="${g.x0 - 4}" y="${g.y0 - 4}" width="${g.gridW + 8}" height="${7 * PITCH - GAP + 8}"/></clipPath>` +
      `</defs>`,
    `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="14" fill="${t.bg}" stroke="${t.line}" stroke-width="2"/>`,
  );

  // Header: the real total, like GitHub's heading, and the figure label.
  const title = `${cal.totalContributions} contributions in the last year`;
  const tr = textRun(title, "text", 22, 48, 64);
  parts.push(`<g fill="${t.fg}" transform="${tr.transform}">${tr.uses}</g>`);
  const fig = textRun("FIG. 5 · A SNAKE PAINTS EVERY DAY IT PASSES", "mono", 14, W - 48, 62, { tracking: 1.7, anchor: "end" });
  parts.push(`<g fill="${t.muted}" transform="${fig.transform}">${fig.uses}</g>`);

  // Month and weekday labels.
  let lastLabelCol = -9;
  cal.weeks.forEach((week, col) => {
    const firstDay = week.contributionDays[0];
    const month = new Date(`${firstDay.date}T00:00:00Z`).getUTCMonth();
    const prev = col > 0 ? new Date(`${cal.weeks[col - 1].contributionDays[0].date}T00:00:00Z`).getUTCMonth() : -1;
    if (month !== prev && col - lastLabelCol >= 3 && col < cal.weeks.length - 1) {
      const name = new Date(Date.UTC(2000, month, 1)).toLocaleString("en-US", { month: "short", timeZone: "UTC" });
      const run = textRun(name, "text", 15, g.x0 + col * PITCH, g.y0 - 14);
      parts.push(`<g fill="${t.fg}" transform="${run.transform}">${run.uses}</g>`);
      lastLabelCol = col;
    }
  });
  [
    [1, "Mon"],
    [3, "Wed"],
    [5, "Fri"],
  ].forEach(([row, name]) => {
    const run = textRun(name, "text", 14, g.x0 - 12, g.y0 + row * PITCH + 12.5, { anchor: "end" });
    parts.push(`<g fill="${t.fg}" transform="${run.transform}">${run.uses}</g>`);
  });

  // The cells: the real level, painted when the head passes, restored in the same order.
  const rank = new Map(g.order.map((c, i) => [c, i]));
  const cellsSvg = g.cells
    .map((c) => {
      const x = g.x0 + c.col * PITCH;
      const y = g.y0 + c.row * PITCH;
      const base = t.cells[c.level];
      const tc = g.tAt(c.s);
      const delay = r1((c.col + c.row) * 0.022);
      let values;
      let times;
      if (c.level > 0) {
        values = [base, base, t.snack, base, base];
        times = [0, kt(tc), kt(tc + 0.12), kt(tc + 0.6), 1];
      } else {
        const paint = t.cells[paintLevel(c.col, c.row)];
        const tr0 = T_RESTORE[0] + (rank.get(c) / g.order.length) * (T_RESTORE[1] - T_RESTORE[0]);
        values = [base, base, paint, paint, base, base];
        times = [0, kt(tc), kt(tc + 0.28), kt(tr0), kt(tr0 + 0.45), 1];
      }
      return (
        `<rect class="c" x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="3" fill="${base}" style="animation-delay:${delay}s">` +
        `<animate attributeName="fill" dur="${P}s" repeatCount="indefinite" keyTimes="${times.join(";")}" values="${values.join(";")}"/></rect>`
      );
    })
    .join("");
  parts.push(`<g>${cellsSvg}</g>`);

  // Shine across the finished green map.
  const gh = 7 * PITCH - GAP;
  parts.push(
    `<g clip-path="url(#grid)"><rect x="${g.x0 - 320}" y="${g.y0 - 30}" width="260" height="${gh + 60}" fill="url(#shine)" transform="skewX(-18)">` +
      `<animate attributeName="x" dur="${P}s" repeatCount="indefinite" keyTimes="0;${kt(T_SHINE[0])};${kt(T_SHINE[1])};1" values="${g.x0 - 320};${g.x0 - 320};${g.x0 + g.gridW + 200};${g.x0 + g.gridW + 200}"/>` +
      `</rect></g>`,
  );

  // Portals the snake comes out of and dives into.
  const portal = ([x, y], open, close) =>
    `<g opacity="0"><animate attributeName="opacity" dur="${P}s" repeatCount="indefinite" keyTimes="0;${kt(open - 0.4)};${kt(open)};${kt(close)};${kt(close + 0.5)};1" values="0;0;1;1;0;0"/>` +
    `<ellipse cx="${r1(x)}" cy="${r1(y)}" rx="17" ry="17" fill="${t.portal}" opacity="0.18" filter="url(#blur)"/>` +
    `<circle class="spin" cx="${r1(x)}" cy="${r1(y)}" r="12" fill="${t.bg}" stroke="${t.portal}" stroke-width="3" stroke-dasharray="9 5"/>` +
    `<circle cx="${r1(x)}" cy="${r1(y)}" r="6" fill="${t.portal}" opacity="0.55"/></g>`;
  parts.push(portal(g.portalA, T_IN, T_IN + 2.2), portal(g.portalB, T_OUT - 1.5, g.tTailGone));

  // The body: a glow, the fire-gradient tube and a highlight, all one moving dash.
  const growTimes = g.snacks.map((c) => g.tAt(c.s));
  const lens = [g.L0, ...g.snacks.map((_, i) => g.L0 + g.GROW * (i + 1))];
  const dashArray = `<animate attributeName="stroke-dasharray" dur="${P}s" repeatCount="indefinite" calcMode="discrete" keyTimes="0;${growTimes.map(kt).join(";")}" values="${lens.map((l) => `${u(l)} 20000`).join(";")}"/>`;
  const offTimes = [0, kt(T_IN)];
  const offValues = [u(g.L0), u(g.L0)];
  let L = g.L0;
  g.snacks.forEach((c) => {
    const time = kt(g.tAt(c.s));
    offTimes.push(time, Math.min(time + 0.00002, 1));
    offValues.push(u(L) - u(c.s), u(L + g.GROW) - u(c.s));
    L += g.GROW;
  });
  offTimes.push(kt(g.tTailGone), 1);
  offValues.push(u(L) - u(g.total + L), u(L) - u(g.total + L));
  const dashOffset = `<animate attributeName="stroke-dashoffset" dur="${P}s" repeatCount="indefinite" keyTimes="${offTimes.join(";")}" values="${offValues.map(r1).join(";")}"/>`;
  const body = (stroke, width, extra = "") =>
    `<path d="${g.pathD}" pathLength="${N}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="0 20000" ${extra}>${dashArray}${dashOffset}</path>`;
  parts.push(body("#ff6a1f", 26, `opacity="0.38" filter="url(#blur)"`), body("url(#fire)", 14), body("#fff6cf", 4, `opacity="0.75"`));

  // The head: eyes forward, flicking tongue, rides the same path.
  parts.push(
    `<g opacity="0"><animate attributeName="opacity" dur="${P}s" repeatCount="indefinite" calcMode="discrete" keyTimes="0;${kt(T_IN)};${kt(T_OUT)}" values="0;1;0"/>` +
      `<animateMotion dur="${P}s" repeatCount="indefinite" calcMode="linear" rotate="auto" keyTimes="0;${kt(T_IN)};${kt(T_OUT)};1" keyPoints="0;0;1;1" path="${g.pathD}"/>` +
      `<path class="tongue" d="M12 0H21M21 0L25 -3M21 0L25 3" fill="none" stroke="#ff2e63" stroke-width="2.2" stroke-linecap="round"/>` +
      `<ellipse rx="13.5" ry="11" fill="url(#head)"/>` +
      `<circle cx="3.5" cy="-5" r="3.4" fill="#fff"/><circle cx="4.9" cy="-5" r="1.8" fill="#111"/>` +
      `<circle cx="3.5" cy="5" r="3.4" fill="#fff"/><circle cx="4.9" cy="5" r="1.8" fill="#111"/>` +
      `</g>`,
  );

  // Each real contribution day: a ring burst and a "+N" that floats up.
  g.snacks.forEach((c) => {
    const [x, y] = g.center(c.col, c.row);
    const t0 = g.tAt(c.s);
    parts.push(
      `<circle cx="${r1(x)}" cy="${r1(y)}" r="6" fill="none" stroke="${t.snack}" stroke-width="3" opacity="0">` +
        `<animate attributeName="r" dur="${P}s" repeatCount="indefinite" keyTimes="0;${kt(t0)};${kt(t0 + 0.7)};1" values="6;6;30;30"/>` +
        `<animate attributeName="opacity" dur="${P}s" repeatCount="indefinite" keyTimes="0;${kt(t0)};${kt(t0 + 0.02)};${kt(t0 + 0.7)};1" values="0;0;1;0;0"/></circle>`,
    );
    const str = `+${c.count}`;
    const label = textRun(str, "mono", 16, 0, 5.5, { anchor: "middle" });
    const pw = measure(str, "mono", 16) + 16;
    const rise = (from, to) => `${r1(x)} ${r1(y - from)}`;
    parts.push(
      `<g opacity="0"><animate attributeName="opacity" dur="${P}s" repeatCount="indefinite" keyTimes="0;${kt(t0)};${kt(t0 + 0.15)};${kt(t0 + 1.1)};${kt(t0 + 1.4)};1" values="0;0;1;1;0;0"/>` +
        `<animateTransform attributeName="transform" type="translate" dur="${P}s" repeatCount="indefinite" keyTimes="0;${kt(t0)};${kt(t0 + 1.4)};1" values="${rise(16)};${rise(16)};${rise(40)};${rise(40)}"/>` +
        `<rect x="${r1(-pw / 2)}" y="-11" width="${r1(pw)}" height="22" rx="11" fill="${t.bg}" stroke="${t.snack}" stroke-width="2"/>` +
        `<g fill="${t.snack}" transform="${label.transform}">${label.uses}</g></g>`,
    );
  });

  // Legend, as on GitHub.
  const ly = g.y0 + gh + 40;
  const more = textRun("More", "text", 15, W - 48, ly + 13, { anchor: "end" });
  const moreW = measure("More", "text", 15);
  const sq0 = W - 48 - moreW - 10 - 5 * (CELL + 4);
  const less = textRun("Less", "text", 15, sq0 - 10, ly + 13, { anchor: "end" });
  parts.push(`<g fill="${t.muted}" transform="${less.transform}">${less.uses}</g>`, `<g fill="${t.muted}" transform="${more.transform}">${more.uses}</g>`);
  t.cells.forEach((fill, i) => parts.push(`<rect x="${sq0 + i * (CELL + 4)}" y="${ly}" width="${CELL}" height="${CELL}" rx="3" fill="${fill}" class="lg"/>`));
  const note = textRun(`${g.snacks.length} days eaten, ${g.cells.length - g.snacks.length} painted`, "text", 15, 48, ly + 13);
  parts.push(`<g fill="${t.muted}" transform="${note.transform}">${note.uses}</g>`);

  const css = `
    .c,.lg{stroke:${t.cellStroke};stroke-width:1}
    .c{transform-box:fill-box;transform-origin:center;animation:pop ${P}s cubic-bezier(.2,.9,.3,1.35) infinite backwards}
    @keyframes pop{0%{transform:scale(.15);opacity:0}2.6%{transform:scale(1);opacity:1}100%{transform:scale(1);opacity:1}}
    .tongue{transform-box:fill-box;transform-origin:0 50%;animation:flick .9s ease-in-out infinite}
    @keyframes flick{0%,40%,100%{transform:scaleX(0)}55%,80%{transform:scaleX(1)}}
    .spin{transform-box:fill-box;transform-origin:center;animation:spin 1.6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    @media (prefers-reduced-motion: reduce){.c,.tongue,.spin{animation:none}}
  `;
  const desc = `My contribution graph for the last year: ${cal.totalContributions} contributions on ${g.snacks.length} days. In the animation a snake slithers through every day, eats the ${g.snacks.length} days I contributed and grows, paints the rest green, then the graph fades back to the real data.`;
  return doc({ width: W, height: H, title: title, desc, css, body: parts.join("\n") });
}

const cal = await calendar();
const now = new Date();
const geometry = build(cal);
for (const t of Object.values(THEMES)) {
  const svg = render(t, cal, geometry);
  writeFileSync(new URL(`../assets/contrib-${t.name}.svg`, import.meta.url), svg);
  console.log(`contrib-${t.name}.svg ${(svg.length / 1024).toFixed(1)} KB`);
}
console.log(`${cal.totalContributions} contributions, ${geometry.snacks.length} active days, path ${Math.round(geometry.total)} px`);

// README: alt text with today's numbers, and a stamp so GitHub fetches the new image.
const readmeUrl = new URL("../README.md", import.meta.url);
const readme = readFileSync(readmeUrl, "utf8");
const stamp = now.toISOString().slice(0, 16).replace(/\D/g, "");
const alt = `My contribution graph for the last year: ${cal.totalContributions} contributions on ${geometry.snacks.length} days. A snake slithers through every day, eats the ${geometry.snacks.length} days I contributed and grows, paints the rest green, then the graph fades back to the real data.`;
// The <a> stays alone on its line so GitHub keeps the block as raw HTML.
const block = `<!-- CONTRIB:START -->
<a href="https://github.com/${USER}">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/contrib-dark.svg?v=${stamp}">
    <img alt="${alt}" src="./assets/contrib-light.svg?v=${stamp}" width="100%">
  </picture>
</a>
<!-- CONTRIB:END -->`;
const next = readme.replace(/<!-- CONTRIB:START -->[\s\S]*?<!-- CONTRIB:END -->/, block);
if (next === readme && !readme.includes(block)) throw new Error("README has no CONTRIB block");
writeFileSync(readmeUrl, next);
