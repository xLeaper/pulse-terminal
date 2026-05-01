export function KeyHint({ label }: { label: string }) {
  return (
    <kbd className="inline-flex items-center justify-center px-1.5 h-[18px] font-mono text-[10px] tracking-wider text-(--color-text-secondary) border border-(--color-border-strong) rounded-[2px] bg-(--color-surface-2)">
      {label}
    </kbd>
  );
}
