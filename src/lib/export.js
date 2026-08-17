function escapeCSV(val) {
    if (val === null || val === undefined) return "";
    const s = String(val);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }
  
  function rowsToCSV(rows) {
    if (!rows || !rows.length) return "";
    const headers = Object.keys(rows[0]);
    const lines = [headers.join(",")];
    for (const row of rows) {
      lines.push(headers.map((h) => escapeCSV(row[h])).join(","));
    }
    return lines.join("\n");
  }
  
  function download(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  export function exportCSV(filename, rows) {
    download(filename, rowsToCSV(rows), "text/csv;charset=utf-8;");
  }
  
  export function exportExcel(filename, rows) {
    if (!rows || !rows.length) {
      download(filename, "", "application/vnd.ms-excel");
      return;
    }
    const headers = Object.keys(rows[0]);
    const thead = `<tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>`;
    const tbody = rows
      .map((r) => `<tr>${headers.map((h) => `<td>${String(r[h] ?? "").replace(/</g, "&lt;")}</td>`).join("")}</tr>`)
      .join("");
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><table>${thead}${tbody}</table></body></html>`;
    download(filename.replace(/\.csv$/, ".xls"), html, "application/vnd.ms-excel");
  }