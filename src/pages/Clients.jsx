import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Pencil, Trash2, Building2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ClientFormDialog from "@/components/ClientFormDialog";
import { canEdit, canDelete } from "@/lib/roles";
import { useAuth } from "@/lib/AuthContext";
import { logAudit } from "@/lib/audit";

export default function Clients() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [entityMissing, setEntityMissing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cl, st] = await Promise.all([
        base44.entities.Client.list("-created_date", 500),
        base44.entities.Site.list("-created_date", 5000),
      ]);
      setClients(cl);
      setSites(st);
      setEntityMissing(false);
    } catch {
      setEntityMissing(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const siteCount = (company) => sites.filter((s) => s.client_company?.toLowerCase() === company?.toLowerCase()).length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      `${c.company_name} ${c.primary_contact_name} ${c.primary_contact_email} ${c.primary_contact_phone}`.toLowerCase().includes(q)
    );
  }, [clients, search]);

  const openCreate = () => { setEditing(null); setDialog(true); };
  const openEdit = (c) => { setEditing(c); setDialog(true); };

  const remove = async (c) => {
    if (!canDelete(user) || !confirm(`Delete client "${c.company_name}"?`)) return;
    await base44.entities.Client.delete(c.id);
    await logAudit({ action: "client_deleted", entityType: "Client", entityId: c.id, entityName: c.company_name, description: `Deleted client "${c.company_name}"` });
    load();
  };

  const viewSites = (company) => {
    navigate(`/sites?q=${encodeURIComponent(company)}`);
  };

  if (entityMissing) {
    return (
      <div className="space-y-4 py-12 text-center">
        <Building2 className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="font-display text-xl font-semibold">Client entity not configured</h1>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          Add a <strong>Client</strong> entity in the Base44 Builder with fields from <code>database/schema.json</code>, then reload this page.
          Client contact data on sites still works via the site form.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} client{filtered.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={openCreate} disabled={!canEdit(user)}><Plus className="mr-1.5 h-4 w-4" /> Add Client</Button>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border p-3">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search clients…" className="pl-9" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5 font-medium">Company</th>
                <th className="px-3 py-2.5 font-medium">Primary contact</th>
                <th className="px-3 py-2.5 font-medium">Phone</th>
                <th className="px-3 py-2.5 font-medium">Email</th>
                <th className="px-3 py-2.5 font-medium">Sites</th>
                <th className="px-3 py-2.5 font-medium w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-3 py-3"><div className="h-5 animate-pulse rounded bg-muted" /></td></tr>
              )) : filtered.map((c) => (
                <tr key={c.id} className="hover:bg-accent/40">
                  <td className="px-3 py-3 font-medium">{c.company_name}</td>
                  <td className="px-3 py-3 text-muted-foreground">{c.primary_contact_name || "—"}</td>
                  <td className="px-3 py-3 text-muted-foreground">{c.primary_contact_phone || "—"}</td>
                  <td className="px-3 py-3 text-muted-foreground">{c.primary_contact_email || "—"}</td>
                  <td className="px-3 py-3">
                    <button type="button" onClick={() => viewSites(c.company_name)} className="text-primary hover:underline">
                      {siteCount(c.company_name)} site{siteCount(c.company_name) !== 1 ? "s" : ""}
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(c)} disabled={!canEdit(user)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => remove(c)} disabled={!canDelete(user)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filtered.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">No clients found.</p>
          )}
        </div>
      </div>

      <ClientFormDialog open={dialog} onOpenChange={setDialog} client={editing} onSaved={load} sites={sites} />
    </div>
  );
}
