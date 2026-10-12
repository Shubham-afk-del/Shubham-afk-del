// The card that changes every day: the assistant's latest committed eval
// numbers, my latest commits across public repos, and live checks on the
// assistant's deploy, its CI and both sites. Rewrites assets/live-*.svg and the
// LIVE block in README.md (alt text and a cache-busting stamp).
//
//   GITHUB_TOKEN=... node scripts/live.mjs     (the token is optional locally)

import { readFileSync, writeFileSync } from "node:fs";
import { USER, evals, links, shortDate } from "./data.mjs";
import { THEMES, card, doc, label, text } from "./lib/svg.mjs";
import { fit } from "./lib/text.mjs";

const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const NAMES = {
  "LR_Delivery_Time_Prediction_-Shubham-Kumar-Singh-": "delivery-time",
  EDA_Optimising_NYC_Taxis_Shubham_Kumar_Singh: "nyc-taxis",
  Notes_App_AE2: "notes-app",
};

async function gh(path) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      ...(TOKEN ? { authorization: `Bearer ${TOKEN}` } : {}),
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

/** Run a check; a failure becomes a visible "unavailable" instead of a crash. */
async function attempt(name, fn, fallback) {
  try {
    return await fn();
  } catch (error) {
    console.warn(`${name}: ${error.message}`);
    return fallback;
  }
}

async function latestCommits(count) {
  const repos = (await gh(`/users/${USER}/repos?type=owner&sort=pushed&per_page=30`))
    .filter((r) => !r.fork && !r.private && r.name !== USER)
    .slice(0, 6);
  const lists = await Promise.all(
    repos.map(async (repo) =>
      (await gh(`/repos/${USER}/${repo.name}/commits?per_page=10`))
        .filter((c) => c.author?.login === USER && !c.commit.message.startsWith("Merge "))
        .map((c) => ({
          date: c.commit.author.date,
          repo: NAMES[repo.name] ?? repo.name,
          subject: c.commit.message.split("\n")[0].trim(),
        })),
    ),
  );
  return lists
    .flat()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, count);
}

async function assistantDeploy() {
  const [deploy] = await gh(`/repos/${USER}/portfolio-assistant/deployments?environment=Production&per_page=1`);
  const [status] = await gh(`/repos/${USER}/portfolio-assistant/deployments/${deploy.id}/statuses?per_page=1`);
  return { ok: status.state === "success", date: status.created_at };
}

async function assistantCI() {
  const { workflow_runs: [run] } = await gh(
    `/repos/${USER}/portfolio-assistant/actions/workflows/ci.yml/runs?branch=main&status=completed&per_page=1`,
  );
  return { ok: run.conclusion === "success" };
}

async function online(url) {
  const res = await fetch(url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(15000) });
  return { ok: res.ok };
}

const now = new Date();
const [e, commits, deploy, ci, portfolio] = await Promise.all([
  evals(),
  attempt("commits", () => latestCommits(4), []),
  attempt("deploy", assistantDeploy, null),
  attempt("ci", assistantCI, null),
  attempt("portfolio", () => online(links.portfolio), null),
]);

const day = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" });
const londonTime = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });

const metrics = [
  [e.recall10.toFixed(2), "recall@10, hybrid + rerank"],
  [`${e.passed}/${e.cases}`, "answer checks passed"],
  [e.injections, "prompt injections resisted"],
  [`${(e.firstWordP50 / 1000).toFixed(1)} s`, "to the first word, median"],
];

const statuses = [
  deploy ? [deploy.ok, deploy.ok ? `assistant deployed ${day(deploy.date)}` : "assistant deploy failed"] : [false, "assistant deploy unknown"],
  ci ? [ci.ok, ci.ok ? "assistant CI passing" : "assistant CI failing"] : [false, "assistant CI unknown"],
  portfolio ? [portfolio.ok, portfolio.ok ? "portfolio online" : "portfolio unreachable"] : [false, "portfolio unknown"],
];

function liveCard(t) {
  const W = 1280;
  const H = 516;
  const pad = 64;
  const parts = [card(t, W, H)];

  parts.push(`<circle cx="${pad + 6}" cy="68" r="6" fill="${t.accent}"/>`);
  parts.push(`<circle class="ping" cx="${pad + 6}" cy="68" r="6" fill="none" stroke="${t.accent}" stroke-width="2" opacity="0.6"/>`);
  parts.push(label("Updated every day", 16, pad + 24, 74, t.fg).svg);
  parts.push(label(`${shortDate(now.toISOString())}, ${londonTime} London`, 16, W - pad, 74, t.muted, { anchor: "end" }).svg);
  parts.push(`<path d="M${pad} 104H${W - pad}" stroke="${t.line}" stroke-width="2"/>`);

  // Left: the assistant, measured.
  parts.push(label("The assistant, measured", 14, pad, 152, t.muted).svg);
  metrics.forEach(([value, name], i) => {
    const x = pad + (i % 2) * 280;
    const y = 222 + Math.floor(i / 2) * 104;
    parts.push(text(value, "display", 46, x - 2, y, t.fg, { tracking: -1 }).svg);
    parts.push(label(name, 13, x, y + 30, t.muted).svg);
  });
  parts.push(label(`evals/results.json · run ${shortDate(e.measuredAt)}`, 13, pad, 404, t.accentInk).svg);

  // Right: latest commits.
  const rx = 668;
  const rw = W - pad - rx;
  parts.push(`<path d="M632 136V412" stroke="${t.line}" stroke-width="2"/>`);
  parts.push(label("Latest commits", 14, rx, 152, t.muted).svg);
  if (commits.length === 0) {
    parts.push(text("Unavailable right now.", "text", 20, rx, 200, t.muted).svg);
  }
  commits.forEach((c, i) => {
    const y = 190 + i * 62;
    const d = label(day(c.date), 13, rx, y, t.muted);
    parts.push(d.svg);
    parts.push(label(c.repo, 13, rx + d.width + 14, y, t.accentInk).svg);
    parts.push(text(fit(c.subject, "text", 20, rw), "text", 20, rx, y + 28, t.fg).svg);
  });

  // Bottom: live checks.
  parts.push(`<path d="M${pad} 440H${W - pad}" stroke="${t.line}" stroke-width="2"/>`);
  let sx = pad;
  statuses.forEach(([ok, str]) => {
    parts.push(
      ok
        ? `<circle cx="${sx + 6}" cy="474" r="6" fill="${t.accent}"/>`
        : `<circle cx="${sx + 6}" cy="474" r="5" fill="none" stroke="${t.muted}" stroke-width="2"/>`,
    );
    const l = label(str, 13, sx + 22, 479, ok ? t.fg : t.muted);
    parts.push(l.svg);
    sx += 22 + l.width + 44;
  });

  const css = `
    .ping{transform-box:fill-box;transform-origin:center;animation:ping 2.4s ease-out infinite}
    @keyframes ping{0%{transform:scale(1);opacity:.6}100%{transform:scale(2.4);opacity:0}}
    @media (prefers-reduced-motion: reduce){.ping{animation:none}}
  `;
  return doc({ width: W, height: H, title: "Updated every day", desc: altText(), css, body: parts.join("\n") });
}

function altText() {
  const m = `The assistant, measured ${shortDate(e.measuredAt)}: recall at 10 of ${e.recall10.toFixed(2)} with hybrid search and reranking, ${e.passed} of ${e.cases} answer checks passed, ${e.injections.replace("/", " of ")} prompt injections resisted, first word after ${(e.firstWordP50 / 1000).toFixed(1)} seconds at the median.`;
  const c = commits.length ? ` Latest commits: ${commits.map((x) => `${day(x.date)}, ${x.repo}: ${x.subject}`).join("; ")}.` : "";
  const checks = statuses.map(([, str]) => str).join(", ");
  const s = ` ${checks[0].toUpperCase()}${checks.slice(1)}.`;
  return `Updated ${shortDate(now.toISOString())}. ${m}${c}${s}`;
}

for (const t of Object.values(THEMES)) {
  const svg = liveCard(t);
  writeFileSync(new URL(`../assets/live-${t.name}.svg`, import.meta.url), svg);
  console.log(`live-${t.name}.svg ${(svg.length / 1024).toFixed(1)} KB`);
}

// README: refresh the alt text and bust GitHub's image cache.
const readmeUrl = new URL("../README.md", import.meta.url);
const readme = readFileSync(readmeUrl, "utf8");
const stamp = now.toISOString().slice(0, 16).replace(/\D/g, "");
const alt = altText().replace(/"/g, "'");
// The <a> stays alone on its line: GitHub's Markdown only keeps the block as
// raw HTML (and the <picture> theme switch working) when it starts that way.
const block = `<!-- LIVE:START -->
<a href="${links.assistantRepo}">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/live-dark.svg?v=${stamp}">
    <img alt="${alt}" src="./assets/live-light.svg?v=${stamp}" width="100%">
  </picture>
</a>
<!-- LIVE:END -->`;
const next = readme.replace(/<!-- LIVE:START -->[\s\S]*?<!-- LIVE:END -->/, block);
if (next === readme && !readme.includes(block)) throw new Error("README has no LIVE block");
writeFileSync(readmeUrl, next);
console.log(altText());
