import { useState, useEffect, useCallback } from "react";
import { Moon, Sun, Users, Database, Download, Shield, FolderInput, CheckCircle2, CircleAlert } from "lucide-react";
import { useTheme } from "next-themes";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { ROLE_LABELS, isAdmin, canEdit } from "@/lib/roles";
import { useAuth } from "@/lib/AuthContext";
import { exportCSV } from "@/lib/export";
import { importDatabaseIdeaCsvs, getImportSelection } from "@/lib/databaseImport";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkMessage, setBulkMessage] = useState("");
  const [bulkResult, setBulkResult] = useState(null);

  const loadUsers = useCallback(async () => {
    if (!isAdmin(user)) { setLoading(false); return; }
    try { setUsers(await base44.entities.User.list()); }
    catch { /* User access is restricted to administrators. */ }
    finally { setLoading(false); }
  }, [user]);
  useEffect(() => { loadUsers(); }, [loadUsers]);

  const exportAll = async () => {
    const [sites, platforms] = await Promise.all([base44.entities.Site.list("-created_date", 5000), base44.entities.Platform.list()]);
    const platformName = (id) => platforms.find((platform) => platform.id === id)?.name || "";
    exportCSV("cctv-sites-export.csv", sites.map((site) => ({
      "Site Name": site.site_name, Platform: platformName(site.platform_id), Status: site.site_status,
      Client: site.client_company || "", Province: site.province || "", Region: site.region || "",
      Address: site.physical_address || "", GPS: site.gps_coordinates || "", "Channel Count": site.channel_count || 0,
      Tags: (site.tags || []).join("; ")
    })));
  };

  const handleBulkImport = async (event) => {
    const { fileMap, duplicates, missing } = getImportSelection(event.target.files || []);
    if (!fileMap.Site || !fileMap.Platform) {
      setBulkResult({ type: "error", message: "Select the Database Idea folder, including Platform_export.csv and Site_export.csv." });
      event.target.value = "";
      return;
    }
    setBulkImporting(true); setBulkResult(null); setBulkMessage("Preparing database import...");
    try {
      const stats = await importDatabaseIdeaCsvs(fileMap, { onProgress: setBulkMessage });
      const created = Object.values(stats).reduce((sum, item) => sum + item.created, 0);
      const updated = Object.values(stats).reduce((sum, item) => sum + item.updated, 0);
      const detail = [
        `${created} records created`, `${updated} records updated`,
        missing.length ? `${missing.join(", ")} not selected` : "All 9 export files included",
        duplicates.length ? `${duplicates.length} duplicate file ignored` : null
      ].filter(Boolean).join(" | ");
      setBulkResult({ type: "success", message: detail });
    } catch (error) {
      setBulkResult({ type: "error", message: error.message || "The database import could not be completed." });
    } finally {
      setBulkImporting(false);
      event.target.value = "";
    }
  };

  return <div className="space-y-5">
    <div><h1 className="font-display text-2xl font-semibold tracking-tight">Settings</h1><p className="text-sm text-muted-foreground">Account access, appearance and operational data.</p></div>
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Section title="Appearance" icon={<Sun className="h-4 w-4" />}>
        <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-medium">Theme</p><p className="text-xs text-muted-foreground">Choose the interface theme.</p></div><Button variant="outline" size="sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? <Sun className="mr-1.5 h-4 w-4" /> : <Moon className="mr-1.5 h-4 w-4" />}{theme === "dark" ? "Light" : "Dark"}</Button></div>
      </Section>
      <Section title="Your Account" icon={<Shield className="h-4 w-4" />}>
        <dl className="space-y-2 text-sm"><Row label="Name" value={user?.full_name || "-"} /><Row label="Email" value={user?.email || "-"} /><Row label="Role" value={ROLE_LABELS[user?.role] || user?.role || "-"} /></dl>
      </Section>
      <Section title="Data Tools" icon={<Database className="h-4 w-4" />}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-medium">Export sites</p><p className="text-xs text-muted-foreground">Download the current site register as CSV.</p></div><Button variant="outline" size="sm" onClick={exportAll}><Download className="mr-1.5 h-3.5 w-3.5" />Export</Button></div>
          <div className="border-t border-border pt-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-medium">Import Database Idea CSVs</p><p className="max-w-md text-xs text-muted-foreground">Select the <span className="font-medium text-foreground">Database Idea</span> folder. The import includes platforms, sites, cameras, technical and security details, documents, clients and operational history.</p></div><label className="inline-flex cursor-pointer items-center"><input type="file" accept=".csv" multiple webkitdirectory="" className="hidden" onChange={handleBulkImport} disabled={bulkImporting || !canEdit(user)} /><span className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground"><FolderInput className="mr-1.5 h-3.5 w-3.5" />{bulkImporting ? "Importing..." : "Select Folder"}</span></label></div>
          {bulkImporting && <p className="mt-3 rounded-lg bg-secondary p-2.5 text-xs">{bulkMessage}</p>}
          {bulkResult && <div className={`mt-3 flex gap-2 rounded-lg border p-3 text-xs ${bulkResult.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300" : "border-destructive/40 bg-destructive/5 text-destructive"}`}>{bulkResult.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <CircleAlert className="h-4 w-4 shrink-0" />}<p>{bulkResult.message}</p></div>}</div>
        </div>
      </Section>
      <Section title="User Management" icon={<Users className="h-4 w-4" />}>
        {!isAdmin(user) ? <p className="text-sm text-muted-foreground">Only administrators can manage users.</p> : loading ? <div className="space-y-2">{[0, 1, 2].map((item) => <div key={item} className="h-10 animate-pulse rounded bg-muted" />)}</div> : <ul className="divide-y divide-border">{users.map((member) => <li key={member.id} className="flex items-center justify-between gap-3 py-2.5"><div className="min-w-0"><p className="truncate text-sm font-medium">{member.full_name || member.email}</p><p className="truncate text-xs text-muted-foreground">{member.email}</p></div><Select value={member.role} onValueChange={async (role) => { await base44.entities.User.update(member.id, { role }); loadUsers(); }}><SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(ROLE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></li>)}</ul>}
      </Section>
    </div>
  </div>;
}

function Section({ title, icon, children }) { return <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><h2 className="mb-4 flex items-center gap-2 font-display text-sm font-semibold">{icon}{title}</h2>{children}</div>; }
function Row({ label, value }) { return <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{label}</dt><dd className="text-right font-medium">{value}</dd></div>; }
