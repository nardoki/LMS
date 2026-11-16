import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DefaultQuizPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Load student's active enrollment
  const { data: enrollment } = await supabase
    .schema("course")
    .from("enrollments")
    .select("course_id")
    .eq("student_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!enrollment?.course_id) {
    redirect("/dashboard");
  }

  // Load first active module for this course
  const { data: moduleData } = await supabase
    .schema("course")
    .from("modules")
    .select("id")
    .eq("course_id", enrollment.course_id)
    .order("order_index", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!moduleData?.id) {
    redirect("/dashboard");
  }

  redirect(`/quiz/${moduleData.id}`);
}
