import { redirect } from "next/navigation";
import {
  AdminConsole,
  type AdminCourseItem,
  type AdminUserItem,
} from "@/components/admin-console";
import { extractRoleFromUser, getRoleHomePath } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = extractRoleFromUser(user);
  if (role !== "admin") {
    redirect(getRoleHomePath(role));
  }

  // 1. Fetch current admin profile
  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .maybeSingle();

  // 2. Fetch all user profiles, courses, modules, and certificates count
  const [profilesRes, coursesRes, modulesRes, certsCountRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, email, role, created_at")
      .order("created_at", { ascending: true }),
    supabase
      .schema("course")
      .from("courses")
      .select("id, title, instructor_id, is_published"),
    supabase.schema("course").from("modules").select("id, course_id"),
    supabase.from("certificates").select("id", { count: "exact", head: true }),
  ]);

  const profileMap = new Map(
    (profilesRes.data ?? []).map((p) => [p.id, p.name]),
  );

  const modulesByCourse = new Map<string, number>();
  for (const m of modulesRes.data ?? []) {
    modulesByCourse.set(m.course_id, (modulesByCourse.get(m.course_id) ?? 0) + 1);
  }

  const users: AdminUserItem[] = (profilesRes.data ?? []).map((p) => ({
    id: p.id,
    name: p.name || "User",
    email: p.email || "",
    role: p.role as "student" | "instructor" | "admin",
    createdAt: String(p.created_at),
  }));

  const courses: AdminCourseItem[] = (coursesRes.data ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    instructorName: profileMap.get(c.instructor_id) ?? "Faculty",
    isPublished: Boolean(c.is_published),
    modulesCount: modulesByCourse.get(c.id) ?? 0,
  }));

  return (
    <AdminConsole
      adminName={adminProfile?.name ?? user.user_metadata?.name ?? "Admin"}
      adminEmail={user.email ?? ""}
      users={users}
      courses={courses}
      totalCertificates={certsCountRes.count ?? 1}
    />
  );
}
