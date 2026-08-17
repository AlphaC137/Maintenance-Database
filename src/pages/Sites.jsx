import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, ChevronLeft, ChevronRight, Search, ArrowUpDown, Archive, Star, FileSpreadsheet, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import StatusBadge from "@/components/StatusBadge";
import SiteFormDialog from "@/components/SiteFormDialog";
import CsvImportExportModal from "@/components/CsvImportExportModal";
import { canEdit } from "@/lib/roles";
import { useAuth } from "@/lib/AuthContext";
import { useSites, usePlatforms, useMutateSite } from "@/hooks/useEntities";

const PAGE_SIZE = 15;
const STATUSES = ["Active", "Offline", "Archived"];

export default function Sites() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const { data: platforms = [], isLoading: loadingPlatforms } = usePlatforms();
  const { data: sites = [], isLoading: loadingSites, refetch: reloadSites } = useSites();
  const { updateSite, bulkUpdateSites } = useMutateSite();
  const [dialog, setDialog] = useState(false);
  const [csvModal, setCsvModal] = useState(false);
  const [search, setSearch] = useState(params.get("q") || "");
  const [fPlatform, setFPlatform] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [fProvince, setFProvince] = useState("all");
  const [fFavorites, setFFavorites] = useState(false);
  const [fOverdue, setFOverdue] = useState(false);
  const [sort, setSort] = useState({ key: "site_name", dir: "asc" });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(new Set());

  const loading = loadingPlatforms || loadingSites;

  const platformName = (id) => platforms.find((p) => p.id === id)?.name || "—";

  const provinces = useMemo(() => {
    return Array.from(new Set(sites.map((s) => s.province).filter(Boolean))).sort();
  }, [sites]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const today = new Date().toISOString().split('T')[0];

    let out = sites.filter((s) => {
      if (fPlatform !== "all" && s.platform_id !== fPlatform) return false;
      if (fStatus !== "all" && s.site_status !== fStatus) return false;
      if (fProvince !== "all" && s.province !== fProvince) return false;
      if (fFavorites && !s.is_favorite) return false;
      if (fOverdue && (!s.next_service_due || s.next_service_due >= today)) return false;
      if (q) {
        const hay = `${s.site_name} ${s.site_code || ""} ${s.client_company} ${s.tags?.join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    out.sort((a, b) => {
      const av = a[sort.key] ?? "";
      const bv = b[sort.key] ?? "";
      const r = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sort.dir === "asc" ? r : -r;
    });
    return out;
  }, [sites, search, fPlatform, fStatus, fProvince, fFavorites, fOverdue, sort]);

  useEffect(() => { setPage(1); setSelected(new Set()); }, [search, fPlatform, fStatus, fProvince, fFavorites, fOverdue]);

  const toggleFavorite = (e, site) => {
    e.stopPropagation();
    if (!canEdit(user)) return;
    updateSite.mutate({ id: site.id, data: { is_favorite: !site.is_favorite } });
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (key) => setSort((s) => s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" });
  const toggleSelect = (id) => setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allOnPageSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));
  const toggleAll = () => setSelected((prev) => {
    const n = new Set(prev);
    if (allOnPageSelected) pageRows.forEach((r) => n.delete(r.id));
    else pageRows.forEach((r) => n.add(r.id));
    return n;
  });

  const bulkArchive = async () => {
    const ids = Array.from(selected);
    await bulkUpdateSites.mutateAsync({ ids, data: { site_status: "Archived" } });
    setSelected(new Set());
  };

  const bulkMove = async (platformId) => {
    const ids = Array.from(selected);
    await bulkUpdateSites.mutateAsync({ ids, data: { platform_id: platformId } });
    setSelected(new Set());
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Sites</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} site{filtered.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setCsvModal(true)}>
            <FileSpreadsheet className="mr-1.5 h-4 w-4" /> Import / Export CSV
          </Button>
          <Button onClick={() => setDialog(true)} disabled={!canEdit(user)}>
            <Plus className="mr-1.5 h-4 w-4" /> Add Site
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, client, tags…" className="pl-9" />
          </div>
          <Select value={fPlatform} onValueChange={setFPlatform}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Platform" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All platforms</SelectItem>
              {platforms.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={fStatus} onValueChange={setFStatus}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={fProvince} onValueChange={setFProvince}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Province" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All provinces</SelectItem>
              {provinces.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant={fFavorites ? "default" : "outline"}
            size="sm"
            onClick={() => setFFavorites((v) => !v)}
            className="gap-1.5"
          >
            <Star className={`h-3.5 w-3.5 ${fFavorites ? "fill-current" : ""}`} />
            Favorites
          </Button>
          <Button
            type="button"
            variant={fOverdue ? "destructive" : "outline"}
            size="sm"
            onClick={() => setFOverdue((v) => !v)}
            className="gap-1.5"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Overdue Service
          </Button>
        </div>

        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-accent/40 px-3 py-2 text-sm">
            <span className="font-medium">{selected.size} selected</span>
            <span className="text-muted-foreground">·</span>
            <Select onValueChange={bulkMove}>
              <SelectTrigger className="h-8 w-[180px]"><SelectValue placeholder="Move to platform…" /></SelectTrigger>
              <SelectContent>{platforms.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={bulkArchive} disabled={!canEdit(user)}><Archive className="mr-1.5 h-3.5 w-3.5" /> Archive</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="w-10 px-3 py-2.5"><input type="checkbox" checked={allOnPageSelected} onChange={toggleAll} className="h-4 w-4 rounded border-input" /></th>
                <th className="w-10 px-3 py-2.5" />
                <Th label="Site" k="site_name" sort={sort} onSort={toggleSort} />
                <Th label="Code" k="site_code" sort={sort} onSort={toggleSort} />
                <Th label="Platform" k="platform_id" sort={sort} onSort={toggleSort} />
                <Th label="Status" k="site_status" sort={sort} onSort={toggleSort} />
                <Th label="Channels" k="channel_count" sort={sort} onSort={toggleSort} />
                <Th label="Province" k="province" sort={sort} onSort={toggleSort} />
                <Th label="Client" k="client_company" sort={sort} onSort={toggleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={9} className="px-3 py-3"><div className="h-5 animate-pulse rounded bg-muted" /></td></tr>
              )) : pageRows.map((s) => {
                const isOverdue = s.next_service_due && s.next_service_due < new Date().toISOString().split('T')[0];
                return (
                  <tr key={s.id} className="cursor-pointer hover:bg-accent/40" onClick={() => navigate(`/sites/${s.id}`)}>
                    <td className="px-3 py-3" onClick={(e) => { e.stopPropagation(); toggleSelect(s.id); }}>
                      <input type="checkbox" checked={selected.has(s.id)} readOnly className="h-4 w-4 rounded border-input" />
                    </td>
                    <td className="px-3 py-3" onClick={(e) => toggleFavorite(e, s)}>
                      <Star className={`h-4 w-4 ${s.is_favorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40 hover:text-amber-400"}`} />
                    </td>
                    <td className="px-3 py-3 font-medium">
                      <div className="flex items-center gap-1.5">
                        <span>{s.site_name}</span>
                        {isOverdue && (
                          <span title={`Service overdue (Due: ${s.next_service_due})`} className="inline-flex items-center rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                            Overdue
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{s.site_code || "—"}</td>
                    <td className="px-3 py-3 text-muted-foreground">{platformName(s.platform_id)}</td>
                    <td className="px-3 py-3"><StatusBadge status={s.site_status} /></td>
                    <td className="px-3 py-3">{s.channel_count ?? "—"}</td>
                    <td className="px-3 py-3 text-muted-foreground">{s.province || "—"}</td>
                    <td className="px-3 py-3 text-muted-foreground">{s.client_company || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!loading && pageRows.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">No sites match your filters.</p>}
        </div>

        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-border px-3 py-2.5 text-sm">
            <span className="text-muted-foreground">Page {page} of {totalPages}</span>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </div>

      <SiteFormDialog open={dialog} onOpenChange={setDialog} platforms={platforms} onSaved={reloadSites} />
      <CsvImportExportModal open={csvModal} onOpenChange={setCsvModal} sites={filtered} onImportComplete={reloadSites} />
    </div>
  );
}

function Th({ label, k, sort, onSort }) {
  const active = sort.key === k;
  return (
    <th className="px-3 py-2.5 font-medium">
      <button onClick={() => onSort(k)} className="inline-flex items-center gap-1 hover:text-foreground">
        {label} <ArrowUpDown className={`h-3 w-3 ${active ? "opacity-100" : "opacity-30"}`} />
      </button>
    </th>
  );
}