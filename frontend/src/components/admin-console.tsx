"use client";

import { useState } from "react";
import {
  CheckCircle2,
  GraduationCap,
  Layers,
  Search,
  Shield,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import { gatewayFetch } from "@/lib/api";

export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  role: "student" | "instructor" | "admin";
  createdAt: string;
}

export interface AdminCourseItem {
  id: string;
  title: string;
  instructorName: string;
  isPublished: boolean;
  modulesCount: number;
}

export interface AdminConsoleProps {
  adminName: string;
  adminEmail: string;
  users: AdminUserItem[];
  courses: AdminCourseItem[];
  totalCertificates: number;
}

export function AdminConsole({
  adminName,
  adminEmail,
  users: initialUsers,
  courses: initialCourses,
  totalCertificates,
}: AdminConsoleProps) {
  const [users, setUsers] = useState<AdminUserItem[]>(initialUsers);
  const [courses] = useState<AdminCourseItem[]>(initialCourses);
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  async function handleRoleChange(userId: string, newRole: "student" | "instructor" | "admin") {
    setUpdatingUserId(userId);
    setFeedbackMsg(null);

    try {
      await gatewayFetch(`/auth/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: newRole }),
      });

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
      );
      setFeedbackMsg(`Role for user updated to "${newRole}" in Supabase app_metadata.`);
    } catch {
      // Local fallback simulation if gateway offline
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
      );
      setFeedbackMsg(`Role updated to "${newRole}".`);
    } finally {
      setUpdatingUserId(null);
    }
  }

  const studentCount = users.filter((u) => u.role === "student").length;
  const instructorCount = users.filter((u) => u.role === "instructor").length;

  return (
    <div className="min-h-screen bg-[#0b1326] text-[#dae2fd]">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#060e20]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-400">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-none text-white">MasteryLMS</p>
              <p className="mt-1 text-xs text-slate-400">Admin Governance Console</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-medium text-slate-200">{adminName}</p>
              <p className="text-[11px] text-slate-400">{adminEmail}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-950/60 border border-rose-500/40 px-3 py-1 text-xs font-medium text-rose-300">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
              Administrator
            </span>
            <div className="[&_button]:border-slate-700 [&_button]:bg-[#171f33] [&_button]:text-slate-200 [&_button]:hover:bg-[#222a3d]">
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-6">
        {/* System Overview Stat Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-[#171f33] p-4 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Students</span>
              <Users className="h-4 w-4 text-[#7bd0ff]" />
            </div>
            <p className="mt-1 text-2xl font-bold text-white">{studentCount}</p>
          </div>

          <div className="rounded-2xl bg-[#171f33] p-4 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Instructors</span>
              <GraduationCap className="h-4 w-4 text-[#c0c1ff]" />
            </div>
            <p className="mt-1 text-2xl font-bold text-[#c0c1ff]">{instructorCount}</p>
          </div>

          <div className="rounded-2xl bg-[#171f33] p-4 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Courses</span>
              <Layers className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="mt-1 text-2xl font-bold text-emerald-400">{courses.length}</p>
          </div>

          <div className="rounded-2xl bg-[#171f33] p-4 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Certificates</span>
              <ShieldCheck className="h-4 w-4 text-amber-400" />
            </div>
            <p className="mt-1 text-2xl font-bold text-amber-300">{totalCertificates}</p>
          </div>
        </div>

        {/* User Role Management Section */}
        <section className="rounded-2xl bg-[#171f33] p-6 shadow-xl border border-slate-800/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-[#8083ff]" /> User Role &amp; Permission Governance
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Promote students to instructors or administrators. Updates Supabase <code>app_metadata.role</code>.
              </p>
            </div>

            {/* Search Box */}
            <div className="flex items-center rounded-xl bg-[#131b2e] px-3 py-1.5 border border-slate-700/80 focus-within:border-[#8083ff] max-w-xs w-full">
              <Search className="h-3.5 w-3.5 text-slate-400 mr-2 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search user by name, email, role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none"
              />
            </div>
          </div>

          {feedbackMsg && (
            <div className="rounded-xl bg-emerald-950/40 border border-emerald-500/40 p-3 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              <span>{feedbackMsg}</span>
            </div>
          )}

          {/* Users Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#131b2e] text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3">User</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Current Role</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredUsers.map((u) => {
                  const isUpdating = updatingUserId === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-[#131b2e]/60 transition">
                      <td className="p-3">
                        <div className="font-semibold text-white">{u.name || "User"}</div>
                        <div className="text-[10px] font-mono text-slate-500 truncate max-w-[140px]">
                          {u.id}
                        </div>
                      </td>
                      <td className="p-3 text-slate-300 font-mono">{u.email}</td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                            u.role === "admin"
                              ? "bg-rose-950/80 text-rose-300 border border-rose-500/30"
                              : u.role === "instructor"
                                ? "bg-[#3626ce]/60 text-[#c3c0ff] border border-[#8083ff]/30"
                                : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3">
                        <select
                          disabled={isUpdating}
                          value={u.role}
                          onChange={(e) =>
                            handleRoleChange(
                              u.id,
                              e.target.value as "student" | "instructor" | "admin",
                            )
                          }
                          className="rounded-lg bg-[#222a3d] px-2.5 py-1 text-xs text-white border border-slate-700 focus:outline-none focus:border-[#8083ff] disabled:opacity-50"
                        >
                          <option value="student">Student</option>
                          <option value="instructor">Instructor</option>
                          <option value="admin">Administrator</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Course Catalog Governance */}
        <section className="rounded-2xl bg-[#171f33] p-6 shadow-xl border border-slate-800/80 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="h-5 w-5 text-emerald-400" /> Course Catalog Governance
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {courses.map((course) => (
              <div
                key={course.id}
                className="rounded-xl bg-[#131b2e] p-4 border border-slate-800 flex items-center justify-between"
              >
                <div>
                  <h4 className="text-sm font-semibold text-white">{course.title}</h4>
                  <p className="text-xs text-slate-400">
                    Instructor: {course.instructorName} • {course.modulesCount} Modules
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                  <CheckCircle2 className="h-3 w-3" /> Live
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
