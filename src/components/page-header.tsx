import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  icon: LucideIcon;
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function PageHeader({ icon: Icon, eyebrow, title, description, actions }: Props) {
  return (
    <header className="page-header relative mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <span className="page-header-icon">
          <Icon className="h-5 w-5" strokeWidth={2.2} />
        </span>
        <div>
          {eyebrow && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">
              {eyebrow}
            </p>
          )}
          <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
          {description && (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
