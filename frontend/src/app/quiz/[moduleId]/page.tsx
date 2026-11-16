import { redirect } from "next/navigation";
import { QuizPlayer, type QuizPlayerConcept } from "@/components/quiz-player";
import { createClient } from "@/lib/supabase/server";

interface QuizPageProps {
  params: Promise<{ moduleId: string }>;
  searchParams: Promise<{ conceptId?: string }>;
}

export default async function ModuleQuizPage({
  params,
  searchParams,
}: QuizPageProps) {
  const { moduleId } = await params;
  const { conceptId } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. Load module info
  const { data: moduleData } = await supabase
    .schema("course")
    .from("modules")
    .select("id, title, order_index, course_id")
    .eq("id", moduleId)
    .maybeSingle();

  if (!moduleData) {
    redirect("/dashboard");
  }

  // 2. Load course info
  const { data: courseData } = await supabase
    .schema("course")
    .from("courses")
    .select("title")
    .eq("id", moduleData.course_id)
    .maybeSingle();

  // 3. Load concepts, prerequisites, and student mastery
  const [conceptsRes, prereqsRes, masteryRes, profileRes] = await Promise.all([
    supabase
      .schema("course")
      .from("concepts")
      .select("id, name, difficulty")
      .eq("course_id", moduleData.course_id)
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
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const conceptNameById = new Map(
    (conceptsRes.data ?? []).map((c) => [c.id, c.name]),
  );

  const masteryMap = new Map<
    string,
    { mastery: number; status: QuizPlayerConcept["status"] }
  >();
  for (const m of masteryRes.data ?? []) {
    masteryMap.set(m.concept_id, {
      mastery: Math.round((m.mastery ?? 0) * 100),
      status: (m.status as QuizPlayerConcept["status"]) ?? "not_started",
    });
  }

  const prereqNameMap = new Map<string, string>();
  for (const p of prereqsRes.data ?? []) {
    const parentName = conceptNameById.get(p.requires_concept_id);
    if (parentName) {
      prereqNameMap.set(p.concept_id, parentName);
    }
  }

  const concepts: QuizPlayerConcept[] = (conceptsRes.data ?? []).map((c) => {
    const m = masteryMap.get(c.id);
    return {
      id: c.id,
      name: c.name,
      difficulty: c.difficulty,
      mastery: m?.mastery ?? 0,
      status: m?.status ?? "not_started",
      prereqName: prereqNameMap.get(c.id),
    };
  });

  return (
    <QuizPlayer
      moduleId={moduleData.id}
      moduleTitle={moduleData.title}
      courseTitle={courseData?.title ?? "Course Quiz"}
      studentName={profileRes.data?.name ?? user.user_metadata?.name ?? "Student"}
      studentEmail={user.email ?? ""}
      targetConceptId={conceptId}
      concepts={concepts}
    />
  );
}
