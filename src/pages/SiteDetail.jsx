import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Pencil, Plus, Trash2, Search, Download, Upload, FileText, Star, FileCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import StatusBadge from "@/components/StatusBadge";
import CameraFormDialog from "@/components/CameraFormDialog";
import SiteFormDialog from "@/components/SiteFormDialog";
import { generateSitePassportPdf } from "@/components/SitePassportGenerator";
import { canEdit, canDelete } from "@/lib/roles";
import { useAuth } from "@/lib/AuthContext";
import { logAudit, pushNotification } from "@/lib/audit";

export default function SiteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [site, setSite] = useState(null);
  const [platform, setPlatform] = useState(null);
  const [platforms, setPlatforms] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [security, setSecurity] = useState(null);
  const [technical, setTechnical] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editSite, setEditSite] = useState(false);
  const [cameraDialog, setCameraDialog] = useState(false);
  const [editingCamera, setEditingCamera] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await base44.entities.Site.get(id);
      setSite(s);
      const [pls, cm, sec, tec, docs, act] = await Promise.all([
        base44.entities.Platform.list(),
        base44.entities.Camera.filter({ site_id: id }),
        base44.entities.SecurityInfo.filter({ site_id: id }),
        base44.entities.TechnicalInfo.filter({ site_id: id }),
        base44.entities.Document.filter({ site_id: id }),
        base44.entities.AuditLog.filter({ entity_id: id })
      ]);
      setPlatforms(pls);
      setPlatform(pls.find((p) => p.id === s.platform_id));
      setCameras(cm.sort((a, b) => (a.camera_number ?? 0) - (b.camera_number ?? 0)));
      setSecurity(sec[0] || null);
      setTechnical(tec[0] || null);
      setDocuments(docs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
      setActivity(act.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />)}</div>;
  if (!site) return <div className="py-20 text-center text-muted-foreground">Site not found.</div>;

  const effectiveCameraCount = cameras.length;

  const deleteCamera = async (cam) => {
    if (!canDelete(user) || !confirm(`Delete camera "${cam.camera_name}"?`)) return;
    await base44.entities.Camera.delete(cam.id);
    await logAudit({ action: "camera_deleted", entityType: "Camera", entityId: cam.id, entityName: cam.camera_name, description: `Deleted camera "${cam.camera_name}" from ${site.site_name}` });
    load();
  };

  const toggleFavorite = async () => {
    if (!canEdit(user)) return;
    const next = !site.is_favorite;
    const updated = await base44.entities.Site.update(site.id, { is_favorite: next });
    setSite(updated);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/sites")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-semibold tracking-tight">{site.site_name}</h1>
              <button type="button" onClick={toggleFavorite} disabled={!canEdit(user)} title={site.is_favorite ? "Remove from favorites" : "Add to favorites"}>
                <Star className={`h-5 w-5 ${site.is_favorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground hover:text-amber-400"}`} />
              </button>
              <StatusBadge status={site.site_status} />
            </div>
            <p className="text-sm text-muted-foreground">{platform?.name} · {effectiveCameraCount} cameras{site.province ? ` · ${site.province}` : ""}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => generateSitePassportPdf(site, platform, cameras, security, technical)}>
            <FileCheck className="mr-1.5 h-4 w-4 text-primary" /> Download Passport (PDF)
          </Button>
          <Button variant="outline" onClick={() => setEditSite(true)} disabled={!canEdit(user)}><Pencil className="mr-1.5 h-4 w-4" /> Edit</Button>
        </div>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="flex h-auto flex-wrap gap-1 bg-muted/60 p-1">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="cameras">Cameras ({cameras.length})</TabsTrigger>
          <TabsTrigger value="client">Client</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="technical">Technical</TabsTrigger>
          <TabsTrigger value="sop">SOP</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="general"><GeneralTab site={site} platform={platform} onEdit={() => setEditSite(true)} canEdit={canEdit(user)} /></TabsContent>
        <TabsContent value="cameras">
          <CamerasTab cameras={cameras} onAdd={() => { setEditingCamera(null); setCameraDialog(true); }} onEdit={(c) => { setEditingCamera(c); setCameraDialog(true); }} onDelete={deleteCamera} canEdit={canEdit(user)} canDelete={canDelete(user)} />
        </TabsContent>
        <TabsContent value="client"><ClientTab site={site} onEdit={() => setEditSite(true)} canEdit={canEdit(user)} /></TabsContent>
        <TabsContent value="security"><InfoTab siteId={id} siteName={site.site_name} record={security} entityName="SecurityInfo" fields={SECURITY_FIELDS} onLoad={load} setLocal={setSecurity} canEdit={canEdit(user)} /></TabsContent>
        <TabsContent value="technical"><InfoTab siteId={id} siteName={site.site_name} record={technical} entityName="TechnicalInfo" fields={TECHNICAL_FIELDS} onLoad={load} setLocal={setTechnical} canEdit={canEdit(user)} /></TabsContent>
        <TabsContent value="sop"><SopTab site={site} documents={documents.filter((d) => d.file_type === "SOP")} onReload={load} canEdit={canEdit(user)} /></TabsContent>
        <TabsContent value="documents"><DocumentsTab siteId={id} siteName={site.site_name} documents={documents} onReload={load} canEdit={canEdit(user)} canDelete={canDelete(user)} /></TabsContent>
        <TabsContent value="activity"><ActivityTab entries={activity} /></TabsContent>
      </Tabs>

      <SiteFormDialog open={editSite} onOpenChange={setEditSite} platforms={platforms} site={site} onSaved={load} />
      <CameraFormDialog open={cameraDialog} onOpenChange={setCameraDialog} siteId={id} siteName={site.site_name} camera={editingCamera} onSaved={load} />
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{value || <span className="text-muted-foreground">—</span>}</dd>
    </div>
  );
}

function GeneralTab({ site, platform, onEdit, canEdit }) {
  const isOverdue = site.next_service_due && site.next_service_due < new Date().toISOString().split('T')[0];
  return (
    <Card>
      <CardHeader title="General Information" action={canEdit && <Button size="sm" variant="outline" onClick={onEdit}><Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit</Button>} />
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Site name" value={site.site_name} />
        <Field label="Site code" value={site.site_code} />
        <Field label="Platform" value={platform?.name} />
        <Field label="Status" value={site.site_status} />
        <Field label="Monitoring schedule" value={site.monitoring_schedule} />
        <Field label="Province" value={site.province} />
        <Field label="Region" value={site.region} />
        <Field label="GPS coordinates" value={site.gps_coordinates} />
        <Field label="Last Service Date" value={site.last_service_date || "Not recorded"} />
        <Field 
          label="Next Service Due" 
          value={
            site.next_service_due ? (
              <div className="flex items-center gap-2">
                <span>{site.next_service_due}</span>
                {isOverdue && (
                  <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                    Overdue
                  </span>
                )}
              </div>
            ) : "Not scheduled"
          } 
        />
        <Field label="Maintenance Interval" value={site.maintenance_interval_months ? `${site.maintenance_interval_months} Months` : "3 Months (Quarterly)"} />
        <div className="sm:col-span-2 lg:col-span-3"><Field label="Physical address" value={site.physical_address} /></div>
        {site.tags?.length > 0 && (
          <div className="sm:col-span-2 lg:col-span-3">
            <dt className="text-xs font-medium text-muted-foreground">Tags</dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">{site.tags.map((t) => <span key={t} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs">{t}</span>)}</dd>
          </div>
        )}
        <div className="sm:col-span-2 lg:col-span-3"><Field label="Notes" value={site.notes} /></div>
      </dl>
    </Card>
  );
}

function ClientTab({ site, onEdit, canEdit }) {
  return (
    <Card>
      <CardHeader title="Client & Contacts" action={canEdit && <Button size="sm" variant="outline" onClick={onEdit}><Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit</Button>} />
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Client company" value={site.client_company} />
        <Field label="Primary contact" value={site.primary_contact} />
        <Field label="Secondary contact" value={site.secondary_contact} />
        <Field label="Contact telephone" value={site.contact_telephone} />
        <Field label="Contact email" value={site.contact_email} />
        <Field label="After hours contact" value={site.after_hours_contact} />
        <Field label="Site manager" value={site.site_manager} />
      </dl>
    </Card>
  );
}

const SECURITY_FIELDS = [
  { key: "armed_response_company", label: "Armed response company" },
  { key: "armed_response_contact", label: "Armed response contact" },
  { key: "site_supervisor", label: "Site supervisor" },
  { key: "guarding_company", label: "Guarding company" },
  { key: "guard_contact_number", label: "Guard contact number" },
  { key: "access_procedure", label: "Access procedure", textarea: true },
  { key: "emergency_contacts", label: "Emergency contacts", textarea: true }
];

const TECHNICAL_FIELDS = [
  { key: "dvr_nvr_details", label: "DVR/NVR details" },
  { key: "platform_technical", label: "Platform technical" },
  { key: "ip_address", label: "IP address" },
  { key: "isp", label: "ISP" },
  { key: "sim_number", label: "SIM number" },
  { key: "sim_imsi", label: "SIM IMSI" },
  { key: "router_details", label: "Router details" },
  { key: "network_notes", label: "Network notes", textarea: true },
  { key: "camera_analytics", label: "Camera analytics", textarea: true }
];

function InfoTab({ siteId, siteName, record, entityName, fields, onLoad, setLocal, canEdit }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      const f = {};
      fields.forEach((fld) => { f[fld.key] = record?.[fld.key] || ""; });
      setForm(f);
    }
  }, [editing, record, fields]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form, site_id: siteId };
      let saved;
      if (record?.id) {
        saved = await base44.entities[entityName].update(record.id, payload);
        await logAudit({ action: `${entityName.toLowerCase()}_edited`, entityType: entityName, entityId: record.id, entityName: siteName, description: `Updated ${entityName} for ${siteName}` });
      } else {
        saved = await base44.entities[entityName].create(payload);
        await logAudit({ action: `${entityName.toLowerCase()}_created`, entityType: entityName, entityId: saved.id, entityName: siteName, description: `Created ${entityName} for ${siteName}` });
      }
      setLocal(saved);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader title={entityName === "SecurityInfo" ? "Security Information" : "Technical Information"} action={canEdit && !editing && <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit</Button>} />
      {editing ? (
        <div className="space-y-4">
          {fields.map((fld) => (
            <div key={fld.key} className="space-y-1.5">
              <Label>{fld.label}</Label>
              {fld.textarea
                ? <Textarea value={form[fld.key]} onChange={(e) => setForm((f) => ({ ...f, [fld.key]: e.target.value }))} rows={3} />
                : <Input value={form[fld.key]} onChange={(e) => setForm((f) => ({ ...f, [fld.key]: e.target.value }))} />}
            </div>
          ))}
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map((fld) => <Field key={fld.key} label={fld.label} value={record?.[fld.key]} />)}
          {!record && <p className="text-sm text-muted-foreground sm:col-span-3">No {entityName.toLowerCase()} information recorded yet.</p>}
        </dl>
      )}
    </Card>
  );
}

function CamerasTab({ cameras, onAdd, onEdit, onDelete, canEdit, canDelete }) {
  const [q, setQ] = useState("");
  const filtered = cameras.filter((c) => `${c.camera_name} ${c.camera_number} ${c.camera_type} ${c.location}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <Card>
      <CardHeader
        title={`Cameras (${cameras.length})`}
        subtitle={`Total: ${cameras.length}`}
        action={canEdit && <Button size="sm" onClick={onAdd}><Plus className="mr-1.5 h-3.5 w-3.5" /> Add Camera</Button>}
      />
      <div className="relative mb-3 max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search cameras…" className="pl-9" />
      </div>
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No cameras found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="pb-2 font-medium">#</th>
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">Type</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Location</th>
                <th className="pb-2 font-medium">View</th>
                {canEdit && <th className="pb-2"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-accent/40">
                  <td className="py-2.5 text-muted-foreground">{c.camera_number ?? "—"}</td>
                  <td className="py-2.5 font-medium">{c.camera_name}</td>
                  <td className="py-2.5 text-muted-foreground">{c.camera_type || "—"}</td>
                  <td className="py-2.5"><StatusBadge status={c.camera_status} /></td>
                  <td className="py-2.5 text-muted-foreground">{c.location || "—"}</td>
                  <td className="py-2.5">
                    {c.camera_view_url ? (
                      <img src={c.camera_view_url} alt="Camera view" className="h-12 w-16 object-cover rounded border" />
                    ) : (
                      <span className="text-muted-foreground text-xs">No image</span>
                    )}
                  </td>
                  {canEdit && (
                    <td className="py-2.5">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => onEdit(c)} className="rounded p-1.5 hover:bg-accent"><Pencil className="h-3.5 w-3.5" /></button>
                        {canDelete && <button onClick={() => onDelete(c)} className="rounded p-1.5 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function SopTab({ site, documents, onReload, canEdit }) {
  const [notes, setNotes] = useState(site.sop_notes || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { setNotes(site.sop_notes || ""); }, [site.sop_notes]);

  const saveNotes = async () => {
    setSaving(true);
    try {
      await base44.entities.Site.update(site.id, { sop_notes: notes });
      await logAudit({ action: "sop_updated", entityType: "Site", entityId: site.id, entityName: site.site_name, description: `Updated SOP notes for ${site.site_name}` });
      onReload();
    } finally {
      setSaving(false);
    }
  };

  const uploadSop = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.Document.create({ site_id: site.id, file_name: file.name, file_url, file_type: "SOP", file_size: file.size, version: "1.0" });
      await logAudit({ action: "document_uploaded", entityType: "Document", entityName: file.name, description: `Uploaded SOP "${file.name}" to ${site.site_name}` });
      onReload();
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="SOP Notes" action={canEdit && <Button size="sm" onClick={saveNotes} disabled={saving}>{saving ? "Saving…" : "Save notes"}</Button>} />
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={8} disabled={!canEdit} placeholder="Standard operating procedures for this site…" />
      </Card>
      <Card>
        <CardHeader title="SOP Documents" action={canEdit && (
          <label className="inline-flex cursor-pointer items-center gap-1.5">
            <input type="file" className="hidden" onChange={uploadSop} disabled={uploading} />
            <span className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground">{uploading ? "Uploading…" : "Upload SOP"}</span>
          </label>
        )} />
        <DocList documents={documents} canDelete={canEdit} onReload={onReload} siteName={site.site_name} />
      </Card>
    </div>
  );
}

function DocumentsTab({ siteId, siteName, documents, onReload, canEdit, canDelete }) {
  const [uploading, setUploading] = useState(false);
  const [type, setType] = useState("");
  const [desc, setDesc] = useState("");

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.Document.create({ site_id: siteId, file_name: file.name, file_url, file_type: type || guessType(file.name), file_size: file.size, version: "1.0", description: desc });
      await logAudit({ action: "document_uploaded", entityType: "Document", entityName: file.name, description: `Uploaded document "${file.name}" to ${siteName}` });
      await pushNotification({ title: "Document uploaded", message: `"${file.name}" was uploaded to ${siteName}.`, type: "document_uploaded" });
      setType(""); setDesc("");
      onReload();
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const remove = async (doc) => {
    if (!canDelete || !confirm(`Delete "${doc.file_name}"?`)) return;
    await base44.entities.Document.delete(doc.id);
    await logAudit({ action: "document_deleted", entityType: "Document", entityId: doc.id, entityName: doc.file_name, description: `Deleted document "${doc.file_name}" from ${siteName}` });
    onReload();
  };

  return (
    <Card>
      <CardHeader title="Documents" action={canEdit && (
        <label className="inline-flex cursor-pointer items-center gap-1.5">
          <input type="file" className="hidden" onChange={upload} disabled={uploading} />
          <span className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground"><Upload className="h-3.5 w-3.5" />{uploading ? "Uploading…" : "Upload"}</span>
        </label>
      )} />
      {canEdit && (
        <div className="mb-3 flex flex-wrap gap-2">
          <Input placeholder="File type (e.g. Network Diagram)" value={type} onChange={(e) => setType(e.target.value)} className="max-w-[200px]" />
          <Input placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} className="max-w-[260px]" />
        </div>
      )}
      <DocList documents={documents} canDelete={canDelete} onReload={onReload} siteName={siteName} onDelete={remove} />
    </Card>
  );
}

function DocList({ documents, canDelete, onDelete, onReload, siteName }) {
  if (!documents.length) return <p className="py-6 text-center text-sm text-muted-foreground">No documents.</p>;
  return (
    <ul className="divide-y divide-border">
      {documents.map((d) => (
        <li key={d.id} className="flex items-center gap-3 py-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary"><FileText className="h-4 w-4 text-muted-foreground" /></div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{d.file_name}</p>
            <p className="text-xs text-muted-foreground">{d.file_type || "File"} · v{d.version || "1.0"}{d.created_by ? ` · ${d.created_by}` : ""}{d.created_date ? ` · ${new Date(d.created_date).toLocaleDateString()}` : ""}</p>
          </div>
          <a href={d.file_url} target="_blank" rel="noreferrer" className="rounded p-1.5 hover:bg-accent"><Download className="h-4 w-4" /></a>
          {canDelete && onDelete && <button onClick={() => onDelete(d)} className="rounded p-1.5 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>}
        </li>
      ))}
    </ul>
  );
}

function ActivityTab({ entries }) {
  if (!entries.length) return <Card><p className="py-8 text-center text-sm text-muted-foreground">No activity recorded.</p></Card>;
  return (
    <Card>
      <CardHeader title="Activity Timeline" />
      <ol className="relative space-y-4 border-l border-border pl-4">
        {entries.map((a) => (
          <li key={a.id} className="relative">
            <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
            <p className="text-sm font-medium">{a.description || a.action}</p>
            <p className="text-xs text-muted-foreground">{a.user_email || "system"} · {a.created_date ? new Date(a.created_date).toLocaleString() : ""}</p>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function guessType(name) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (["pdf"].includes(ext)) return "PDF";
  if (["xlsx", "xls", "csv"].includes(ext)) return "Excel";
  if (["png", "jpg", "jpeg", "gif"].includes(ext)) return "Image";
  if (["doc", "docx"].includes(ext)) return "Document";
  return "File";
}

function Card({ children }) {
  return <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">{children}</div>;
}

function CardHeader({ title, subtitle, action }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="font-display text-sm font-semibold">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}