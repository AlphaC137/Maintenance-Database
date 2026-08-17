import jsPDF from "jspdf";
import { toast } from "sonner";

export function generateSitePassportPdf(site, platform, cameras = [], security = null, technical = null) {
  if (!site) return toast.error("Site data unavailable");

  const doc = new jsPDF();
  const margin = 20;
  let y = 20;

  // Header Banner
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, 210, 35, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(site.site_name || "SITE PASSPORT", margin, 22);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Site Code: ${site.site_code || "N/A"} | Platform: ${platform?.name || "N/A"} | Status: ${site.site_status || "Active"}`, margin, 29);

  y = 45;

  // Helper Section Renderer
  const renderSection = (title) => {
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, 170, 7, "F");
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(title, margin + 4, y + 5);
    y += 12;
  };

  const renderField = (label, val, xOffset = 0) => {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text(`${label}:`, margin + xOffset, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(String(val || "—"), margin + xOffset + 35, y);
  };

  // Section 1: General Info
  renderSection("1. GENERAL & LOCATION DETAILS");
  renderField("Client Company", site.client_company, 0);
  renderField("Monitoring", site.monitoring_schedule, 90);
  y += 6;
  renderField("Province / Region", `${site.province || "—"} / ${site.region || "—"}`, 0);
  renderField("GPS Coordinates", site.gps_coordinates, 90);
  y += 6;
  renderField("Physical Address", site.physical_address, 0);
  y += 8;

  // Section 2: Contact Details
  renderSection("2. CONTACT & MANAGEMENT");
  renderField("Primary Contact", site.primary_contact, 0);
  renderField("Telephone", site.contact_telephone, 90);
  y += 6;
  renderField("Contact Email", site.contact_email, 0);
  renderField("After Hours", site.after_hours_contact, 90);
  y += 8;

  // Section 3: Technical & Security Setup
  renderSection("3. TECHNICAL & SECURITY OVERVIEW");
  renderField("IP Address", technical?.ip_address || "—", 0);
  renderField("DVR/NVR Model", technical?.dvr_nvr_details || "—", 90);
  y += 6;
  renderField("Armed Response", security?.armed_response_company || "—", 0);
  renderField("Guarding Co.", security?.guarding_company || "—", 90);
  y += 8;

  // Section 4: Maintenance Status
  renderSection("4. PREVENTATIVE MAINTENANCE SCHEDULE");
  renderField("Last Service", site.last_service_date || "Not Recorded", 0);
  renderField("Next Service Due", site.next_service_due || "Not Scheduled", 90);
  y += 8;

  // Section 5: Camera Manifest Summary
  renderSection(`5. CAMERA MANIFEST (${cameras.length} Cameras)`);
  
  if (cameras.length === 0) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text("No camera manifest entries recorded yet.", margin + 4, y);
    y += 8;
  } else {
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("#", margin + 4, y);
    doc.text("Camera Name", margin + 14, y);
    doc.text("Type", margin + 70, y);
    doc.text("Status", margin + 110, y);
    doc.text("Location", margin + 140, y);
    y += 4;
    doc.line(margin, y, 190, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    cameras.slice(0, 10).forEach((c, idx) => {
      if (y > 270) return;
      doc.text(String(c.camera_number || idx + 1), margin + 4, y);
      doc.text(String(c.camera_name || "—").slice(0, 25), margin + 14, y);
      doc.text(String(c.camera_type || "—"), margin + 70, y);
      doc.text(String(c.camera_status || "Active"), margin + 110, y);
      doc.text(String(c.location || "—").slice(0, 20), margin + 140, y);
      y += 5;
    });
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated on ${new Date().toLocaleString()} - CCTV Maintenance Database Passport`, margin, 285);

  doc.save(`Site_Passport_${(site.site_name || "site").replace(/\s+/g, "_")}.pdf`);
  toast.success("Site Passport PDF downloaded");
}
