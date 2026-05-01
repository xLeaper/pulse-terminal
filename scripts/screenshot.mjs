import puppeteer from "puppeteer";
import { mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "..", "screenshots");
mkdirSync(OUT, { recursive: true });

const BASE = process.env.BASE_URL || "http://localhost:3137";

const ROUTES = [
  { name: "01-entry", path: "/" },
  { name: "02-watchlist-empty", path: "/watchlist" },
  { name: "03-watchlist-data-analyst", path: "/watchlist?role=Data%20Analyst&skills=Python,SQL,Excel" },
  { name: "04-watchlist-engineer", path: "/watchlist?role=Software%20Engineer&skills=JavaScript,Python" },
  { name: "05-skill-python", path: "/skill/python" },
  { name: "06-skill-aws", path: "/skill/aws" },
  { name: "07-recruiter-empty", path: "/recruiter" },
  { name: "08-recruiter-loaded", path: "/recruiter?skills=Python,SQL,AWS,Docker,Kubernetes" },
  { name: "09-sources", path: "/sources" },
];

const VIEWPORTS = [
  { tag: "desktop", width: 1440, height: 900 },
  { tag: "tablet", width: 820, height: 1180 },
  { tag: "mobile", width: 390, height: 844 },
];

const browser = await puppeteer.launch({
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

for (const viewport of VIEWPORTS) {
  const page = await browser.newPage();
  await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: 1 });

  for (const r of ROUTES) {
    const url = `${BASE}${r.path}`;
    try {
      await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
      await new Promise((rsv) => setTimeout(rsv, 400));
      const file = resolve(OUT, `${viewport.tag}-${r.name}.png`);
      await page.screenshot({ path: file, fullPage: viewport.tag !== "desktop" });
      console.log(`✓ ${viewport.tag} ${r.path} -> ${file}`);
    } catch (e) {
      console.error(`✗ ${viewport.tag} ${r.path} :: ${e.message}`);
    }
  }

  await page.close();
}

await browser.close();
