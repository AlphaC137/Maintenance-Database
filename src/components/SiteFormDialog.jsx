import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { logAudit, pushNotification } from "@/lib/audit";
import { canEdit } from "@/lib/roles";
import { useAuth } from "@/lib/AuthContext";
import SopImportButton from "@/components/SopImportButton";

const SITE_STATUSES = ["Active", "Offline", "Archived"];
const PROVINCES = ["Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo", "Mpumalanga", "Northern Cape", "North West", "Western Cape", "Other"];

export default function SiteFormDialog({ open, onOpenChange, platforms, site, onSaved, onSopSecurityData }) {
  const { user } = useAuth();
  const editable = canEdit(user);
  const defaultPlatform = platforms.find((p) => p.is_default)?.id || platforms[0]?.id || "";
  const [form, setForm] = useState({});
  const [tagsInput, setTagsInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        site_name: site?.site_name || "",
        site_code: site?.site_code || "",
        platform_id: site?.platform_id || defaultPlatform,
        site_status: site?.site_status || "Active",
        monitoring_schedule: site?.monitoring_schedule || "24/7",
        client_company: site?.client_company || "",
        primary_contact: site?.primary_contact || "",
        secondary_contact: site?.secondary_contact || "",
        contact_telephone: site?.contact_telephone || "",
        contact_email: site?.contact_email || "",
        after_hours_contact: site?.after_hours_contact || "",
        site_manager: site?.site_manager || "",
        physical_address: site?.physical_address || "",
        gps_coordinates: site?.gps_coordinates || "",
        province: site?.province || "",
        region: site?.region || "",
        notes: site?.notes || "",
        sop_notes: site?.sop_notes || "",
        last_service_date: site?.last_service_date || "",
        next_service_due: site?.next_service_due || "",
        maintenance_interval_months: site?.maintenance_interval_months || 3
      });
      setTagsInput((site?.tags || []).join(", "));
    }
  }, [open, site, defaultPlatform]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
      const payload = { ...form, tags };
      let saved;
      if (site?.id) {
        saved = await base44.entities.Site.update(site.id, payload);
        await logAudit({ action: "site_edited", entityType: "Site", entityId: site.id, entityName: form.site_name, oldValue: site, newValue: payload, description: `Edited site "${form.site_name}"` });
      } else {
        saved = await base44.entities.Site.create(payload);
        await logAudit({ action: "site_created", entityType: "Site", entityId: saved.id, entityName: form.site_name, description: `Created site "${form.site_name}"` });
        await pushNotification({ title: "New site added", message: `"${form.site_name}" was added to the database.`, type: "site_added", relatedEntityId: saved.id });
      }
      onSaved?.(saved);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-8">
            <span>{site?.id ? "Edit Site" : "Add Site"}</span>
            {!site?.id && (
              <SopImportButton onExtracted={(data) => {
                setForm((f) => ({
                  ...f,
                  site_name: data.site_name || f.site_name,
                  physical_address: data.physical_address || f.physical_address,
                  client_company: data.client_company || f.client_company,
                  primary_contact: data.primary_contact || f.primary_contact,
                  contact_telephone: data.contact_telephone || f.contact_telephone,
                  secondary_contact: data.secondary_contact || f.secondary_contact,
                  after_hours_contact: data.after_hours_contact || f.after_hours_contact,
                  site_manager: data.site_manager || f.site_manager,
                  monitoring_schedule: data.monitoring_schedule || f.monitoring_schedule,
                  sop_notes: data.sop_notes || f.sop_notes,
                }));
                if (data.armed_response_company || data.armed_response_contact || data.guard_contact_number) {
                  onSopSecurityData?.({
                    armed_response_company: data.armed_response_company,
                    armed_response_contact: data.armed_response_contact,
                    guard_contact_number: data.guard_contact_number,
                  });
                }
              }} />
            )}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Site name</Label>
              <Input value={form.site_name || ""} onChange={(e) => set("site_name", e.target.value)} required disabled={!editable} />
            </div>
            <div className="space-y-1.5">
              <Label>Site code</Label>
              <Input value={form.site_code || ""} onChange={(e) => set("site_code", e.target.value)} disabled={!editable} placeholder="e.g. STA020" />
            </div>
            <div className="space-y-1.5">
              <Label>Platform</Label>
              <Select value={form.platform_id} onValueChange={(v) => set("platform_id", v)} disabled={!editable}>
                <SelectTrigger><SelectValue placeholder="Select platform" /></SelectTrigger>
                <SelectContent>
                  {platforms.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.site_status} onValueChange={(v) => set("site_status", v)} disabled={!editable}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SITE_STATUSES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Monitoring schedule</Label>
              <Select value={form.monitoring_schedule} onValueChange={(v) => set("monitoring_schedule", v)} disabled={!editable}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="24/7">24/7</SelectItem>
                  <SelectItem value="12/7">12/7</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Client company</Label>
              <Input value={form.client_company || ""} onChange={(e) => set("client_company", e.target.value)} disabled={!editable} />
            </div>
            <div className="space-y-1.5">
              <Label>Province</Label>
              <Select value={form.province || ""} onValueChange={(v) => set("province", v)} disabled={!editable}>
                <SelectTrigger><SelectValue placeholder="Select province" /></SelectTrigger>
                <SelectContent>{PROVINCES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Region</Label>
              <Input value={form.region || ""} onChange={(e) => set("region", e.target.value)} disabled={!editable} />
            </div>
            <div className="space-y-1.5">
              <Label>Primary contact</Label>
              <Input value={form.primary_contact || ""} onChange={(e) => set("primary_contact", e.target.value)} disabled={!editable} />
            </div>
            <div className="space-y-1.5">
              <Label>Contact telephone</Label>
              <Input value={form.contact_telephone || ""} onChange={(e) => set("contact_telephone", e.target.value)} disabled={!editable} />
            </div>
            <div className="space-y-1.5">
              <Label>Contact email</Label>
              <Input type="email" value={form.contact_email || ""} onChange={(e) => set("contact_email", e.target.value)} disabled={!editable} />
            </div>
            <div className="space-y-1.5">
              <Label>After hours contact</Label>
              <Input value={form.after_hours_contact || ""} onChange={(e) => set("after_hours_contact", e.target.value)} disabled={!editable} />
            </div>
            <div className="space-y-1.5">
              <Label>Site manager</Label>
              <Input value={form.site_manager || ""} onChange={(e) => set("site_manager", e.target.value)} disabled={!editable} />
            </div>
            <div className="space-y-1.5">
              <Label>Secondary contact</Label>
              <Input value={form.secondary_contact || ""} onChange={(e) => set("secondary_contact", e.target.value)} disabled={!editable} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Physical address</Label>
              <Textarea value={form.physical_address || ""} onChange={(e) => set("physical_address", e.target.value)} rows={2} disabled={!editable} />
            </div>
            <div className="space-y-1.5">
              <Label>GPS coordinates</Label>
              <Input value={form.gps_coordinates || ""} onChange={(e) => set("gps_coordinates", e.target.value)} disabled={!editable} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Tags (comma separated)</Label>
              <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="e.g. high-risk, perimeter" disabled={!editable} />
            </div>

            <div className="space-y-1.5">
              <Label>Last Service Date</Label>
              <Input type="date" value={form.last_service_date || ""} onChange={(e) => {
                const last = e.target.value;
                set("last_service_date", last);
                if (last && form.maintenance_interval_months) {
                  const d = new Date(last);
                  d.setMonth(d.getMonth() + Number(form.maintenance_interval_months));
                  set("next_service_due", d.toISOString().split('T')[0]);
                }
              }} disabled={!editable} />
            </div>

            <div className="space-y-1.5">
              <Label>Next Service Due Date</Label>
              <Input type="date" value={form.next_service_due || ""} onChange={(e) => set("next_service_due", e.target.value)} disabled={!editable} />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Maintenance Service Interval</Label>
              <Select value={String(form.maintenance_interval_months || 3)} onValueChange={(v) => {
                set("maintenance_interval_months", Number(v));
                if (form.last_service_date) {
                  const d = new Date(form.last_service_date);
                  d.setMonth(d.getMonth() + Number(v));
                  set("next_service_due", d.toISOString().split('T')[0]);
                }
              }} disabled={!editable}>
                <SelectTrigger><SelectValue placeholder="Interval" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Monthly (1 Month)</SelectItem>
                  <SelectItem value="3">Quarterly (3 Months)</SelectItem>
                  <SelectItem value="6">Bi-Annually (6 Months)</SelectItem>
                  <SelectItem value="12">Annually (12 Months)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} rows={2} disabled={!editable} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || !editable}>{saving ? "Saving…" : "Save site"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}