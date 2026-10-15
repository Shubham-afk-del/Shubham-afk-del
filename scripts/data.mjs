// Every fact the profile states. Sources: the portfolio's lib/content.ts (checked
// against certificates and letters), the assistant's evals/results.json, and
// one real answer from the live assistant. Do not add a number that is not on file.

import { readFileSync, writeFileSync } from "node:fs";

export const USER = "Shubham-afk-del";

export const links = {
  portfolio: "https://shubham-kumar-singh.vercel.app",
  assistant: "https://portfolio-assistant-iota.vercel.app",
  assistantRepo: "https://github.com/Shubham-afk-del/portfolio-assistant",
  linkedin: "https://www.linkedin.com/in/shubham-kumar-singh-00236a191",
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

/** The about card: his own words from the portfolio, cut to sit beside the numbers. */
export const about = [
  "For three years I was on the other end of the ticket: triaging fifty incidents a day, administering Active Directory and keeping SLAs green for enterprise clients. Near the end I built a Python tool that used a language model to turn prose access requests into directory changes, and I approved every one.",
  "Now I'm doing an MSc in AI and Computer Science at Northeastern University London. My dissertation tests guardrails for LLM agents: if a rule blocks one large refund, does the agent split it into many small ones that each pass?",
  "I'm open to AI and ML internships, including summer 2027 or an MSc placement, and to full-time roles from February 2027.",
];

export const experience = [
  { role: "Campus Ambassador", company: "Northeastern University London", place: "London, UK", dates: "Aug 2026 to now", current: true, notes: ["Campus tours, open days and offer-holder events for prospective students and their families."] },
  {
    role: "Senior Analyst, IT Support",
    company: "Capgemini",
    place: "Noida, India",
    dates: "Jun 2023 to Dec 2025",
    notes: [
      "Managed and prioritised 50+ incidents a day in ServiceNow, consistently meeting SLA targets.",
      "Built a Python tool that used an LLM to turn prose access requests into proposed Active Directory changes for my approval. It saved me 2 to 5 hours a week.",
      "Administered accounts, access permissions and endpoint compliance with Active Directory and Tanium.",
    ],
  },
  { role: "Associate, Technical Support", company: "Tech Mahindra", place: "Noida, India", dates: "Aug 2022 to Jun 2023", notes: ["Support for Netgear and Orbi networking devices, with every case managed in Salesforce CRM."] },
  { role: "Associate, Customer Support", company: "Tech Mahindra", place: "India", dates: "Aug 2021 to May 2022", notes: ["Customer support for the JioMart e-commerce platform in a high-volume contact centre."] },
];

/** Levels are his own, calibrated against evidence on file. Do not round up. */
export const skills = {
  strong: ["ServiceNow", "Active Directory / Tanium"],
  working: ["Python", "RAG", "Large language models", "Agentic AI", "Scikit-learn", "Pandas / NumPy", "SQL", "JavaScript / TypeScript", "Git", "Salesforce CRM"],
  familiar: ["NLP", "PyTorch / TensorFlow", "Docker", "AWS", "C++"],
};

export const education = [
  { title: "MSc Artificial Intelligence & Computer Science", school: "Northeastern University London · dissertation on guardrails for LLM agents", when: "Jan 2026 to Jan 2027", result: "In progress" },
  { title: "Postgraduate Diploma, Computer Science", school: "IIIT Bangalore", when: "Jan 2025 to Jan 2026", result: "96.25% · CGPA 3.85 / 4.0", highlight: true },
  { title: "Bachelor of Computer Applications", school: "Chandigarh University", when: "Sep 2021 to Sep 2024", result: "Completed alongside full-time work" },
  { title: "Diploma, Computer Science & Engineering", school: "Kalinga University, Raipur", when: "2018 to 2021", result: "81% · first division" },
];

export const certifications = [
  { name: "Advanced Certificate in Data Science, NLP", issuer: "IIIT Bangalore and upGrad", date: "Oct 2025" },
  { name: "Foundations of Responsible AI", issuer: "Northeastern University", date: "Jan 2026" },
  { name: "AWS Cloud Technical Essentials", issuer: "Amazon Web Services", date: "Apr 2025" },
  { name: "Foundations of Cybersecurity", issuer: "Google", date: "Apr 2025" },
  { name: "Python Bootcamp", issuer: "upGrad", date: "Mar 2025" },
];

/**
 * PMFBY premiums per year in crore rupees, from the per-year query in my
 * Farmers-Insurance-SQL repo (summary_queries.sql), recomputed from
 * the course's data.csv on 15 Oct 2026. The farmers' share fell every year.
 */
export const pmfby = [
  { year: 2018, gross: 7263, farmers: 1390, share: 19.1 },
  { year: 2019, gross: 9214, farmers: 1279, share: 13.9 },
  { year: 2020, gross: 13411, farmers: 1560, share: 11.6 },
  { year: 2021, gross: 13119, farmers: 1395, share: 10.6 },
];
