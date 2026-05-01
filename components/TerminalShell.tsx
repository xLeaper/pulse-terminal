"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { CommandPalette } from "./CommandPalette";
import { ShortcutsOverlay } from "./ShortcutsOverlay";

type Density = "comfortable" | "compact";

type ShellState = {
  density: Density;
  setDensity: (d: Density) => void;
  paletteOpen: boolean;
  setPaletteOpen: (b: boolean) => void;
  shortcutsOpen: boolean;
  setShortcutsOpen: (b: boolean) => void;
};

const ShellCtx = createContext<ShellState | null>(null);

export function useShell(): ShellState {
  const ctx = useContext(ShellCtx);
  if (!ctx) throw new Error("useShell must be used inside <TerminalShell>");
  return ctx;
}

export function TerminalShell({ children }: { children: React.ReactNode }) {
  const [density, setDensityState] = useState<Density>("comfortable");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Persist density across navigations within a session.
  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("jp.density") : null;
    if (stored === "compact" || stored === "comfortable") {
      setDensityState(stored);
    }
  }, []);

  const setDensity = useCallback((d: Density) => {
    setDensityState(d);
    document.documentElement.setAttribute("data-density", d);
    window.localStorage.setItem("jp.density", d);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-density", density);
  }, [density]);

  // Global shortcuts.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl+K — palette
      if (isMod && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      // Cmd/Ctrl+Shift+D — toggle density
      if (isMod && e.shiftKey && (e.key === "D" || e.key === "d")) {
        e.preventDefault();
        setDensity(density === "compact" ? "comfortable" : "compact");
        return;
      }
      // ? — shortcuts overlay
      if (e.key === "?" && !isMod) {
        const t = e.target as HTMLElement | null;
        const tag = t?.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea" || t?.isContentEditable) return;
        e.preventDefault();
        setShortcutsOpen((s) => !s);
        return;
      }
      if (e.key === "Escape") {
        if (paletteOpen) setPaletteOpen(false);
        if (shortcutsOpen) setShortcutsOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [density, setDensity, paletteOpen, shortcutsOpen]);

  const value = useMemo(
    () => ({ density, setDensity, paletteOpen, setPaletteOpen, shortcutsOpen, setShortcutsOpen }),
    [density, setDensity, paletteOpen, shortcutsOpen],
  );

  return (
    <ShellCtx.Provider value={value}>
      {children}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <ShortcutsOverlay open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </ShellCtx.Provider>
  );
}
