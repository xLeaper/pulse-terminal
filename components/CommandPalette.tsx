"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { skills } from "@/lib/data";
import { useShell } from "./TerminalShell";

type Action = {
  id: string;
  label: string;
  hint?: string;
  group: "Skills" | "Navigate" | "Mode" | "Roles";
  keywords?: string[];
  perform: () => void;
};

const ROLES = [
  "Data Analyst",
  "Software Engineer",
  "Machine Learning Engineer",
  "Product Manager",
  "UI/UX Designer",
  "Marketing Manager",
  "DevOps Engineer",
  "Customer Support Lead",
  "Operations Manager",
  "HR Business Partner",
];

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { setDensity, density } = useShell();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const actions = useMemo<Action[]>(() => {
    const navigate: Action[] = [
      {
        id: "nav-watchlist",
        label: "Open Watchlist",
        hint: "W",
        group: "Navigate",
        perform: () => router.push("/watchlist"),
      },
      {
        id: "nav-recruiter",
        label: "Switch to Recruiter mode",
        hint: "R",
        group: "Navigate",
        perform: () => router.push("/recruiter"),
      },
      {
        id: "nav-sources",
        label: "View data sources",
        hint: "S",
        group: "Navigate",
        perform: () => router.push("/sources"),
      },
      {
        id: "nav-entry",
        label: "Return to entry prompt",
        group: "Navigate",
        perform: () => router.push("/"),
      },
    ];
    const modes: Action[] = [
      {
        id: "mode-density",
        label: `Toggle density (now ${density.toUpperCase()})`,
        hint: "⌘⇧D",
        group: "Mode",
        perform: () => setDensity(density === "compact" ? "comfortable" : "compact"),
      },
    ];
    const skillActions: Action[] = skills.slice(0, 60).map((s) => ({
      id: `skill-${s.key}`,
      label: `Open detail · ${s.name}`,
      hint: `${s.jobCount} postings`,
      group: "Skills",
      keywords: [s.name, s.topCategory],
      perform: () => router.push(`/skill/${encodeURIComponent(s.key)}`),
    }));
    const roleActions: Action[] = ROLES.map((role) => ({
      id: `role-${role}`,
      label: `Watchlist for · ${role}`,
      group: "Roles",
      keywords: [role],
      perform: () => router.push(`/watchlist?role=${encodeURIComponent(role)}`),
    }));
    return [...navigate, ...modes, ...roleActions, ...skillActions];
  }, [router, setDensity, density]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-start pt-[10vh] sm:pt-[14vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-(--color-surface-0)/85" />
      <div
        className="relative w-full max-w-[640px] mx-4 panel-2 border border-(--color-border-strong) shadow-xl panel-in"
        onClick={(e) => e.stopPropagation()}
      >
        <Command label="Command palette" filter={(value, search, keywords) => {
          const haystack = (value + " " + (keywords?.join(" ") ?? "")).toLowerCase();
          const needle = search.toLowerCase();
          if (!needle) return 1;
          if (haystack.includes(needle)) return 1;
          // crude fuzzy: every char in needle appears in order
          let i = 0;
          for (const c of haystack) {
            if (c === needle[i]) i++;
            if (i === needle.length) return 0.6;
          }
          return 0;
        }}>
          <div className="px-4 h-11 flex items-center gap-2 border-b border-(--color-border-subtle)">
            <span className="text-(--color-signal) font-mono text-[14px]" aria-hidden>
              {">"}
            </span>
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Search skills, roles, or actions"
              className="flex-1 bg-transparent outline-none font-mono text-[14px] text-(--color-text-primary) placeholder:text-(--color-text-tertiary)"
            />
            <span className="caption">esc to close</span>
          </div>
          <Command.List className="max-h-[60vh] overflow-y-auto py-1">
            <Command.Empty className="px-4 py-6 caption text-(--color-text-tertiary)">
              NO RESULTS FOR "{query}"
            </Command.Empty>
            {(["Navigate", "Mode", "Roles", "Skills"] as const).map((group) => {
              const groupActions = actions.filter((a) => a.group === group);
              if (!groupActions.length) return null;
              return (
                <Command.Group
                  key={group}
                  heading={
                    <div className="px-4 pt-2 pb-1 caption text-(--color-text-tertiary)">{group}</div>
                  }
                >
                  {groupActions.map((a) => (
                    <Command.Item
                      key={a.id}
                      value={a.label}
                      keywords={a.keywords}
                      onSelect={() => {
                        a.perform();
                        onClose();
                      }}
                      className="px-4 h-8 flex items-center justify-between font-mono text-[13px] text-(--color-text-primary) cursor-pointer data-[selected=true]:bg-(--color-surface-3) data-[selected=true]:text-(--color-signal)"
                    >
                      <span>{a.label}</span>
                      {a.hint ? (
                        <span className="caption text-(--color-text-tertiary)">{a.hint}</span>
                      ) : null}
                    </Command.Item>
                  ))}
                </Command.Group>
              );
            })}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
