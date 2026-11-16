import { redirect } from "next/navigation";
import { CourseCatalog, type CatalogCourse } from "@/components/course-catalog";
import { createClient } from "@/lib/supabase/server";

export default async function CoursesCatalogPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch student profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .maybeSingle();

  // Fetch all published courses
  const { data: coursesData } = await supabase
    .schema("course")
    .from("courses")
    .select("id, title, description, instructor_id, is_published")
    .eq("is_published", true);

  const courseList = coursesData ?? [];
  const courseIds = courseList.map((c) => c.id);

  // Fetch enrollments, modules, concepts, lessons, and instructor profiles in parallel
  const [enrollmentsRes, modulesRes, conceptsRes, lessonsRes, instructorsRes] =
    await Promise.all([
      supabase
        .schema("course")
        .from("enrollments")
        .select("course_id")
        .eq("student_id", user.id),
      courseIds.length > 0
        ? supabase
            .schema("course")
            .from("modules")
            .select("id, course_id, order_index")
            .in("course_id", courseIds)
            .order("order_index", { ascending: true })
        : Promise.resolve({ data: [] }),
      courseIds.length > 0
        ? supabase
            .schema("course")
            .from("concepts")
            .select("id, course_id, name")
            .in("course_id", courseIds)
        : Promise.resolve({ data: [] }),
      courseIds.length > 0
        ? supabase
            .schema("course")
            .from("lessons")
            .select("id, module_id, order_index")
            .order("order_index", { ascending: true })
        : Promise.resolve({ data: [] }),
      supabase.from("profiles").select("id, name"),
    ]);

  const enrolledCourseIds = new Set(
    (enrollmentsRes.data ?? []).map((e) => e.course_id),
  );
  const instructorMap = new Map(
    (instructorsRes.data ?? []).map((p) => [p.id, p.name]),
  );

  const modulesByCourse = new Map<string, Array<{ id: string; order_index: number }>>();
  for (const m of modulesRes.data ?? []) {
    const list = modulesByCourse.get(m.course_id) ?? [];
    list.push(m);
    modulesByCourse.set(m.course_id, list);
  }

  const conceptsByCourse = new Map<string, string[]>();
  for (const c of conceptsRes.data ?? []) {
    const list = conceptsByCourse.get(c.course_id) ?? [];
    list.push(c.name);
    conceptsByCourse.set(c.course_id, list);
  }

  const lessonsByModule = new Map<string, Array<{ id: string }>>();
  for (const l of lessonsRes.data ?? []) {
    const list = lessonsByModule.get(l.module_id) ?? [];
    list.push(l);
    lessonsByModule.set(l.module_id, list);
  }

  const catalogCourses: CatalogCourse[] = courseList.map((c) => {
    const courseModules = modulesByCourse.get(c.id) ?? [];
    const courseConcepts = conceptsByCourse.get(c.id) ?? [];
    const firstMod = courseModules[0];
    const firstLesson = firstMod
      ? lessonsByModule.get(firstMod.id)?.[0]
      : undefined;

    return {
      id: c.id,
      title: c.title,
      description: c.description ?? "",
      instructorName: instructorMap.get(c.instructor_id) ?? "MasteryLMS Faculty",
      modulesCount: courseModules.length,
      conceptsCount: courseConcepts.length,
      lessonsCount: courseModules.reduce(
        (sum, m) => sum + (lessonsByModule.get(m.id)?.length ?? 0),
        0,
      ),
      concepts: courseConcepts,
      isEnrolled: enrolledCourseIds.has(c.id),
      firstModuleId: firstMod?.id,
      firstLessonId: firstLesson?.id,
    };
  });

  return (
    <CourseCatalog
      courses={catalogCourses}
      studentName={profile?.name ?? user.user_metadata?.name ?? "Student"}
    />
  );
}
