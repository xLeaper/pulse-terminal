"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function EntryPrompt({ suggestions }: { suggestions: string[] }) {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [skills, setSkills] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // `/` focuses the role input from anywhere on the page.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/") return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || t?.isContentEditable) return;
      e.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!role.trim()) return;
    const q = new URLSearchParams();
    q.set("role", role.trim());
    if (skills.trim()) q.set("skills", skills.trim());
    router.push(`/watchlist?${q.toString()}`);
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex items-stretch border border-(--color-border-strong) bg-(--color-surface-1) focus-within:border-(--color-signal) transition-colors">
        <span
          className="grid place-items-center px-3 text-(--color-signal) font-mono text-[16px]"
          aria-hidden
        >
          {">"}
        </span>
        <input
          ref={inputRef}
          type="text"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="e.g. Data Analyst, Software Engineer, Product Manager"
          className="flex-1 bg-transparent outline-none font-mono text-[16px] py-3 pr-3 text-(--color-text-primary) placeholder:text-(--color-text-tertiary)"
          aria-label="Target role or category"
          autoFocus
        />
        <button
          type="submit"
          disabled={!role.trim()}
          className="px-4 font-mono text-[12px] uppercase tracking-[0.12em] bg-(--color-signal) text-(--color-text-on-accent) disabled:bg-(--color-surface-3) disabled:text-(--color-text-tertiary) transition-colors hover:bg-(--color-signal-dim) disabled:hover:bg-(--color-surface-3)"
        >
          run ↵
        </button>
      </div>

      <div className="flex items-stretch border border-(--color-border-subtle) bg-(--color-surface-1) focus-within:border-(--color-border-strong) transition-colors">
        <span className="grid place-items-center px-3 text-(--color-text-tertiary) font-mono text-[12px]" aria-hidden>
          ::
        </span>
        <input
          type="text"
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
          placeholder="optional: skills you already have, comma-separated (Python, SQL, Excel…)"
          className="flex-1 bg-transparent outline-none font-mono text-[13px] py-2 pr-3 text-(--color-text-primary) placeholder:text-(--color-text-tertiary)"
          aria-label="Your current skills"
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap pt-1">
        <span className="caption text-(--color-text-tertiary) mr-1">TRY</span>
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setRole(s)}
            className="font-mono text-[11px] tracking-wider text-(--color-text-secondary) hover:text-(--color-signal) border border-(--color-border-subtle) hover:border-(--color-signal-dim) px-2 py-0.5 transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </form>
  );
}
