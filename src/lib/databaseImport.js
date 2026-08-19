const EXPECTED_EXPORTS = [
  "Platform", "Site", "Camera", "SecurityInfo", "TechnicalInfo",
  "Document", "Client", "AuditLog", "Notification"
];

function parseCSVRow(row) {
  const values = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < row.length; index += 1) {
    const char = row[index];
    if (char === '"') {
      if (quoted && row[index + 1] === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(value); value = "";
    } else value += char;
  }
  values.push(value);
  return values;
}

function splitCSVRows(text) {
  const rows = [];
  let row = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { row += '""'; index += 1; }
      else { quoted = !quoted; row += char; }
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (row.trim()) rows.push(row);
      row = "";
      if (char === "\r" && text[index + 1] === "\n") index += 1;
    } else row += char;
  }
  if (row.trim()) rows.push(row);
  return rows;
}

export function parseCSV(text) {
  const rows = splitCSVRows(text.replace(/^\uFEFF/, ""));
  if (rows.length < 2) return [];
  const headers = parseCSVRow(rows[0]);
  return rows.slice(1).map((row) => Object.fromEntries(headers.map((header, index) => [header, parseCSVRow(row)[index] ?? ""])));
}

const clean = (value) => value == null || value === "" || value === "null" ? "" : value;
const toBool = (value) => value === true || value === "true";
const toNum = (value) => {
  const number = Number(value);
  return clean(value) !== "" && Number.isFinite(number) ? number : null;
};
const parseTags = (value) => {
  if (!clean(value) || value === "[]") return [];
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; }
  catch { return value.split(",").map((tag) => tag.trim()).filter(Boolean); }
};

const sourceKey = (row) => row.id || "";
const safe = (work) => work.catch(() => null);

export function detectCsvEntity(filename) {
  const base = filename.replace(/_export\.csv$/i, "").replace(/\.csv$/i, "");
  return EXPECTED_EXPORTS.includes(base) ? base : null;
}

export function getImportSelection(files) {
  const fileMap = {};
  const duplicates = [];
  Array.from(files).forEach((file) => {
    const entity = detectCsvEntity(file.name);
    if (!entity) return;
    if (fileMap[entity]) duplicates.push(file.name);
    else fileMap[entity] = file;
  });
  return { fileMap, duplicates, missing: EXPECTED_EXPORTS.filter((entity) => !fileMap[entity]) };
}

export async function importDatabaseIdeaCsvs(fileMap, { onProgress } = {}) {
  const report = (message) => onProgress?.(message);
  const { base44 } = await import("@/api/base44Client");
  const rows = Object.fromEntries(await Promise.all(EXPECTED_EXPORTS.map(async (entity) => [
    entity, fileMap[entity] ? parseCSV(await fileMap[entity].text()) : []
  ])));
  const stats = Object.fromEntries(EXPECTED_EXPORTS.map((entity) => [entity, { created: 0, updated: 0, skipped: 0 }]));
  const ids = { Platform: {}, Site: {}, Camera: {}, SecurityInfo: {}, TechnicalInfo: {}, Document: {}, Client: {} };
  const entityIds = { ...ids, AuditLog: {}, Notification: {} };

  const upsert = async (entity, sourceId, query, payload) => {
    const existing = (await base44.entities[entity].filter(query))[0];
    const saved = existing
      ? await base44.entities[entity].update(existing.id, payload)
      : await base44.entities[entity].create(payload);
    stats[entity][existing ? "updated" : "created"] += 1;
    if (sourceId) entityIds[entity][sourceId] = saved.id;
    return saved;
  };

  report("Importing platforms…");
  for (const row of rows.Platform) {
    const name = clean(row.name); if (!name) { stats.Platform.skipped += 1; continue; }
    await upsert("Platform", sourceKey(row), { name }, { name, description: clean(row.description), is_default: toBool(row.is_default), color: clean(row.color) || "#3b82f6", status: clean(row.status) || "Active" });
  }

  const platforms = await base44.entities.Platform.list();
  const defaultPlatformId = platforms.find((platform) => platform.is_default)?.id || platforms[0]?.id || "";
  report("Importing sites…");
  for (const row of rows.Site) {
    const siteName = clean(row.site_name); if (!siteName) { stats.Site.skipped += 1; continue; }
    const payload = {
      site_name: siteName, site_code: clean(row.site_code), platform_id: entityIds.Platform[row.platform_id] || defaultPlatformId,
      site_status: clean(row.site_status) || "Active", monitoring_schedule: clean(row.monitoring_schedule) || "24/7",
      client_company: clean(row.client_company), primary_contact: clean(row.primary_contact), secondary_contact: clean(row.secondary_contact),
      contact_telephone: clean(row.contact_telephone), contact_email: clean(row.contact_email), after_hours_contact: clean(row.after_hours_contact),
      site_manager: clean(row.site_manager), physical_address: clean(row.physical_address), gps_coordinates: clean(row.gps_coordinates),
      province: clean(row.province), region: clean(row.region), tags: parseTags(row.tags),
      notes: clean(row.notes), sop_notes: clean(row.sop_notes), is_favorite: toBool(row.is_favorite)
    };
    await upsert("Site", sourceKey(row), { site_name: siteName }, payload);
  }

  report("Importing cameras and site details…");
  for (const row of rows.Camera) {
    const siteId = entityIds.Site[row.site_id], name = clean(row.camera_name);
    if (!siteId || !name) { stats.Camera.skipped += 1; continue; }
    await upsert("Camera", sourceKey(row), { site_id: siteId, camera_name: name }, { site_id: siteId, camera_name: name, camera_number: toNum(row.camera_number), camera_type: clean(row.camera_type) || "Other", camera_status: clean(row.camera_status) || "Active", location: clean(row.location), notes: clean(row.notes) });
  }
  for (const [entity, fields] of [["SecurityInfo", ["armed_response_company", "armed_response_contact", "site_supervisor", "guarding_company", "guard_contact_number", "access_procedure", "emergency_contacts"]], ["TechnicalInfo", ["dvr_nvr_details", "platform_technical", "ip_address", "isp", "sim_number", "sim_imsi", "router_details", "network_notes", "camera_analytics"]]]) {
    for (const row of rows[entity]) {
      const siteId = entityIds.Site[row.site_id]; if (!siteId) { stats[entity].skipped += 1; continue; }
      const payload = Object.fromEntries(fields.map((field) => [field, clean(row[field])])) ; payload.site_id = siteId;
      await upsert(entity, sourceKey(row), { site_id: siteId }, payload);
    }
  }

  report("Importing clients and documents…");
  for (const row of rows.Client) {
    const companyName = clean(row.company_name); if (!companyName) { stats.Client.skipped += 1; continue; }
    await upsert("Client", sourceKey(row), { company_name: companyName }, { company_name: companyName, primary_contact_name: clean(row.primary_contact_name), primary_contact_email: clean(row.primary_contact_email), primary_contact_phone: clean(row.primary_contact_phone), secondary_contact_name: clean(row.secondary_contact_name), secondary_contact_phone: clean(row.secondary_contact_phone), after_hours_contact: clean(row.after_hours_contact), site_manager_name: clean(row.site_manager_name), notes: clean(row.notes) });
  }
  for (const row of rows.Document) {
    const siteId = entityIds.Site[row.site_id], fileName = clean(row.file_name); if (!siteId || !fileName) { stats.Document.skipped += 1; continue; }
    await upsert("Document", sourceKey(row), { site_id: siteId, file_name: fileName }, { site_id: siteId, file_name: fileName, file_url: clean(row.file_url), file_type: clean(row.file_type) || "Other", file_size: toNum(row.file_size), version: clean(row.version), description: clean(row.description) });
  }

  report("Importing operational history…");
  const resolveRelatedId = (type, id) => entityIds[type]?.[id] || id || "";
  for (const row of rows.AuditLog) {
    const action = clean(row.action), created = clean(row.created_date); if (!action) { stats.AuditLog.skipped += 1; continue; }
    const payload = { user_email: clean(row.user_email), entity_type: clean(row.entity_type), entity_id: resolveRelatedId(row.entity_type, row.entity_id), entity_name: clean(row.entity_name), action, description: clean(row.description), old_value: clean(row.old_value), new_value: clean(row.new_value), source_created_date: created };
    await upsert("AuditLog", sourceKey(row), { action, entity_name: payload.entity_name, source_created_date: created }, payload);
  }
  for (const row of rows.Notification) {
    const title = clean(row.title), created = clean(row.created_date); if (!title) { stats.Notification.skipped += 1; continue; }
    const payload = { title, message: clean(row.message), type: clean(row.type), related_entity_id: resolveRelatedId("Site", row.related_entity_id), is_read: toBool(row.is_read), source_created_date: created };
    await upsert("Notification", sourceKey(row), { title, source_created_date: created }, payload);
  }

  report("Import complete.");
  return stats;
}
