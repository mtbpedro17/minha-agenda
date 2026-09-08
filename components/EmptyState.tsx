import type { LucideIcon } from "lucide-react";

export default function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-elevated">
        <Icon size={22} className="text-muted" />
      </div>
      <div>
        <p className="font-medium text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
    </div>
  );
}
