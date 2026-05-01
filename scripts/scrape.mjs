// Scrapes three public job-board APIs and writes a unified raw CSV that
// matches the original schema. Run via `npm run data:scrape`.
//
// All three APIs are no-auth and rate-limit-tolerant for one-shot scrapes.
// The aggregated raw CSV is then enriched by `enrich.mjs`.
//
//   Remotive       https://remotive.com/api/remote-jobs
//   Arbeitnow      https://www.arbeitnow.com/api/job-board-api  (paginated)
//   The Muse       https://www.themuse.com/api/public/jobs       (paginated)
//
// Output schema (10 columns, exactly matches data/job_postings_raw.csv):
//   source, source_url, date_posted, company, title, category, location,
//   job_type, tags_raw, description

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "..", "data", "job_postings_raw.csv");

// Cap per-source so a single API outage doesn't dominate. Targets ~400 total
// postings, matching the existing dataset's size.
const TARGETS = {
  remotive: 200,
  arbeitnow: 200,
  themuse: 60,
};

// Filter to the last N days of postings to keep the dataset relevant.
const MAX_AGE_DAYS = 60;
const ageCutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

const UA = "Mozilla/5.0 (compatible; PulseTerminal/1.0; +https://huggingface.co/spaces)";

async function fetchJson(url, opts = {}) {
  const r = await fetch(url, { ...opts, headers: { "User-Agent": UA, ...(opts.headers || {}) } });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText} from ${url}`);
  return r.json();
}

function clean(s) {
  if (s == null) return "";
  return String(s).replace(/\s+/g, " ").trim();
}

function stripHtml(s) {
  return clean(String(s ?? "").replace(/<[^>]+>/g, " "));
}

function withinAge(dateStr) {
  const t = Date.parse(dateStr);
  if (!Number.isFinite(t)) return true; // keep undated rows; rare
  return t >= ageCutoff;
}

// ---------- Remotive ----------
async function scrapeRemotive() {
  const url = "https://remotive.com/api/remote-jobs?limit=" + TARGETS.remotive;
  const data = await fetchJson(url);
  const rows = (data.jobs ?? []).filter((j) => withinAge(j.publication_date)).map((j) => ({
    source: "Remotive API",
    source_url: j.url ?? "",
    date_posted: (j.publication_date ?? "").slice(0, 19),
    company: clean(j.company_name),
    title: clean(j.title),
    category: clean(j.category),
    location: clean(j.candidate_required_location),
    job_type: clean(j.job_type),
    tags_raw: (j.tags ?? []).map(clean).filter(Boolean).join("; "),
    description: stripHtml(j.description).slice(0, 4000),
  }));
  return rows.slice(0, TARGETS.remotive);
}

// ---------- Arbeitnow (paginated, 100/page max) ----------
async function scrapeArbeitnow() {
  const out = [];
  let page = 1;
  while (out.length < TARGETS.arbeitnow && page <= 8) {
    let data;
    try {
      data = await fetchJson(`https://www.arbeitnow.com/api/job-board-api?page=${page}`);
    } catch (e) {
      console.warn(`[arbeitnow] page ${page} failed: ${e.message}`);
      break;
    }
    const items = data.data ?? [];
    if (!items.length) break;
    for (const j of items) {
      const date = j.created_at ? new Date(j.created_at * 1000).toISOString() : "";
      if (date && !withinAge(date)) continue;
      out.push({
        source: "Arbeitnow API",
        source_url: j.url ?? "",
        date_posted: date.slice(0, 19),
        company: clean(j.company_name),
        title: clean(j.title),
        category: (j.tags ?? [])[0] ?? "",
        location: clean(j.location),
        job_type: (j.job_types ?? []).join(", "),
        tags_raw: (j.tags ?? []).map(clean).filter(Boolean).join("; "),
        description: stripHtml(j.description ?? "").slice(0, 4000),
      });
      if (out.length >= TARGETS.arbeitnow) break;
    }
    page++;
  }
  return out;
}

// ---------- The Muse (paginated, 20/page) ----------
async function scrapeTheMuse() {
  const out = [];
  let page = 0;
  while (out.length < TARGETS.themuse && page < 6) {
    let data;
    try {
      data = await fetchJson(
        `https://www.themuse.com/api/public/jobs?page=${page}&descending=true`,
      );
    } catch (e) {
      console.warn(`[themuse] page ${page} failed: ${e.message}`);
      break;
    }
    const items = data.results ?? [];
    if (!items.length) break;
    for (const j of items) {
      if (j.publication_date && !withinAge(j.publication_date)) continue;
      const cats = (j.categories ?? []).map((c) => c.name).filter(Boolean);
      const locations = (j.locations ?? []).map((l) => l.name).filter(Boolean);
      const tags = [...cats, ...(j.levels ?? []).map((l) => l.name)];
      out.push({
        source: "The Muse API",
        source_url: j.refs?.landing_page ?? "",
        date_posted: (j.publication_date ?? "").slice(0, 19),
        company: clean(j.company?.name),
        title: clean(j.name),
        category: cats[0] ?? "",
        location: locations.join(", "),
        job_type: (j.type ?? "").toLowerCase(),
        tags_raw: tags.map(clean).filter(Boolean).join("; "),
        description: stripHtml(j.contents ?? "").slice(0, 4000),
      });
      if (out.length >= TARGETS.themuse) break;
    }
    page++;
  }
  return out;
}

// ---------- CSV writer (simple, schema-locked) ----------
const COLUMNS = [
  "source", "source_url", "date_posted", "company", "title",
  "category", "location", "job_type", "tags_raw", "description",
];

function csvEscape(v) {
  const s = String(v ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows) {
  const header = COLUMNS.join(",");
  const body = rows.map((r) => COLUMNS.map((c) => csvEscape(r[c])).join(",")).join("\n");
  return header + "\n" + body + "\n";
}

// ---------- main ----------
console.log("[scrape] starting…");
const t0 = Date.now();

const settled = await Promise.allSettled([
  scrapeRemotive(),
  scrapeArbeitnow(),
  scrapeTheMuse(),
]);

const named = ["Remotive", "Arbeitnow", "TheMuse"];
const all = [];
settled.forEach((s, i) => {
  if (s.status === "fulfilled") {
    console.log(`[scrape] ${named[i]}: ${s.value.length} rows`);
    all.push(...s.value);
  } else {
    console.warn(`[scrape] ${named[i]} FAILED: ${s.reason?.message ?? s.reason}`);
  }
});

if (!all.length) {
  console.error("[scrape] NO ROWS fetched from any source. Aborting (refusing to overwrite CSV with empty data).");
  process.exit(1);
}

// Dedupe by source_url, then by title+company as a fallback for blank URLs.
const seen = new Set();
const deduped = [];
for (const r of all) {
  const key = (r.source_url || `${r.title}|${r.company}`).toLowerCase();
  if (seen.has(key)) continue;
  seen.add(key);
  deduped.push(r);
}

deduped.sort((a, b) => (b.date_posted ?? "").localeCompare(a.date_posted ?? ""));

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, toCsv(deduped));

console.log(
  `[scrape] wrote ${OUT}: ${deduped.length} unique postings (from ${all.length} fetched) in ${(
    (Date.now() - t0) / 1000
  ).toFixed(1)}s`,
);
