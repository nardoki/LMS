import type { ReactNode } from "react";
import { BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SignOutButton } from "@/components/sign-out-button";
import type { UserRole } from "@/lib/roles";

export function RoleShell({
  title,
  email,
  role,
  children,
}: {
  title: string;
  email: string;
  role: UserRole;
  children: ReactNode;
}) {
  const badgeVariant =
    role === "admin"
      ? "danger"
      : role === "instructor"
        ? "warning"
        : "success";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-slate-900" />
            <span className="font-semibold text-slate-900">MasteryLMS</span>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-medium text-slate-600">{title}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 sm:inline">{email}</span>
            <Badge variant={badgeVariant}>{role}</Badge>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 p-6">{children}</main>
    </div>
  );
}
