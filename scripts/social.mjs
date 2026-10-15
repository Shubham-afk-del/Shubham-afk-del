// Link previews: the 1280 x 640 image GitHub shows when someone shares one of
// my repositories. Each one frames the repo's figure from this profile on the
// night card, with the repo's path above it. Writes assets/social/*.svg.
//
//   node scripts/build.mjs && node scripts/social.mjs
//
// GitHub only takes a PNG or JPG, uploaded by hand in each repo's settings, so
// render these to PNG at 1280 x 640 first (any browser screenshot will do).

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { USER } from "./data.mjs";
import { THEMES, card, doc, text } from "./lib/svg.mjs";
import { measure } from "./lib/text.mjs";

const W = 1280;
const H = 640;
const ASSETS = new URL("../assets/", import.meta.url);
const OUT = new URL("../assets/social/", import.meta.url);
mkdirSync(OUT, { recursive: true });

const PREVIEWS = [
  { repo: "portfolio-assistant", figure: "work-assistant" },
  { repo: "Fraudulent-Claim-Detection", figure: "work-fraud" },
  { repo: "Employee-Retention-Prediction", figure: "work-retention" },
  { repo: "Delivery-Time-Prediction", figure: "work-delivery" },
  { repo: "NYC-Taxi-EDA", figure: "work-taxis" },
  { repo: "Farmers-Insurance-SQL", figure: "work-farmers" },
  { repo: USER, figure: "header" },
];

/**
 * A figure's still frame: SMIL removed and CSS animation switched off. The
 * styles themselves stay, since the header's points get their place from CSS.
 */
function still(name) {
  return readFileSync(new URL(`${name}-dark.svg`, ASSETS), "utf8")
    .replace(/<(animate|animateTransform|animateMotion|set)\b[^>]*\/>/g, "")
    .replace("</svg>", "<style>*{animation:none!important}</style></svg>");
}

function preview({ repo, figure }) {
  const t = THEMES.dark;
  const svg = still(figure);
  const [, fw, fh] = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/).map(Number);
  // The figure as an image, so its ids never meet the frame's.
  const scale = Math.min(1100 / fw, 470 / fh);
  const [w, h] = [Math.round(fw * scale), Math.round(fh * scale)];
  const x = Math.round((W - w) / 2);
  const y = 112 + Math.round((470 - h) / 2);
  const href = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

  // The repo's path, centred over the figure: owner in muted, repo in white.
  const size = 30;
  const owner = `${USER} / `;
  const total = measure(owner + repo, "mono", size);
  const left = (W - total) / 2;
  const path =
    text(owner, "mono", size, left, 78, t.muted).svg + text(repo, "mono", size, left + measure(owner, "mono", size), 78, t.fg).svg;

  return doc({
    width: W,
    height: H,
    title: `${USER}/${repo}`,
    desc: `Link preview for ${USER}/${repo}, showing its figure from my GitHub profile.`,
    body: [
      card(t, W, H, 0),
      path,
      `<image href="${href}" x="${x}" y="${y}" width="${w}" height="${h}"/>`,
      `<rect x="${W / 2 - 60}" y="${H - 22}" width="120" height="4" rx="2" fill="${t.accent}"/>`,
    ].join("\n"),
  });
}

for (const p of PREVIEWS) {
  const svg = preview(p);
  writeFileSync(new URL(`${p.repo}.svg`, OUT), svg);
  console.log(`social/${p.repo}.svg ${(svg.length / 1024).toFixed(0)} KB`);
}
