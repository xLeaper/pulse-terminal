export function Pill({
  children,
  tone = "amber",
}: {
  children: React.ReactNode;
  tone?: "amber" | "neutral" | "up" | "down";
}) {
  const styles: Record<string, string> = {
    amber: "bg-(--color-signal-deep) text-(--color-text-primary)",
    neutral: "bg-(--color-surface-3) text-(--color-text-secondary)",
    up: "bg-(--color-data-up)/15 text-(--color-data-up) border border-(--color-data-up)/30",
    down: "bg-(--color-data-down)/15 text-(--color-data-down) border border-(--color-data-down)/30",
  };
  return (
    <span
      className={`inline-flex items-center px-1.5 py-[1px] font-mono text-[10px] uppercase tracking-[0.1em] rounded-[2px] ${styles[tone]}`}
    >
      {children}
    </span>
  );
}
