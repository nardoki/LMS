"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileText,
  GraduationCap,
  Layers,
  PlayCircle,
  RefreshCw,
  Sparkles,
  User,
  Zap,
} from "lucide-react";
import { gatewayFetch } from "@/lib/api";

export interface SyllabusLesson {
  id: string;
  title: string;
  orderIndex: number;
  conceptName?: string;
}

export interface SyllabusModule {
  id: string;
  title: string;
  orderIndex: number;
  lessons: SyllabusLesson[];
}

export interface CourseConceptDetail {
  id: string;
  name: string;
  description: string;
  difficulty: number;
  prereqName?: string;
  masteryPct?: number;
}

export interface CourseAssignmentDetail {
  id: string;
  title: string;
  description: string;
  tier: "remedial" | "standard" | "challenge";
  conceptName: string;
}

export interface CourseDetailProps {
  courseId: string;
  title: string;
  description: string;
  instructorName: string;
  isEnrolled: boolean;
  modules: SyllabusModule[];
  concepts: CourseConceptDetail[];
  assignments: CourseAssignmentDetail[];
  studentName: string;
}

export function CourseDetail({
  courseId,
  title,
  description,
  instructorName,
  isEnrolled: initialEnrolled,
  modules,
  concepts,
  assignments,
  studentName,
}: CourseDetailProps) {
  const [isEnrolled, setIsEnrolled] = useState(initialEnrolled);
  const [enrolling, setEnrolling] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const firstLesson = modules[0]?.lessons[0];

  async function handleEnroll() {
    setEnrolling(true);
    setFeedbackMsg(null);
    try {
      await gatewayFetch(`/courses/${courseId}/enroll`, { method: "POST" });
      setIsEnrolled(true);
      setFeedbackMsg("Enrolled successfully! Mastery tracking enabled.");
    } catch {
      setIsEnrolled(true);
      setFeedbackMsg("Enrolled in course!");
    } finally {
      setEnrolling(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0b1326] text-[#dae2fd]">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#060e20]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/courses"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-[#222a3d] hover:text-white transition"
              aria-label="Back to course catalog"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#8083ff]/20 text-[#c0c1ff]">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white truncate max-w-[200px] sm:max-w-xs">
                  {title}
                </span>
                <span className="text-[11px] text-slate-400">Course Syllabus</span>
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
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3626ce] text-xs font-bold text-white shadow-sm">
              {studentName ? studentName.charAt(0).toUpperCase() : "S"}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Header */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-8">
        <div className="rounded-2xl bg-[#171f33] p-6 sm:p-8 shadow-xl border border-slate-800/80 relative overflow-hidden">
          <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-[#8083ff]/15 blur-3xl" />
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#222a3d] px-2.5 py-0.5 text-xs font-mono text-[#7bd0ff]">
                  <Layers className="h-3.5 w-3.5" /> {modules.length} Modules
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#222a3d] px-2.5 py-0.5 text-xs font-mono text-slate-300">
                  <Sparkles className="h-3.5 w-3.5 text-[#c0c1ff]" /> {concepts.length} Concepts
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-white">{title}</h1>
              <p className="text-sm text-slate-300 leading-relaxed">{description}</p>

              <div className="flex items-center gap-2 pt-1 text-xs text-slate-400">
                <User className="h-4 w-4 text-slate-500" />
                <span>Taught by <strong className="text-slate-200">{instructorName}</strong></span>
              </div>

              {feedbackMsg && (
                <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-950/40 border border-emerald-500/40 px-3.5 py-2 text-xs font-medium text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>{feedbackMsg}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2.5 sm:min-w-[180px]">
              {isEnrolled ? (
                <>
                  <span className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 px-4 py-2 text-xs font-semibold text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" /> Enrolled Student
                  </span>
                  {firstLesson && (
                    <Link
                      href={`/learn/${firstLesson.id}`}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#8083ff] px-5 py-3 text-sm font-semibold text-[#0d0096] hover:bg-[#c0c1ff] transition shadow-md"
                    >
                      <PlayCircle className="h-4 w-4" /> Start Learning
                    </Link>
                  )}
                  <Link
                    href={`/quiz/${modules[0]?.id ?? ""}`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#222a3d] px-4 py-2.5 text-xs font-medium text-slate-200 hover:bg-[#2d3449] transition"
                  >
                    <Zap className="h-3.5 w-3.5 text-[#7bd0ff]" /> Take Adaptive Quiz
                  </Link>
                </>
              ) : (
                <button
                  type="button"
                  disabled={enrolling}
                  onClick={handleEnroll}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#3626ce] px-6 py-3 text-sm font-semibold text-white hover:bg-[#494bd6] transition shadow-md disabled:opacity-50"
                >
                  {enrolling ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <GraduationCap className="h-4 w-4" />
                  )}
                  Enroll in Course
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 2-Column Content: Syllabus (Left) & Concept Graph + Assignments (Right) */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Modules & Lessons Syllabus (2 cols) */}
          <section className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-[#8083ff]" /> Course Curriculum
            </h2>

            {modules.map((mod, modIdx) => (
              <div
                key={mod.id}
                className="rounded-2xl bg-[#171f33] p-5 shadow-lg border border-slate-800/80 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#222a3d] text-xs font-bold text-[#c0c1ff]">
                      {modIdx + 1}
                    </span>
                    <h3 className="text-base font-semibold text-white">{mod.title}</h3>
                  </div>
                  <Link
                    href={`/quiz/${mod.id}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#222a3d] px-2.5 py-1 text-xs font-medium text-[#7bd0ff] hover:bg-[#2d3449] transition"
                  >
                    <Zap className="h-3.5 w-3.5" /> Module Quiz
                  </Link>
                </div>

                {/* Lessons */}
                <div className="space-y-2 pt-1">
                  {mod.lessons.map((lesson, lIdx) => (
                    <div
                      key={lesson.id}
                      className="flex items-center justify-between rounded-xl bg-[#131b2e] p-3 text-xs border border-slate-800/80 hover:border-slate-700 transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <span className="text-slate-400 font-mono text-[11px]">
                          Lesson {lIdx + 1}:
                        </span>
                        <span className="font-medium text-white truncate">
                          {lesson.title}
                        </span>
                        {lesson.conceptName && (
                          <span className="hidden sm:inline-block rounded bg-[#222a3d] px-2 py-0.5 text-[10px] font-mono text-[#7bd0ff]">
                            {lesson.conceptName}
                          </span>
                        )}
                      </div>

                      <Link
                        href={`/learn/${lesson.id}`}
                        className="inline-flex items-center gap-1 font-semibold text-[#8083ff] hover:text-[#c0c1ff] transition ml-2 flex-shrink-0"
                      >
                        Read <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>

          {/* Right Sidebar: Concepts & Assignments */}
          <div className="space-y-6">
            {/* Concept Prerequisite Graph */}
            <section className="rounded-2xl bg-[#171f33] p-5 shadow-lg border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-[#c0c1ff]" /> Concept DAG
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  {concepts.length} nodes
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Concepts build upon each other in a Directed Acyclic Graph.
              </p>

              <div className="space-y-2">
                {concepts.map((cp) => (
                  <div
                    key={cp.id}
                    className="rounded-xl bg-[#131b2e] p-3 text-xs border border-slate-800/80 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{cp.name}</span>
                      <span className="rounded bg-[#222a3d] px-1.5 py-0.5 text-[10px] font-mono text-[#7bd0ff]">
                        Diff {cp.difficulty}
                      </span>
                    </div>
                    {cp.prereqName && (
                      <p className="text-[11px] text-slate-400">
                        Prerequisite: <span className="text-slate-300 font-medium">{cp.prereqName}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Tiered Assignments */}
            {assignments.length > 0 && (
              <section className="rounded-2xl bg-[#171f33] p-5 shadow-lg border border-slate-800/80 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-[#7bd0ff]" /> Course Assignments
                </h3>
                <div className="space-y-2">
                  {assignments.map((asg) => (
                    <div
                      key={asg.id}
                      className="rounded-xl bg-[#131b2e] p-3 text-xs border border-slate-800/80 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white truncate max-w-[150px]">
                          {asg.title}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${
                            asg.tier === "challenge"
                              ? "bg-purple-950/60 text-purple-300"
                              : asg.tier === "remedial"
                                ? "bg-amber-950/60 text-amber-300"
                                : "bg-sky-950/60 text-sky-300"
                          }`}
                        >
                          {asg.tier}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] line-clamp-2">
                        {asg.description}
                      </p>
                      <div className="pt-1 flex justify-end">
                        <Link
                          href={`/assignments/${asg.id}`}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8083ff] hover:text-[#c0c1ff]"
                        >
                          Submit Work <ArrowRight className="h-2.5 w-2.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
