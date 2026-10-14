import { TECH_ICONS, techIconKey } from "@/lib/project-icons";
import { cn } from "@/lib/utils";

/** Technology chip with its logo when one is known (see TECH_PATTERNS), otherwise a dot. */
export function TechBadge({ name, className }: { name: string; className?: string }) {
  const iconKey = techIconKey(name);
  const Icon = iconKey ? TECH_ICONS[iconKey] : undefined;

  return (
    <span
      title={name}
      className={cn(
        "inline-flex max-w-44 items-center gap-1.5 rounded-md border border-foreground/12 bg-foreground/[0.04] px-2 py-1 text-[11px] font-medium text-foreground/85",
        className
      )}
    >
      {Icon ? (
        <Icon className="size-3.5 shrink-0 text-caramel" />
      ) : (
        <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-caramel" />
      )}
      <span className="truncate">{name}</span>
    </span>
  );
}
