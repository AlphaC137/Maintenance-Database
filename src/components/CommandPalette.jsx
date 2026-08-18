import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Command } from "cmdk";
import { Search, MapPin, Server, Users, LayoutDashboard, FileText, ShieldAlert } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function CommandPalette({ open, onOpenChange }) {
  const navigate = useNavigate();
  const [sites, setSites] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const down = (e) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [onOpenChange]);

  useEffect(() => {
    if (open) {
      Promise.all([
        base44.entities.Site.list("-created_date", 200),
        base44.entities.Platform.list()
      ]).then(([st, pl]) => {
        setSites(st);
        setPlatforms(pl);
      });
    }
  }, [open]);

  if (!open) return null;

  const runCommand = (action) => {
    onOpenChange(false);
    action();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-20 backdrop-blur-sm animate-in fade-in-0">
      <div
        className="fixed inset-0"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl">
        <Command className="w-full" label="Global Command Menu">
          <div className="flex items-center border-b border-border px-4 py-3">
            <Search className="mr-3 h-5 w-5 text-muted-foreground" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Type a command or search sites, clients, platforms… (ESC to exit)"
              className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
              autoFocus
            />
            <kbd className="hidden rounded bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground sm:inline-block">ESC</kbd>
          </div>

          <Command.List className="max-h-[380px] overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
              No results found for "{query}".
            </Command.Empty>

            <Command.Group heading="Navigation" className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              <Command.Item
                onSelect={() => runCommand(() => navigate("/"))}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent aria-selected:bg-accent"
              >
                <LayoutDashboard className="h-4 w-4 text-primary" />
                <span>Dashboard</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => navigate("/sites"))}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent aria-selected:bg-accent"
              >
                <MapPin className="h-4 w-4 text-emerald-500" />
                <span>All Sites</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => navigate("/clients"))}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent aria-selected:bg-accent"
              >
                <Users className="h-4 w-4 text-blue-500" />
                <span>Clients</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => navigate("/platforms"))}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent aria-selected:bg-accent"
              >
                <Server className="h-4 w-4 text-violet-500" />
                <span>Platforms</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => navigate("/reports"))}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent aria-selected:bg-accent"
              >
                <FileText className="h-4 w-4 text-amber-500" />
                <span>Reports</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => navigate("/audit"))}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent aria-selected:bg-accent"
              >
                <ShieldAlert className="h-4 w-4 text-rose-500" />
                <span>Audit Logs</span>
              </Command.Item>
            </Command.Group>

            <Command.Separator className="my-1.5 h-px bg-border" />

            <Command.Group heading="Sites" className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              {sites.slice(0, 15).map((s) => (
                <Command.Item
                  key={s.id}
                  value={`${s.site_name} ${s.site_code} ${s.client_company} ${s.province}`}
                  onSelect={() => runCommand(() => navigate(`/sites/${s.id}`))}
                  className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-accent aria-selected:bg-accent"
                >
                  <div className="flex items-center gap-2.5">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="font-medium text-foreground">{s.site_name}</span>
                      {s.client_company && <span className="ml-2 text-xs text-muted-foreground">({s.client_company})</span>}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{s.province || s.site_code || ""}</span>
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Separator className="my-1.5 h-px bg-border" />

            <Command.Group heading="Platforms" className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              {platforms.map((p) => (
                <Command.Item
                  key={p.id}
                  value={p.name}
                  onSelect={() => runCommand(() => navigate(`/sites?platform=${p.id}`))}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-accent aria-selected:bg-accent"
                >
                  <Server className="h-4 w-4 text-violet-400" />
                  <span>{p.name}</span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>

          <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
            <span>Use <kbd className="rounded bg-muted px-1.5 py-0.5">↑</kbd> <kbd className="rounded bg-muted px-1.5 py-0.5">↓</kbd> to navigate</span>
            <span>Press <kbd className="rounded bg-muted px-1.5 py-0.5">ESC</kbd> to close</span>
          </div>
        </Command>
      </div>
    </div>
  );
}
