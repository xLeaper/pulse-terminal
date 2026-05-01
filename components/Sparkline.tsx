// SVG sparkline. Pure data, no Plotly. ~64x16 by default.
// Color picks itself from change direction unless `tone` is overridden.

type Tone = "auto" | "up" | "down" | "flat" | "signal";

export function Sparkline({
  data,
  width = 64,
  height = 16,
  tone = "auto",
  fill = false,
  ariaLabel,
}: {
  data: number[];
  width?: number;
  height?: number;
  tone?: Tone;
  fill?: boolean;
  ariaLabel?: string;
}) {
  if (!data?.length) {
    return (
      <span
        className="inline-block opacity-40 font-mono text-[10px] text-(--color-text-tertiary)"
        style={{ width, height }}
        aria-label="no data"
      >
        — — —
      </span>
    );
  }

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = Math.max(max - min, 1);
  const stepX = data.length > 1 ? width / (data.length - 1) : width;

  const points = data
    .map((d, i) => {
      const x = i * stepX;
      const y = height - ((d - min) / range) * (height - 2) - 1;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  // Pick tone if auto.
  const half = Math.floor(data.length / 2);
  const recentSum = data.slice(half).reduce((a, b) => a + b, 0);
  const priorSum = data.slice(0, half).reduce((a, b) => a + b, 0) || 0.0001;
  const direction =
    tone === "auto" ? (recentSum > priorSum * 1.05 ? "up" : recentSum < priorSum * 0.95 ? "down" : "flat") : tone;

  const stroke =
    direction === "up"
      ? "var(--color-data-up)"
      : direction === "down"
      ? "var(--color-data-down)"
      : direction === "signal"
      ? "var(--color-signal)"
      : "var(--color-data-flat)";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel ?? `Sparkline trend, direction ${direction}`}
      className="overflow-visible"
    >
      {fill ? (
        <polygon
          points={`0,${height} ${points} ${width},${height}`}
          fill={stroke}
          fillOpacity={0.16}
        />
      ) : null}
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth={1}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Endpoint dot */}
      <circle
        cx={(data.length - 1) * stepX}
        cy={height - ((data[data.length - 1] - min) / range) * (height - 2) - 1}
        r={1.4}
        fill={stroke}
      />
    </svg>
  );
}
