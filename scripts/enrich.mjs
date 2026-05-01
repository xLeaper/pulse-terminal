// Reads data/job_postings_raw.csv, applies the same enrichment pipeline the
// original Python app used (transform_raw_jobs in app.py), and writes
// data/job_market_enriched_from_raw.csv.
//
// Adds: normalized category, inferred seniority, extracted skills,
// proxy salary band, demand_index, scarcity_score, time_to_fill, app_volume.

import { parse } from "csv-parse/sync";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const RAW = resolve(ROOT, "data", "job_postings_raw.csv");
const OUT = resolve(ROOT, "data", "job_market_enriched_from_raw.csv");

// ---------- Skill alias map (mirrors app.py SKILL_ALIASES) ----------
const SKILL_ALIASES = {
  "python": "Python", "sql": "SQL", "excel": "Excel", "power bi": "Power BI", "tableau": "Tableau",
  "data analysis": "Data Analysis", "data analytics": "Data Analytics", "data science": "Data Science",
  "data engineering": "Data Engineering", "machine learning": "Machine Learning", "ai/ml": "AI/ML",
  "ai": "AI", "artificial intelligence": "AI", "generative ai": "Generative AI", "nlp": "NLP",
  "tensorflow": "TensorFlow", "pytorch": "PyTorch", "spark": "Spark", "aws": "AWS", "azure": "Azure",
  "gcp": "GCP", "cloud": "Cloud", "docker": "Docker", "kubernetes": "Kubernetes", "ci/cd": "CI/CD",
  "git": "Git", "api": "API", "rest": "REST", "javascript": "JavaScript", "typescript": "TypeScript",
  "react": "React", "node.js": "Node.js", "nodejs": "Node.js", "java": "Java", ".net": ".NET", "c#": "C#",
  "c++": "C++", "go": "Go", "golang": "Go", "android": "Android", "ios": "iOS", "rust": "Rust",
  "backend": "Backend", "frontend": "Frontend", "fullstack": "Full Stack", "full stack": "Full Stack",
  "testing": "Testing", "automation": "Automation", "security": "Security", "cybersecurity": "Cybersecurity",
  "risk management": "Risk Management", "seo": "SEO", "google analytics": "Google Analytics",
  "content strategy": "Content Strategy", "paid marketing": "Paid Marketing",
  "performance marketing": "Performance Marketing", "advertising": "Advertising", "crm": "CRM",
  "social media": "Social Media", "product management": "Product Management",
  "project management": "Project Management", "agile": "Agile", "scrum": "Scrum",
  "stakeholder management": "Stakeholder Management", "roadmapping": "Roadmapping", "figma": "Figma",
  "ui/ux": "UI/UX", "user research": "User Research", "design": "Design", "motion design": "Motion Design",
  "video": "Video Editing", "finance": "Finance", "financial modeling": "Financial Modeling",
  "accounting": "Accounting", "forecasting": "Forecasting", "erp": "ERP", "sap": "SAP",
  "customer service": "Customer Service", "technical support": "Technical Support", "onboarding": "Onboarding",
  "sales": "Sales", "recruitment": "Recruitment", "hr": "HR", "fundraising": "Fundraising",
  "startup": "Startup", "saas": "SaaS", "wordpress": "WordPress", "shopify": "Shopify",
  "research": "Research", "editing": "Editing", "operations": "Operations", "communication": "Communication",
  "marketplace": "Marketplace",
};
const KEYWORDS = Object.keys(SKILL_ALIASES).sort((a, b) => b.length - a.length);

const DEFAULT_SKILLS_BY_CATEGORY = {
  "Data & AI": ["Python", "SQL", "AI/ML", "Data Analysis", "Machine Learning"],
  "Software & Engineering": ["Python", "JavaScript", "API", "Cloud", "Git"],
  "Cybersecurity & IT": ["Security", "Cloud", "Risk Management", "Technical Support"],
  "Marketing & Growth": ["SEO", "Google Analytics", "Paid Marketing", "Content Strategy", "CRM"],
  "Product & Project Management": ["Product Management", "Project Management", "Agile", "Stakeholder Management", "Roadmapping"],
  "Design & UX": ["UI/UX", "Figma", "Design", "User Research"],
  "Finance & Business": ["Excel", "Finance", "Accounting", "Forecasting", "Power BI"],
  "Operations & Support": ["Excel", "Customer Service", "Technical Support", "Operations", "Onboarding"],
  "HR & Recruitment": ["Recruitment", "HR", "Onboarding", "Communication", "Stakeholder Management"],
  "Other": ["Excel", "Communication", "Research"],
};

const FAMILY_SALARY = {
  "Data & AI": 85000, "Software & Engineering": 88000, "Cybersecurity & IT": 80000,
  "Product & Project Management": 76000, "Marketing & Growth": 60000, "Design & UX": 62000,
  "Finance & Business": 68000, "Operations & Support": 52000, "HR & Recruitment": 56000, "Other": 55000,
};

const SENIORITY_MULT = {
  "Internship/Student": 0.55, "Entry-level": 0.75, "Mid-level": 1.0,
  "Senior/Lead": 1.35, "Unspecified": 0.92,
};

const SCARCE_SKILLS = new Set([
  "Generative AI", "AI/ML", "Machine Learning", "NLP", "PyTorch", "TensorFlow",
  "Data Engineering", "AWS", "Azure", "GCP", "Cloud", "Kubernetes", "Cybersecurity",
  "Security", "API", "Backend", "Full Stack", "Python", "Rust",
]);

// ---------- helpers ----------
function normalizeCategory(rawCategory, title = "", tags = "", desc = "") {
  const t = `${rawCategory ?? ""} ${title ?? ""} ${tags ?? ""} ${desc ?? ""}`.toLowerCase();
  if (/(data science|machine learning|ai\/ml|artificial intelligence|nlp|data engineering|analytics)/.test(t)) return "Data & AI";
  if (/(software|developer|backend|frontend|fullstack|engineering|engineer|java|javascript|python|api)/.test(t)) return "Software & Engineering";
  if (/(security|cyber|network|system administration|information technology|cloud security|iam)/.test(t)) return "Cybersecurity & IT";
  if (/(marketing|seo|growth|advertising|content|social media|crm)/.test(t)) return "Marketing & Growth";
  if (/(product|project management|project manager|scrum|agile|management)/.test(t)) return "Product & Project Management";
  if (/(design|ui\/ux|graphic|figma|creative|video)/.test(t)) return "Design & UX";
  if (/(finance|financial|controlling|accounting|business|commercial)/.test(t)) return "Finance & Business";
  if (/(hr|human resources|recruit|talent)/.test(t)) return "HR & Recruitment";
  if (/(operations|customer service|support|assistant|admin)/.test(t)) return "Operations & Support";
  return "Other";
}

function inferSeniority(title, jobType = "") {
  const t = `${title ?? ""} ${jobType ?? ""}`.toLowerCase();
  if (/(intern|internship|apprentice|student|working student|hilfstätigkeit)/.test(t)) return "Internship/Student";
  if (/(senior|lead|principal|staff|head|director|teamleitung|manager)/.test(t)) return "Senior/Lead";
  if (/(entry|junior|graduate|trainee|berufseinstieg)/.test(t)) return "Entry-level";
  if (/(mid|experienced|professional|berufserfahren|erfahren)/.test(t)) return "Mid-level";
  return "Unspecified";
}

function extractSkills(row) {
  const tagText = String(row.tags_raw ?? "").toLowerCase();
  const allText = `${tagText} ${String(row.title ?? "").toLowerCase()} ${String(row.category ?? "").toLowerCase()} ${String(row.description ?? "").toLowerCase().slice(0, 3000)}`;
  const out = [];
  const seen = new Set();

  // Tags first.
  for (const k of KEYWORDS) {
    if (tagText.includes(k)) {
      const skill = SKILL_ALIASES[k];
      if (!seen.has(skill.toLowerCase())) {
        seen.add(skill.toLowerCase());
        out.push(skill);
      }
    }
  }
  // Description / title.
  for (const k of KEYWORDS) {
    if (k === "go") continue; // too noisy as a 2-letter token; handled below
    const re = new RegExp(`(?<![a-z0-9+#.])${k.replace(/[+#.]/g, "\\$&")}(?![a-z0-9+#.])`, "i");
    if (re.test(allText)) {
      const skill = SKILL_ALIASES[k];
      if (!seen.has(skill.toLowerCase())) {
        seen.add(skill.toLowerCase());
        out.push(skill);
      }
    }
  }
  if (/(?<![a-z0-9])go(?![a-z0-9])/i.test(tagText) || /golang/i.test(allText)) {
    if (!seen.has("go")) {
      seen.add("go");
      out.push("Go");
    }
  }

  if (!out.length) {
    const cat = normalizeCategory(row.category, row.title, row.tags_raw, row.description);
    return DEFAULT_SKILLS_BY_CATEGORY[cat]?.slice(0, 4) ?? DEFAULT_SKILLS_BY_CATEGORY["Other"];
  }
  return out.slice(0, 12);
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function parseDate(s) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : null;
}

// ---------- main ----------
console.log("[enrich] reading raw CSV…");
const raw = parse(readFileSync(RAW, "utf8"), { columns: true, skip_empty_lines: true, trim: true });
console.log(`[enrich] ${raw.length} raw rows`);

// Pre-pass: normalize categories + infer seniority + extract skills + count skill mentions
const prepped = raw.map((r) => {
  const category = normalizeCategory(r.category, r.title, r.tags_raw, r.description);
  const seniority = inferSeniority(r.title, r.job_type);
  const skills = extractSkills(r);
  return { ...r, _category: category, _seniority: seniority, _skills: skills, _date: parseDate(r.date_posted) };
});

const skillCounts = new Map();
for (const r of prepped) for (const s of r._skills) skillCounts.set(s, (skillCounts.get(s) ?? 0) + 1);
const maxSkillCount = Math.max(1, ...skillCounts.values());

const dateMax = prepped.reduce((acc, r) => {
  if (r._date && (!acc || r._date > acc)) return r._date;
  return acc;
}, null) ?? new Date();

// Build enriched rows.
const enriched = prepped.map((r, i) => {
  const skills = r._skills;
  const demandScore = skills.length
    ? skills.reduce((a, s) => a + ((skillCounts.get(s) ?? 0) / maxSkillCount) * 100, 0) / skills.length
    : 20;
  const daysOld = r._date ? Math.max(0, (dateMax - r._date) / (1000 * 60 * 60 * 24)) : 60;
  const recency = Math.max(0, 100 - daysOld * 1.2);
  const demand_index = clamp(0.68 * demandScore + 0.32 * recency + 10, 5, 100);

  const scarceCount = skills.slice(0, 8).filter((s) => SCARCE_SKILLS.has(s)).length;
  const seniorBoost = r._seniority === "Senior/Lead" ? 10 : 0;
  const familyBoost = r._category === "Data & AI" || r._category === "Cybersecurity & IT" ? 5 : 0;
  const scarcity_score = clamp(38 + 8 * scarceCount + seniorBoost + familyBoost, 10, 100);

  const baseSalary = FAMILY_SALARY[r._category] ?? 58000;
  const mult = SENIORITY_MULT[r._seniority] ?? 0.92;
  const salary_mid = Math.round(baseSalary * mult);
  const salary_min = Math.round(salary_mid * 0.82);
  const salary_max = Math.round(salary_mid * 1.18);

  const ttf = clamp(14 + 0.43 * scarcity_score + (r._seniority === "Senior/Lead" ? 4 : 0), 8, 75);
  const appVol = Math.round(clamp(185 - 1.3 * scarcity_score, 10, 260));

  const dateStr = r._date ? r._date.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  return {
    job_id: `raw-${String(i + 1).padStart(4, "0")}`,
    date_posted: dateStr,
    source: r.source || "Unknown",
    company: r.company || "Unknown company",
    title: r.title || "Unknown role",
    category: r._category,
    raw_category: r.category || "Unspecified",
    seniority: r._seniority,
    location: r.location || "Unspecified",
    job_type: r.job_type || "",
    skills: skills.join("; "),
    tags_raw: r.tags_raw || "",
    salary_min_usd: salary_min,
    salary_max_usd: salary_max,
    salary_mid_usd: salary_mid,
    demand_index: Number(demand_index.toFixed(1)),
    scarcity_score: Number(scarcity_score.toFixed(1)),
    time_to_fill_days_proxy: Number(ttf.toFixed(1)),
    application_volume_proxy: appVol,
    source_url: r.source_url || "",
    description_preview: String(r.description ?? "").replace(/\s+/g, " ").slice(0, 220),
  };
});

// CSV writer — schema-locked.
const COLUMNS = [
  "job_id", "date_posted", "source", "company", "title", "category", "raw_category",
  "seniority", "location", "job_type", "skills", "tags_raw", "salary_min_usd",
  "salary_max_usd", "salary_mid_usd", "demand_index", "scarcity_score",
  "time_to_fill_days_proxy", "application_volume_proxy", "source_url", "description_preview",
];

function csvEscape(v) {
  const s = String(v ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
const csv =
  COLUMNS.join(",") + "\n" +
  enriched.map((r) => COLUMNS.map((c) => csvEscape(r[c])).join(",")).join("\n") + "\n";

writeFileSync(OUT, csv);
console.log(`[enrich] wrote ${OUT}: ${enriched.length} rows`);
