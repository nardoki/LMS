import { redirect } from "next/navigation";
import { RoleShell } from "@/components/role-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

  return (
    <RoleShell title="Admin Console" email={user.email ?? ""} role={role}>
      <Card>
        <CardHeader>
          <CardTitle>User & Course Governance</CardTitle>
          <CardDescription>
            Admins manage role assignments in Supabase <code>app_metadata</code> and course catalogs.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          Use <code>PATCH /auth/users/:id/role</code> on the API Gateway to promote instructors.
        </CardContent>
      </Card>
    </RoleShell>
  );
}
