import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { Menu, Search, Bell, Sun, Moon, User as UserIcon, LogOut } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/roles";

export default function Topbar({ user, onMenu, onOpenCommandPalette }) {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [q, setQ] = useState("");
  const [mounted, setMounted] = useState(false);
  const notifRef = useRef(null);
  const userRef = useRef(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function onClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const onSearch = (e) => {
    e.preventDefault();
    if (q.trim()) navigate(`/sites?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md">
      <button className="lg:hidden text-foreground" onClick={onMenu}>
        <Menu className="h-5 w-5" />
      </button>

      <button
        onClick={() => onOpenCommandPalette?.()}
        className="flex flex-1 max-w-md items-center justify-between rounded-xl border border-input bg-muted/40 px-3 py-2 text-sm text-muted-foreground hover:bg-accent/60 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <span>Search sites, clients, platforms…</span>
        </div>
        <kbd className="hidden sm:inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground border border-border">
          <span>⌘</span><span>K</span>
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
          title="Toggle theme"
        >
          {mounted && theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </button>

        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Bell className="h-[18px] w-[18px]" />
            <NotificationBadge />
          </button>
          {notifOpen && <NotificationsDropdown onClose={() => setNotifOpen(false)} />}
        </div>

        <div className="relative" ref={userRef}>
          <button
            onClick={() => setUserOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-accent"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
              {(user?.full_name || user?.email || "U").charAt(0).toUpperCase()}
            </div>
            <span className="hidden sm:block text-sm font-medium max-w-[140px] truncate">
              {user?.full_name || user?.email}
            </span>
          </button>
          {userOpen && (
            <div className="absolute right-0 mt-2 w-60 rounded-xl border border-border bg-popover p-2 shadow-lg">
              <div className="px-3 py-2 border-b border-border mb-1">
                <p className="text-sm font-medium truncate">{user?.full_name || "User"}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                <span className="mt-1 inline-block rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                  {ROLE_LABELS[user?.role] || user?.role}
                </span>
              </div>
              <button
                onClick={() => navigate("/settings")}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent"
              >
                <UserIcon className="h-4 w-4" /> Settings
              </button>
              <button
                onClick={() => base44.auth.logout()}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function NotificationBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    base44.entities.Notification.list("-created_date", 50)
      .then((items) => setCount(items.filter((n) => !n.is_read).length))
      .catch(() => {});
  }, []);

  if (!count) return null;
  return (
    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
      {count > 9 ? "9+" : count}
    </span>
  );
}

function NotificationsDropdown({ onClose }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    base44.entities.Notification.list("-created_date", 20)
      .then(setItems)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const markRead = async (n) => {
    if (n.is_read) return;
    await base44.entities.Notification.update(n.id, { is_read: true });
    setItems((prev) => prev.map((x) => x.id === n.id ? { ...x, is_read: true } : x));
  };

  const markAllRead = async () => {
    const unread = items.filter((n) => !n.is_read);
    await Promise.all(unread.map((n) => base44.entities.Notification.update(n.id, { is_read: true })));
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const openNotification = async (n) => {
    await markRead(n);
    if (n.related_entity_id) {
      navigate(`/sites/${n.related_entity_id}`);
      onClose?.();
    }
  };

  const unreadCount = items.filter((n) => !n.is_read).length;

  return (
    <div className="absolute right-0 mt-2 w-80 rounded-xl border border-border bg-popover shadow-lg overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <span className="text-sm font-semibold">Notifications</span>
        {unreadCount > 0 && (
          <button type="button" onClick={markAllRead} className="text-xs text-primary hover:underline">Mark all read</button>
        )}
      </div>
      <div className="max-h-80 overflow-y-auto">
        {loading ? (
          <p className="p-4 text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No notifications</p>
        ) : (
          items.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => openNotification(n)}
              className={cn("block w-full px-4 py-2.5 text-left border-b border-border/60 hover:bg-accent/60", !n.is_read && "bg-accent/40")}
            >
              <p className="text-sm font-medium">{n.title}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
