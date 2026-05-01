"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const PRESETS: { label: string; skills: string }[] = [
  { label: "Backend hire", skills: "Python, API, Cloud, AWS" },
  { label: "Data scientist", skills: "Python, SQL, Machine Learning, AI/ML" },
  { label: "Growth marketer", skills: "SEO, Google Analytics, Paid Marketing, CRM" },
  { label: "Product manager", skills: "Product Management, Agile, Stakeholder Management, Roadmapping" },
];

export function RecruiterForm({ initial }: { initial: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    router.push(trimmed ? `/recruiter?skills=${encodeURIComponent(trimmed)}` : "/recruiter");
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block">
        <span className="caption text-(--color-text-tertiary) block mb-1.5">REQUIRED SKILLS</span>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={4}
          placeholder="Python, SQL, AWS, Docker"
          className="w-full bg-(--color-surface-1) border border-(--color-border-strong) focus:border-(--color-signal) px-3 py-2 font-mono text-[13px] text-(--color-text-primary) placeholder:text-(--color-text-tertiary) outline-none transition-colors resize-y"
        />
      </label>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          className="px-4 py-1.5 font-mono text-[12px] uppercase tracking-[0.12em] bg-(--color-signal) text-(--color-text-on-accent) hover:bg-(--color-signal-dim) transition-colors"
        >
          evaluate ↵
        </button>
        <button
          type="button"
          onClick={() => {
            setValue("");
            router.push("/recruiter");
          }}
          className="px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-(--color-text-secondary) hover:text-(--color-text-primary)"
        >
          clear
        </button>
      </div>
      <div className="pt-2 border-t border-(--color-border-subtle)">
        <p className="caption text-(--color-text-tertiary) mb-2">PRESETS</p>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setValue(p.skills)}
              className="font-mono text-[11px] tracking-wider text-(--color-text-secondary) hover:text-(--color-signal) border border-(--color-border-subtle) hover:border-(--color-signal-dim) px-2 py-0.5 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}
