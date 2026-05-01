import Link from "next/link";
import { findSkill, meta } from "@/lib/data";
import { ChartFrame } from "@/components/ChartFrame";
import { HBars } from "@/components/Bars";
import { Pill } from "@/components/Pill";
import { RecruiterForm } from "@/components/RecruiterForm";

export const metadata = { title: "Recruiter mode · Pulse Terminal" };

type SP = Promise<{ skills?: string }>;

function fmtUsd(n: number | null | undefined) {
  if (!n || !Number.isFinite(n)) return "—";
  return `$${Math.round(n).toLocaleString()}`;
}

export default async function Recruiter({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const required = (sp.skills ?? "")
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const evaluated = required.map((label) => {
    const s = findSkill(label);
    return {
      label,
      found: !!s,
      jobCount: s?.jobCount ?? 0,
      avgSalary: s?.avgSalary ?? 0,
      medianSalary: s?.medianSalary ?? 0,
      avgScarcity: s?.avgScarcity ?? 0,
      avgTTF: s?.avgTTF ?? 0,
      change30d: s?.change30d ?? 0,
    };
  });

  const validRows = evaluated.filter((r) => r.found);
  const meanScarcity =
    validRows.length ? validRows.reduce((a, b) => a + b.avgScarcity, 0) / validRows.length : 0;
  const meanSalary =
    validRows.length ? validRows.reduce((a, b) => a + b.medianSalary, 0) / validRows.length : 0;
  const meanTTF =
    validRows.length ? validRows.reduce((a, b) => a + b.avgTTF, 0) / validRows.length : 0;
  const difficulty =
    !validRows.length ? "—" : meanScarcity >= 65 ? "HIGH" : meanScarcity >= 50 ? "MEDIUM" : "MANAGEABLE";
  const difficultyTone = difficulty === "HIGH" ? "down" : difficulty === "MANAGEABLE" ? "up" : "neutral";

  return (
    <div className="flex-1 flex flex-col">
      <section className="border-b border-(--color-border-subtle) px-4 sm:px-6 pt-6 pb-5">
        <div className="max-w-[1320px] mx-auto">
          <div className="caption text-(--color-text-tertiary) mb-2 flex items-center gap-2">
            <span>RECRUITER MODE</span>
            <span aria-hidden>·</span>
            <span>HIRING DIFFICULTY READOUT</span>
            <span className="ml-auto">{meta.dateRange.min} → {meta.dateRange.max}</span>
          </div>
          <h1 className="font-mono text-[20px] sm:text-[24px] tracking-[0.02em] text-(--color-text-primary)">
            <span className="text-(--color-text-tertiary)">required:</span>{" "}
            <span className="text-(--color-signal)">{required.length ? required.join(", ") : "—"}</span>
          </h1>
          <p className="mt-2 text-[13px] text-(--color-text-secondary) max-w-[70ch]">
            Paste the skills your req asks for. The terminal returns hiring difficulty, salary band,
            and a 30-day market trend per skill — sized against{" "}
            <Link href="/sources" className="text-(--color-signal) hover:underline">
              {meta.rowCount.toLocaleString()} postings
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="px-4 sm:px-6 py-6 max-w-[1320px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-4">
          <RecruiterForm initial={required.join(", ")} />

          {required.length ? (
            <div className="border border-(--color-border-subtle) panel">
              <div className="px-3 h-7 border-b border-(--color-border-subtle) caption">SUMMARY</div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-3 py-3 font-mono text-[13px] tabular-nums">
                <div>
                  <dt className="caption text-(--color-text-tertiary)">DIFFICULTY</dt>
                  <dd className="mt-1">
                    <Pill tone={difficultyTone}>{difficulty}</Pill>
                  </dd>
                </div>
                <div>
                  <dt className="caption text-(--color-text-tertiary)">MEAN SCARCITY</dt>
                  <dd>{meanScarcity.toFixed(1)}</dd>
                </div>
                <div>
                  <dt className="caption text-(--color-text-tertiary)">SALARY MID</dt>
                  <dd>{fmtUsd(meanSalary)}</dd>
                </div>
                <div>
                  <dt className="caption text-(--color-text-tertiary)">TIME TO FILL</dt>
                  <dd>{meanTTF.toFixed(0)}d</dd>
                </div>
              </dl>
              <div className="px-3 py-3 border-t border-(--color-border-subtle) text-[12px] text-(--color-text-secondary) leading-relaxed">
                {difficulty === "HIGH" ? (
                  <>
                    A bundle this scarce takes longer to close. Consider splitting must-have from
                    nice-to-have, expanding the location radius, or pre-qualifying on one skill and
                    training the second.
                  </>
                ) : difficulty === "MANAGEABLE" ? (
                  <>
                    Healthy supply for this combination. Compensation should anchor at the market
                    median, not above — over-paying for an easy hire telegraphs a future raise floor.
                  </>
                ) : (
                  <>
                    A standard requisition. Expect time-to-fill near the mean shown. Salary band is the
                    market median for the skill family, not a recommended offer.
                  </>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="lg:col-span-8 space-y-4">
          {required.length ? (
            <>
              <ChartFrame
                figNumber="01"
                title="HIRING DIFFICULTY · SCARCITY SCORE BY REQUIRED SKILL"
                source={`${validRows.length} of ${required.length} matched in the dataset`}
                height={Math.max(160, evaluated.length * 30)}
              >
                <HBars
                  rows={evaluated.map((r) => ({
                    label: r.label,
                    value: r.found ? r.avgScarcity : 0,
                    sub: r.found ? `${r.jobCount} postings` : "no match",
                  }))}
                  max={100}
                  format={(n) => (n ? n.toFixed(1) : "—")}
                  tone="down"
                />
              </ChartFrame>

              <ChartFrame
                figNumber="02"
                title="MARKET DEMAND · POSTINGS BY REQUIRED SKILL"
                source="Total postings in dataset that mention the skill"
                height={Math.max(160, evaluated.length * 30)}
              >
                <HBars
                  rows={evaluated.map((r) => ({
                    label: r.label,
                    value: r.jobCount,
                  }))}
                  format={(n) => n.toString()}
                  tone="signal"
                />
              </ChartFrame>

              <div className="border border-(--color-border-subtle) overflow-x-auto">
                <table className="w-full font-mono text-[12px]">
                  <thead>
                    <tr className="caption text-(--color-text-tertiary) text-left border-b border-(--color-border-subtle)">
                      <th className="px-3 py-2 font-normal">SKILL</th>
                      <th className="px-3 py-2 font-normal text-right">POSTINGS</th>
                      <th className="px-3 py-2 font-normal text-right">SCARCITY</th>
                      <th className="px-3 py-2 font-normal text-right">SALARY MID</th>
                      <th className="px-3 py-2 font-normal text-right">TIME TO FILL</th>
                      <th className="px-3 py-2 font-normal text-right">Δ 30D</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evaluated.map((r) => (
                      <tr key={r.label} className="hr-row hover:bg-(--color-surface-2)">
                        <td className="px-3 py-2 text-(--color-text-primary)">
                          {r.found ? (
                            <Link href={`/skill/${encodeURIComponent(r.label.toLowerCase())}`} className="hover:text-(--color-signal)">
                              {r.label}
                            </Link>
                          ) : (
                            <span className="text-(--color-text-tertiary)">{r.label} <span className="caption">NOT FOUND</span></span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">{r.jobCount || "—"}</td>
                        <td className="px-3 py-2 text-right">
                          <span className={r.avgScarcity >= 65 ? "text-(--color-data-down)" : ""}>
                            {r.found ? r.avgScarcity.toFixed(1) : "—"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">{r.found ? fmtUsd(r.medianSalary) : "—"}</td>
                        <td className="px-3 py-2 text-right">{r.found ? `${r.avgTTF.toFixed(0)}d` : "—"}</td>
                        <td className="px-3 py-2 text-right">
                          {r.found ? (
                            <span className={r.change30d > 0 ? "text-(--color-data-up)" : r.change30d < 0 ? "text-(--color-data-down)" : "text-(--color-text-tertiary)"}>
                              {r.change30d > 0 ? "▲" : r.change30d < 0 ? "▼" : "■"} {Math.abs(r.change30d).toFixed(1)}%
                            </span>
                          ) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="border border-(--color-border-subtle) p-12 text-center">
              <p className="caption text-(--color-text-tertiary) mb-3">EMPTY STATE</p>
              <p className="font-mono text-[14px] text-(--color-text-primary) max-w-[44ch] mx-auto leading-relaxed">
                Enter a comma-separated list of required skills on the left to evaluate hiring difficulty.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
