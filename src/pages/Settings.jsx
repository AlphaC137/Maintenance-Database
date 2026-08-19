import { useState, useEffect, useCallback } from "react";
import { 
  Moon, Sun, Users, Database, Download, Shield, FolderInput, 
  CheckCircle2, CircleAlert, Clock, UserCheck, UserX, UserPlus, 
  Trash2, Ban, CheckCircle, Search, Pencil, RefreshCw, Key
} from "lucide-react";
import { useTheme } from "next-themes";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ROLE_LABELS, ASSIGNABLE_ROLE_LABELS, isAdmin, isSuperAdmin, canEdit } from "@/lib/roles";
import { useAuth } from "@/lib/AuthContext";
import { exportCSV } from "@/lib/export";
import { importDatabaseIdeaCsvs, getImportSelection } from "@/lib/databaseImport";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkMessage, setBulkMessage] = useState("");
  const [bulkResult, setBulkResult] = useState(null);

  const loadUsers = useCallback(async () => {
    if (!isAdmin(user)) { setLoading(false); return; }
    setLoading(true);
    try {
      const allUsers = await base44.entities.User.list();
      setPendingUsers(allUsers.filter((u) => u.status === 'pending'));
      setUsers(allUsers.filter((u) => u.status !== 'pending'));
    } catch (e) {
      console.error("Failed to load users:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const approveUser = async (member) => {
    // Optimistic UI update
    setPendingUsers((prev) => prev.filter((u) => u.id !== member.id));
    setUsers((prev) => [{ ...member, status: 'active', role: member.role || 'readonly' }, ...prev]);
    
    try {
      await base44.entities.User.update(member.id, { 
        status: 'active', 
        role: member.role || 'readonly' 
      });
    } catch (err) {
      console.error("Failed to approve user:", err);
      alert("Failed to approve user on server: " + err.message);
    }
    loadUsers();
  };

  const rejectUser = async (member) => {
    if (!confirm(`Reject access request for "${member.email}"?`)) return;
    
    // Optimistic UI update
    setPendingUsers((prev) => prev.filter((u) => u.id !== member.id));
    
    try {
      await base44.entities.User.delete(member.id);
    } catch (err) {
      console.error("Failed to reject user:", err);
    }
    loadUsers();
  };

  const toggleUserStatus = async (member) => {
    const isCurrentlyActive = member.status === 'active' || !member.status;
    const newStatus = isCurrentlyActive ? 'disabled' : 'active';
    const actionName = isCurrentlyActive ? 'disable' : 'enable';
    
    if (!confirm(`Are you sure you want to ${actionName} access for ${member.full_name || member.email}?`)) {
      return;
    }

    // Optimistic update
    setUsers((prev) => prev.map((u) => u.id === member.id ? { ...u, status: newStatus } : u));

    try {
      await base44.entities.User.update(member.id, { status: newStatus });
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Failed to update status on server: " + err.message);
    }
    loadUsers();
  };

  const deleteUserAccount = async (member) => {
    if (!confirm(`Permanently delete account for "${member.full_name || member.email}"? This action cannot be undone.`)) {
      return;
    }

    // Optimistic UI removal
    setUsers((prev) => prev.filter((u) => u.id !== member.id));
    setPendingUsers((prev) => prev.filter((u) => u.id !== member.id));

    try {
      await base44.auth.deleteUser(member.id);
    } catch (err) {
      console.error("Failed to delete user:", err);
      alert("Failed to delete user from server: " + err.message);
    }
    loadUsers();
  };

  const exportAll = async () => {
    const [sites, platforms] = await Promise.all([base44.entities.Site.list("-created_date", 5000), base44.entities.Platform.list()]);
    const platformName = (id) => platforms.find((platform) => platform.id === id)?.name || "";
    exportCSV("cctv-sites-export.csv", sites.map((site) => ({
      "Site Name": site.site_name, Platform: platformName(site.platform_id), Status: site.site_status,
      Client: site.client_company || "", Province: site.province || "", Region: site.region || "",
      Address: site.physical_address || "", GPS: site.gps_coordinates || "",
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

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      (u.full_name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.role || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Account access, appearance, data tools, and user management.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title="Appearance" icon={<Sun className="h-4 w-4" />}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Theme</p>
              <p className="text-xs text-muted-foreground">Choose the interface theme.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun className="mr-1.5 h-4 w-4" /> : <Moon className="mr-1.5 h-4 w-4" />}
              {theme === "dark" ? "Light" : "Dark"}
            </Button>
          </div>
        </Section>

        <Section title="Your Account" icon={<Shield className="h-4 w-4" />}>
          <dl className="space-y-2 text-sm">
            <Row label="Name" value={user?.full_name || "-"} />
            <Row label="Email" value={user?.email || "-"} />
            <Row label="Role" value={ROLE_LABELS[user?.role] || user?.role || "-"} />
          </dl>
        </Section>

        <Section title="Data Tools" icon={<Database className="h-4 w-4" />}>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Export sites</p>
                <p className="text-xs text-muted-foreground">Download the current site register as CSV.</p>
              </div>
              <Button variant="outline" size="sm" onClick={exportAll}>
                <Download className="mr-1.5 h-3.5 w-3.5" />Export
              </Button>
            </div>
            <div className="border-t border-border pt-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Import Database Idea CSVs</p>
                  <p className="max-w-md text-xs text-muted-foreground">
                    Select the <span className="font-medium text-foreground">Database Idea</span> folder.
                    The import includes platforms, sites, cameras, technical and security details, documents, clients and operational history.
                  </p>
                </div>
                <label className="inline-flex cursor-pointer items-center">
                  <input type="file" accept=".csv" multiple webkitdirectory="" className="hidden" onChange={handleBulkImport} disabled={bulkImporting || !canEdit(user)} />
                  <span className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground">
                    <FolderInput className="mr-1.5 h-3.5 w-3.5" />{bulkImporting ? "Importing..." : "Select Folder"}
                  </span>
                </label>
              </div>
              {bulkImporting && <p className="mt-3 rounded-lg bg-secondary p-2.5 text-xs">{bulkMessage}</p>}
              {bulkResult && (
                <div className={`mt-3 flex gap-2 rounded-lg border p-3 text-xs ${bulkResult.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300" : "border-destructive/40 bg-destructive/5 text-destructive"}`}>
                  {bulkResult.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <CircleAlert className="h-4 w-4 shrink-0" />}
                  <p>{bulkResult.message}</p>
                </div>
              )}
            </div>
          </div>
        </Section>

        {/* Pending Approvals — Super Admin only */}
        {isSuperAdmin(user) && (
          <Section
            title={`Pending Approvals${pendingUsers.length > 0 ? ` (${pendingUsers.length})` : ""}`}
            icon={<Clock className="h-4 w-4 text-amber-500" />}
            action={
              <Button size="sm" variant="ghost" onClick={loadUsers} className="text-xs gap-1">
                <RefreshCw className="h-3 w-3" /> Refresh
              </Button>
            }
          >
            {loading ? (
              <div className="space-y-2">{[0, 1].map((i) => <div key={i} className="h-10 animate-pulse rounded bg-muted" />)}</div>
            ) : pendingUsers.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-500/50" />
                No pending registration requests.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {pendingUsers.map((member) => (
                  <li key={member.id} className="py-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{member.full_name || member.email}</p>
                        <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                        {member.created_date && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Requested {new Date(member.created_date).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={member.role || 'readonly'}
                        onValueChange={(role) => {
                          setPendingUsers((prev) => prev.map((u) => u.id === member.id ? { ...u, role } : u));
                        }}
                      >
                        <SelectTrigger className="h-8 w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ASSIGNABLE_ROLE_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button 
                        size="sm" 
                        className="h-8 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" 
                        onClick={() => approveUser(member)}
                      >
                        <UserCheck className="h-3.5 w-3.5" /> Approve
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 gap-1 text-destructive hover:bg-destructive/10" 
                        onClick={() => rejectUser(member)}
                      >
                        <UserX className="h-3.5 w-3.5" /> Reject
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        )}

        {/* Full User Management — Admin + Super Admin */}
        <div className="lg:col-span-2">
          <Section 
            title="User Management" 
            icon={<Users className="h-4 w-4" />}
            action={
              isSuperAdmin(user) && (
                <Button size="sm" onClick={() => setCreateDialogOpen(true)} className="gap-1.5">
                  <UserPlus className="h-3.5 w-3.5" /> Add New User
                </Button>
              )
            }
          >
            {!isAdmin(user) ? (
              <p className="text-sm text-muted-foreground">Only administrators can manage users.</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search users by name, email, or role..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9 text-sm"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {filteredUsers.length} user{filteredUsers.length === 1 ? "" : "s"} found
                  </p>
                </div>

                {loading ? (
                  <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded bg-muted" />)}</div>
                ) : filteredUsers.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No users matching search.</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3">User</th>
                          <th className="px-4 py-3">Role</th>
                          <th className="px-4 py-3">Status</th>
                          {isSuperAdmin(user) && <th className="px-4 py-3 text-right">Actions</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredUsers.map((member) => {
                          const isSuperAdminAccount = member.role === 'super_admin' || member.email === 'slebeloane@stallion.co.za';
                          const isDisabled = member.status === 'disabled' || member.status === 'deactivated';

                          return (
                            <tr key={member.id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-3">
                                <div>
                                  <p className="font-medium text-foreground">{member.full_name || member.email}</p>
                                  <p className="text-xs text-muted-foreground">{member.email}</p>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {isSuperAdmin(user) && !isSuperAdminAccount ? (
                                  <Select
                                    value={member.role || 'readonly'}
                                    onValueChange={async (role) => {
                                      // Optimistic role change
                                      setUsers((prev) => prev.map((u) => u.id === member.id ? { ...u, role } : u));
                                      await base44.entities.User.update(member.id, { role });
                                      loadUsers();
                                    }}
                                  >
                                    <SelectTrigger className="h-8 w-[140px] text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Object.entries(ASSIGNABLE_ROLE_LABELS).map(([value, label]) => (
                                        <SelectItem key={value} value={value}>{label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ${
                                    isSuperAdminAccount ? "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20" : "bg-secondary text-secondary-foreground"
                                  }`}>
                                    {ROLE_LABELS[member.role] || member.role || "Read Only"}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {isDisabled ? (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                    <Ban className="h-3 w-3" /> Disabled
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                    <CheckCircle className="h-3 w-3" /> Active
                                  </span>
                                )}
                              </td>
                              {isSuperAdmin(user) && (
                                <td className="px-4 py-3 text-right">
                                  {!isSuperAdminAccount ? (
                                    <div className="flex items-center justify-end gap-1.5">
                                      {/* Edit Details Button */}
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setEditingUser(member)}
                                        className="h-7 px-2 text-xs gap-1"
                                        title="Edit user details and password"
                                      >
                                        <Pencil className="h-3 w-3" /> Edit
                                      </Button>

                                      {/* Toggle Status Button */}
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => toggleUserStatus(member)}
                                        className={`h-7 px-2 text-xs gap-1 ${
                                          isDisabled 
                                            ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-300" 
                                            : "text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-300"
                                        }`}
                                      >
                                        {isDisabled ? "Enable" : "Disable"}
                                      </Button>

                                      {/* Delete Button */}
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => deleteUserAccount(member)}
                                        className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                                        title="Permanently delete user"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground italic">Master Admin</span>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </Section>
        </div>
      </div>

      {/* Create User Dialog */}
      <CreateUserDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen} 
        onUserCreated={loadUsers} 
      />

      {/* Edit User Dialog */}
      <EditUserDialog
        user={editingUser}
        open={!!editingUser}
        onOpenChange={(open) => { if (!open) setEditingUser(null); }}
        onUserSaved={loadUsers}
      />
    </div>
  );
}

function CreateUserDialog({ open, onOpenChange, onUserCreated }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("readonly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password || !fullName) {
      setError("All fields are required.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      await base44.auth.createUser({
        email,
        password,
        full_name: fullName,
        role,
        status: 'active'
      });

      setFullName("");
      setEmail("");
      setPassword("");
      setRole("readonly");
      onOpenChange(false);
      onUserCreated();
    } catch (err) {
      setError(err.message || "Failed to create user.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" /> Add New User
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="create-fullname">Full Name</Label>
            <Input 
              id="create-fullname"
              placeholder="e.g. John Smith"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-email">Email Address</Label>
            <Input 
              id="create-email"
              type="email"
              placeholder="e.g. jsmith@stallion.co.za"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-password">Initial Password</Label>
            <Input 
              id="create-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-role">Assigned Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="create-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ASSIGNABLE_ROLE_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({ user: editTarget, open, onOpenChange, onUserSaved }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("readonly");
  const [status, setStatus] = useState("active");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editTarget) {
      setFullName(editTarget.full_name || "");
      setEmail(editTarget.email || "");
      setRole(editTarget.role || "readonly");
      setStatus(editTarget.status || "active");
      setPassword("");
      setError("");
    }
  }, [editTarget]);

  if (!editTarget) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !fullName) {
      setError("Full Name and Email are required.");
      return;
    }

    if (password && password.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      await base44.auth.updateUser(editTarget.id, {
        email,
        full_name: fullName,
        role,
        status,
        password: password.trim() || undefined
      });

      onOpenChange(false);
      onUserSaved();
    } catch (err) {
      setError(err.message || "Failed to update user details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-primary" /> Edit User Details
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-fullname">Full Name</Label>
            <Input 
              id="edit-fullname"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-email">Email Address</Label>
            <Input 
              id="edit-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-role">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger id="edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ASSIGNABLE_ROLE_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5 border-t border-border pt-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-password" className="flex items-center gap-1">
                <Key className="h-3.5 w-3.5 text-muted-foreground" /> Reset Password
              </Label>
              <span className="text-[11px] text-muted-foreground">Leave blank to keep current</span>
            </div>
            <Input 
              id="edit-password"
              type="password"
              placeholder="New password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, icon, children, action }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold">{icon}{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
