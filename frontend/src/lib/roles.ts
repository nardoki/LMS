import type { User } from "@supabase/supabase-js";

export type UserRole = "student" | "instructor" | "admin";

export function extractRoleFromUser(user: User | null | undefined): UserRole {
  const role = user?.app_metadata?.role;
  if (role === "instructor" || role === "admin" || role === "student") {
    return role;
  }
  return "student";
}

export function getRoleHomePath(role: UserRole): string {
  if (role === "instructor") {
    return "/instructor";
  }
  if (role === "admin") {
    return "/admin";
  }
  return "/dashboard";
}
