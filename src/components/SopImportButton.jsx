import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileUp, Loader2 } from "lucide-react";

export default function SopImportButton({ onExtracted }) {
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setLoading(true);
    try {
      // Basic local extraction: use file name and basic text inspection if available
      const name = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      const mockExtracted = {
        site_name: name,
        physical_address: "",
        client_company: "",
        primary_contact: "",
        contact_telephone: "",
        monitoring_schedule: "24/7",
        sop_notes: `Imported from SOP file: ${file.name}`
      };
      
      onExtracted?.(mockExtracted);
    } catch (err) {
      console.error("SOP extraction failed", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.txt" className="hidden" onChange={handleFile} />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={loading}
        onClick={() => inputRef.current?.click()}
      >
        {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <FileUp className="mr-1.5 h-4 w-4" />}
        {loading ? "Reading SOP…" : "Import from SOP File"}
      </Button>
    </>
  );
}