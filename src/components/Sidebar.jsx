import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  MapPin,
  Server,
  FileText,
  ScrollText,
  Settings,
  Cctv,
  X,
  Building2
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/sites", label: "Sites", icon: MapPin },
  { to: "/clients", label: "Clients", icon: Building2 },
  { to: "/platforms", label: "Platforms", icon: Server },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/audit", label: "Audit Log", icon: ScrollText },
  { to: "/settings", label: "Settings", icon: Settings }
];

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 w-64 shrink-0 border-r border-border bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-border px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Cctv className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <p className="font-display text-sm font-semibold tracking-tight">CCTV Sites</p>
              <p className="text-[11px] text-muted-foreground">Maintenance Operations</p>
            </div>
          </div>
          <button className="lg:hidden text-muted-foreground" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )
              }
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}