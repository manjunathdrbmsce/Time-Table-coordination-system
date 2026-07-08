"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Download,
  Upload,
  Database,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  FileJson,
  HardDrive,
  RefreshCw,
  Shield,
  Clock,
  Users,
  Building2,
  GraduationCap,
  DoorOpen,
  Calendar,
  BookOpen,
} from "lucide-react";
import toast from "react-hot-toast";

interface BackupStats {
  stats: {
    buildings: number;
    academicSessions: number;
    departments: number;
    users: number;
    semesters: number;
    rooms: number;
    sections: number;
    subjects: number;
    faculties: number;
    facultyMappings: number;
    allocations: number;
    slotRequests: number;
    approvals: number;
    timetableUploads: number;
    auditLogs: number;
  };
  totalRecords: number;
}

export default function BackupRestorePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [backupStats, setBackupStats] = useState<BackupStats | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [restorePreview, setRestorePreview] = useState<any>(null);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch current database stats
  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/backup", {
        method: "POST",
      });
      if (response.ok) {
        const data = await response.json();
        setBackupStats(data);
      } else {
        toast.error("Failed to fetch database statistics");
      }
    } catch (error) {
      toast.error("Failed to connect to server");
    } finally {
      setIsLoading(false);
    }
  };

  // Download backup
  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const response = await fetch("/api/admin/backup");
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        
        // Get filename from Content-Disposition header or generate one
        const disposition = response.headers.get("Content-Disposition");
        let filename = `timetable_backup_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
        if (disposition) {
          const match = disposition.match(/filename="(.+)"/);
          if (match) filename = match[1];
        }
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast.success("Backup downloaded successfully!");
      } else {
        toast.error("Failed to create backup");
      }
    } catch (error) {
      toast.error("Failed to download backup");
    } finally {
      setIsBackingUp(false);
    }
  };

  // Handle file selection
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      toast.error("Please select a valid JSON backup file");
      return;
    }

    setSelectedFile(file);

    // Preview the backup file
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!data.version || !data.createdAt) {
        toast.error("Invalid backup file format");
        setSelectedFile(null);
        return;
      }

      setRestorePreview({
        version: data.version,
        createdAt: data.createdAt,
        createdBy: data.createdBy,
        counts: {
          buildings: data.buildings?.length || 0,
          departments: data.departments?.length || 0,
          users: data.users?.length || 0,
          rooms: data.rooms?.length || 0,
          sections: data.sections?.length || 0,
          subjects: data.subjects?.length || 0,
          faculties: data.faculties?.length || 0,
          allocations: data.allocations?.length || 0,
        },
      });
      
      toast.success("Backup file loaded successfully");
    } catch (error) {
      toast.error("Failed to parse backup file");
      setSelectedFile(null);
      setRestorePreview(null);
    }
  };

  // Restore from backup
  const handleRestore = async () => {
    if (!selectedFile) return;

    setIsRestoring(true);
    setRestoreProgress(10);
    setShowRestoreConfirm(false);

    try {
      const text = await selectedFile.text();
      const data = JSON.parse(text);
      
      setRestoreProgress(30);

      const response = await fetch("/api/admin/restore", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: text,
      });

      setRestoreProgress(80);

      if (response.ok) {
        const result = await response.json();
        setRestoreProgress(100);
        toast.success("Database restored successfully!");
        
        // Refresh stats
        await fetchStats();
        
        // Clear selected file
        setSelectedFile(null);
        setRestorePreview(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to restore database");
      }
    } catch (error) {
      toast.error("Failed to restore database");
    } finally {
      setIsRestoring(false);
      setRestoreProgress(0);
    }
  };

  // Fetch stats on mount
  useState(() => {
    fetchStats();
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Backup & Restore</h1>
          <p className="text-muted-foreground mt-1">
            Manage database backups and restore from previous snapshots
          </p>
        </div>
        <Button variant="outline" onClick={fetchStats} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh Stats
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {backupStats?.totalRecords?.toLocaleString() || "---"}
            </div>
            <p className="text-xs text-muted-foreground">Across all tables</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {backupStats?.stats?.departments || "---"}
            </div>
            <p className="text-xs text-muted-foreground">Active departments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {backupStats?.stats?.users || "---"}
            </div>
            <p className="text-xs text-muted-foreground">Registered users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Allocations</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {backupStats?.stats?.allocations?.toLocaleString() || "---"}
            </div>
            <p className="text-xs text-muted-foreground">Timetable entries</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Backup Section */}
        <Card className="border-green-200 dark:border-green-900">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Download className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <CardTitle>Create Backup</CardTitle>
                <CardDescription>
                  Download a complete snapshot of your database
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>Buildings: {backupStats?.stats?.buildings || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                <span>Sections: {backupStats?.stats?.sections || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <DoorOpen className="h-4 w-4 text-muted-foreground" />
                <span>Rooms: {backupStats?.stats?.rooms || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <span>Subjects: {backupStats?.stats?.subjects || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>Faculty: {backupStats?.stats?.faculties || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Allocations: {backupStats?.stats?.allocations || 0}</span>
              </div>
            </div>

            <Separator />

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>Backup includes all data with preserved relationships</span>
            </div>

            <Button
              onClick={handleBackup}
              disabled={isBackingUp}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              {isBackingUp ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Backup...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download Backup
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Restore Section */}
        <Card className="border-orange-200 dark:border-orange-900">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <Upload className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <CardTitle>Restore from Backup</CardTitle>
                <CardDescription>
                  Upload a backup file to restore the database
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <FileJson className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">
                {selectedFile ? selectedFile.name : "Click to select backup file"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Only .json backup files are supported
              </p>
            </div>

            {restorePreview && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Backup Info</span>
                  <Badge variant="outline">v{restorePreview.version}</Badge>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    Created: {new Date(restorePreview.createdAt).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-3 w-3" />
                    By: {restorePreview.createdBy}
                  </div>
                </div>
                <Separator className="my-2" />
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span>Departments: {restorePreview.counts.departments}</span>
                  <span>Users: {restorePreview.counts.users}</span>
                  <span>Rooms: {restorePreview.counts.rooms}</span>
                  <span>Sections: {restorePreview.counts.sections}</span>
                  <span>Subjects: {restorePreview.counts.subjects}</span>
                  <span>Allocations: {restorePreview.counts.allocations}</span>
                </div>
              </div>
            )}

            {isRestoring && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Restoring database...</span>
                  <span>{restoreProgress}%</span>
                </div>
                <Progress value={restoreProgress} />
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
              <AlertTriangle className="h-4 w-4" />
              <span>This will replace ALL existing data</span>
            </div>

            <Button
              onClick={() => setShowRestoreConfirm(true)}
              disabled={!selectedFile || isRestoring}
              className="w-full bg-orange-600 hover:bg-orange-700"
              size="lg"
            >
              {isRestoring ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Restore Database
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      {backupStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Database Details
            </CardTitle>
            <CardDescription>
              Complete breakdown of all database tables
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {Object.entries(backupStats.stats).map(([key, value]) => (
                <div
                  key={key}
                  className="p-3 bg-muted/50 rounded-lg text-center"
                >
                  <div className="text-2xl font-bold">{value.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Restore Confirmation Dialog */}
      <Dialog open={showRestoreConfirm} onOpenChange={setShowRestoreConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              Confirm Database Restore
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 pt-2">
                <p>
                  You are about to restore the database from a backup file. This action will:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li><strong>DELETE</strong> all existing data in the database</li>
                  <li><strong>REPLACE</strong> with data from the backup file</li>
                  <li>This action <strong>CANNOT</strong> be undone</li>
                </ul>
                <p className="text-sm font-medium">
                  Are you sure you want to proceed?
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowRestoreConfirm(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRestore}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Yes, Restore Database
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
