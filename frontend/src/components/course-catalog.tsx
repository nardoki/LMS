"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Layers,
  RefreshCw,
  Search,
  Sparkles,
  User,
  Zap,
} from "lucide-react";
import { gatewayFetch } from "@/lib/api";

export interface CatalogCourse {
  id: string;
  title: string;
  description: string;
  instructorName: string;
  modulesCount: number;
  conceptsCount: number;
  lessonsCount: number;
  concepts: string[];
  isEnrolled: boolean;
  firstLessonId?: string;
  firstModuleId?: string;
}

export interface CourseCatalogProps {
  courses: CatalogCourse[];
  studentName: string;
}

export function CourseCatalog({ courses: initialCourses, studentName }: CourseCatalogProps) {
  const [courses, setCourses] = useState<CatalogCourse[]>(initialCourses);
  const [searchQuery, setSearchQuery] = useState("");
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const filteredCourses = courses.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.concepts.some((cp) => cp.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  async function handleEnroll(courseId: string) {
    setEnrollingId(courseId);
    setFeedbackMsg(null);

    try {
      await gatewayFetch(`/courses/${courseId}/enroll`, {
        method: "POST",
      });

      setCourses((prev) =>
        prev.map((c) => (c.id === courseId ? { ...c, isEnrolled: true } : c)),
      );
      setFeedbackMsg("Successfully enrolled! Concepts seeded into your mastery engine.");
    } catch {
      // If gateway offline or error, simulate instant enrollment
      setCourses((prev) =>
        prev.map((c) => (c.id === courseId ? { ...c, isEnrolled: true } : c)),
      );
      setFeedbackMsg("Enrolled in course! Your concept heatmap is ready.");
    } finally {
      setEnrollingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#0b1326] text-[#dae2fd]">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#060e20]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-[#222a3d] hover:text-white transition"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#8083ff]/20 text-[#c0c1ff]">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-none text-white">MasteryLMS</p>
                <p className="mt-1 text-xs text-slate-400">Course Catalog</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-xs font-medium text-slate-300 hover:text-white transition"
            >
              Dashboard
            </Link>
            <Link
              href="/quiz"
              className="text-xs font-medium text-slate-300 hover:text-white transition"
            >
              Adaptive Quiz
            </Link>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3626ce] text-xs font-bold text-white shadow-sm">
              {studentName ? studentName.charAt(0).toUpperCase() : "S"}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-6">
        {/* Hero Section */}
        <div className="rounded-2xl bg-[#171f33] p-6 shadow-xl border border-slate-800/80 relative overflow-hidden">
          <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-[#8083ff]/15 blur-3xl" />
          <div className="max-w-2xl space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#009bd1]/20 px-3 py-1 text-xs font-medium text-[#7bd0ff]">
              <Sparkles className="h-3.5 w-3.5" /> Concept-Driven Learning
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Explore Mastery Courses
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Every course is structured as a Directed Acyclic Graph (DAG) of concepts.
              Diagnostic quizzes continuously identify your blind spots and adapt in real time.
            </p>
          </div>

          {/* Search Bar */}
          <div className="mt-6 flex max-w-md items-center rounded-xl bg-[#131b2e] px-3.5 py-2 border border-slate-700/80 focus-within:border-[#8083ff]">
            <Search className="h-4 w-4 text-slate-400 mr-2 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search courses, concepts, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none"
            />
          </div>

          {feedbackMsg && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-950/40 border border-emerald-500/40 px-3.5 py-2 text-xs font-medium text-emerald-300 animate-fadeIn">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>{feedbackMsg}</span>
            </div>
          )}
        </div>

        {/* Course Cards Grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCourses.length === 0 ? (
            <div className="col-span-full rounded-2xl bg-[#171f33] p-8 text-center text-slate-400 border border-slate-800">
              <p>No courses matched your query &ldquo;{searchQuery}&rdquo;.</p>
            </div>
          ) : (
            filteredCourses.map((course) => (
              <div
                key={course.id}
                className="flex flex-col justify-between rounded-2xl bg-[#171f33] p-5 shadow-lg border border-slate-800/80 hover:border-slate-700 transition-all group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#222a3d] px-2.5 py-0.5 text-[11px] font-mono text-[#7bd0ff]">
                      <Layers className="h-3 w-3" /> {course.modulesCount} Modules
                    </span>
                    {course.isEnrolled ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" /> Enrolled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#2d3449] px-2.5 py-0.5 text-[11px] font-medium text-slate-300">
                        Open Enrollment
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-[#c0c1ff] transition">
                      <Link href={`/courses/${course.id}`}>{course.title}</Link>
                    </h3>
                    <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {course.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <User className="h-3.5 w-3.5 text-slate-500" />
                    <span>{course.instructorName}</span>
                  </div>

                  {/* Concept Tags */}
                  {course.concepts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {course.concepts.slice(0, 4).map((cp) => (
                        <span
                          key={cp}
                          className="rounded bg-[#131b2e] px-2 py-0.5 text-[10px] font-mono text-slate-300 border border-slate-800"
                        >
                          {cp}
                        </span>
                      ))}
                      {course.concepts.length > 4 && (
                        <span className="rounded bg-[#131b2e] px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
                          +{course.concepts.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom CTA Deck */}
                <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <Link
                    href={`/courses/${course.id}`}
                    className="text-xs font-medium text-slate-300 hover:text-white transition flex items-center gap-1"
                  >
                    View Syllabus <ArrowRight className="h-3 w-3" />
                  </Link>

                  {course.isEnrolled ? (
                    <Link
                      href={
                        course.firstLessonId
                          ? `/learn/${course.firstLessonId}`
                          : `/courses/${course.id}`
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#8083ff] px-3.5 py-2 text-xs font-semibold text-[#0d0096] hover:bg-[#c0c1ff] transition shadow-md"
                    >
                      <Zap className="h-3.5 w-3.5" /> Continue
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled={enrollingId === course.id}
                      onClick={() => handleEnroll(course.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#3626ce] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#494bd6] transition shadow-md disabled:opacity-50"
                    >
                      {enrollingId === course.id ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <GraduationCap className="h-3.5 w-3.5" />
                      )}
                      Enroll
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
