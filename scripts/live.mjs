// The card that changes every day: the assistant's latest committed eval
// numbers, my latest commits across public repos, and live checks on the
// assistant's deploy, its CI and both sites. Rewrites assets/live-*.svg and the
// LIVE block in README.md (alt text and a cache-busting stamp).
//
//   GITHUB_TOKEN=... node scripts/live.mjs     (the token is optional locally)

import { readFileSync, writeFileSync } from "node:fs";
import { USER, evals, links, shortDate } from "./data.mjs";
import { crt } from "./lib/crt.mjs";
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

/** My newest today-I-learned note, if there is one yet. */
async function latestTil() {
  const months = [0, 1].map((back) => {
    const d = new Date(Date.now() - back * 28 * 86400000);
    const y = d.toLocaleDateString("en-GB", { year: "numeric", timeZone: "Europe/London" });
    const m = d.toLocaleDateString("en-GB", { month: "2-digit", timeZone: "Europe/London" });
    return `${y}-${m}`;
  });
  for (const month of months) {
    const res = await fetch(`https://raw.githubusercontent.com/${USER}/til/main/entries/${month}.md`, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) continue;
    const [, newest] = (await res.text()).split("\n## ");
    if (!newest) continue;
    const [date, ...lines] = newest.split("\n");
    const notes = lines.filter((l) => l.startsWith("- "));
    if (notes.length) return { date: date.trim(), note: notes.at(-1).slice(2) };
  }
  return null;
}

async function online(url) {
  const res = await fetch(url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(15000) });
  return { ok: res.ok };
}

const now = new Date();
const [e, commits, deploy, ci, portfolio, til] = await Promise.all([
  evals(),
  attempt("commits", () => latestCommits(4), []),
  attempt("deploy", assistantDeploy, null),
  attempt("ci", assistantCI, null),
  attempt("portfolio", () => online(links.portfolio), null),
  attempt("til", latestTil, null),
]);

const day = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" });
const londonTime = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });

const statuses = [
  deploy ? [deploy.ok, deploy.ok ? `assistant deployed ${day(deploy.date)}` : "assistant deploy failed"] : [false, "assistant deploy unknown"],
  ci ? [ci.ok, ci.ok ? "assistant CI passing" : "assistant CI failing"] : [false, "assistant CI unknown"],
  portfolio ? [portfolio.ok, portfolio.ok ? "portfolio online" : "portfolio unreachable"] : [false, "portfolio unknown"],
];

// What the terminal prints after `neofetch`. Values stay within 50 characters.
const VALUE_W = 600;
const latest = commits[0];
const live = [
  deploy ? (deploy.ok ? `assistant deployed ${day(deploy.date)}` : "assistant deploy failed") : "assistant unknown",
  ci ? (ci.ok ? "CI passing" : "CI failing") : "CI unknown",
  portfolio ? (portfolio.ok ? "site up" : "site down") : "site unknown",
].join(" · ");
const info = [
  ["Name", "Shubham Kumar Singh"],
  ["Role", "AI & ML Engineer"],
  ["Study", "MSc AI & CS, Northeastern University London"],
  ["Thesis", "Agentic AI and large language models"],
  ["Before", "Capgemini, Tech Mahindra · 3+ yrs enterprise IT"],
  ["Stack", "Python, TypeScript, RAG, LLMs, scikit-learn"],
  ["Evals", `recall@10 ${e.recall10.toFixed(2)} · ${e.passed}/${e.cases} checks · ${e.injections} injections`],
  ["Commit", latest ? fit(`${day(latest.date)} · ${latest.repo} · ${latest.subject}`, "mono", 20, VALUE_W) : "unavailable right now"],
  ["Live", live],
  ...(til ? [["TIL", fit(`${til.date.replace(/ \d{4}$/, "")} · ${til.note}`, "mono", 20, VALUE_W)]] : []),
  ["Open to", "AI/ML internships · full-time from Feb 2027"],
];

function altText() {
  const m = `The assistant, measured ${shortDate(e.measuredAt)}: recall at 10 of ${e.recall10.toFixed(2)} with hybrid search and reranking, ${e.passed} of ${e.cases} answer checks passed, ${e.injections.replace("/", " of ")} prompt injections resisted, first word after ${(e.firstWordP50 / 1000).toFixed(1)} seconds at the median.`;
  const c = commits.length ? ` Latest commits: ${commits.map((x) => `${day(x.date)}, ${x.repo}: ${x.subject}`).join("; ")}.` : "";
  const l = til ? ` Today I learned (${til.date}): ${til.note}` : "";
  const checks = statuses.map(([, str]) => str).join(", ");
  const s = ` ${checks[0].toUpperCase()}${checks.slice(1)}.`;
  return `Updated ${shortDate(now.toISOString())}. ${m}${c}${s}${l}`;
}

for (const theme of ["light", "dark"]) {
  const svg = crt(theme, {
    info,
    stamp: `updated daily · ${shortDate(now.toISOString())}, ${londonTime} London`,
    title: "Updated every day: my terminal running neofetch",
    desc: altText(),
  });
  writeFileSync(new URL(`../assets/live-${theme}.svg`, import.meta.url), svg);
  console.log(`live-${theme}.svg ${(svg.length / 1024).toFixed(1)} KB`);
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
  <img alt="${alt}" src="./assets/live-dark.svg?v=${stamp}" width="100%">
</a>
<!-- LIVE:END -->`;
const next = readme.replace(/<!-- LIVE:START -->[\s\S]*?<!-- LIVE:END -->/, block);
if (next === readme && !readme.includes(block)) throw new Error("README has no LIVE block");
writeFileSync(readmeUrl, next);
console.log(altText());
