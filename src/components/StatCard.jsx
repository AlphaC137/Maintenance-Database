import { cn } from "@/lib/utils";

export default function StatCard({ icon: Icon, label, value, tone = "primary", loading }) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    red: "bg-red-500/10 text-red-600 dark:text-red-400",
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400"
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", tones[tone])}>
          {Icon && <Icon className="h-[18px] w-[18px]" />}
        </div>
      </div>
      <p className="mt-3 font-display text-3xl font-semibold tracking-tight">
        {loading ? <span className="inline-block h-7 w-12 animate-pulse rounded bg-muted" /> : value}
      </p>
    </div>
  );
}