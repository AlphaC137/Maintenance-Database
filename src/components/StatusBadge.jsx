import { cn } from "@/lib/utils";

const STATUS_STYLES = {
  Active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Offline: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  Archived: "bg-zinc-200 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-400",
  Faulty: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Maintenance: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400"
};

export default function StatusBadge({ status }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLES[status] || "bg-secondary text-secondary-foreground"
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status || "—"}
    </span>
  );
}