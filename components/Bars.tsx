// A horizontal stacked bar series. Plain SVG. Used inside ChartFrame.

export function HBars({
  rows,
  max,
  height = 220,
  format = (n: number) => n.toString(),
  tone = "signal",
}: {
  rows: { label: string; value: number; sub?: string }[];
  max?: number;
  height?: number;
  format?: (n: number) => string;
  tone?: "signal" | "up" | "down" | "neutral";
}) {
  if (!rows.length) {
    return (
      <p className="caption text-(--color-text-tertiary)">NO ROWS TO PLOT</p>
    );
  }
  const peak = max ?? Math.max(...rows.map((r) => r.value), 1);
  // Cap row height so a 2-row chart doesn't explode vertically.
  const rowH = Math.min(36, Math.max(22, Math.floor(height / rows.length)));
  const fill =
    tone === "up"
      ? "var(--color-data-up)"
      : tone === "down"
      ? "var(--color-data-down)"
      : tone === "neutral"
      ? "var(--color-text-tertiary)"
      : "var(--color-signal)";

  return (
    <div className="space-y-px">
      {rows.map((r) => {
        const pct = (r.value / peak) * 100;
        return (
          <div
            key={r.label}
            className="grid items-center gap-2"
            style={{ gridTemplateColumns: "minmax(120px, 200px) 1fr 64px", height: rowH }}
          >
            <span className="font-mono text-[12px] text-(--color-text-primary) truncate">
              {r.label}
              {r.sub ? (
                <span className="text-(--color-text-tertiary) ml-1.5 text-[10px]">
                  {r.sub}
                </span>
              ) : null}
            </span>
            <div className="relative h-3 bg-(--color-surface-3)">
              <div
                className="absolute inset-y-0 left-0"
                style={{ width: `${pct}%`, background: fill }}
                aria-hidden
              />
            </div>
            <span className="font-mono text-[12px] text-right text-(--color-text-primary) tabular-nums">
              {format(r.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
