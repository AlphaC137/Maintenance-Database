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
import { Upload, X } from "lucide-react";

const CAMERA_TYPES = ["Dome", "Bullet", "PTZ", "Covert", "ANPR", "Box", "Other"];
const CAMERA_STATUSES = ["Active", "Offline", "Faulty", "Maintenance"];

export default function CameraFormDialog({ open, onOpenChange, siteId, siteName, camera, onSaved }) {
  const { user } = useAuth();
  const editable = canEdit(user);
  const [form, setForm] = useState({ camera_name: "", camera_number: "", camera_type: "Dome", camera_status: "Active", location: "", notes: "", camera_view_url: "" });
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState("");

  useEffect(() => {
    if (open) {
      setForm({
        camera_name: camera?.camera_name || "",
        camera_number: camera?.camera_number ?? "",
        camera_type: camera?.camera_type || "Dome",
        camera_status: camera?.camera_status || "Active",
        location: camera?.location || "",
        notes: camera?.notes || "",
        camera_view_url: camera?.camera_view_url || ""
      });
      setImagePreview(camera?.camera_view_url || "");
    }
  }, [open, camera]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm((f) => ({ ...f, camera_view_url: file_url }));
      setImagePreview(file_url);
    } catch (err) {
      console.error("Failed to upload image:", err);
      alert("Failed to upload image");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  const removeImage = () => {
    setForm((f) => ({ ...f, camera_view_url: "" }));
    setImagePreview("");
  };

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
          <div className="space-y-1.5">
            <Label>Camera View Image (Optional)</Label>
            {imagePreview ? (
              <div className="relative inline-block">
                <img src={imagePreview} alt="Camera view" className="h-32 w-48 object-cover rounded-lg border" />
                {editable && (
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 rounded-full bg-destructive p-1 text-destructive-foreground hover:bg-destructive/90"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border p-4 hover:bg-accent/50">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={!editable || uploadingImage}
                />
                <div className="text-center">
                  <Upload className="mx-auto h-6 w-6 text-muted-foreground" />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {uploadingImage ? "Uploading..." : "Click to upload camera view"}
                  </p>
                </div>
              </label>
            )}
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