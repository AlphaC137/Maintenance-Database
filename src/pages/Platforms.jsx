import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Archive, RotateCcw, Server, ArrowRightLeft, MapPin, Cctv } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import PlatformFormDialog from "@/components/PlatformFormDialog";
import StatusBadge from "@/components/StatusBadge";
import { canEdit, isAdmin } from "@/lib/roles";
import { useAuth } from "@/lib/AuthContext";
import { logAudit } from "@/lib/audit";

export default function Platforms() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [platforms, setPlatforms] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(null);
  const [mergeOpen, setMergeOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pl, st] = await Promise.all([
        base44.entities.Platform.list(),
        base44.entities.Site.list("-created_date", 3000)
      ]);
      setPlatforms(pl.sort((a, b) => a.name.localeCompare(b.name)));
      setSites(st);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = (pid) => {
    const ss = sites.filter((s) => s.platform_id === pid);
    const cameras = ss.reduce((sum, s) => sum + (s.channel_count || 0), 0);
    return { sites: ss.length, cameras };
  };

  const childrenOf = (pid) => platforms.filter((p) => p.parent_platform_id === pid);
  const topLevel = platforms.filter((p) => !p.parent_platform_id);

  const archive = async (p) => {
    if (!isAdmin(user)) return;
    await base44.entities.Platform.update(p.id, { status: p.status === "Archived" ? "Active" : "Archived" });
    await logAudit({ action: p.status === "Archived" ? "platform_restored" : "platform_archived", entityType: "Platform", entityId: p.id, entityName: p.name, description: `${p.status === "Archived" ? "Restored" : "Archived"} platform "${p.name}"` });
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Platforms</h1>
          <p className="text-sm text-muted-foreground">{platforms.length} platforms</p>
        </div>
        <div className="flex gap-2">
          {isAdmin(user) && <Button variant="outline" onClick={() => setMergeOpen(true)}><ArrowRightLeft className="mr-1.5 h-4 w-4" /> Merge</Button>}
          <Button onClick={() => { setEditing(null); setDialog(true); }} disabled={!canEdit(user)}><Plus className="mr-1.5 h-4 w-4" /> New Platform</Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-muted" />)}</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topLevel.map((p) => {
            const s = stats(p.id);
            const kids = childrenOf(p.id);
            return (
              <div key={p.id} className={`rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md ${p.status === "Archived" ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ backgroundColor: p.color || "#6366f1" }}><Server className="h-5 w-5" /></span>
                    <div>
                      <p className="font-display font-semibold">{p.name}</p>
                      <StatusBadge status={p.status} />
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {canEdit(user) && <button onClick={() => { setEditing(p); setDialog(true); }} className="rounded p-1.5 hover:bg-accent"><Pencil className="h-4 w-4" /></button>}
                    {isAdmin(user) && <button onClick={() => archive(p)} className="rounded p-1.5 hover:bg-accent">{p.status === "Archived" ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}</button>}
                  </div>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground min-h-[2.5rem]">{p.description || "No description"}</p>
                <div className="mt-4 flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-muted-foreground" /> {s.sites} sites</span>
                  <span className="flex items-center gap-1.5"><Cctv className="h-4 w-4 text-muted-foreground" /> {s.cameras} cameras</span>
                  <button onClick={() => setSelected(p)} className="ml-auto text-xs font-medium text-primary hover:underline">View sites</button>
                </div>
                {kids.length > 0 && (
                  <div className="mt-4 space-y-2 border-t border-border pt-3">
                    <p className="text-xs font-medium text-muted-foreground">Sub-groups</p>
                    {kids.map((c) => {
                      const cs = stats(c.id);
                      return (
                        <div key={c.id} className={`flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-2.5 ${c.status === "Archived" ? "opacity-60" : ""}`}>
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg text-white" style={{ backgroundColor: c.color || "#6366f1" }}><Server className="h-3.5 w-3.5" /></span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{c.name}</p>
                            <p className="text-xs text-muted-foreground">{cs.sites} sites · {cs.cameras} cameras</p>
                          </div>
                          <div className="flex gap-1">
                            {canEdit(user) && <button onClick={() => { setEditing(c); setDialog(true); }} className="rounded p-1 hover:bg-accent"><Pencil className="h-3.5 w-3.5" /></button>}
                            <button onClick={() => setSelected(c)} className="rounded p-1 text-xs font-medium text-primary hover:bg-accent">View</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <PlatformFormDialog open={dialog} onOpenChange={setDialog} platforms={platforms} platform={editing} onSaved={load} />
      <PlatformSitesDialog platform={selected} platforms={platforms} sites={sites} onClose={() => setSelected(null)} onMoved={load} canEdit={canEdit(user)} />
      <MergeDialog open={mergeOpen} onOpenChange={setMergeOpen} platforms={platforms} sites={sites} onMerged={load} />
    </div>
  );
}

function PlatformSitesDialog({ platform, platforms, sites, onClose, onMoved, canEdit }) {
  if (!platform) return null;
  const list = sites.filter((s) => s.platform_id === platform.id);
  const targets = platforms.filter((p) => p.id !== platform.id);

  const moveSite = async (site, targetId) => {
    const tgt = platforms.find((p) => p.id === targetId);
    if (!confirm(`Move "${site.site_name}" to "${tgt?.name}"?`)) return;
    await base44.entities.Site.update(site.id, { platform_id: targetId });
    await logAudit({ action: "site_moved", entityType: "Site", entityId: site.id, entityName: site.site_name, description: `Moved "${site.site_name}" from "${platform.name}" to "${tgt?.name}"` });
    onMoved();
  };

  return (
    <Dialog open={!!platform} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Sites on {platform.name}</DialogTitle>
        </DialogHeader>
        {list.length === 0 ? <p className="py-4 text-sm text-muted-foreground">No sites on this platform.</p> : (
          <div className="max-h-80 overflow-y-auto rounded-lg border border-border">
            <ul className="divide-y divide-border">
              {list.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-accent/40">
                  <span className="min-w-0 flex-1 truncate font-medium">{s.site_name}</span>
                  <StatusBadge status={s.site_status} />
                  {canEdit && <SiteMoveSelect site={s} targets={targets} onMove={moveSite} />}
                </li>
              ))}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SiteMoveSelect({ site, targets, onMove }) {
  const [val, setVal] = useState("");
  return (
    <Select value={val} onValueChange={(v) => { setVal(""); onMove(site, v); }}>
      <SelectTrigger className="h-7 w-[130px]"><SelectValue placeholder="Move to…" /></SelectTrigger>
      <SelectContent>{targets.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
    </Select>
  );
}

function MergeDialog({ open, onOpenChange, platforms, sites, onMerged }) {
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");

  const merge = async () => {
    if (!source || !target || source === target) return;
    const count = sites.filter((s) => s.platform_id === source).length;
    if (!confirm(`Merge "${platforms.find((p) => p.id === source)?.name}" (${count} sites) into "${platforms.find((p) => p.id === target)?.name}"? The source platform will be archived.`)) return;
    await base44.entities.Site.updateMany({ platform_id: source }, { $set: { platform_id: target } });
    await base44.entities.Platform.update(source, { status: "Archived" });
    await logAudit({ action: "platform_merge", entityType: "Platform", entityId: source, description: `Merged platform into ${platforms.find((p) => p.id === target)?.name}` });
    setSource(""); setTarget("");
    onOpenChange(false);
    onMerged();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Merge Platforms</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Move all sites from a source platform into a target platform, then archive the source.</p>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Source platform</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
              <SelectContent>{platforms.filter((p) => p.status === "Active").map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Target platform</Label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger><SelectValue placeholder="Select target" /></SelectTrigger>
              <SelectContent>{platforms.filter((p) => p.id !== source).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={merge} disabled={!source || !target || source === target}>Merge</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}