import snapshot from "./snapshot.json";

export type Posting = {
  id: string;
  date: string;
  source: string;
  company: string;
  title: string;
  category: string;
  rawCategory: string;
  seniority: string;
  location: string;
  jobType: string;
  skills: string[];
  salaryMin: number | null;
  salaryMax: number | null;
  salaryMid: number | null;
  demandIndex: number;
  scarcityScore: number;
  timeToFill: number;
  applicationVolume: number;
  url: string;
  preview: string;
};

export type Skill = {
  key: string;
  name: string;
  jobCount: number;
  medianSalary: number;
  avgSalary: number;
  avgScarcity: number;
  avgDemand: number;
  avgTTF: number;
  avgAppVol: number;
  history: number[];
  change30d: number;
  topCategory: string;
  categoryBreakdown: Record<string, number>;
  locationBreakdown: Record<string, number>;
  seniorityBreakdown: Record<string, number>;
  sampleJobIds: string[];
};

export type Snapshot = {
  meta: {
    rowCount: number;
    skillCount: number;
    categoryCount: number;
    generatedAt: string;
    dateRange: { min: string; max: string };
    sources: { source: string; count: number }[];
    categoryCounts: { category: string; count: number; medianSalary: number }[];
    manifest: Record<string, string>[];
    taxonomy: Record<string, string>[];
    rawRowCount: number;
  };
  postings: Posting[];
  skills: Skill[];
  categories: string[];
  locations: string[];
  seniorities: string[];
};

const data = snapshot as unknown as Snapshot;

export const meta = data.meta;
export const postings = data.postings;
export const skills = data.skills;
export const categories = data.categories;
export const locations = data.locations;
export const seniorities = data.seniorities;

export function findSkill(key: string): Skill | undefined {
  const k = key.toLowerCase();
  return skills.find((s) => s.key === k);
}

export function postingsForSkill(skillKey: string): Posting[] {
  const k = skillKey.toLowerCase();
  return postings.filter((p) => p.skills.some((s) => s.toLowerCase() === k));
}

// Inferred role match. The watchlist uses this to score skills against a
// target role string the user typed at the entry. Cascades from precise to
// broad until the matched set is large enough to produce signal.
export function postingsForRole(role: string): Posting[] {
  if (!role.trim()) return postings;
  const r = role.toLowerCase();
  const TARGET = 24; // need at least this many postings to compute meaningful per-skill aggregates

  const titleHits = postings.filter((p) => p.title.toLowerCase().includes(r));
  if (titleHits.length >= TARGET) return titleHits;

  const titleOrCat = postings.filter(
    (p) =>
      p.title.toLowerCase().includes(r) ||
      p.category.toLowerCase().includes(r) ||
      p.rawCategory.toLowerCase().includes(r),
  );
  if (titleOrCat.length >= TARGET) return titleOrCat;

  // Broaden to text search across descriptions + skills.
  const textHits = postings.filter((p) => {
    const haystack = `${p.title} ${p.category} ${p.rawCategory} ${p.preview} ${p.skills.join(" ")}`.toLowerCase();
    return haystack.includes(r);
  });
  if (textHits.length >= TARGET) return textHits;

  // Last resort: include every posting in the same normalized categories as
  // the postings we did find. Keeps the watchlist statistically meaningful
  // for narrow titles like "Data Analyst" that only appear in 3 rows directly.
  const expansionPool = textHits.length ? textHits : titleOrCat;
  const cats = new Set(expansionPool.map((p) => p.category));
  if (cats.size) {
    const expanded = postings.filter((p) => cats.has(p.category));
    // Surface direct matches first, then peers from the same categories.
    const direct = new Set(expansionPool.map((p) => p.id));
    return [
      ...expansionPool,
      ...expanded.filter((p) => !direct.has(p.id)),
    ];
  }

  return textHits;
}

// Re-aggregate per-skill stats over a posting subset (e.g. role-filtered).
export function skillsForPostings(subset: Posting[], minMentions = 2): Skill[] {
  if (!subset.length) return [];
  const byKey = new Map<string, { name: string; pids: string[]; sal: number[]; scar: number[]; dem: number[]; ttf: number[]; cats: Map<string, number> }>();
  for (const p of subset) {
    for (const s of p.skills) {
      const k = s.toLowerCase();
      if (!byKey.has(k)) {
        byKey.set(k, { name: s, pids: [], sal: [], scar: [], dem: [], ttf: [], cats: new Map() });
      }
      const r = byKey.get(k)!;
      r.pids.push(p.id);
      if (p.salaryMid) r.sal.push(p.salaryMid);
      r.scar.push(p.scarcityScore);
      r.dem.push(p.demandIndex);
      r.ttf.push(p.timeToFill);
      r.cats.set(p.category, (r.cats.get(p.category) || 0) + 1);
    }
  }
  const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const median = (a: number[]) => {
    if (!a.length) return 0;
    const s = [...a].sort((x, y) => x - y);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };

  const result: Skill[] = [];
  for (const [k, r] of byKey) {
    if (r.pids.length < minMentions) continue;
    // Pull existing global skill record for history + breakdowns we don't recompute.
    const global = skills.find((s) => s.key === k);
    if (!global) continue;
    result.push({
      ...global,
      jobCount: r.pids.length,
      medianSalary: Math.round(median(r.sal)),
      avgSalary: Math.round(mean(r.sal)),
      avgScarcity: Number(mean(r.scar).toFixed(1)),
      avgDemand: Number(mean(r.dem).toFixed(1)),
      avgTTF: Number(mean(r.ttf).toFixed(1)),
      topCategory: [...r.cats.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Other",
    });
  }
  return result.sort((a, b) => b.jobCount - a.jobCount);
}

// Score a skill set "fit" against the user's known skills. Returns 0..100.
// Used by the watchlist to compute the FIT column.
export function fitScore(skill: Skill, known: Set<string>): number {
  if (!known.size) return 0;
  if (known.has(skill.key)) return 100;
  // Adjacency: skills that frequently co-occur with the target in postings.
  const adj = postingsForSkill(skill.key);
  const coOccur = new Map<string, number>();
  for (const p of adj) {
    for (const s of p.skills) {
      const k = s.toLowerCase();
      if (k === skill.key) continue;
      coOccur.set(k, (coOccur.get(k) || 0) + 1);
    }
  }
  let overlap = 0;
  let total = 0;
  for (const [k, n] of coOccur) {
    total += n;
    if (known.has(k)) overlap += n;
  }
  if (!total) return 0;
  return Math.round((overlap / total) * 100);
}

export function normalizeSkillInput(input: string): Set<string> {
  return new Set(
    input
      .split(/[,;\n]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

// Linear-regression projection over the 12-week sparkline → next N weeks.
export function projectHistory(history: number[], horizon = 8): { historical: number[]; projected: number[] } {
  const n = history.length;
  if (n < 2) return { historical: history, projected: Array(horizon).fill(0) };
  const xs = history.map((_, i) => i);
  const xBar = xs.reduce((a, b) => a + b, 0) / n;
  const yBar = history.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xBar) * (history[i] - yBar);
    den += (xs[i] - xBar) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = yBar - slope * xBar;
  const projected: number[] = [];
  for (let h = 1; h <= horizon; h++) {
    const x = n + h - 1;
    projected.push(Math.max(0, slope * x + intercept));
  }
  return { historical: history, projected };
}
