import { useState, useEffect, useCallback } from "react";
import { FileSpreadsheet, FileText, MapPin, Cctv, Server, Users, ScrollText, Database } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { exportCSV, exportExcel } from "@/lib/export";

const REPORTS = [
  { key: "site", title: "Site Report", desc: "Site name, platform, number of cameras", icon: MapPin },
  { key: "full", title: "Complete Database Report", desc: "All site information", icon: Database },
  { key: "camera", title: "Camera Report", desc: "Every camera from every site", icon: Cctv },
  { key: "platform", title: "Platform Report", desc: "Sites grouped by platform", icon: Server },
  { key: "client", title: "Client Report", desc: "Sites grouped by client", icon: Users },
  { key: "audit", title: "Audit Log Export", desc: "Full activity log", icon: ScrollText }
];

export default function Reports() {
  const [data, setData] = useState({ platforms: [], sites: [], cameras: [], audit: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pl, st, cm, au] = await Promise.all([
        base44.entities.Platform.list(),
        base44.entities.Site.list("-created_date", 3000),
        base44.entities.Camera.list("-created_date", 5000),
        base44.entities.AuditLog.list("-created_date", 5000)
      ]);
      setData({ platforms: pl, sites: st, cameras: cm, audit: au });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const pName = (id) => data.platforms.find((p) => p.id === id)?.name || "—";

  const buildRows = (key) => {
    if (key === "site") {
      return data.sites.map((s) => ({ "Site Name": s.site_name, "Platform": pName(s.platform_id), "Status": s.site_status, "Province": s.province || "", "Client": s.client_company || "" }));
    }
    if (key === "full") {
      return data.sites.map((s) => ({
        "Site Name": s.site_name, "Platform": pName(s.platform_id), "Status": s.site_status, "Client Company": s.client_company || "",
        "Primary Contact": s.primary_contact || "", "Telephone": s.contact_telephone || "", "Email": s.contact_email || "",
        "After Hours": s.after_hours_contact || "", "Site Manager": s.site_manager || "", "Address": s.physical_address || "",
        "GPS": s.gps_coordinates || "", "Province": s.province || "", "Region": s.region || "",
        "Tags": (s.tags || []).join("; "), "Notes": s.notes || ""
      }));
    }
    if (key === "camera") {
      return data.cameras.map((c) => {
        const site = data.sites.find((s) => s.id === c.site_id);
        return { "Site": site?.site_name || "—", "Platform": site ? pName(site.platform_id) : "—", "Camera Name": c.camera_name, "Camera #": c.camera_number ?? "", "Type": c.camera_type || "", "Status": c.camera_status, "Location": c.location || "" };
      });
    }
    if (key === "platform") {
      const rows = [];
      data.platforms.forEach((p) => {
        const ss = data.sites.filter((s) => s.platform_id === p.id);
        ss.forEach((s) => rows.push({ "Platform": p.name, "Site": s.site_name, "Status": s.site_status, "Client": s.client_company || "" }));
        if (ss.length === 0) rows.push({ "Platform": p.name, "Site": "—", "Status": p.status, "Client": "" });
      });
      return rows;
    }
    if (key === "client") {
      const groups = {};
      data.sites.forEach((s) => {
        const c = s.client_company || "Unassigned";
        (groups[c] = groups[c] || []).push(s);
      });
      const rows = [];
      Object.entries(groups).forEach(([client, ss]) => ss.forEach((s) => rows.push({ "Client": client, "Site": s.site_name, "Platform": pName(s.platform_id), "Province": s.province || "" })));
      return rows;
    }
    if (key === "audit") {
      return data.audit.map((a) => ({ "Date": a.created_date ? new Date(a.created_date).toLocaleString() : "", "Action": a.action, "Entity": a.entity_type || "", "Name": a.entity_name || "", "Description": a.description || "", "User": a.user_email || "" }));
    }
    return [];
  };

  const generate = async (key, fmt) => {
    setBusy(`${key}-${fmt}`);
    try {
      const rows = buildRows(key);
      const stamp = new Date().toISOString().slice(0, 10);
      const name = `${key}-report-${stamp}`;
      if (fmt === "csv") exportCSV(`${name}.csv`, rows);
      else exportExcel(`${name}.csv`, rows);
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">Generate and export reports as Excel or CSV</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => (
          <div key={r.key} className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><r.icon className="h-5 w-5" /></span>
              <div>
                <p className="font-display font-semibold">{r.title}</p>
                <p className="text-xs text-muted-foreground">{r.desc}</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" disabled={loading || busy === `${r.key}-excel`} onClick={() => generate(r.key, "excel")}>
                <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" /> Excel
              </Button>
              <Button size="sm" variant="outline" className="flex-1" disabled={loading || busy === `${r.key}-csv`} onClick={() => generate(r.key, "csv")}>
                <FileText className="mr-1.5 h-3.5 w-3.5" /> CSV
              </Button>
            </div>
          </div>
        ))}
      </div>
      {loading && <p className="text-sm text-muted-foreground">Loading data for reports…</p>}
    </div>
  );
}