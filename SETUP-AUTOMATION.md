# Automation setup

The repo ships with five GitHub Actions workflows. Together they cover deploy,
data freshness, accessibility, visual regression, and per-PR previews.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  PUSH → main           PR opened/updated      Daily 06:00 UTC            │
│       │                       │                       │                   │
│       ▼                       ▼                       ▼                   │
│  sync-to-hf.yml      lighthouse.yml           daily-refresh.yml          │
│  visual-regr…  ←─────┘                                │                   │
│  pr-preview.yml ←────┘                                │                   │
│       │                                               │                   │
│       ▼                                               ▼                   │
│  HF Space rebuild                                scrape APIs              │
│                                                  enrich CSV               │
│                                                  build snapshot           │
│                                                  commit back → triggers   │
│                                                  sync-to-hf again         │
└──────────────────────────────────────────────────────────────────────────┘
```

## One-time setup

### 1. Create a GitHub repo

```bash
cd /Users/ly__kevin/Claude/jobpulse-terminal/app

# If .git points at HF, reset it.
rm -rf .git
git init -b main
git add .
git commit -m "Initial commit: Pulse Terminal"

gh repo create pulse-terminal --private --source=. --push
# OR use https:
#   git remote add origin https://github.com/<you>/pulse-terminal.git
#   git push -u origin main
```

### 2. Generate an HF write token

- https://huggingface.co/settings/tokens → **New token** → role **Write**
- Copy the `hf_…` value

### 3. Add the secret to GitHub

GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Name | Value |
|---|---|
| `HF_TOKEN` | `hf_…` (the token from step 2) |

### 4. Edit two values in three workflow files

These determine where each workflow pushes.

| File | Field | Value |
|---|---|---|
| `.github/workflows/sync-to-hf.yml` | `env.HF_USERNAME` | your HF username |
| `.github/workflows/sync-to-hf.yml` | `env.HF_SPACE` | the production Space slug (e.g. `pulse-terminal`) |
| `.github/workflows/pr-preview.yml` | `env.HF_USERNAME` | same |

`daily-refresh.yml`, `lighthouse.yml`, `visual-regression.yml` need no editing.

### 5. Push to GitHub

```bash
git add .github/
git commit -m "Add automation workflows"
git push
```

## The five workflows

### `sync-to-hf.yml` — deploy

| | |
|---|---|
| **Triggers** | `push` to `main`, manual |
| **What it does** | `npm ci` → snapshot → `next build` (sanity check) → force-push to HF Space |
| **Result** | HF detects the push and rebuilds the Docker image. ~5 min later, prod is live. |

### `daily-refresh.yml` — data freshness

| | |
|---|---|
| **Triggers** | cron `0 6 * * *` (06:00 UTC daily), manual |
| **What it does** | Runs `npm run data:refresh` (scrape → enrich → snapshot), checks if `data/` changed, sanity-builds, commits the new CSVs back to `main` |
| **Result** | Cascades into `sync-to-hf.yml`. Prod gets fresh job postings every morning. |
| **Sources** | Remotive API, Arbeitnow API, The Muse API. All public, no auth. |

### `lighthouse.yml` — accessibility & performance

| | |
|---|---|
| **Triggers** | every PR to `main`, manual |
| **What it does** | Builds, starts the prod server, runs Lighthouse against the 5 main routes, asserts a11y ≥ 90 and key audits (color-contrast, image-alt, label, link-name, button-name, etc.) |
| **Result** | PR check passes/fails. Public report URL in the run logs. |
| **Tunable** | thresholds in [lighthouserc.json](lighthouserc.json) |

### `visual-regression.yml` — pixel-level UI guardrail

| | |
|---|---|
| **Triggers** | every PR to `main`, manual |
| **What it does** | Captures 27 screenshots (3 viewports × 9 surfaces), pixel-diffs against `screenshots/baseline/`, fails if any surface drifted >0.5% |
| **Result** | On failure, uploads diff PNGs (with pink overlays) as a workflow artifact and comments on the PR with how to accept the new look. |
| **Update baseline** | After approving the new look locally: `UPDATE_BASELINE=1 npm run qa:visual-diff` then commit `screenshots/baseline/`. |

### `pr-preview.yml` — temporary HF Space per PR

| | |
|---|---|
| **Triggers** | PR opened, updated, or closed |
| **What it does** | On open/update: creates `<user>/pulse-terminal-pr-<number>` HF Space and force-pushes the PR branch. On close: deletes the Space. |
| **Result** | Bot comment with the preview URL on the PR, refreshed every push. |
| **Note** | HF doesn't have native branch deploys, so this workflow simulates them by creating a fresh Space per PR. Builds take 3–6 min. |

## Daily flow

```bash
# Iterate locally
git checkout -b feature/whatever
# … edit …
git add . && git commit -m "Try X"
git push -u origin feature/whatever

# Open a PR. Three checks fire:
#   - Lighthouse → score check
#   - Visual regression → pixel diff
#   - PR preview → temp HF Space, URL posted to PR

# Merge → sync-to-hf pushes prod. Done.
```

You don't push to HF directly anymore. Everything goes through the GitHub repo.

## Local commands

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server on port 3000 |
| `npm run build && npm start` | Local production build |
| `npm run data:refresh` | Scrape → enrich → snapshot (the same chain `daily-refresh.yml` runs) |
| `npm run data:scrape` | Just the scrape step |
| `npm run data:enrich` | Just the enrichment step |
| `npm run data:snapshot` | Just rebuild snapshot.json from current CSVs |
| `npm run qa:screenshots` | Capture 27 screenshots (need dev or prod server running) |
| `npm run qa:visual-diff` | Diff current screenshots against `screenshots/baseline/` |
| `UPDATE_BASELINE=1 npm run qa:visual-diff` | Promote current screenshots to the new baseline |

## Troubleshooting

| Symptom | Fix |
|---|---|
| `sync-to-hf` 401 / 403 | Token missing, wrong, or read-only. Regenerate as **Write** scope. |
| `sync-to-hf` "not found" | `HF_USERNAME` / `HF_SPACE` wrong. Match the URL of your Space exactly. |
| `daily-refresh` "no changes" | Sources returned the same set as yesterday. Normal. Commit only happens on diff. |
| `daily-refresh` scrape timeouts | Source API is rate-limiting. Re-run via `workflow_dispatch`. |
| `lighthouse` fails on a11y | Open the report URL in the run log. The audit names tell you which DOM nodes to fix. |
| `visual-regression` fails after a deliberate change | Download the `visual-diffs` artifact, eyeball them, then `UPDATE_BASELINE=1 npm run qa:visual-diff` locally and commit. |
| `pr-preview` fails on first open | The HF account needs Spaces-create permission (default for personal accounts). Re-run after enabling. |
| Lots of `pr-preview` Spaces lying around | The cleanup job runs on PR close. Stuck Spaces can be deleted manually at https://huggingface.co/settings/spaces. |

## What's still manual (and intentional)

- **Approving visual diffs.** Pixelmatch can flag legitimate changes; a human still decides "ship it" vs "fix it."
- **Tuning Lighthouse thresholds.** As the surface grows, edit `lighthouserc.json` to keep the bar realistic.
- **Adding more scrape sources.** Drop another adapter into `scripts/scrape.mjs`; the rest of the pipeline picks it up automatically.
