"use client";

import { useEffect } from "react";
import { KeyHint } from "./KeyHint";

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["⌘", "K"], label: "Open command palette" },
  { keys: ["/"], label: "Focus search input" },
  { keys: ["↑", "↓"], label: "Walk the watchlist" },
  { keys: ["↵"], label: "Open selected skill" },
  { keys: ["esc"], label: "Close drawer / overlay" },
  { keys: ["⌘", "⇧", "D"], label: "Toggle density (compact / comfy)" },
  { keys: ["W"], label: "Go to Watchlist" },
  { keys: ["R"], label: "Go to Recruiter mode" },
  { keys: ["S"], label: "Go to Sources" },
  { keys: ["?"], label: "Toggle this overlay" },
];

export function ShortcutsOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-(--color-surface-0)/85" />
      <div
        className="relative panel-2 border border-(--color-border-strong) w-full max-w-[480px] panel-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 h-9 flex items-center justify-between border-b border-(--color-border-subtle)">
          <span className="caption">Keyboard shortcuts</span>
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-[11px] text-(--color-text-secondary) hover:text-(--color-text-primary)"
            aria-label="Close"
          >
            esc
          </button>
        </div>
        <ul className="divide-y divide-(--color-border-subtle)">
          {SHORTCUTS.map((s) => (
            <li
              key={s.label}
              className="px-4 h-8 flex items-center justify-between font-mono text-[12px]"
            >
              <span className="text-(--color-text-primary)">{s.label}</span>
              <span className="flex gap-1">
                {s.keys.map((k) => (
                  <KeyHint key={k} label={k} />
                ))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
