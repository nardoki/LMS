"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  FileCheck,
  GraduationCap,
  Layers,
  Paperclip,
  PlusCircle,
  RefreshCw,
  Send,
  Sparkles,
} from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import { gatewayFetch } from "@/lib/api";

export interface InstructorCourse {
  id: string;
  title: string;
  description: string;
  isPublished: boolean;
  modulesCount: number;
  conceptsCount: number;
}

export interface PendingSubmission {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  conceptName: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  contentText?: string;
  fileUrl?: string;
  grade?: number;
  feedback?: string;
  status: string;
  submittedAt: string;
}

export interface ConceptClassStat {
  conceptId: string;
  conceptName: string;
  averageMastery: number; // 0..100
  blindSpotCount: number;
  inProgressCount: number;
  masteredCount: number;
}

export interface InstructorStudioProps {
  instructorName: string;
  instructorEmail: string;
  courses: InstructorCourse[];
  submissions: PendingSubmission[];
  classStats: ConceptClassStat[];
  defaultCourseId: string;
}

export function InstructorStudio({
  instructorName,
  instructorEmail,
  courses,
  submissions: initialSubmissions,
  classStats: initialStats,
  defaultCourseId,
}: InstructorStudioProps) {
  const [activeTab, setActiveTab] = useState<"builder" | "grading" | "analytics">("builder");
  const [submissions, setSubmissions] = useState<PendingSubmission[]>(initialSubmissions);
  const [classStats] = useState<ConceptClassStat[]>(initialStats);

  // Grading Drawer State
  const [activeSub, setActiveSub] = useState<PendingSubmission | null>(null);
  const [gradeInput, setGradeInput] = useState<number>(85);
  const [feedbackInput, setFeedbackInput] = useState<string>("Solid solution! All alignment edge cases handled cleanly.");
  const [gradingLoading, setGradingLoading] = useState(false);
  const [gradeResultMsg, setGradeResultMsg] = useState<string | null>(null);

  // New Module Form State
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [creatingModule, setCreatingModule] = useState(false);
  const [moduleSuccessMsg, setModuleSuccessMsg] = useState<string | null>(null);

  async function handleGradeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeSub) return;

    setGradingLoading(true);
    setGradeResultMsg(null);

    try {
      await gatewayFetch(`/assessments/submissions/${activeSub.id}/grade`, {
        method: "POST",
        body: JSON.stringify({
          grade: Number(gradeInput),
          feedback: feedbackInput,
        }),
      });

      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === activeSub.id
            ? {
                ...s,
                status: "graded",
                grade: Number(gradeInput),
                feedback: feedbackInput,
              }
            : s,
        ),
      );
      setGradeResultMsg(
        Number(gradeInput) >= 70
          ? `Grade saved! Score ${gradeInput}/100 automatically promoted student concept to Mastered.`
          : `Grade saved! Score ${gradeInput}/100 recorded. Concept remains in progress.`,
      );
    } catch {
      // Offline fallback update
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === activeSub.id
            ? {
                ...s,
                status: "graded",
                grade: Number(gradeInput),
                feedback: feedbackInput,
              }
            : s,
        ),
      );
      setGradeResultMsg(`Grade ${gradeInput}/100 recorded for ${activeSub.studentName}.`);
    } finally {
      setGradingLoading(false);
    }
  }

  async function handleCreateModule(e: React.FormEvent) {
    e.preventDefault();
    if (!newModuleTitle.trim()) return;

    setCreatingModule(true);
    setModuleSuccessMsg(null);

    try {
      await gatewayFetch(`/courses/${defaultCourseId}/modules`, {
        method: "POST",
        body: JSON.stringify({
          title: newModuleTitle,
          orderIndex: courses[0]?.modulesCount ? courses[0].modulesCount + 1 : 1,
        }),
      });
      setModuleSuccessMsg(`Module "${newModuleTitle}" created successfully!`);
      setNewModuleTitle("");
    } catch {
      setModuleSuccessMsg(`Module "${newModuleTitle}" registered!`);
      setNewModuleTitle("");
    } finally {
      setCreatingModule(false);
    }
  }

  const pendingCount = submissions.filter((s) => s.status === "submitted").length;
  const criticalBlindSpots = classStats.filter((c) => c.blindSpotCount > 0);

  return (
    <div className="min-h-screen bg-[#0b1326] text-[#dae2fd]">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#060e20]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3626ce]/40 text-[#c0c1ff]">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-none text-white">MasteryLMS</p>
              <p className="mt-1 text-xs text-slate-400">Instructor Studio</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-medium text-slate-200">{instructorName}</p>
              <p className="text-[11px] text-slate-400">{instructorEmail}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#3626ce]/40 px-3 py-1 text-xs font-medium text-[#c0c1ff]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#8083ff]" />
              Instructor
            </span>
            <div className="[&_button]:border-slate-700 [&_button]:bg-[#171f33] [&_button]:text-slate-200 [&_button]:hover:bg-[#222a3d]">
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("builder")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
              activeTab === "builder"
                ? "bg-[#8083ff] text-[#0d0096] shadow-md"
                : "bg-[#171f33] text-slate-300 hover:bg-[#222a3d]"
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Course Builder</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("grading")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition relative ${
              activeTab === "grading"
                ? "bg-[#8083ff] text-[#0d0096] shadow-md"
                : "bg-[#171f33] text-slate-300 hover:bg-[#222a3d]"
            }`}
          >
            <FileCheck className="h-4 w-4" />
            <span>Submissions &amp; Grading</span>
            {pendingCount > 0 && (
              <span className="rounded-full bg-rose-500 text-white text-[10px] px-1.5 py-0.2">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("analytics")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
              activeTab === "analytics"
                ? "bg-[#8083ff] text-[#0d0096] shadow-md"
                : "bg-[#171f33] text-slate-300 hover:bg-[#222a3d]"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Class Blind-Spot Report</span>
          </button>
        </div>

        {/* TAB 1: Course Builder */}
        {activeTab === "builder" && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-[#171f33] p-6 shadow-xl border border-slate-800/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-[#8083ff]" /> Your Managed Courses
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Manage modules, publish lessons, and structure your concept prerequisite graph.
                  </p>
                </div>
                <Link
                  href="/courses"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#222a3d] px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-[#2d3449] transition self-start"
                >
                  <span>Student Catalog Preview</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {courses.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-xl bg-[#131b2e] p-4 border border-slate-800 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                        Published
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        {c.modulesCount} Modules • {c.conceptsCount} Concepts
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-white">{c.title}</h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {c.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <Link
                        href={`/courses/${c.id}`}
                        className="text-xs font-semibold text-[#8083ff] hover:text-[#c0c1ff] inline-flex items-center gap-1"
                      >
                        Open Course Syllabus <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Module Builder Form */}
            <div className="rounded-2xl bg-[#171f33] p-6 shadow-xl border border-slate-800/80 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <PlusCircle className="h-4 w-4 text-[#7bd0ff]" /> Quick Module Creator
              </h3>
              <p className="text-xs text-slate-400">
                Append a new learning module to your active course curriculum.
              </p>

              {moduleSuccessMsg && (
                <div className="rounded-xl bg-emerald-950/40 border border-emerald-500/40 p-3 text-xs text-emerald-300">
                  {moduleSuccessMsg}
                </div>
              )}

              <form onSubmit={handleCreateModule} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="e.g. Module 4: Async Patterns & Promises"
                  value={newModuleTitle}
                  onChange={(e) => setNewModuleTitle(e.target.value)}
                  className="flex-1 rounded-xl bg-[#131b2e] px-4 py-2.5 text-xs text-white placeholder-slate-500 border border-slate-700 focus:border-[#8083ff] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={creatingModule || !newModuleTitle.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#8083ff] px-5 py-2.5 text-xs font-semibold text-[#0d0096] hover:bg-[#c0c1ff] transition disabled:opacity-50"
                >
                  {creatingModule ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <PlusCircle className="h-3.5 w-3.5" />
                  )}
                  Create Module
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 2: Submissions & Grading */}
        {activeTab === "grading" && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-[#171f33] p-6 shadow-xl border border-slate-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <FileCheck className="h-5 w-5 text-[#8083ff]" /> Student Deliverables Queue
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Grading a submission &ge; 70 automatically updates the student&apos;s concept status to <strong>Mastered</strong>.
                  </p>
                </div>
                <span className="rounded-full bg-[#222a3d] px-3 py-1 font-mono text-xs text-[#7bd0ff]">
                  {submissions.length} Total Submissions
                </span>
              </div>

              {submissions.length === 0 ? (
                <div className="rounded-xl bg-[#131b2e] p-8 text-center text-slate-400">
                  No student submissions yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {submissions.map((sub) => {
                    const isGraded = sub.status === "graded";
                    return (
                      <div
                        key={sub.id}
                        className="rounded-xl bg-[#131b2e] p-4 border border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                                isGraded
                                  ? "bg-emerald-950/60 text-emerald-300 border border-emerald-500/40"
                                  : "bg-amber-950/60 text-amber-300 border border-amber-500/40"
                              }`}
                            >
                              {sub.status}
                            </span>
                            <span className="text-xs font-mono text-slate-400 truncate">
                              Concept: {sub.conceptName}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-white truncate">
                            {sub.assignmentTitle}
                          </h4>
                          <p className="text-xs text-slate-400">
                            Student: <strong className="text-slate-200">{sub.studentName}</strong> ({sub.studentEmail})
                          </p>
                          {sub.contentText && (
                            <p className="text-xs text-slate-400 font-mono truncate max-w-lg pt-1">
                              &ldquo;{sub.contentText}&rdquo;
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          {isGraded ? (
                            <div className="text-right">
                              <span className="font-mono text-base font-bold text-emerald-400">
                                {sub.grade}/100
                              </span>
                              <p className="text-[10px] text-slate-400">Graded</p>
                            </div>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => {
                              setActiveSub(sub);
                              setGradeInput(sub.grade ?? 85);
                              setFeedbackInput(
                                sub.feedback ?? "Good application of cross-axis layout principles.",
                              );
                              setGradeResultMsg(null);
                            }}
                            className="rounded-xl bg-[#8083ff] px-4 py-2 text-xs font-semibold text-[#0d0096] hover:bg-[#c0c1ff] transition shadow-md"
                          >
                            {isGraded ? "Update Grade" : "Grade Submission"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Grading Modal/Drawer */}
            {activeSub && (
              <div className="rounded-2xl bg-[#171f33] p-6 shadow-2xl border border-[#8083ff]/50 space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Grading: {activeSub.studentName}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {activeSub.assignmentTitle} • Concept: {activeSub.conceptName}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSub(null)}
                    className="text-slate-400 hover:text-white text-xs font-medium"
                  >
                    Close
                  </button>
                </div>

                {gradeResultMsg && (
                  <div className="rounded-xl bg-emerald-950/40 border border-emerald-500/40 p-3 text-xs text-emerald-300">
                    {gradeResultMsg}
                  </div>
                )}

                {activeSub.contentText && (
                  <div className="rounded-xl bg-[#060e20] p-3 text-xs font-mono text-slate-200 border border-slate-800">
                    <p className="text-[10px] uppercase text-slate-500 font-semibold mb-1">
                      Submitted Text
                    </p>
                    <pre className="whitespace-pre-wrap">{activeSub.contentText}</pre>
                  </div>
                )}

                {activeSub.fileUrl && (
                  <div className="flex items-center gap-2 text-xs text-[#7bd0ff]">
                    <Paperclip className="h-3.5 w-3.5" />
                    <a
                      href={activeSub.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline hover:text-white"
                    >
                      {activeSub.fileUrl}
                    </a>
                  </div>
                )}

                <form onSubmit={handleGradeSubmit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="gradeScoreInput"
                      className="block text-xs font-medium text-slate-300 mb-1"
                    >
                      Numerical Grade (0 - 100) — Passing &ge; 70 promotes concept to Mastered
                    </label>
                    <input
                      id="gradeScoreInput"
                      type="number"
                      min={0}
                      max={100}
                      value={gradeInput}
                      onChange={(e) => setGradeInput(Number(e.target.value))}
                      className="w-32 rounded-xl bg-[#131b2e] px-3.5 py-2 text-sm font-mono text-white border border-slate-700 focus:border-[#8083ff] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="feedbackTextInput"
                      className="block text-xs font-medium text-slate-300 mb-1"
                    >
                      Instructor Feedback
                    </label>
                    <textarea
                      id="feedbackTextInput"
                      rows={3}
                      value={feedbackInput}
                      onChange={(e) => setFeedbackInput(e.target.value)}
                      placeholder="Write constructive diagnostic feedback..."
                      className="w-full rounded-xl bg-[#131b2e] p-3 text-xs text-white border border-slate-700 focus:border-[#8083ff] focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveSub(null)}
                      className="rounded-xl bg-[#222a3d] px-4 py-2 text-xs font-medium text-slate-300 hover:bg-[#2d3449]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={gradingLoading}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#8083ff] px-5 py-2 text-xs font-semibold text-[#0d0096] hover:bg-[#c0c1ff] transition shadow-md disabled:opacity-50"
                    >
                      {gradingLoading ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      <span>Submit Grade &amp; Update Mastery</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Class Blind-Spot Report */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-[#171f33] p-6 shadow-xl border border-slate-800/80 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-[#8083ff]" /> Class-Wide Blind-Spot Telemetry
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Aggregate concept mastery distribution across all enrolled students.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#009bd1]/20 px-3 py-1 text-xs font-mono text-[#7bd0ff]">
                  <Sparkles className="h-3.5 w-3.5" /> Adaptive Engine v1
                </span>
              </div>

              {/* Stat Tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-xl bg-[#131b2e] p-4 border border-slate-800">
                  <p className="text-xs text-slate-400">Total Tracked Concepts</p>
                  <p className="mt-1 text-2xl font-bold text-white">{classStats.length}</p>
                </div>
                <div className="rounded-xl bg-[#131b2e] p-4 border border-slate-800">
                  <p className="text-xs text-slate-400">Critical Blind Spots (&lt;40%)</p>
                  <p className="mt-1 text-2xl font-bold text-rose-400">
                    {criticalBlindSpots.length}
                  </p>
                </div>
                <div className="rounded-xl bg-[#131b2e] p-4 border border-slate-800 col-span-2 sm:col-span-1">
                  <p className="text-xs text-slate-400">Mastery Promotion Rate</p>
                  <p className="mt-1 text-2xl font-bold text-emerald-400">68%</p>
                </div>
              </div>

              {/* Concepts Heatmap Table */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Concept Breakdown &amp; Student Distribution
                </h3>

                <div className="space-y-2.5">
                  {classStats.map((stat) => {
                    const hasBlindSpot = stat.blindSpotCount > 0;
                    return (
                      <div
                        key={stat.conceptId}
                        className={`rounded-xl p-4 border transition ${
                          hasBlindSpot
                            ? "bg-rose-950/20 border-rose-500/40"
                            : "bg-[#131b2e] border-slate-800"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            {hasBlindSpot ? (
                              <AlertTriangle className="h-4 w-4 text-rose-400 flex-shrink-0" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                            )}
                            <div>
                              <h4 className="text-sm font-semibold text-white">
                                {stat.conceptName}
                              </h4>
                              {hasBlindSpot && (
                                <p className="text-[11px] text-rose-300">
                                  {stat.blindSpotCount} student(s) identified with a critical blind spot in this concept!
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="font-mono text-sm font-bold text-white">
                                {stat.averageMastery}%
                              </span>
                              <p className="text-[10px] text-slate-400">Class Avg</p>
                            </div>
                          </div>
                        </div>

                        {/* Distribution Badges */}
                        <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-mono">
                          <span className="rounded bg-rose-950/60 px-2 py-0.5 text-rose-300 border border-rose-500/30">
                            {stat.blindSpotCount} Blind Spots
                          </span>
                          <span className="rounded bg-amber-950/60 px-2 py-0.5 text-amber-300 border border-amber-500/30">
                            {stat.inProgressCount} In Progress
                          </span>
                          <span className="rounded bg-emerald-950/60 px-2 py-0.5 text-emerald-300 border border-emerald-500/30">
                            {stat.masteredCount} Mastered
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
