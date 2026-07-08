import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, ChevronRight, Clock, CheckCircle } from "lucide-react";
import Link from "next/link";
import { ExportSectionsButton } from "./export-button";

export default async function CoordinatorSectionsPage() {
  const session = await auth();

  if (!session?.user?.departmentId) {
    redirect("/login");
  }

  const departmentId = session.user.departmentId;

  // Fetch department info
  const department = await db.department.findUnique({
    where: { id: departmentId },
  });

  if (!department) {
    redirect("/login");
  }

  // Fetch sections directly by departmentId (not through semesters)
  // This fixes the issue where semesters may not be linked to departments
  const sections = await db.section.findMany({
    where: { departmentId },
    include: {
      semester: true,
      allocations: { select: { type: true } },
    },
    orderBy: [{ year: "asc" }, { division: "asc" }],
  });

  // Group sections by semester
  const semesterMap = new Map<string, {
    id: string;
    name: string;
    code: string;
    isActive: boolean;
    sections: typeof sections;
  }>();

  for (const section of sections) {
    const semId = section.semesterId;
    if (!semesterMap.has(semId)) {
      semesterMap.set(semId, {
        id: section.semester.id,
        name: section.semester.name,
        code: section.semester.code,
        isActive: section.semester.isActive,
        sections: [],
      });
    }
    semesterMap.get(semId)!.sections.push(section);
  }

  // Convert to array and sort by semester code
  const semesters = Array.from(semesterMap.values()).sort((a, b) => 
    a.code.localeCompare(b.code)
  );

  // Calculate total stats
  const totalSections = sections.length;
  const totalAllocations = sections.reduce((sum, s) => sum + s.allocations.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Section Timetables</h1>
            <Badge variant="secondary">{department.code}</Badge>
          </div>
          <ExportSectionsButton 
            departmentCode={department.code} 
            sectionCount={totalSections}
          />
        </div>
        <p className="text-muted-foreground">
          Edit timetables for your department sections ({totalSections} sections, {totalAllocations} allocations)
        </p>
      </div>

      <div className="space-y-6">
        {semesters.map((semester) => (
          <Card key={semester.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {semester.name}
                {semester.isActive && <Badge variant="default">Active</Badge>}
              </CardTitle>
              <CardDescription>
                {semester.sections.length} sections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {semester.sections.map((section) => {
                  const theoryHrs = section.allocations.filter(a => a.type === "THEORY").length;
                  const labHrs = section.allocations.filter(a => a.type === "LAB").length;
                  const totalHrs = theoryHrs + labHrs;
                  const targetHrs = section.requiredTheoryHours + section.requiredLabHours;
                  const isComplete = totalHrs >= targetHrs;
                  const percentage = targetHrs > 0 ? Math.round((totalHrs / targetHrs) * 100) : 0;
                  const label = `${section.year}${section.division}`;

                  return (
                    <Link key={section.id} href={`/coordinator/sections/${section.id}`}>
                      <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <GraduationCap className="w-4 h-4 text-primary" />
                              <span className="font-semibold">{label}</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                Theory
                              </span>
                              <span>{theoryHrs}/{section.requiredTheoryHours}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                Lab
                              </span>
                              <span>{labHrs}/{section.requiredLabHours}</span>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t">
                              {isComplete ? (
                                <Badge variant="default" className="text-xs bg-green-600">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Complete
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {targetHrs - totalHrs} hrs left
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">{percentage}%</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}

        {semesters.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <GraduationCap className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No sections found</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
