import { redirect } from "next/navigation";
import { AssignmentSubmit } from "@/components/assignment-submit";
import { createClient } from "@/lib/supabase/server";

interface AssignmentPageProps {
  params: Promise<{ id: string }>;
}

export default async function AssignmentSubmissionPage({
  params,
}: AssignmentPageProps) {
  const { id: assignmentId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. Fetch assignment details
  const { data: assignment } = await supabase
    .schema("assessment")
    .from("assignments")
    .select("id, module_id, concept_id, title, description, tier, due_date")
    .eq("id", assignmentId)
    .maybeSingle();

  if (!assignment) {
    redirect("/dashboard");
  }

  // 2. Fetch concept, course, profile, and existing submission in parallel
  const [conceptRes, profileRes, submissionRes] = await Promise.all([
    supabase
      .schema("course")
      .from("concepts")
      .select("id, name, course_id")
      .eq("id", assignment.concept_id)
      .maybeSingle(),
    supabase.from("profiles").select("name").eq("id", user.id).maybeSingle(),
    supabase
      .schema("assessment")
      .from("submissions")
      .select("id, content_text, file_url, grade, feedback, status, submitted_at")
      .eq("assignment_id", assignmentId)
      .eq("student_id", user.id)
      .maybeSingle(),
  ]);

  let courseTitle = "Mastery Course";
  if (conceptRes.data?.course_id) {
    const { data: course } = await supabase
      .schema("course")
      .from("courses")
      .select("title")
      .eq("id", conceptRes.data.course_id)
      .maybeSingle();
    if (course?.title) courseTitle = course.title;
  }

  return (
    <AssignmentSubmit
      assignmentId={assignment.id}
      title={assignment.title}
      description={assignment.description ?? ""}
      tier={assignment.tier as "remedial" | "standard" | "challenge"}
      dueDate={assignment.due_date ? String(assignment.due_date) : undefined}
      conceptId={assignment.concept_id}
      conceptName={conceptRes.data?.name ?? "Course Concept"}
      courseTitle={courseTitle}
      moduleId={assignment.module_id}
      existingSubmission={
        submissionRes.data
          ? {
              id: submissionRes.data.id,
              contentText: submissionRes.data.content_text || undefined,
              fileUrl: submissionRes.data.file_url || undefined,
              grade: submissionRes.data.grade !== null ? Number(submissionRes.data.grade) : undefined,
              feedback: submissionRes.data.feedback || undefined,
              status: submissionRes.data.status,
              submittedAt: submissionRes.data.submitted_at || undefined,
            }
          : undefined
      }
      studentName={profileRes.data?.name ?? user.user_metadata?.name ?? "Student"}
    />
  );
}
