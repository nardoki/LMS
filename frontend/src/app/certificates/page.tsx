import { redirect } from "next/navigation";
import {
  StudentCertificates,
  type StudentCertificateItem,
} from "@/components/student-certificates";
import { createClient } from "@/lib/supabase/server";

export default async function CertificatesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. Fetch student profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .maybeSingle();

  // 2. Fetch certificates earned by user
  const { data: certRows } = await supabase
    .from("certificates")
    .select("id, verification_code, course_id, mastered_concepts_json, issued_at")
    .eq("student_id", user.id)
    .order("issued_at", { ascending: false });

  // 3. Fetch courses to map course titles
  const courseIds = (certRows ?? []).map((c) => c.course_id);
  const { data: coursesData } =
    courseIds.length > 0
      ? await supabase
          .schema("course")
          .from("courses")
          .select("id, title")
          .in("id", courseIds)
      : { data: [] };

  const courseTitleMap = new Map((coursesData ?? []).map((c) => [c.id, c.title]));

  const certificates: StudentCertificateItem[] = (certRows ?? []).map((c) => ({
    id: c.id,
    verificationCode: c.verification_code,
    courseId: c.course_id,
    courseTitle: courseTitleMap.get(c.course_id) ?? "Intro to Web Development",
    issuedAt: String(c.issued_at),
    masteredConcepts: Array.isArray(c.mastered_concepts_json)
      ? (c.mastered_concepts_json as string[])
      : [],
  }));

  // 4. Fetch active enrollment
  const { data: enrollment } = await supabase
    .schema("course")
    .from("enrollments")
    .select("course_id")
    .eq("student_id", user.id)
    .limit(1)
    .maybeSingle();

  let enrolledCourseTitle = "Intro to Web Development";
  if (enrollment?.course_id) {
    const { data: course } = await supabase
      .schema("course")
      .from("courses")
      .select("title")
      .eq("id", enrollment.course_id)
      .maybeSingle();
    if (course?.title) enrolledCourseTitle = course.title;
  }

  return (
    <StudentCertificates
      studentName={profile?.name ?? user.user_metadata?.name ?? "Student"}
      certificates={certificates}
      enrolledCourseId={enrollment?.course_id}
      enrolledCourseTitle={enrolledCourseTitle}
    />
  );
}
