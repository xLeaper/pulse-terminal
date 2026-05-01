import Link from "next/link";
import { Watchlist } from "@/components/Watchlist";
import { Pill } from "@/components/Pill";
import {
  meta,
  postingsForRole,
  skillsForPostings,
  fitScore,
  normalizeSkillInput,
  skills as allSkills,
} from "@/lib/data";

export const metadata = {
  title: "Watchlist · Pulse Terminal",
};

type SP = Promise<{ role?: string; skills?: string }>;

export default async function WatchlistPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const role = (sp.role ?? "").trim();
  const skillsInput = (sp.skills ?? "").trim();
  const known = normalizeSkillInput(skillsInput);

  const subset = role ? postingsForRole(role) : [];
  const filteredSkills = role ? skillsForPostings(subset) : allSkills;
  const scored = filteredSkills.map((s) => ({ ...s, fit: fitScore(s, known) }));

  const matchedRows = subset.length;
  const usingFallback = role && matchedRows < 8;

  const knownLabel = [...known].slice(0, 5).join(", ");
  const refreshed = new Date(meta.generatedAt).toISOString().slice(0, 10);

  return (
    <div className="flex-1 flex flex-col">
      <section className="border-b border-(--color-border-subtle) px-4 sm:px-6 pt-6 pb-5">
        <div className="max-w-[1320px] mx-auto">
          <div className="flex items-baseline gap-2 caption text-(--color-text-tertiary) mb-2">
            <span>WATCHLIST</span>
            <span aria-hidden>·</span>
            <span>FIG. 01 / SKILLS RANKED FOR ROLE</span>
            <span className="ml-auto">{refreshed}</span>
          </div>
          <h1 className="font-mono text-[20px] sm:text-[24px] tracking-[0.02em] text-(--color-text-primary)">
            {role ? (
              <>
                <span className="text-(--color-text-tertiary)">role:</span>{" "}
                <span className="text-(--color-signal)">{role}</span>
              </>
            ) : (
              <>
                <span className="text-(--color-text-tertiary)">role:</span>{" "}
                <span className="text-(--color-text-primary)">All roles · global market</span>
              </>
            )}
          </h1>
          <p className="mt-2 text-[13px] text-(--color-text-secondary) max-w-[70ch] leading-relaxed">
            {role ? (
              <>
                Showing skills extracted from{" "}
                <span className="font-mono text-(--color-text-primary)">
                  {matchedRows.toLocaleString()}
                </span>{" "}
                postings that match your role.{" "}
                {usingFallback ? (
                  <span className="text-(--color-data-down)">
                    Few exact matches found — broadened to text search across descriptions.
                  </span>
                ) : (
                  <>Sort by any column. Press <span className="font-mono text-(--color-text-primary)">↵</span> on a row to open detail.</>
                )}
              </>
            ) : (
              <>
                No role specified. Showing the global skill ranking across the whole dataset.{" "}
                <Link href="/" className="text-(--color-signal) hover:underline">
                  Set a role →
                </Link>
              </>
            )}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {known.size ? (
              <>
                <span className="caption text-(--color-text-tertiary)">YOU HAVE</span>
                {[...known].slice(0, 8).map((k) => (
                  <Pill key={k} tone="up">
                    ✓ {k}
                  </Pill>
                ))}
                {known.size > 8 ? (
                  <span className="caption text-(--color-text-tertiary)">+{known.size - 8} MORE</span>
                ) : null}
              </>
            ) : (
              <>
                <span className="caption text-(--color-text-tertiary)">FIT COLUMN HIDDEN</span>
                <Link href={`/?role=${encodeURIComponent(role)}`} className="caption text-(--color-signal) hover:underline">
                  ADD YOUR SKILLS →
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="flex-1 max-w-[1320px] w-full mx-auto">
        {scored.length ? (
          <Watchlist
            skills={scored}
            role={role}
            knownSkills={[...known]}
          />
        ) : (
          <div className="px-6 py-24 text-center">
            <p className="caption text-(--color-text-tertiary) mb-2">EMPTY STATE</p>
            <p className="font-mono text-[14px] text-(--color-text-primary)">
              NO SKILLS MATCH ROLE "{role || "—"}"
            </p>
            <Link href="/" className="mt-4 inline-block caption text-(--color-signal) hover:underline">
              ← TRY A DIFFERENT ROLE
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
