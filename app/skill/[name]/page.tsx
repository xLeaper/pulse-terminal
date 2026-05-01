import { notFound } from "next/navigation";
import Link from "next/link";
import { ChartFrame } from "@/components/ChartFrame";
import { Sparkline } from "@/components/Sparkline";
import { HBars } from "@/components/Bars";
import { Pill } from "@/components/Pill";
import { findSkill, postingsForSkill, projectHistory, meta } from "@/lib/data";

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const decoded = decodeURIComponent(name);
  const skill = findSkill(decoded);
  return {
    title: skill ? `${skill.name} · Pulse Terminal` : "Skill not found · Pulse Terminal",
  };
}

function fmtUsd(n: number | null | undefined) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return `$${Math.round(n).toLocaleString()}`;
}

function fmt(n: number, digits = 1) {
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(digits);
}

export default async function SkillDetail({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const skill = findSkill(decodeURIComponent(name));
  if (!skill) notFound();

  const postings = postingsForSkill(skill.key);
  const recentPostings = [...postings].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  const { historical, projected } = projectHistory(skill.history, 8);
  const combined = [...historical, ...projected];
  const histMax = Math.max(...combined, 1);

  const dir = skill.change30d > 0 ? "up" : skill.change30d < 0 ? "down" : "flat";
  const dirLabel = dir === "up" ? "RISING" : dir === "down" ? "DECLINING" : "FLAT";
  const isCapped = Math.abs(skill.change30d) >= 200;
  const refreshed = new Date(meta.generatedAt).toISOString().slice(0, 10);

  const topCategories = Object.entries(skill.categoryBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value]) => ({ label, value }));

  const topLocations = Object.entries(skill.locationBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value]) => ({ label, value }));

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-4 sm:px-6 py-3 border-b border-(--color-border-subtle) flex items-center gap-3">
        <Link
          href="/watchlist"
          className="caption text-(--color-text-secondary) hover:text-(--color-signal)"
        >
          ← WATCHLIST
        </Link>
        <span className="caption text-(--color-text-tertiary)">/</span>
        <span className="caption text-(--color-text-primary)">{skill.name.toUpperCase()}</span>
      </div>

      <section className="px-4 sm:px-6 pt-6 pb-4 border-b border-(--color-border-subtle)">
        <div className="max-w-[1320px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr,auto] gap-6 items-start">
          <div className="min-w-0">
            <div className="caption text-(--color-text-tertiary) mb-2 flex items-center gap-2">
              <span>SKILL DETAIL</span>
              <span aria-hidden>·</span>
              <span>{skill.topCategory.toUpperCase()}</span>
              <Pill tone={dir === "up" ? "up" : dir === "down" ? "down" : "neutral"}>
                {dir === "up" ? "▲" : dir === "down" ? "▼" : "■"} {dirLabel}{" "}
                {isCapped ? "· NEW SIGNAL" : `${Math.abs(skill.change30d).toFixed(1)}%`}
              </Pill>
            </div>
            <h1 className="font-mono text-[28px] sm:text-[32px] tracking-[0.01em] text-(--color-text-primary)">
              {skill.name}
            </h1>
            <p className="mt-2 max-w-[68ch] text-[14px] text-(--color-text-secondary) leading-relaxed">
              Appears in{" "}
              <span className="font-mono text-(--color-text-primary)">
                {skill.jobCount.toLocaleString()}
              </span>{" "}
              postings, with median pay{" "}
              <span className="font-mono text-(--color-text-primary)">{fmtUsd(skill.medianSalary)}</span>{" "}
              and an average scarcity score of{" "}
              <span className="font-mono text-(--color-text-primary)">{fmt(skill.avgScarcity)}</span>.
              The market signal over the last 12 weeks is{" "}
              <span className={dir === "up" ? "text-(--color-data-up)" : dir === "down" ? "text-(--color-data-down)" : "text-(--color-text-tertiary)"}>
                {dirLabel.toLowerCase()}
              </span>
              .
            </p>
          </div>

          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 lg:min-w-[280px] text-right self-start">
            <Stat label="DEMAND" value={fmt(skill.avgDemand)} />
            <Stat label="SCARCITY" value={fmt(skill.avgScarcity)} tone={skill.avgScarcity >= 65 ? "down" : "default"} />
            <Stat label="TIME TO FILL" value={`${fmt(skill.avgTTF, 0)}d`} />
            <Stat label="APP. VOLUME" value={skill.avgAppVol.toString()} />
          </dl>
        </div>
      </section>

      <section className="px-4 sm:px-6 py-6">
        <div className="max-w-[1320px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 space-y-4">
            <ChartFrame
              figNumber="01"
              title="DEMAND, 12 WEEKS HISTORICAL + 8 WEEKS PROJECTED"
              source={`${skill.jobCount.toLocaleString()} postings · refreshed ${refreshed}`}
              height={220}
            >
              <ProjectionChart historical={historical} projected={projected} max={histMax} />
            </ChartFrame>

            <ChartFrame
              figNumber="02"
              title="SALARY BAND"
              source={`Proxy band derived from ${skill.jobCount.toLocaleString()} postings, USD mid`}
              height={120}
            >
              <SalaryBand
                min={Math.round(skill.medianSalary * 0.78)}
                mid={skill.medianSalary}
                max={Math.round(skill.medianSalary * 1.22)}
              />
            </ChartFrame>
          </div>

          <div className="lg:col-span-4 space-y-4">
            <ChartFrame
              figNumber="03"
              title="WHERE IT APPEARS · CATEGORY"
              source="Posting count by normalized category"
              height={Math.max(120, topCategories.length * 28)}
            >
              <HBars rows={topCategories} format={(n) => `${n}`} />
            </ChartFrame>

            <ChartFrame
              figNumber="04"
              title="WHERE IT APPEARS · LOCATION"
              source="Posting count by location string (top 6)"
              height={Math.max(120, topLocations.length * 28)}
            >
              <HBars rows={topLocations} format={(n) => `${n}`} tone="neutral" />
            </ChartFrame>
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 py-6 border-t border-(--color-border-subtle)">
        <div className="max-w-[1320px] mx-auto">
          <h2 className="caption text-(--color-text-tertiary) mb-3">RECENT POSTINGS · {recentPostings.length} OF {postings.length}</h2>
          <ul className="divide-y divide-(--color-border-subtle) border border-(--color-border-subtle)">
            {recentPostings.map((p) => (
              <li key={p.id} className="px-4 py-3 grid grid-cols-1 md:grid-cols-[1fr,auto] gap-2 hover:bg-(--color-surface-2) transition-colors">
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-mono text-[10px] tracking-wider text-(--color-text-tertiary)">{p.date}</span>
                    <span className="text-[14px] text-(--color-text-primary) font-medium">{p.title}</span>
                    <span className="text-[12px] text-(--color-text-secondary)">· {p.company}</span>
                  </div>
                  <p className="text-[12px] text-(--color-text-tertiary) mt-1 line-clamp-1">
                    {p.location} · {p.seniority} · {p.category}
                  </p>
                </div>
                <div className="text-right text-[12px] font-mono text-(--color-text-secondary) tabular-nums whitespace-nowrap">
                  {fmtUsd(p.salaryMid)}
                  {p.url ? (
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="ml-3 caption text-(--color-signal) hover:underline"
                    >
                      VIEW ↗
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "down" | "up";
}) {
  const cls =
    tone === "down" ? "text-(--color-data-down)" : tone === "up" ? "text-(--color-data-up)" : "text-(--color-text-primary)";
  return (
    <div className="text-right">
      <dt className="caption text-(--color-text-tertiary)">{label}</dt>
      <dd className={`font-mono text-[18px] ${cls} tabular-nums`}>{value}</dd>
    </div>
  );
}

function ProjectionChart({
  historical,
  projected,
  max,
}: {
  historical: number[];
  projected: number[];
  max: number;
}) {
  const W = 720;
  const H = 180;
  const PAD_X = 24;
  const PAD_Y = 16;
  const total = historical.length + projected.length;
  const stepX = (W - PAD_X * 2) / (total - 1);

  function toPath(arr: number[], offset: number) {
    return arr
      .map((v, i) => {
        const x = PAD_X + (i + offset) * stepX;
        const y = H - PAD_Y - ((v / max) * (H - PAD_Y * 2));
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }

  // Last historical point is shared with first projected for a continuous line.
  const histWithBridge = [...historical];
  const projWithBridge = [historical[historical.length - 1], ...projected];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="none" className="block" role="img" aria-label="Demand history and projection">
      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <line
          key={t}
          x1={PAD_X}
          x2={W - PAD_X}
          y1={H - PAD_Y - t * (H - PAD_Y * 2)}
          y2={H - PAD_Y - t * (H - PAD_Y * 2)}
          stroke="var(--color-border-subtle)"
          strokeDasharray={t === 0 ? "" : "1 3"}
        />
      ))}

      {/* Historical area */}
      <path
        d={`${toPath(histWithBridge, 0)} L${PAD_X + (histWithBridge.length - 1) * stepX},${H - PAD_Y} L${PAD_X},${H - PAD_Y} Z`}
        fill="var(--color-signal)"
        fillOpacity="0.12"
      />
      <path d={toPath(histWithBridge, 0)} fill="none" stroke="var(--color-signal)" strokeWidth="1.5" />

      {/* Projection (dashed) */}
      <path
        d={toPath(projWithBridge, historical.length - 1)}
        fill="none"
        stroke="var(--color-signal-dim)"
        strokeWidth="1.5"
        strokeDasharray="3 3"
      />

      {/* Boundary line */}
      <line
        x1={PAD_X + (historical.length - 1) * stepX}
        x2={PAD_X + (historical.length - 1) * stepX}
        y1={PAD_Y}
        y2={H - PAD_Y}
        stroke="var(--color-text-tertiary)"
        strokeDasharray="2 4"
      />
      <text
        x={PAD_X + (historical.length - 1) * stepX + 6}
        y={PAD_Y + 8}
        fontSize="10"
        fontFamily="var(--font-mono)"
        fill="var(--color-text-tertiary)"
        letterSpacing="0.06em"
      >
        NOW
      </text>

      {/* X-axis ticks */}
      <text
        x={PAD_X}
        y={H - 2}
        fontSize="9"
        fontFamily="var(--font-mono)"
        fill="var(--color-text-tertiary)"
      >
        -12W
      </text>
      <text
        x={W - PAD_X}
        y={H - 2}
        textAnchor="end"
        fontSize="9"
        fontFamily="var(--font-mono)"
        fill="var(--color-text-tertiary)"
      >
        +8W
      </text>
    </svg>
  );
}

function SalaryBand({ min, mid, max }: { min: number; mid: number; max: number }) {
  return (
    <div className="space-y-3">
      <div className="relative h-6 bg-(--color-surface-3)">
        <div
          className="absolute inset-y-0"
          style={{
            left: "10%",
            right: "10%",
            background:
              "linear-gradient(90deg, var(--color-signal-deep) 0%, var(--color-signal) 50%, var(--color-signal-deep) 100%)",
          }}
          aria-hidden
        />
        <span
          className="absolute top-0 bottom-0 w-px bg-(--color-text-primary)"
          style={{ left: "50%" }}
          aria-hidden
        />
      </div>
      <div className="grid grid-cols-3 font-mono text-[12px] tabular-nums">
        <div>
          <div className="caption text-(--color-text-tertiary)">P25</div>
          <div className="text-(--color-text-primary)">${min.toLocaleString()}</div>
        </div>
        <div className="text-center">
          <div className="caption text-(--color-text-tertiary)">MEDIAN</div>
          <div className="text-(--color-signal)">${mid.toLocaleString()}</div>
        </div>
        <div className="text-right">
          <div className="caption text-(--color-text-tertiary)">P75</div>
          <div className="text-(--color-text-primary)">${max.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}
