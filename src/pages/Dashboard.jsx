import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { MapPin, Cctv, Server, CheckCircle2, WifiOff, Plus, Server as ServerIcon, FileText, AlertTriangle, Star, Calendar } from "lucide-react";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import SiteFormDialog from "@/components/SiteFormDialog";
import PlatformFormDialog from "@/components/PlatformFormDialog";
import { Button } from "@/components/ui/button";
import { canEdit } from "@/lib/roles";
import { useAuth } from "@/lib/AuthContext";
import { useSites, usePlatforms, useCameras, useAuditLogs } from "@/hooks/useEntities";

const CHART_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#a855f7", "#f97316"];

function monthKey(d) {
  const date = new Date(d);
  return date.toLocaleString("default", { month: "short", year: "2-digit" });
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: platforms = [], isLoading: loadingPlatforms } = usePlatforms();
  const { data: sites = [], isLoading: loadingSites, refetch: reloadSites } = useSites();
  const { data: cameras = [], isLoading: loadingCameras } = useCameras();
  const { data: audit = [], isLoading: loadingAudit } = useAuditLogs(10);
  const [siteDialog, setSiteDialog] = useState(false);
  const [platformDialog, setPlatformDialog] = useState(false);

  const loading = loadingPlatforms || loadingSites || loadingCameras || loadingAudit;

  const platformName = (id) => platforms.find((p) => p.id === id)?.name || "—";
  const platformColor = (id) => platforms.find((p) => p.id === id)?.color || CHART_COLORS[0];

  const totalSites = sites.length;
  const totalCameras = sites.reduce((s, x) => s + (x.channel_count || 0), 0);
  const activeSites = sites.filter((s) => s.site_status === "Active").length;
  const offlineSites = sites.filter((s) => s.site_status === "Offline").length;

  const camerasByPlatform = platforms.map((p) => ({
    name: p.name,
    cameras: sites.filter((s) => s.platform_id === p.id).reduce((sum, s) => sum + (s.channel_count || 0), 0)
  })).filter((x) => x.cameras > 0 || true);

  const sitesByPlatform = platforms.map((p) => ({
    name: p.name,
    value: sites.filter((s) => s.platform_id === p.id).length,
    color: p.color || CHART_COLORS[0]
  })).filter((x) => x.value > 0);

  const siteMonths = {};
  sites.forEach((s) => { if (s.created_date) { const k = monthKey(s.created_date); siteMonths[k] = (siteMonths[k] || 0) + 1; } });
  const cameraMonths = {};
  cameras.forEach((c) => { if (c.created_date) { const k = monthKey(c.created_date); cameraMonths[k] = (cameraMonths[k] || 0) + 1; } });
  const monthKeys = Array.from(new Set([...Object.keys(siteMonths), ...Object.keys(cameraMonths)])).slice(-12);
  const siteTrend = monthKeys.map((k) => ({ month: k, sites: siteMonths[k] || 0 }));
  const cameraTrend = monthKeys.map((k) => ({ month: k, cameras: cameraMonths[k] || 0 }));

  const recentSites = [...sites].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 5);
  const favoriteSites = sites.filter((s) => s.is_favorite).slice(0, 8);
  const recentModified = [...sites].sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date)).slice(0, 5);
  const incomplete = sites.filter((s) => !s.client_company || !s.physical_address || !s.province).slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Operational overview of all CCTV sites</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setSiteDialog(true)} disabled={!canEdit(user)}><Plus className="mr-1.5 h-4 w-4" /> Add Site</Button>
          <Button variant="outline" onClick={() => setPlatformDialog(true)} disabled={!canEdit(user)}><ServerIcon className="mr-1.5 h-4 w-4" /> Add Platform</Button>
          <Button variant="outline" onClick={() => navigate("/reports")}><FileText className="mr-1.5 h-4 w-4" /> Reports</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard icon={MapPin} label="Total Sites" value={totalSites} tone="primary" loading={loading} />
        <StatCard icon={Cctv} label="Total Cameras" value={totalCameras} tone="blue" loading={loading} />
        <StatCard icon={Server} label="Platforms" value={platforms.length} tone="violet" loading={loading} />
        <StatCard icon={CheckCircle2} label="Active Sites" value={activeSites} tone="emerald" loading={loading} />
        <StatCard icon={WifiOff} label="Offline Sites" value={offlineSites} tone="red" loading={loading} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Cameras by Platform">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={camerasByPlatform} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="cameras" radius={[6, 6, 0, 0]} fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Sites by Platform">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={sitesByPlatform} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={2}>
                {sitesByPlatform.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Monthly Site Additions">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={siteTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="sites" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Monthly Camera Additions">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={cameraTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="cameras" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Favorite Sites" icon={<Star className="h-4 w-4 fill-amber-400 text-amber-400" />}>
          {loading ? <SkeletonRows /> : favoriteSites.length === 0 ? (
            <Empty msg="No favorites yet — star sites from the Sites list" />
          ) : (
            <SiteMiniTable rows={favoriteSites} platformName={platformName} onClick={(id) => navigate(`/sites/${id}`)} loading={loading} />
          )}
        </Panel>
        <Panel title="Recently Added Sites">
          <SiteMiniTable rows={recentSites} platformName={platformName} onClick={(id) => navigate(`/sites/${id}`)} loading={loading} />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Recently Modified Sites">
          <SiteMiniTable rows={recentModified} platformName={platformName} onClick={(id) => navigate(`/sites/${id}`)} loading={loading} />
        </Panel>
        <Panel title="Recent Activity">
          {loading ? <SkeletonRows /> : audit.length === 0 ? <Empty msg="No activity yet" /> : (
            <ul className="divide-y divide-border">
              {audit.map((a) => (
                <li key={a.id} className="py-2.5">
                  <p className="text-sm font-medium">{a.description || a.action}</p>
                  <p className="text-xs text-muted-foreground">{a.user_email} · {a.created_date ? new Date(a.created_date).toLocaleString() : ""}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Overdue Maintenance Services" icon={<Calendar className="h-4 w-4 text-rose-500" />}>
          {loading ? <SkeletonRows /> : (() => {
            const today = new Date().toISOString().split('T')[0];
            const overdueSites = sites.filter((s) => s.next_service_due && s.next_service_due < today);
            if (overdueSites.length === 0) return <Empty msg="All sites are up to date on maintenance!" />;
            return (
              <ul className="divide-y divide-border">
                {overdueSites.slice(0, 5).map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-2.5 text-sm">
                    <div>
                      <button onClick={() => navigate(`/sites/${s.id}`)} className="font-medium hover:underline text-left block">{s.site_name}</button>
                      <span className="text-xs text-muted-foreground">{s.client_company || "Client unassigned"}</span>
                    </div>
                    <div className="text-right">
                      <span className="rounded bg-rose-500/15 px-2 py-0.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                        Due: {s.next_service_due}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            );
          })()}
        </Panel>
        <Panel title="Sites with Missing Information" icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}>
          {loading ? <SkeletonRows /> : incomplete.length === 0 ? <Empty msg="All sites have complete info" /> : (
            <ul className="divide-y divide-border">
              {incomplete.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2.5 text-sm">
                  <button onClick={() => navigate(`/sites/${s.id}`)} className="font-medium hover:underline">{s.site_name}</button>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {!s.client_company && <Tag>no client</Tag>}
                    {!s.physical_address && <Tag>no address</Tag>}
                    {!s.province && <Tag>no province</Tag>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <SiteFormDialog open={siteDialog} onOpenChange={setSiteDialog} platforms={platforms} onSaved={reloadSites} />
      <PlatformFormDialog open={platformDialog} onOpenChange={setPlatformDialog} platforms={platforms} onSaved={reloadSites} />
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h3 className="mb-4 font-display text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function Panel({ title, icon, children }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold">{icon}{title}</h3>
      {children}
    </div>
  );
}

function SiteMiniTable({ rows, platformName, onClick, loading }) {
  if (loading) return <SkeletonRows />;
  if (!rows.length) return <Empty msg="No sites yet" />;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-muted-foreground">
          <th className="pb-2 font-medium">Site</th>
          <th className="pb-2 font-medium">Platform</th>
          <th className="pb-2 font-medium">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {rows.map((s) => (
          <tr key={s.id} className="cursor-pointer hover:bg-accent/50" onClick={() => onClick(s.id)}>
            <td className="py-2.5 font-medium">{s.site_name}</td>
            <td className="py-2.5 text-muted-foreground">{platformName(s.platform_id)}</td>
            <td className="py-2.5"><StatusBadge status={s.site_status} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Tag({ children }) {
  return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">{children}</span>;
}

function Empty({ msg }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{msg}</p>;
}

function SkeletonRows() {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-8 animate-pulse rounded bg-muted" />)}
    </div>
  );
}