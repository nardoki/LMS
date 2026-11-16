import { redirect } from "next/navigation";
import { LessonViewer, type ModuleSidebarGroup } from "@/components/lesson-viewer";
import { createClient } from "@/lib/supabase/server";

interface LessonPageProps {
  params: Promise<{ lessonId: string }>;
}

export default async function LearnLessonPage({ params }: LessonPageProps) {
  const { lessonId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. Fetch current lesson
  const { data: lesson } = await supabase
    .schema("course")
    .from("lessons")
    .select("id, module_id, title, content_markdown, media_url, concept_id, order_index")
    .eq("id", lessonId)
    .maybeSingle();

  if (!lesson) {
    redirect("/courses");
  }

  // 2. Fetch current module
  const { data: currentModule } = await supabase
    .schema("course")
    .from("modules")
    .select("id, title, course_id, order_index")
    .eq("id", lesson.module_id)
    .maybeSingle();

  if (!currentModule) {
    redirect("/courses");
  }

  // 3. Fetch course info and all sibling modules/lessons in parallel
  const [courseRes, modulesRes, lessonsRes, conceptRes, masteryRes] =
    await Promise.all([
      supabase
        .schema("course")
        .from("courses")
        .select("id, title")
        .eq("id", currentModule.course_id)
        .maybeSingle(),
      supabase
        .schema("course")
        .from("modules")
        .select("id, title, order_index")
        .eq("course_id", currentModule.course_id)
        .order("order_index", { ascending: true }),
      supabase
        .schema("course")
        .from("lessons")
        .select("id, module_id, title, order_index, concept_id")
        .order("order_index", { ascending: true }),
      lesson.concept_id
        ? supabase
            .schema("course")
            .from("concepts")
            .select("id, name, difficulty")
            .eq("id", lesson.concept_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      lesson.concept_id
        ? supabase
            .schema("mastery")
            .from("student_concept_mastery")
            .select("mastery, status")
            .eq("student_id", user.id)
            .eq("concept_id", lesson.concept_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const allModules = modulesRes.data ?? [];
  const allLessons = lessonsRes.data ?? [];

  // Group lessons by module_id
  const lessonsByModule = new Map<
    string,
    Array<{ id: string; moduleId: string; title: string; orderIndex: number }>
  >();
  for (const l of allLessons) {
    const list = lessonsByModule.get(l.module_id) ?? [];
    list.push({
      id: l.id,
      moduleId: l.module_id,
      title: l.title,
      orderIndex: l.order_index,
    });
    lessonsByModule.set(l.module_id, list);
  }

  const syllabusModules: ModuleSidebarGroup[] = allModules.map((m) => ({
    id: m.id,
    title: m.title,
    orderIndex: m.order_index,
    lessons: lessonsByModule.get(m.id) ?? [],
  }));

  // Flatten ordered lessons for prev / next navigation
  const flatLessons: string[] = [];
  for (const m of allModules) {
    const modLessons = lessonsByModule.get(m.id) ?? [];
    for (const l of modLessons) {
      flatLessons.push(l.id);
    }
  }

  const currentIdx = flatLessons.indexOf(lesson.id);
  const prevLessonId = currentIdx > 0 ? flatLessons[currentIdx - 1] : undefined;
  const nextLessonId =
    currentIdx >= 0 && currentIdx < flatLessons.length - 1
      ? flatLessons[currentIdx + 1]
      : undefined;

  return (
    <LessonViewer
      lessonId={lesson.id}
      lessonTitle={lesson.title}
      contentMarkdown={lesson.content_markdown ?? "# Lesson Content\n\nNo content yet."}
      mediaUrl={lesson.media_url || undefined}
      courseId={currentModule.course_id}
      courseTitle={courseRes.data?.title ?? "Course"}
      moduleId={currentModule.id}
      moduleTitle={currentModule.title}
      conceptId={lesson.concept_id || undefined}
      conceptName={conceptRes.data?.name}
      conceptDifficulty={conceptRes.data?.difficulty}
      conceptMastery={
        masteryRes.data?.mastery !== undefined
          ? Math.round(Number(masteryRes.data.mastery) * 100)
          : undefined
      }
      modules={syllabusModules}
      prevLessonId={prevLessonId}
      nextLessonId={nextLessonId}
    />
  );
}
