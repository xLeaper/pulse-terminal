// Diffs current screenshots against a committed baseline.
// Run after `node scripts/screenshot.mjs`.
//
// - Reads every PNG in screenshots/ that has a matching screenshots/baseline/ peer
// - Produces screenshots/diff/<name>.png for any pair with > THRESHOLD changed pixels
// - Exits 1 if any diffs exceed the threshold (suitable for CI)
//
// Modes:
//   node scripts/visual-diff.mjs              # diff and report
//   UPDATE_BASELINE=1 node scripts/visual-diff.mjs  # promote current → baseline

import { readdirSync, readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "screenshots");
const BASELINE = resolve(ROOT, "baseline");
const DIFF = resolve(ROOT, "diff");

// A run-of-the-mill antialiasing change is a few hundred pixels. A real
// regression is thousands. Tune by trial.
const THRESHOLD_RATIO = 0.005; // 0.5% of pixels changed = real regression
const PIXELMATCH_OPTS = { threshold: 0.1, includeAA: false };

mkdirSync(BASELINE, { recursive: true });
mkdirSync(DIFF, { recursive: true });

const current = readdirSync(ROOT).filter((f) => f.endsWith(".png"));

if (process.env.UPDATE_BASELINE === "1") {
  for (const f of current) copyFileSync(resolve(ROOT, f), resolve(BASELINE, f));
  console.log(`[visual-diff] promoted ${current.length} screenshots to baseline`);
  process.exit(0);
}

const failures = [];
const created = [];

for (const f of current) {
  const cur = resolve(ROOT, f);
  const base = resolve(BASELINE, f);
  const out = resolve(DIFF, f);

  if (!existsSync(base)) {
    created.push(f);
    copyFileSync(cur, base);
    continue;
  }

  const a = PNG.sync.read(readFileSync(base));
  const b = PNG.sync.read(readFileSync(cur));
  if (a.width !== b.width || a.height !== b.height) {
    failures.push({ name: f, reason: `size changed (${a.width}x${a.height} → ${b.width}x${b.height})`, diffPx: -1 });
    continue;
  }
  const diff = new PNG({ width: a.width, height: a.height });
  const diffPx = pixelmatch(a.data, b.data, diff.data, a.width, a.height, PIXELMATCH_OPTS);
  const ratio = diffPx / (a.width * a.height);

  if (ratio > THRESHOLD_RATIO) {
    writeFileSync(out, PNG.sync.write(diff));
    failures.push({ name: f, reason: `${(ratio * 100).toFixed(2)}% changed`, diffPx });
  }
}

if (created.length) {
  console.log(`[visual-diff] ${created.length} new screenshots seeded as baseline:`);
  created.forEach((f) => console.log(`  +  ${f}`));
}

if (failures.length) {
  console.log(`[visual-diff] ${failures.length} regressions:`);
  failures.forEach((f) => console.log(`  ✗  ${f.name}: ${f.reason}`));
  console.log(`\nReview diffs in ${DIFF}/ then either fix the code or run UPDATE_BASELINE=1 npm run qa:visual-diff to accept the new look.`);
  process.exit(1);
}

console.log(`[visual-diff] all ${current.length - created.length} screenshots match baseline`);
