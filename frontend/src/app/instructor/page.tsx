import { redirect } from "next/navigation";
import { GatewayRbacTester } from "@/components/gateway-rbac-tester";
import { RoleShell } from "@/components/role-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { extractRoleFromUser } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export default async function InstructorDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = extractRoleFromUser(user);
  if (role !== "instructor" && role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <RoleShell
      title="Instructor Studio"
      email={user.email ?? ""}
      role={role}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Course Builder</CardTitle>
            <CardDescription>
              Modules, lessons, concept tagging, and prerequisite graph arrive in Step 3.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            Signed in as <code>{role}</code>. Students cannot reach this route.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Class Blind-Spot Report</CardTitle>
            <CardDescription>
              Aggregated cohort mastery analytics and grading arrive in Step 4.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            RLS limits instructor analytics reads strictly to courses you own.
          </CardContent>
        </Card>
      </div>

      <GatewayRbacTester />
    </RoleShell>
  );
}
