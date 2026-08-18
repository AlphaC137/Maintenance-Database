export const ROLE_LABELS = {
  super_admin: "Super Admin",
  admin: "Administrator",
  maintenance: "Maintenance",
  readonly: "Read Only"
};

// Assignable roles (super_admin cannot be assigned via UI)
export const ASSIGNABLE_ROLE_LABELS = {
  admin: "Administrator",
  maintenance: "Maintenance",
  readonly: "Read Only"
};

export const isSuperAdmin = (user) => user?.role === "super_admin";
export const isAdmin = (user) => user?.role === "admin" || user?.role === "super_admin";
export const canEdit = (user) => user?.role === "admin" || user?.role === "super_admin" || user?.role === "maintenance";
export const canDelete = (user) => user?.role === "admin" || user?.role === "super_admin";