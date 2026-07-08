"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2, FileSpreadsheet } from "lucide-react";
import toast from "react-hot-toast";

interface ExportSectionsButtonProps {
  departmentCode: string;
  sectionCount: number;
}

export function ExportSectionsButton({ departmentCode, sectionCount }: ExportSectionsButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (sectionCount === 0) {
      toast.error("No sections to export");
      return;
    }

    setIsExporting(true);
    try {
      const response = await fetch("/api/coordinator/sections/export");
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to export timetables");
      }

      // Get the blob from response
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `${departmentCode}_Section_Timetables.xlsx`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) {
          filename = match[1];
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`Exported ${sectionCount} section timetables`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to export timetables");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button 
      onClick={handleExport} 
      disabled={isExporting || sectionCount === 0}
      className="gap-2"
      variant="outline"
    >
      {isExporting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Exporting...
        </>
      ) : (
        <>
          <FileSpreadsheet className="h-4 w-4" />
          Export All Timetables
        </>
      )}
    </Button>
  );
}
