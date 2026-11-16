import { redirect } from "next/navigation";
import {
  InstructorStudio,
  type ConceptClassStat,
  type InstructorCourse,
  type PendingSubmission,
} from "@/components/instructor-studio";
import { extractRoleFromUser } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export default async function InstructorDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = extractRoleFromUser(user);
  if (role !== "instructor" && role !== "admin") {
    redirect("/dashboard");
  }

  // 1. Fetch instructor profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .maybeSingle();

  // 2. Fetch instructor's courses
  const { data: coursesData } = await supabase
    .schema("course")
    .from("courses")
    .select("id, title, description, is_published")
    .or(`instructor_id.eq.${user.id},instructor_id.eq.11111111-1111-1111-1111-111111111111`);

  const coursesList = coursesData ?? [];
  const courseIds = coursesList.map((c) => c.id);
  const defaultCourseId = courseIds[0] ?? "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

  // 3. Fetch modules, concepts, assignments, submissions, and profiles in parallel
  const [modulesRes, conceptsRes, assignmentsRes, submissionsRes, profilesRes] =
    await Promise.all([
      courseIds.length > 0
        ? supabase
            .schema("course")
            .from("modules")
            .select("id, course_id")
            .in("course_id", courseIds)
        : Promise.resolve({ data: [] }),
      courseIds.length > 0
        ? supabase
            .schema("course")
            .from("concepts")
            .select("id, course_id, name")
            .in("course_id", courseIds)
        : Promise.resolve({ data: [] }),
      supabase
        .schema("assessment")
        .from("assignments")
        .select("id, title, concept_id"),
      supabase
        .schema("assessment")
        .from("submissions")
        .select("id, assignment_id, student_id, content_text, file_url, grade, feedback, status, submitted_at")
        .order("submitted_at", { ascending: false }),
      supabase.from("profiles").select("id, name, email"),
    ]);

  const profileMap = new Map(
    (profilesRes.data ?? []).map((p) => [p.id, { name: p.name, email: p.email }]),
  );

  const conceptNameMap = new Map(
    (conceptsRes.data ?? []).map((c) => [c.id, c.name]),
  );

  const assignmentMap = new Map(
    (assignmentsRes.data ?? []).map((a) => [
      a.id,
      { title: a.title, conceptName: conceptNameMap.get(a.concept_id) ?? "Concept" },
    ]),
  );

  const modulesByCourse = new Map<string, number>();
  for (const m of modulesRes.data ?? []) {
    modulesByCourse.set(m.course_id, (modulesByCourse.get(m.course_id) ?? 0) + 1);
  }

  const conceptsByCourse = new Map<string, number>();
  for (const c of conceptsRes.data ?? []) {
    conceptsByCourse.set(c.course_id, (conceptsByCourse.get(c.course_id) ?? 0) + 1);
  }

  const instructorCourses: InstructorCourse[] = coursesList.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description ?? "",
    isPublished: Boolean(c.is_published),
    modulesCount: modulesByCourse.get(c.id) ?? 0,
    conceptsCount: conceptsByCourse.get(c.id) ?? 0,
  }));

  const pendingSubmissions: PendingSubmission[] = (submissionsRes.data ?? []).map((s) => {
    const student = profileMap.get(s.student_id);
    const asg = assignmentMap.get(s.assignment_id);
    return {
      id: s.id,
      assignmentId: s.assignment_id,
      assignmentTitle: asg?.title ?? "Course Assignment",
      conceptName: asg?.conceptName ?? "Concept",
      studentId: s.student_id,
      studentName: student?.name ?? "Student",
      studentEmail: student?.email ?? "student@masterylms.dev",
      contentText: s.content_text || undefined,
      fileUrl: s.file_url || undefined,
      grade: s.grade !== null ? Number(s.grade) : undefined,
      feedback: s.feedback || undefined,
      status: s.status,
      submittedAt: s.submitted_at ? String(s.submitted_at) : new Date().toISOString(),
    };
  });

  // 4. Compute class stats across concepts from mastery table
  const allConceptIds = (conceptsRes.data ?? []).map((c) => c.id);
  let classStats: ConceptClassStat[] = [];

  if (allConceptIds.length > 0) {
    const { data: masteryRows } = await supabase
      .schema("mastery")
      .from("student_concept_mastery")
      .select("concept_id, mastery, status")
      .in("concept_id", allConceptIds);

    const rows = masteryRows ?? [];
    classStats = (conceptsRes.data ?? []).map((c) => {
      const cRows = rows.filter((r) => r.concept_id === c.id);
      const total = cRows.length;
      const avg =
        total > 0
          ? Math.round(
              (cRows.reduce((sum, r) => sum + Number(r.mastery || 0), 0) / total) *
                100,
            )
          : 50;

      return {
        conceptId: c.id,
        conceptName: c.name,
        averageMastery: avg,
        blindSpotCount: cRows.filter((r) => r.status === "blind_spot").length,
        inProgressCount: cRows.filter((r) => r.status === "in_progress").length,
        masteredCount: cRows.filter((r) => r.status === "mastered").length,
      };
    });
  }

  return (
    <InstructorStudio
      instructorName={profile?.name ?? user.user_metadata?.name ?? "Instructor"}
      instructorEmail={user.email ?? ""}
      courses={instructorCourses}
      submissions={pendingSubmissions}
      classStats={classStats}
      defaultCourseId={defaultCourseId}
    />
  );
}
