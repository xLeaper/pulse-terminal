export function ChartFrame({
  figNumber,
  title,
  source,
  children,
  height = 240,
}: {
  figNumber: string;
  title: string;
  source: string;
  children: React.ReactNode;
  height?: number;
}) {
  return (
    <figure className="border border-(--color-border-subtle) bg-(--color-surface-1)">
      <figcaption className="px-3 sm:px-4 h-7 flex items-center justify-between border-b border-(--color-border-subtle)">
        <span className="caption">
          FIG. {figNumber}{" "}
          <span className="text-(--color-text-tertiary)">·</span>{" "}
          <span className="text-(--color-text-primary)">{title}</span>
        </span>
      </figcaption>
      <div className="p-3 sm:p-4" style={{ minHeight: height }}>
        {children}
      </div>
      <div className="px-3 sm:px-4 h-6 flex items-center border-t border-(--color-border-subtle)">
        <span className="text-[10px] font-mono text-(--color-text-tertiary) tracking-wider">
          Source: {source}
        </span>
      </div>
    </figure>
  );
}
