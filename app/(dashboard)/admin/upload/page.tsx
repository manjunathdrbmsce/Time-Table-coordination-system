"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "react-hot-toast";

export default function AdminUploadPage() {
  const [uploading, setUploading] = useState(false);
  const [academicYear, setAcademicYear] = useState("");
  const [semester, setSemester] = useState("");
  const [roomFile, setRoomFile] = useState<File | null>(null);
  const [sectionFile, setSectionFile] = useState<File | null>(null);

  const handleUpload = async () => {
    if (!academicYear || !semester) {
      toast.error("Please fill in academic year and semester");
      return;
    }

    if (!roomFile && !sectionFile) {
      toast.error("Please select at least one file to upload");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("academicYear", academicYear);
    formData.append("semester", semester);
    if (roomFile) formData.append("roomFile", roomFile);
    if (sectionFile) formData.append("sectionFile", sectionFile);

    try {
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Timetables uploaded successfully!");
        setRoomFile(null);
        setSectionFile(null);
      } else {
        toast.error(data.error || "Upload failed");
      }
    } catch (error) {
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Upload Timetables</h1>
        <p className="text-muted-foreground">
          Upload Excel files to import room and section timetables
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upload Details</CardTitle>
            <CardDescription>
              Specify the academic year and semester for this upload
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="academicYear">Academic Year</Label>
              <Input
                id="academicYear"
                placeholder="e.g., 2024-25"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="semester">Semester</Label>
              <Input
                id="semester"
                placeholder="e.g., Odd / Even"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Select Files</CardTitle>
            <CardDescription>
              Upload Excel files (.xlsx) for rooms and sections
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="roomFile">Room Timetable (Optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="roomFile"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setRoomFile(e.target.files?.[0] || null)}
                />
                {roomFile && <CheckCircle className="w-5 h-5 text-green-500" />}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sectionFile">Section Timetable (Optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="sectionFile"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setSectionFile(e.target.files?.[0] || null)}
                />
                {sectionFile && <CheckCircle className="w-5 h-5 text-green-500" />}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full"
            size="lg"
          >
            {uploading ? (
              <>Processing...</>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Timetables
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
