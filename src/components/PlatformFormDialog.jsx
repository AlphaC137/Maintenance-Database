import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { base44 } from "@/api/base44Client";
import { logAudit } from "@/lib/audit";
import { canEdit } from "@/lib/roles";
import { useAuth } from "@/lib/AuthContext";

const PLATFORM_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6"];

export default function PlatformFormDialog({ open, onOpenChange, platform, platforms = [], onSaved }) {
  const { user } = useAuth();
  const editable = canEdit(user);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(PLATFORM_COLORS[0]);
  const [isDefault, setIsDefault] = useState(false);
  const [parentId, setParentId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(platform?.name || "");
      setDescription(platform?.description || "");
      setColor(platform?.color || PLATFORM_COLORS[0]);
      setIsDefault(platform?.is_default || false);
      setParentId(platform?.parent_platform_id || "");
    }
  }, [open, platform]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let saved;
      if (platform?.id) {
        saved = await base44.entities.Platform.update(platform.id, { name, description, color, is_default: isDefault, parent_platform_id: parentId || "" });
        await logAudit({ action: "platform_edited", entityType: "Platform", entityId: platform.id, entityName: name, description: `Edited platform "${name}"` });
      } else {
        saved = await base44.entities.Platform.create({ name, description, color, is_default: isDefault, status: "Active", parent_platform_id: parentId || "" });
        await logAudit({ action: "platform_created", entityType: "Platform", entityId: saved.id, entityName: name, description: `Created platform "${name}"` });
      }
      onSaved?.(saved);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{platform?.id ? "Edit Platform" : "New Platform"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pf-name">Name</Label>
            <Input id="pf-name" value={name} onChange={(e) => setName(e.target.value)} required disabled={!editable} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-desc">Description</Label>
            <Textarea id="pf-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} disabled={!editable} />
          </div>
          <div className="space-y-1.5">
            <Label>Parent platform</Label>
            <Select value={parentId} onValueChange={setParentId} disabled={!editable}>
              <SelectTrigger><SelectValue placeholder="None (top-level)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>None (top-level)</SelectItem>
                {platforms.filter((p) => p.id !== platform?.id).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Make this a sub-group of another platform</p>
          </div>
          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {PLATFORM_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full border-2 ${color === c ? "border-foreground" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label htmlFor="pf-default">Default platform</Label>
              <p className="text-xs text-muted-foreground">Used for new sites when none specified</p>
            </div>
            <Switch id="pf-default" checked={isDefault} onCheckedChange={setIsDefault} disabled={!editable} />
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