import { base44 } from "@/api/base44Client";

export async function logAudit({ action, entityType, entityId, entityName, oldValue, newValue, description }) {
  try {
    const user = await base44.auth.me().catch(() => null);
    await base44.entities.AuditLog.create({
      action,
      entity_type: entityType || "",
      entity_id: entityId || "",
      entity_name: entityName || "",
      old_value: oldValue ? JSON.stringify(oldValue) : "",
      new_value: newValue ? JSON.stringify(newValue) : "",
      description: description || "",
      user_email: user?.email || ""
    });
  } catch (e) {
    // audit failures should never break the main operation
  }
}

export async function pushNotification({ title, message, type, relatedEntityId }) {
  try {
    await base44.entities.Notification.create({
      title,
      message,
      type: type || "",
      is_read: false,
      related_entity_id: relatedEntityId || ""
    });
  } catch (e) {
    // non-critical
  }
}