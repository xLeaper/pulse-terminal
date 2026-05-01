import { meta, skills } from "@/lib/data";
import { EntryPrompt } from "@/components/EntryPrompt";
import { Sparkline } from "@/components/Sparkline";
import { Pill } from "@/components/Pill";
import Link from "next/link";

const SUGGESTIONS = [
  "Data Analyst",
  "Software Engineer",
  "Product Manager",
  "UI/UX Designer",
  "Marketing Manager",
];

export default function Home() {
  // Three skills the market is moving on right now. Filter out the capped
  // "brand-new signal" skills (change == 100 or 200) so movers reflect real
  // momentum rather than appearance from zero.
  const movers = [...skills]
    .filter((s) => s.jobCount >= 6 && Math.abs(s.change30d) > 5 && Math.abs(s.change30d) < 200)
    .sort((a, b) => Math.abs(b.change30d) - Math.abs(a.change30d))
    .slice(0, 3);

  return (
    <div className="flex-1 flex flex-col">
      <section className="flex-1 grid place-items-center px-4 sm:px-6 py-12 sm:py-16">
        <div className="w-full max-w-[820px]">
          <div className="caption text-(--color-text-tertiary) mb-6 flex items-center gap-2">
            <span aria-hidden>●</span>
            <span>PULSE TERMINAL · {meta.dateRange.min} → {meta.dateRange.max}</span>
            <span className="ml-auto">
              {meta.rowCount.toLocaleString()} POSTINGS · {meta.skillCount} SKILLS
            </span>
          </div>

          <h1 className="display mb-10">
            Tell the terminal which role you&rsquo;re aiming at,
            <span className="cursor-blink ml-1" aria-hidden />
          </h1>

          <EntryPrompt suggestions={SUGGESTIONS} />

          <div className="mt-12 grid gap-px bg-(--color-border-subtle) sm:grid-cols-3 border border-(--color-border-subtle)">
            {movers.map((s, i) => {
              const dir = s.change30d > 0 ? "up" : s.change30d < 0 ? "down" : "flat";
              return (
                <Link
                  key={s.key}
                  href={`/skill/${encodeURIComponent(s.key)}`}
                  className="bg-(--color-surface-1) hover:bg-(--color-surface-2) p-4 transition-colors group"
                >
                  <div className="flex items-center justify-between caption text-(--color-text-tertiary) mb-3">
                    <span>MOVER {String(i + 1).padStart(2, "0")}</span>
                    <Pill tone={dir === "up" ? "up" : dir === "down" ? "down" : "neutral"}>
                      {dir === "up" ? "▲" : dir === "down" ? "▼" : "■"}{" "}
                      {Math.abs(s.change30d) >= 200 ? "NEW" : `${Math.abs(s.change30d).toFixed(1)}%`}
                    </Pill>
                  </div>
                  <div className="flex items-end justify-between gap-2 mb-2">
                    <span className="font-mono text-[18px] text-(--color-text-primary) group-hover:text-(--color-signal) transition-colors">
                      {s.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <Sparkline data={s.history} width={92} height={24} fill />
                    <span className="font-mono text-[11px] text-(--color-text-secondary)">
                      {s.jobCount} postings
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          <p className="mt-10 max-w-[60ch] text-[14px] text-(--color-text-secondary) leading-relaxed">
            Pulse ranks skills on three axes (demand, scarcity, price) over the last
            month of postings. State a role and the terminal returns the watchlist that matches
            it, scored against the skills you already have. No applications, no recruiters in your
            inbox. A market instrument for one decision: <em className="text-(--color-text-primary) not-italic font-medium">what to learn next.</em>
          </p>
        </div>
      </section>
    </div>
  );
}
