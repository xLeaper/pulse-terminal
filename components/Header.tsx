"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { KeyHint } from "./KeyHint";
import { useShell } from "./TerminalShell";

const NAV: { label: string; href: string; key: string }[] = [
  { label: "Watchlist", href: "/watchlist", key: "W" },
  { label: "Recruiter", href: "/recruiter", key: "R" },
  { label: "Sources", href: "/sources", key: "S" },
];

function useTicker() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function fmtIso(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function Header() {
  const pathname = usePathname();
  const now = useTicker();
  const { density, setDensity, setPaletteOpen, setShortcutsOpen } = useShell();

  return (
    <header className="border-b border-(--color-border-subtle) panel">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-10 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 group">
          <span
            className="inline-block size-2 rounded-full bg-(--color-signal)"
            aria-hidden
          />
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-(--color-text-primary) group-hover:text-(--color-signal) transition-colors">
            Pulse Terminal
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1" aria-label="Primary">
          {NAV.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors ${
                  active
                    ? "text-(--color-signal)"
                    : "text-(--color-text-secondary) hover:text-(--color-text-primary)"
                }`}
              >
                {item.label}
                {active ? (
                  <span
                    className="absolute left-3 right-3 -bottom-px h-px bg-(--color-signal)"
                    aria-hidden
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1 hidden lg:flex items-center justify-center">
          <span className="ticker tabular-nums" suppressHydrationWarning>
            {now ? fmtIso(now) : "----------T--:--:--Z"}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDensity(density === "compact" ? "comfortable" : "compact")}
            className="font-mono text-[11px] uppercase tracking-[0.12em] text-(--color-text-secondary) hover:text-(--color-text-primary) px-2 py-1"
            aria-label={`Switch to ${density === "compact" ? "comfortable" : "compact"} density`}
            title={`Density: ${density.toUpperCase()}  ⌘⇧D`}
          >
            <span aria-hidden>≡</span>{" "}
            <span className="hidden sm:inline">{density === "compact" ? "compact" : "comfy"}</span>
          </button>

          <button
            type="button"
            onClick={() => setShortcutsOpen(true)}
            className="font-mono text-[11px] uppercase tracking-[0.12em] text-(--color-text-secondary) hover:text-(--color-text-primary) size-6 grid place-items-center border border-(--color-border-subtle) rounded-[2px]"
            aria-label="Show keyboard shortcuts"
            title="Keyboard shortcuts  ?"
          >
            ?
          </button>

          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="hidden sm:flex items-center gap-2 px-2 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-(--color-text-secondary) hover:text-(--color-text-primary) border border-(--color-border-subtle) rounded-[2px]"
            aria-label="Open command palette"
          >
            <span>Search</span>
            <KeyHint label="⌘K" />
          </button>
        </div>
      </div>
    </header>
  );
}
