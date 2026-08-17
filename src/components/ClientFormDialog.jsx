import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { logAudit } from "@/lib/audit";
import { canEdit } from "@/lib/roles";
import { useAuth } from "@/lib/AuthContext";

export default function ClientFormDialog({ open, onOpenChange, client, onSaved }) {
  const { user } = useAuth();
  const editable = canEdit(user);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        company_name: client?.company_name || "",
        primary_contact_name: client?.primary_contact_name || "",
        primary_contact_email: client?.primary_contact_email || "",
        primary_contact_phone: client?.primary_contact_phone || "",
        secondary_contact_name: client?.secondary_contact_name || "",
        secondary_contact_phone: client?.secondary_contact_phone || "",
        after_hours_contact: client?.after_hours_contact || "",
        site_manager_name: client?.site_manager_name || "",
        notes: client?.notes || "",
      });
    }
  }, [open, client]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let saved;
      if (client?.id) {
        saved = await base44.entities.Client.update(client.id, form);
        await logAudit({ action: "client_edited", entityType: "Client", entityId: client.id, entityName: form.company_name, description: `Edited client "${form.company_name}"` });
      } else {
        saved = await base44.entities.Client.create(form);
        await logAudit({ action: "client_created", entityType: "Client", entityId: saved.id, entityName: form.company_name, description: `Created client "${form.company_name}"` });
      }
      onSaved?.(saved);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{client?.id ? "Edit Client" : "Add Client"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Company name</Label>
            <Input value={form.company_name || ""} onChange={(e) => set("company_name", e.target.value)} required disabled={!editable} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Primary contact</Label>
              <Input value={form.primary_contact_name || ""} onChange={(e) => set("primary_contact_name", e.target.value)} disabled={!editable} />
            </div>
            <div className="space-y-1.5">
              <Label>Primary phone</Label>
              <Input value={form.primary_contact_phone || ""} onChange={(e) => set("primary_contact_phone", e.target.value)} disabled={!editable} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Primary email</Label>
              <Input type="email" value={form.primary_contact_email || ""} onChange={(e) => set("primary_contact_email", e.target.value)} disabled={!editable} />
            </div>
            <div className="space-y-1.5">
              <Label>Secondary contact</Label>
              <Input value={form.secondary_contact_name || ""} onChange={(e) => set("secondary_contact_name", e.target.value)} disabled={!editable} />
            </div>
            <div className="space-y-1.5">
              <Label>Secondary phone</Label>
              <Input value={form.secondary_contact_phone || ""} onChange={(e) => set("secondary_contact_phone", e.target.value)} disabled={!editable} />
            </div>
            <div className="space-y-1.5">
              <Label>After hours contact</Label>
              <Input value={form.after_hours_contact || ""} onChange={(e) => set("after_hours_contact", e.target.value)} disabled={!editable} />
            </div>
            <div className="space-y-1.5">
              <Label>Site manager</Label>
              <Input value={form.site_manager_name || ""} onChange={(e) => set("site_manager_name", e.target.value)} disabled={!editable} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} rows={2} disabled={!editable} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || !editable}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
