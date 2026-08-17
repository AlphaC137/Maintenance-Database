import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { logAudit } from "@/lib/audit";
import { canEdit } from "@/lib/roles";
import { useAuth } from "@/lib/AuthContext";

const CAMERA_TYPES = ["Dome", "Bullet", "PTZ", "Covert", "ANPR", "Box", "Other"];
const CAMERA_STATUSES = ["Active", "Offline", "Faulty", "Maintenance"];

export default function CameraFormDialog({ open, onOpenChange, siteId, siteName, camera, onSaved }) {
  const { user } = useAuth();
  const editable = canEdit(user);
  const [form, setForm] = useState({ camera_name: "", camera_number: "", camera_type: "Dome", camera_status: "Active", location: "", notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        camera_name: camera?.camera_name || "",
        camera_number: camera?.camera_number ?? "",
        camera_type: camera?.camera_type || "Dome",
        camera_status: camera?.camera_status || "Active",
        location: camera?.location || "",
        notes: camera?.notes || ""
      });
    }
  }, [open, camera]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, camera_number: form.camera_number === "" ? null : Number(form.camera_number), site_id: siteId };
      let saved;
      if (camera?.id) {
        saved = await base44.entities.Camera.update(camera.id, payload);
        await logAudit({ action: "camera_edited", entityType: "Camera", entityId: camera.id, entityName: form.camera_name, description: `Edited camera "${form.camera_name}" on ${siteName}` });
      } else {
        saved = await base44.entities.Camera.create(payload);
        await logAudit({ action: "camera_added", entityType: "Camera", entityId: saved.id, entityName: form.camera_name, description: `Added camera "${form.camera_name}" to ${siteName}` });
      }
      onSaved?.(saved);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{camera?.id ? "Edit Camera" : "Add Camera"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Camera name</Label>
              <Input value={form.camera_name} onChange={(e) => set("camera_name", e.target.value)} required disabled={!editable} />
            </div>
            <div className="space-y-1.5">
              <Label>Camera #</Label>
              <Input type="number" value={form.camera_number} onChange={(e) => set("camera_number", e.target.value)} disabled={!editable} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.camera_type} onValueChange={(v) => set("camera_type", v)} disabled={!editable}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CAMERA_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.camera_status} onValueChange={(v) => set("camera_status", v)} disabled={!editable}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CAMERA_STATUSES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Location</Label>
            <Input value={form.location} onChange={(e) => set("location", e.target.value)} disabled={!editable} />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} disabled={!editable} />
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