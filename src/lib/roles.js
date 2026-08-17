export const ROLE_LABELS = {
    admin: "Administrator",
    maintenance: "Maintenance",
    readonly: "Read Only"
  };
  
  export const isAdmin = (user) => user?.role === "admin";
  export const canEdit = (user) => user?.role === "admin" || user?.role === "maintenance";
  export const canDelete = (user) => user?.role === "admin";