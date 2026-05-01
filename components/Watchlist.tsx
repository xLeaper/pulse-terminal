"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Skill } from "@/lib/data";
import { Sparkline } from "./Sparkline";

type SortKey = "fit" | "demand" | "scarcity" | "salary" | "count" | "change";
type SortDir = "asc" | "desc";

function deltaTone(n: number) {
  if (n > 1) return { tone: "up" as const, glyph: "▲" };
  if (n < -1) return { tone: "down" as const, glyph: "▼" };
  return { tone: "flat" as const, glyph: "■" };
}

function fmtDelta(n: number): string {
  // Values at the snapshot caps signal "no prior baseline" — show as bracketed.
  if (n >= 200) return "NEW";
  if (n <= -100) return "MAX↓";
  return `${Math.abs(n).toFixed(1)}%`;
}

export function Watchlist({
  skills,
  role,
  knownSkills,
}: {
  skills: (Skill & { fit: number })[];
  role: string;
  knownSkills: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>(() => ({
    key: knownSkills.length ? "fit" : "count",
    dir: "desc",
  }));
  const [activeIdx, setActiveIdx] = useState(0);
  const tableRef = useRef<HTMLDivElement>(null);

  const sorted = useMemo(() => {
    const f = filter.trim().toLowerCase();
    const filtered = f ? skills.filter((s) => s.name.toLowerCase().includes(f)) : skills;
    const accessor: Record<SortKey, (s: typeof filtered[number]) => number> = {
      fit: (s) => s.fit,
      demand: (s) => s.avgDemand,
      scarcity: (s) => s.avgScarcity,
      salary: (s) => s.medianSalary,
      count: (s) => s.jobCount,
      change: (s) => s.change30d,
    };
    return [...filtered].sort((a, b) => {
      const diff = accessor[sort.key](b) - accessor[sort.key](a);
      return sort.dir === "desc" ? diff : -diff;
    });
  }, [skills, filter, sort]);

  // Reset selection when sort/filter changes.
  useEffect(() => {
    setActiveIdx(0);
  }, [sorted.length, sort.key, sort.dir, filter]);

  // Keyboard nav.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName?.toLowerCase();
      const inField = tag === "input" || tag === "textarea" || t?.isContentEditable;

      if (e.key === "ArrowDown" && !inField) {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, sorted.length - 1));
      } else if (e.key === "ArrowUp" && !inField) {
        e.preventDefault();
        setActiveIdx((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter" && !inField) {
        e.preventDefault();
        const target = sorted[activeIdx];
        if (target) router.push(`/skill/${encodeURIComponent(target.key)}`);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sorted, activeIdx, router]);

  // Scroll active row into view.
  useEffect(() => {
    const row = tableRef.current?.querySelector<HTMLElement>(`[data-row="${activeIdx}"]`);
    row?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { ...s, dir: s.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" }));
  }

  return (
    <div>
      <div className="flex items-center gap-3 px-4 sm:px-6 h-10 border-b border-(--color-border-subtle) panel-2">
        <span className="caption text-(--color-text-tertiary)">FILTER</span>
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="type to filter skills"
          className="bg-transparent outline-none font-mono text-[12px] text-(--color-text-primary) placeholder:text-(--color-text-tertiary) flex-1 max-w-[240px]"
        />
        <span className="caption text-(--color-text-tertiary) ml-auto hidden sm:inline">
          {sorted.length} OF {skills.length}
        </span>
      </div>

      <div ref={tableRef} className="overflow-x-auto">
        <table className="w-full font-mono text-[12px]">
          <thead>
            <tr className="text-left caption text-(--color-text-tertiary) border-b border-(--color-border-subtle)">
              <th className="px-4 sm:px-6 py-2 font-normal">SKILL</th>
              <SortHeader label="DEMAND" k="demand" sort={sort} onToggle={toggleSort} align="right" />
              <SortHeader label="SCARCITY" k="scarcity" sort={sort} onToggle={toggleSort} align="right" />
              <SortHeader label="MED. SALARY" k="salary" sort={sort} onToggle={toggleSort} align="right" />
              <th className="px-3 py-2 font-normal text-left">30D</th>
              <SortHeader label="Δ" k="change" sort={sort} onToggle={toggleSort} align="right" />
              <SortHeader label="COUNT" k="count" sort={sort} onToggle={toggleSort} align="right" />
              {knownSkills.length ? (
                <SortHeader label="FIT" k="fit" sort={sort} onToggle={toggleSort} align="right" />
              ) : null}
            </tr>
          </thead>
          <tbody>
            {sorted.map((s, idx) => {
              const active = idx === activeIdx;
              const dt = deltaTone(s.change30d);
              const fitLabel =
                s.fit === 100 ? "HAVE" : s.fit >= 60 ? "HIGH" : s.fit >= 30 ? "MED" : "LOW";
              return (
                <tr
                  key={s.key}
                  data-row={idx}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => router.push(`/skill/${encodeURIComponent(s.key)}`)}
                  className={`row-cell hr-row cursor-pointer relative ${
                    active ? "bg-(--color-surface-2)" : "hover:bg-(--color-surface-2)/60"
                  }`}
                >
                  <td className="px-4 sm:px-6 py-2.5 relative">
                    {active ? (
                      <span
                        className="absolute left-0 top-0 bottom-0 w-[2px] bg-(--color-signal)"
                        aria-hidden
                      />
                    ) : null}
                    <div className="flex items-baseline gap-2">
                      <span className={`text-[13px] ${active ? "text-(--color-signal)" : "text-(--color-text-primary)"}`}>
                        {s.name}
                      </span>
                      <span className="text-[10px] text-(--color-text-tertiary) tracking-wider truncate hidden sm:inline">
                        {s.topCategory.toUpperCase()}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right text-(--color-text-primary)">
                    {s.avgDemand.toFixed(1)}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={s.avgScarcity >= 65 ? "text-(--color-data-down)" : "text-(--color-text-primary)"}>
                      {s.avgScarcity.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right text-(--color-text-primary) tabular-nums">
                    ${s.medianSalary.toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5">
                    <Sparkline data={s.history} width={72} height={18} />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span
                      className={
                        dt.tone === "up"
                          ? "text-(--color-data-up)"
                          : dt.tone === "down"
                          ? "text-(--color-data-down)"
                          : "text-(--color-text-tertiary)"
                      }
                    >
                      <span aria-hidden>{dt.glyph}</span> {fmtDelta(s.change30d)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right text-(--color-text-secondary)">
                    {s.jobCount}
                  </td>
                  {knownSkills.length ? (
                    <td className="px-4 sm:px-6 py-2.5 text-right">
                      <FitCell fit={s.fit} label={fitLabel} />
                    </td>
                  ) : null}
                </tr>
              );
            })}
            {!sorted.length ? (
              <tr>
                <td colSpan={knownSkills.length ? 8 : 7} className="px-6 py-12 text-center caption text-(--color-text-tertiary)">
                  NO SKILLS MATCH "{filter}"
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SortHeader({
  label,
  k,
  sort,
  onToggle,
  align = "left",
}: {
  label: string;
  k: SortKey;
  sort: { key: SortKey; dir: SortDir };
  onToggle: (k: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = sort.key === k;
  return (
    <th
      className={`px-3 py-2 font-normal ${align === "right" ? "text-right" : "text-left"}`}
    >
      <button
        type="button"
        onClick={() => onToggle(k)}
        className={`inline-flex items-center gap-1 transition-colors ${
          active ? "text-(--color-signal)" : "text-(--color-text-tertiary) hover:text-(--color-text-primary)"
        }`}
      >
        {label}
        <span aria-hidden className="text-[10px]">
          {active ? (sort.dir === "desc" ? "▼" : "▲") : "·"}
        </span>
      </button>
    </th>
  );
}

function FitCell({ fit, label }: { fit: number; label: string }) {
  const tone =
    label === "HAVE"
      ? "text-(--color-data-up)"
      : label === "HIGH"
      ? "text-(--color-signal)"
      : label === "MED"
      ? "text-(--color-text-primary)"
      : "text-(--color-text-tertiary)";
  return (
    <span className={`inline-flex items-center gap-2 ${tone}`}>
      <span className="tabular-nums w-7 text-right">{fit}</span>
      <span className="text-[10px] tracking-wider">{label}</span>
    </span>
  );
}
