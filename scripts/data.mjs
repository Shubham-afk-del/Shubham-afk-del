// Every fact the profile states. Sources: the portfolio's lib/content.ts (checked
// against certificates and letters), the assistant's evals/results.json, and
// one real answer from the live assistant. Do not add a number that is not on file.

import { readFileSync, writeFileSync } from "node:fs";

export const USER = "Shubham-afk-del";

export const links = {
  portfolio: "https://shubham-kumar-singh.vercel.app",
  assistant: "https://portfolio-assistant-iota.vercel.app",
  assistantRepo: "https://github.com/Shubham-afk-del/portfolio-assistant",
  linkedin: "https://www.linkedin.com/in/shubham-singh-00236a191",
  email: "mailto:shubhamsingh90390@gmail.com",
  cv: "https://shubham-kumar-singh.vercel.app/Shubham-Kumar-Singh-CV.pdf",
};

/** Captured from the live assistant on 12 Oct 2026; citation marks removed as its UI does. */
export const ask = {
  question: "What did he automate at Capgemini?",
  answer:
    "At Capgemini, Shubham automated repetitive reporting tasks in incident tracking and follow-up using Python. He also built a Python tool that used a language model to turn prose access requests into proposed Active Directory account and access changes for his review, which saved roughly 2 to 5 hours of his own time a week.",
  sources: [
    "Putting a language model in front of Active Directory access requests, with me as the approval step",
    "Keep a human approval step between the language model and Active Directory",
    "The seven questions I get asked, and my actual answers",
  ],
  capturedAt: "12 Oct 2026",
};

const EVALS_URL = `https://raw.githubusercontent.com/${USER}/portfolio-assistant/main/evals/results.json`;
const EVALS_CACHE = new URL("./cache/evals.json", import.meta.url);

/** The assistant's committed eval results, reduced to what the profile shows. */
export async function evals() {
  let raw;
  try {
    const res = await fetch(EVALS_URL, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    raw = await res.json();
  } catch (error) {
    console.warn(`evals: using the cached copy (${error.message})`);
    return JSON.parse(readFileSync(EVALS_CACHE, "utf8"));
  }
  const production = raw.retrieval.configurations.find((c) => c.name === "hybrid + rerank");
  const m = raw.answers.metrics;
  const reduced = {
    cases: raw.answers.count,
    passed: m.passed,
    injections: `${m.injectionsResisted.resisted}/${m.injectionsResisted.of}`,
    recall10: production.metrics["recall@10"].mean,
    mrr: production.metrics.MRR.mean,
    firstWordP50: m.latencyMs.firstWord.p50,
    measuredAt: [raw.answers.generatedAt, raw.retrieval.generatedAt].sort().at(-1),
  };
  writeFileSync(EVALS_CACHE, `${JSON.stringify(reduced, null, 2)}\n`);
  return reduced;
}

export const shortDate = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" });
