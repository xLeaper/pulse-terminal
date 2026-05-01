---
title: Pulse Terminal
emoji: 🟡
colorFrom: yellow
colorTo: gray
sdk: docker
app_port: 7860
pinned: false
license: mit
short_description: A career terminal. Rank skills. Learn what's next.
---

# Pulse Terminal

A Bloomberg-style career terminal for job seekers. Rank skills on three axes (demand, scarcity, price), then learn what to learn next.

This Space ships a Next.js 16 app served by Docker. The data is a build-time snapshot of ~380 enriched job postings.

## App sections

- **Entry** (`/`): italic prompt, type a target role
- **Watchlist** (`/watchlist`): ranked skills with sparklines and FIT score
- **Skill detail** (`/skill/[name]`): 12-week history + 8-week projection, salary band, where it appears
- **Recruiter mode** (`/recruiter`): paste required skills, get a hiring-difficulty readout
- **Sources** (`/sources`): provenance, methodology, raw posting sample

## Local dev

```bash
npm install
node scripts/build-snapshot.mjs
npm run dev   # http://localhost:3000
```

## Build

```bash
npm run build && npm start
```

## Refresh data

Drop a new `data/job_market_enriched_from_raw.csv` and re-run `node scripts/build-snapshot.mjs`. Same schema as the original source.

## Keyboard

- `⌘K`: command palette
- `?`: shortcuts overlay
- `⌘⇧D`: toggle row density
- `↑ ↓`: walk the watchlist, `↵` to open detail
