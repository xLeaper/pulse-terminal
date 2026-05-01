// Reads the enriched Pulse CSV and produces a typed JSON snapshot the app
// imports directly. Runs at build time (and pre-dev), not at request time.
//
// Output: lib/snapshot.json
// Shape:  { meta, postings[], skills[], categories[], locations[], seniorities[] }

import { parse } from "csv-parse/sync";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const SOURCE = resolve(ROOT, "data", "job_market_enriched_from_raw.csv");
const RAW = resolve(ROOT, "data", "job_postings_raw.csv");
const MANIFEST = resolve(ROOT, "data", "source_manifest.csv");
const TAXONOMY = resolve(ROOT, "data", "skills_taxonomy_sample.csv");
const OUT = resolve(ROOT, "lib", "snapshot.json");

function readCsv(path) {
  const buf = readFileSync(path, "utf8");
  return parse(buf, { columns: true, skip_empty_lines: true, trim: true });
}

function splitSkills(value) {
  if (!value) return [];
  const parts = String(value).split(/[;,|]+/);
  const seen = new Set();
  const out = [];
  for (const p of parts) {
    const s = p.trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

function num(value, fallback = null) {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function int(value, fallback = null) {
  const n = num(value, fallback);
  return n === null ? fallback : Math.round(n);
}

const rows = readCsv(SOURCE);
const rawRows = (() => {
  try {
    return readCsv(RAW);
  } catch {
    return [];
  }
})();
const manifestRows = (() => {
  try {
    return readCsv(MANIFEST);
  } catch {
    return [];
  }
})();
const taxonomyRows = (() => {
  try {
    return readCsv(TAXONOMY);
  } catch {
    return [];
  }
})();

const postings = rows.map((r, idx) => ({
  id: r.job_id || `row-${idx + 1}`,
  date: r.date_posted,
  source: r.source || "Uploaded CSV",
  company: r.company || "Unknown company",
  title: r.title || "Unknown role",
  category: r.category || "Other",
  rawCategory: r.raw_category || "",
  seniority: r.seniority || "Unspecified",
  location: r.location || "Unspecified",
  jobType: r.job_type || "",
  skills: splitSkills(r.skills),
  salaryMin: int(r.salary_min_usd),
  salaryMax: int(r.salary_max_usd),
  salaryMid: int(r.salary_mid_usd),
  demandIndex: num(r.demand_index, 50),
  scarcityScore: num(r.scarcity_score, 50),
  timeToFill: num(r.time_to_fill_days_proxy, 30),
  applicationVolume: int(r.application_volume_proxy, 80),
  url: r.source_url || "",
  preview: (r.description_preview || "").slice(0, 320),
}));

// Derive per-skill aggregates: count, salary band, scarcity, weekly history
function ymd(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

const skillStats = new Map();

for (const p of postings) {
  const date = ymd(p.date);
  for (const s of p.skills) {
    const key = s.toLowerCase();
    if (!skillStats.has(key)) {
      skillStats.set(key, {
        canonical: s,
        jobIds: [],
        salaries: [],
        scarcities: [],
        demands: [],
        ttf: [],
        appVol: [],
        categories: new Map(),
        locations: new Map(),
        seniorities: new Map(),
        dates: [],
      });
    }
    const rec = skillStats.get(key);
    rec.jobIds.push(p.id);
    if (p.salaryMid) rec.salaries.push(p.salaryMid);
    rec.scarcities.push(p.scarcityScore);
    rec.demands.push(p.demandIndex);
    rec.ttf.push(p.timeToFill);
    rec.appVol.push(p.applicationVolume);
    rec.categories.set(p.category, (rec.categories.get(p.category) || 0) + 1);
    rec.locations.set(p.location, (rec.locations.get(p.location) || 0) + 1);
    rec.seniorities.set(p.seniority, (rec.seniorities.get(p.seniority) || 0) + 1);
    if (date) rec.dates.push(date.getTime());
  }
}

function mean(arr) {
  if (!arr.length) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
function median(arr) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

const allDates = postings.map((p) => ymd(p.date)?.getTime()).filter(Boolean);
const minDate = Math.min(...allDates);
const maxDate = Math.max(...allDates);

// Build a 12-week sparkline per skill, ending at maxDate.
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const SPARK_WEEKS = 12;
function weeklyHistory(dateMsArr) {
  const buckets = Array(SPARK_WEEKS).fill(0);
  if (!dateMsArr.length) return buckets;
  const end = maxDate;
  for (const t of dateMsArr) {
    const weeksAgo = Math.floor((end - t) / WEEK_MS);
    if (weeksAgo < 0 || weeksAgo >= SPARK_WEEKS) continue;
    const idx = SPARK_WEEKS - 1 - weeksAgo;
    buckets[idx] += 1;
  }
  return buckets;
}

const skills = [];
for (const [key, rec] of skillStats.entries()) {
  if (rec.jobIds.length < 2) continue; // Drop singletons — too noisy for the watchlist.
  const history = weeklyHistory(rec.dates);
  const half = Math.floor(history.length / 2);
  const recentSum = history.slice(half).reduce((a, b) => a + b, 0);
  const priorSum = history.slice(0, half).reduce((a, b) => a + b, 0);
  let change;
  if (priorSum === 0 && recentSum === 0) {
    change = 0;
  } else if (priorSum === 0) {
    change = 100; // brand-new signal — cap rather than divide by zero
  } else {
    const raw = ((recentSum - priorSum) / priorSum) * 100;
    // Clamp to keep the table readable. Anything past 200% is "new market entrant" territory anyway.
    change = Math.max(-100, Math.min(200, raw));
  }

  const topCategory = [...rec.categories.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Other";

  skills.push({
    key,
    name: rec.canonical,
    jobCount: rec.jobIds.length,
    medianSalary: Math.round(median(rec.salaries) ?? 0),
    avgSalary: Math.round(mean(rec.salaries) ?? 0),
    avgScarcity: Number((mean(rec.scarcities) ?? 0).toFixed(1)),
    avgDemand: Number((mean(rec.demands) ?? 0).toFixed(1)),
    avgTTF: Number((mean(rec.ttf) ?? 0).toFixed(1)),
    avgAppVol: Math.round(mean(rec.appVol) ?? 0),
    history,
    change30d: Number(change.toFixed(1)),
    topCategory,
    categoryBreakdown: Object.fromEntries(rec.categories),
    locationBreakdown: Object.fromEntries(
      [...rec.locations.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
    ),
    seniorityBreakdown: Object.fromEntries(rec.seniorities),
    sampleJobIds: rec.jobIds.slice(0, 8),
  });
}

skills.sort((a, b) => b.jobCount - a.jobCount);

const categories = [...new Set(postings.map((p) => p.category))].sort();
const locations = [...new Set(postings.map((p) => p.location))].sort();
const seniorities = [...new Set(postings.map((p) => p.seniority))].sort();
const sources = [...new Set(postings.map((p) => p.source))].sort();

const sourceCounts = sources.map((s) => ({
  source: s,
  count: postings.filter((p) => p.source === s).length,
}));

const categoryCounts = categories.map((c) => ({
  category: c,
  count: postings.filter((p) => p.category === c).length,
  medianSalary: Math.round(
    median(postings.filter((p) => p.category === c).map((p) => p.salaryMid).filter(Boolean)) ?? 0,
  ),
}));

const meta = {
  rowCount: postings.length,
  skillCount: skills.length,
  categoryCount: categories.length,
  generatedAt: new Date().toISOString(),
  dateRange: {
    min: new Date(minDate).toISOString().slice(0, 10),
    max: new Date(maxDate).toISOString().slice(0, 10),
  },
  sources: sourceCounts,
  categoryCounts,
  manifest: manifestRows,
  taxonomy: taxonomyRows,
  rawRowCount: rawRows.length,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(
  OUT,
  JSON.stringify(
    {
      meta,
      postings,
      skills,
      categories,
      locations,
      seniorities,
    },
    null,
    0,
  ),
);

console.log(
  `[build-snapshot] wrote ${OUT}: ${postings.length} postings · ${skills.length} skills · ${categories.length} categories`,
);
