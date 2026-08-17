import { useState, useEffect, useMemo, useCallback } from "react";
import { Search, FileSpreadsheet, FileText } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { exportCSV, exportExcel } from "@/lib/export";

export default function AuditLogPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [fAction, setFAction] = useState("all");
  const [fUser, setFUser] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEntries(await base44.entities.AuditLog.list("-created_date", 2000));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const actions = useMemo(() => Array.from(new Set(entries.map((e) => e.action).filter(Boolean))).sort(), [entries]);
  const users = useMemo(() => Array.from(new Set(entries.map((e) => e.user_email).filter(Boolean))).sort(), [entries]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (fAction !== "all" && e.action !== fAction) return false;
      if (fUser !== "all" && e.user_email !== fUser) return false;
      if (from && new Date(e.created_date) < new Date(from)) return false;
      if (to && new Date(e.created_date) > new Date(to + "T23:59:59")) return false;
      if (q && !`${e.description} ${e.action} ${e.entity_name} ${e.user_email}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [entries, search, fAction, fUser, from, to]);

  const exportRows = () => filtered.map((e) => ({
    "Date": e.created_date ? new Date(e.created_date).toLocaleString() : "",
    "Action": e.action, "Entity": e.entity_type || "", "Name": e.entity_name || "",
    "Description": e.description || "", "User": e.user_email || ""
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Audit Log</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} entries</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportExcel("audit-log.csv", exportRows())}><FileSpreadsheet className="mr-1.5 h-4 w-4" /> Excel</Button>
          <Button variant="outline" onClick={() => exportCSV("audit-log.csv", exportRows())}><FileText className="mr-1.5 h-4 w-4" /> CSV</Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search descriptions…" className="pl-9" />
          </div>
          <Select value={fAction} onValueChange={setFAction}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Action" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All actions</SelectItem>{actions.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={fUser} onValueChange={setFUser}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="User" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All users</SelectItem>{users.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
          </Select>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[150px]" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[150px]" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5 font-medium">Date</th>
                <th className="px-3 py-2.5 font-medium">Action</th>
                <th className="px-3 py-2.5 font-medium">Description</th>
                <th className="px-3 py-2.5 font-medium">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={4} className="px-3 py-3"><div className="h-5 animate-pulse rounded bg-muted" /></td></tr>
              )) : filtered.slice(0, 200).map((e) => (
                <tr key={e.id} className="hover:bg-accent/40">
                  <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{e.created_date ? new Date(e.created_date).toLocaleString() : "—"}</td>
                  <td className="px-3 py-2.5"><span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">{e.action}</span></td>
                  <td className="px-3 py-2.5">{e.description || "—"}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{e.user_email || "system"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filtered.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">No audit entries match your filters.</p>}
          {!loading && filtered.length > 200 && <p className="py-3 text-center text-xs text-muted-foreground">Showing first 200 of {filtered.length}. Export for the full list.</p>}
        </div>
      </div>
    </div>
  );
}