import { redirect } from "next/navigation";
import {
  StudentDashboard,
  type DashboardAssignment,
  type DashboardConceptNode,
  type MasteryStatus,
} from "@/components/student-dashboard";
import { createClient } from "@/lib/supabase/server";

export default async function StudentDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Load student's profile name
  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .maybeSingle();

  // Load student's active enrollment and course
  const { data: enrollment } = await supabase
    .schema("course")
    .from("enrollments")
    .select("course_id")
    .eq("student_id", user.id)
    .limit(1)
    .maybeSingle();

  let courseTitle = "No Enrolled Course Yet";
  let instructorName = "MasteryLMS Faculty";
  let conceptNodes: DashboardConceptNode[] = [];
  let assignments: DashboardAssignment[] = [];
  let defaultModuleId = "bbbbbbbb-0001-0001-0001-000000000002";

  if (enrollment?.course_id) {
    const [
      courseRes,
      conceptsRes,
      prereqsRes,
      masteryRes,
      modulesRes,
      lessonsRes,
    ] = await Promise.all([
      supabase
        .schema("course")
        .from("courses")
        .select("id, title, instructor_id")
        .eq("id", enrollment.course_id)
        .maybeSingle(),
      supabase
        .schema("course")
        .from("concepts")
        .select("id, name, difficulty")
        .eq("course_id", enrollment.course_id)
        .order("difficulty", { ascending: true }),
      supabase
        .schema("course")
        .from("concept_prerequisites")
        .select("concept_id, requires_concept_id"),
      supabase
        .schema("mastery")
        .from("student_concept_mastery")
        .select("concept_id, mastery, status")
        .eq("student_id", user.id),
      supabase
        .schema("course")
        .from("modules")
        .select("id, title, order_index")
        .eq("course_id", enrollment.course_id)
        .order("order_index", { ascending: true }),
      supabase
        .schema("course")
        .from("lessons")
        .select("module_id, concept_id"),
    ]);

    if (courseRes.data?.title) {
      courseTitle = courseRes.data.title;
    }

    if (courseRes.data?.instructor_id) {
      const { data: instProfile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", courseRes.data.instructor_id)
        .maybeSingle();
      if (instProfile?.name) {
        instructorName = instProfile.name;
      }
    }

    const moduleByConceptId = new Map<string, string>();
    for (const l of lessonsRes.data ?? []) {
      if (l.concept_id && l.module_id) {
        moduleByConceptId.set(l.concept_id, l.module_id);
      }
    }

    defaultModuleId =
      moduleByConceptId.get("cccccccc-0001-0001-0001-000000000003") ??
      modulesRes.data?.[1]?.id ??
      modulesRes.data?.[0]?.id ??
      "bbbbbbbb-0001-0001-0001-000000000002";

    const masteryMap = new Map<
      string,
      { mastery: number; status: MasteryStatus }
    >();
    for (const row of masteryRes.data ?? []) {
      masteryMap.set(row.concept_id, {
        mastery: Math.round((row.mastery ?? 0) * 100),
        status: (row.status as MasteryStatus) ?? "not_started",
      });
    }

    const courseConceptList = conceptsRes.data ?? [];
    const conceptNameById = new Map(courseConceptList.map((c) => [c.id, c.name]));

    const prereqMap = new Map<string, string[]>();
    for (const p of prereqsRes.data ?? []) {
      const list = prereqMap.get(p.concept_id) ?? [];
      list.push(p.requires_concept_id);
      prereqMap.set(p.concept_id, list);
    }

    conceptNodes = courseConceptList.map((c) => {
      const m = masteryMap.get(c.id);
      const reqIds = prereqMap.get(c.id) ?? [];
      const unmetReq = reqIds.find((reqId) => {
        const reqStatus = masteryMap.get(reqId)?.status ?? "not_started";
        return reqStatus !== "in_progress" && reqStatus !== "mastered";
      });
      const locked = Boolean(unmetReq);
      const reqName = unmetReq ? conceptNameById.get(unmetReq) : undefined;

      return {
        id: c.id,
        name: c.name,
        difficulty: c.difficulty,
        mastery: m?.mastery ?? 0,
        status: m?.status ?? "not_started",
        locked,
        prereqHint: locked && reqName ? `Requires ${reqName}` : undefined,
        moduleId: moduleByConceptId.get(c.id) ?? defaultModuleId,
      };
    });

    const conceptIds = courseConceptList.map((c) => c.id);
    if (conceptIds.length > 0) {
      const { data: assignmentRows } = await supabase
        .schema("assessment")
        .from("assignments")
        .select("id, title, description, tier, concept_id")
        .in("concept_id", conceptIds);

      assignments = (assignmentRows ?? []).map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        tier: a.tier as DashboardAssignment["tier"],
        conceptName: conceptNameById.get(a.concept_id) ?? "Course Concept",
      }));
    }
  }

  return (
    <StudentDashboard
      studentName={profile?.name ?? user.user_metadata?.name ?? "Student"}
      studentEmail={user.email ?? ""}
      courseTitle={courseTitle}
      instructorName={instructorName}
      concepts={conceptNodes}
      assignments={assignments}
      defaultModuleId={defaultModuleId}
    />
  );
}
