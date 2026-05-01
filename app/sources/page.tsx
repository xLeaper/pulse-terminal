import Link from "next/link";
import { meta, postings, skills } from "@/lib/data";
import { ChartFrame } from "@/components/ChartFrame";
import { HBars } from "@/components/Bars";
import { Pill } from "@/components/Pill";

export const metadata = { title: "Sources · Pulse Terminal" };

export default function Sources() {
  const refreshed = new Date(meta.generatedAt).toISOString();
  const sample = [...postings].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 16);

  const sourceRows = meta.sources
    .sort((a, b) => b.count - a.count)
    .map((s) => ({ label: s.source, value: s.count }));

  const categoryRows = meta.categoryCounts
    .sort((a, b) => b.count - a.count)
    .map((c) => ({ label: c.category, value: c.count, sub: `med $${c.medianSalary.toLocaleString()}` }));

  return (
    <div className="flex-1 flex flex-col">
      <section className="border-b border-(--color-border-subtle) px-4 sm:px-6 pt-6 pb-5">
        <div className="max-w-[1320px] mx-auto">
          <div className="caption text-(--color-text-tertiary) mb-2 flex items-center gap-2">
            <span>SOURCES</span>
            <span aria-hidden>·</span>
            <span>PROVENANCE & DATA STATUS</span>
            <Pill tone="amber">SNAPSHOT</Pill>
            <span className="ml-auto">refreshed {refreshed}</span>
          </div>
          <h1 className="font-mono text-[20px] sm:text-[24px] tracking-[0.02em] text-(--color-text-primary)">
            <span className="text-(--color-text-tertiary)">data:</span>{" "}
            <span className="text-(--color-signal)">
              {meta.rowCount.toLocaleString()} postings · {meta.skillCount} skills · {meta.categoryCount} categories
            </span>
          </h1>
          <p className="mt-2 text-[13px] text-(--color-text-secondary) max-w-[72ch] leading-relaxed">
            Every number elsewhere in the terminal traces back to the rows below. The dataset is a
            build-time snapshot of {meta.rowCount.toLocaleString()} job postings spanning{" "}
            <span className="font-mono text-(--color-text-primary)">{meta.dateRange.min}</span> →{" "}
            <span className="font-mono text-(--color-text-primary)">{meta.dateRange.max}</span>. Salary,
            scarcity, time-to-fill, and application volume are <em className="not-italic text-(--color-text-primary)">proxy variables</em> derived
            from the postings, not measured outcomes.
          </p>
        </div>
      </section>

      <section className="px-4 sm:px-6 py-6 max-w-[1320px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 space-y-4">
          <ChartFrame
            figNumber="01"
            title="DATA FLOW"
            source="Build-time pipeline · scripts/build-snapshot.mjs"
            height={220}
          >
            <pre className="font-mono text-[11px] leading-[1.5] text-(--color-text-secondary) tracking-tight overflow-x-auto whitespace-pre">{`
   ┌──────────────────────┐      ┌──────────────────────┐      ┌──────────────────────┐
   │  job_postings_raw    │ ───▶ │   normalize +        │ ───▶ │  enriched CSV        │
   │  (Remotive API, etc) │      │   extract skills     │      │  381 rows · 21 cols  │
   └──────────────────────┘      └──────────────────────┘      └──────────┬───────────┘
                                                                           │
                                                                           ▼
   ┌──────────────────────┐      ┌──────────────────────┐      ┌──────────────────────┐
   │  next.js build       │ ◀─── │  snapshot.json       │ ◀─── │  build-snapshot.mjs  │
   │  RSC reads at compile│      │  84 skills · history │      │  weekly aggregation  │
   └──────────────────────┘      └──────────────────────┘      └──────────────────────┘
`}</pre>
          </ChartFrame>

          <ChartFrame
            figNumber="02"
            title="POSTINGS BY NORMALIZED CATEGORY"
            source={`${meta.rowCount.toLocaleString()} postings`}
            height={Math.max(160, categoryRows.length * 28)}
          >
            <HBars rows={categoryRows} format={(n) => `${n}`} tone="signal" />
          </ChartFrame>
        </div>

        <div className="lg:col-span-5 space-y-4">
          <ChartFrame
            figNumber="03"
            title="POSTINGS BY SOURCE"
            source="Discovered in source column of input CSV"
            height={Math.max(160, sourceRows.length * 28)}
          >
            <HBars rows={sourceRows} format={(n) => `${n}`} tone="neutral" />
          </ChartFrame>

          <div className="border border-(--color-border-subtle) bg-(--color-surface-1)">
            <div className="px-3 h-7 border-b border-(--color-border-subtle) caption">METHODOLOGY · PROXY VARIABLES</div>
            <dl className="divide-y divide-(--color-border-subtle) text-[12px]">
              <ProxyRow term="demand_index" desc="0–100. Weighted blend of skill-mention frequency and recency of postings citing it." />
              <ProxyRow term="scarcity_score" desc="0–100. Lifted by appearance in scarce-skill set (AI/ML, cloud, security) and seniority of role." />
              <ProxyRow term="salary_mid_usd" desc="Family-base × seniority multiplier. Min/Max are mid × 0.82 / × 1.18." />
              <ProxyRow term="time_to_fill_days_proxy" desc="14 + 0.43·scarcity (+4 for senior/lead), clipped to [8, 75]." />
              <ProxyRow term="application_volume_proxy" desc="185 − 1.3·scarcity, clipped to [10, 260]." />
            </dl>
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 pb-10 max-w-[1320px] w-full mx-auto">
        <div className="caption text-(--color-text-tertiary) mb-2">RAW POSTING SAMPLE · {sample.length} OF {meta.rowCount.toLocaleString()}</div>
        <div className="border border-(--color-border-subtle) overflow-x-auto">
          <table className="w-full font-mono text-[11px]">
            <thead>
              <tr className="caption text-(--color-text-tertiary) text-left border-b border-(--color-border-subtle)">
                <th className="px-3 py-2 font-normal">DATE</th>
                <th className="px-3 py-2 font-normal">SOURCE</th>
                <th className="px-3 py-2 font-normal">TITLE</th>
                <th className="px-3 py-2 font-normal">CATEGORY</th>
                <th className="px-3 py-2 font-normal">LOCATION</th>
                <th className="px-3 py-2 font-normal text-right">MID. SAL.</th>
                <th className="px-3 py-2 font-normal text-right">SCARCITY</th>
              </tr>
            </thead>
            <tbody>
              {sample.map((p) => (
                <tr key={p.id} className="hr-row hover:bg-(--color-surface-2)">
                  <td className="px-3 py-2 text-(--color-text-tertiary)">{p.date}</td>
                  <td className="px-3 py-2 text-(--color-text-secondary)">{p.source}</td>
                  <td className="px-3 py-2 text-(--color-text-primary)">{p.title}</td>
                  <td className="px-3 py-2 text-(--color-text-secondary)">{p.category}</td>
                  <td className="px-3 py-2 text-(--color-text-tertiary) truncate max-w-[200px]">{p.location}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-(--color-text-primary)">${(p.salaryMid ?? 0).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    <span className={p.scarcityScore >= 65 ? "text-(--color-data-down)" : "text-(--color-text-secondary)"}>
                      {p.scarcityScore.toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-[12px] text-(--color-text-tertiary)">
          Dataset ports forward from the original Hugging Face Space (job_market_enriched_from_raw.csv).
          To refresh, replace the CSV in <code className="font-mono text-(--color-text-secondary)">/app/data</code> and rebuild.{" "}
          <Link href="/" className="text-(--color-signal) hover:underline">
            Return to entry →
          </Link>
        </p>
      </section>
    </div>
  );
}

function ProxyRow({ term, desc }: { term: string; desc: string }) {
  return (
    <div className="grid grid-cols-[160px,1fr] px-3 py-2 gap-3">
      <code className="text-(--color-signal) text-[11px]">{term}</code>
      <p className="text-(--color-text-secondary) leading-relaxed">{desc}</p>
    </div>
  );
}
