import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function CsvImportExportModal({ open, onOpenChange, sites = [], onImportComplete }) {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const exportSitesCsv = () => {
    if (!sites.length) return toast.error("No sites available to export.");

    const headers = [
      "ID", "Site Name", "Site Code", "Platform ID", "Status", "Schedule", 
      "Client", "Province", "Region", "Address", "Primary Contact", 
      "Telephone", "Email", "Last Service Date", "Next Service Due"
    ];

    const rows = sites.map((s) => [
      s.id || "",
      `"${(s.site_name || "").replace(/"/g, '""')}"`,
      `"${(s.site_code || "").replace(/"/g, '""')}"`,
      s.platform_id || "",
      s.site_status || "",
      s.monitoring_schedule || "",
      `"${(s.client_company || "").replace(/"/g, '""')}"`,
      `"${(s.province || "").replace(/"/g, '""')}"`,
      `"${(s.region || "").replace(/"/g, '""')}"`,
      `"${(s.physical_address || "").replace(/"/g, '""')}"`,
      `"${(s.primary_contact || "").replace(/"/g, '""')}"`,
      `"${(s.contact_telephone || "").replace(/"/g, '""')}"`,
      `"${(s.contact_email || "").replace(/"/g, '""')}"`,
      s.last_service_date || "",
      s.next_service_due || ""
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `maintenance_sites_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${sites.length} site(s) to CSV`);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setResult(null);

    try {
      const text = await file.text();
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length <= 1) throw new Error("CSV file is empty or missing data rows.");

      const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
      
      let count = 0;
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
        if (!values[0]) continue;

        const siteData = {
          site_name: values[headers.indexOf("site name")] || values[1] || values[0],
          site_code: values[headers.indexOf("site code")] || "",
          client_company: values[headers.indexOf("client")] || "",
          province: values[headers.indexOf("province")] || "",
          physical_address: values[headers.indexOf("address")] || "",
          site_status: "Active",
          monitoring_schedule: "24/7"
        };

        await base44.entities.Site.create(siteData);
        count++;
      }

      setResult({ success: true, count });
      toast.success(`Successfully imported ${count} sites!`);
      onImportComplete?.();
    } catch (err) {
      setResult({ success: false, error: err.message });
      toast.error(`Import failed: ${err.message}`);
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            CSV Data Import & Export
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
            <h4 className="font-semibold text-sm">Export Current View</h4>
            <p className="text-xs text-muted-foreground">Download all filtered sites currently displayed into a standard CSV spreadsheet.</p>
            <Button onClick={exportSitesCsv} className="w-full gap-2">
              <Download className="h-4 w-4" /> Export {sites.length} Sites to CSV
            </Button>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
            <h4 className="font-semibold text-sm">Batch Import Sites</h4>
            <p className="text-xs text-muted-foreground">Upload a CSV file containing site headers: <code>Site Name, Site Code, Client, Province, Address</code>.</p>

            <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-6 cursor-pointer hover:bg-accent/40 transition-colors">
              <Upload className="h-6 w-6 text-muted-foreground mb-2" />
              <span className="text-xs font-medium">{importing ? "Importing records…" : "Click or drop CSV file here"}</span>
              <input type="file" accept=".csv" onChange={handleFileUpload} disabled={importing} className="hidden" />
            </label>

            {result?.success && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Successfully imported {result.count} new site(s).</span>
              </div>
            )}

            {result?.success === false && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive border border-destructive/20">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Error: {result.error}</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
