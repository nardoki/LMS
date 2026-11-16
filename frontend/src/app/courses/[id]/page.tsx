import { redirect } from "next/navigation";
import {
  CourseDetail,
  type CourseAssignmentDetail,
  type CourseConceptDetail,
  type SyllabusModule,
} from "@/components/course-detail";
import { createClient } from "@/lib/supabase/server";

interface CoursePageProps {
  params: Promise<{ id: string }>;
}

export default async function CourseDetailPage({ params }: CoursePageProps) {
  const { id: courseId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. Fetch course details
  const { data: course } = await supabase
    .schema("course")
    .from("courses")
    .select("id, title, description, instructor_id")
    .eq("id", courseId)
    .maybeSingle();

  if (!course) {
    redirect("/courses");
  }

  // 2. Fetch all related entities in parallel
  const [
    profileRes,
    instructorRes,
    enrollmentRes,
    modulesRes,
    lessonsRes,
    conceptsRes,
    prereqsRes,
  ] = await Promise.all([
    supabase.from("profiles").select("name").eq("id", user.id).maybeSingle(),
    supabase.from("profiles").select("name").eq("id", course.instructor_id).maybeSingle(),
    supabase
      .schema("course")
      .from("enrollments")
      .select("id")
      .eq("course_id", courseId)
      .eq("student_id", user.id)
      .maybeSingle(),
    supabase
      .schema("course")
      .from("modules")
      .select("id, title, order_index")
      .eq("course_id", courseId)
      .order("order_index", { ascending: true }),
    supabase
      .schema("course")
      .from("lessons")
      .select("id, module_id, title, order_index, concept_id")
      .order("order_index", { ascending: true }),
    supabase
      .schema("course")
      .from("concepts")
      .select("id, name, description, difficulty")
      .eq("course_id", courseId)
      .order("difficulty", { ascending: true }),
    supabase
      .schema("course")
      .from("concept_prerequisites")
      .select("concept_id, requires_concept_id"),
  ]);

  const conceptNameMap = new Map(
    (conceptsRes.data ?? []).map((c) => [c.id, c.name]),
  );

  const prereqMap = new Map<string, string>();
  for (const p of prereqsRes.data ?? []) {
    const parentName = conceptNameMap.get(p.requires_concept_id);
    if (parentName) {
      prereqMap.set(p.concept_id, parentName);
    }
  }

  // Lessons mapped by module_id
  const lessonsByModule = new Map<
    string,
    Array<{ id: string; title: string; orderIndex: number; conceptName?: string }>
  >();
  for (const l of lessonsRes.data ?? []) {
    const list = lessonsByModule.get(l.module_id) ?? [];
    list.push({
      id: l.id,
      title: l.title,
      orderIndex: l.order_index,
      conceptName: l.concept_id ? conceptNameMap.get(l.concept_id) : undefined,
    });
    lessonsByModule.set(l.module_id, list);
  }

  const modules: SyllabusModule[] = (modulesRes.data ?? []).map((m) => ({
    id: m.id,
    title: m.title,
    orderIndex: m.order_index,
    lessons: lessonsByModule.get(m.id) ?? [],
  }));

  const concepts: CourseConceptDetail[] = (conceptsRes.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description ?? "",
    difficulty: c.difficulty,
    prereqName: prereqMap.get(c.id),
  }));

  // Fetch assignments for this course
  const conceptIds = concepts.map((c) => c.id);
  let assignments: CourseAssignmentDetail[] = [];
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
      tier: a.tier as CourseAssignmentDetail["tier"],
      conceptName: conceptNameMap.get(a.concept_id) ?? "Concept",
    }));
  }

  return (
    <CourseDetail
      courseId={course.id}
      title={course.title}
      description={course.description ?? ""}
      instructorName={instructorRes.data?.name ?? "MasteryLMS Faculty"}
      isEnrolled={Boolean(enrollmentRes.data)}
      modules={modules}
      concepts={concepts}
      assignments={assignments}
      studentName={profileRes.data?.name ?? user.user_metadata?.name ?? "Student"}
    />
  );
}
