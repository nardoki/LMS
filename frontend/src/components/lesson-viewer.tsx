"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Menu,
  Sparkles,
  Video,
  X,
  Zap,
} from "lucide-react";

export interface LessonSidebarItem {
  id: string;
  moduleId: string;
  title: string;
  orderIndex: number;
  conceptName?: string;
}

export interface ModuleSidebarGroup {
  id: string;
  title: string;
  orderIndex: number;
  lessons: LessonSidebarItem[];
}

export interface LessonViewerProps {
  lessonId: string;
  lessonTitle: string;
  contentMarkdown: string;
  mediaUrl?: string;
  courseId: string;
  courseTitle: string;
  moduleId: string;
  moduleTitle: string;
  conceptId?: string;
  conceptName?: string;
  conceptDifficulty?: number;
  conceptMastery?: number;
  modules: ModuleSidebarGroup[];
  prevLessonId?: string;
  nextLessonId?: string;
}

export function LessonViewer({
  lessonId,
  lessonTitle,
  contentMarkdown,
  mediaUrl,
  courseId,
  courseTitle,
  moduleId,
  moduleTitle,
  conceptId,
  conceptName,
  conceptDifficulty,
  conceptMastery,
  modules,
  prevLessonId,
  nextLessonId,
}: LessonViewerProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Render markdown lines into structured elements
  const lines = contentMarkdown.split("\n");

  return (
    <div className="min-h-screen bg-[#0b1326] text-[#dae2fd] flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#060e20]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen((s) => !s)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-[#222a3d] hover:text-white transition lg:hidden"
              aria-label="Toggle Syllabus"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <Link
              href={`/courses/${courseId}`}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-[#222a3d] hover:text-white transition"
              aria-label="Back to course syllabus"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <div className="flex flex-col min-w-0">
              <span className="text-xs font-mono text-slate-400 truncate">
                {courseTitle} • {moduleTitle}
              </span>
              <span className="text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
                {lessonTitle}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {conceptId && (
              <Link
                href={`/quiz/${moduleId}?conceptId=${conceptId}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#8083ff] px-3.5 py-1.5 text-xs font-semibold text-[#0d0096] hover:bg-[#c0c1ff] transition shadow-md"
              >
                <Zap className="h-3.5 w-3.5" />
                <span>Test Concept</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Body with Sidebar + Reader */}
      <div className="flex flex-1 relative">
        {/* Left Sidebar (Collapsible on mobile, permanent on desktop) */}
        <aside
          className={`fixed inset-y-16 left-0 z-30 w-72 border-r border-slate-800/80 bg-[#060e20] p-4 overflow-y-auto transition-transform duration-200 lg:static lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Course Syllabus
              </span>
              <span className="text-[11px] font-mono text-[#7bd0ff]">
                {modules.length} Modules
              </span>
            </div>

            {modules.map((mod, modIdx) => (
              <div key={mod.id} className="space-y-1.5">
                <p className="text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
                  Module {modIdx + 1}: {mod.title}
                </p>

                <div className="space-y-1 pl-1">
                  {mod.lessons.map((les) => {
                    const isActive = les.id === lessonId;
                    return (
                      <Link
                        key={les.id}
                        href={`/learn/${les.id}`}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-xs transition ${
                          isActive
                            ? "bg-[#171f33] text-white font-semibold border-l-2 border-[#8083ff]"
                            : "text-slate-400 hover:bg-[#131b2e] hover:text-slate-200"
                        }`}
                      >
                        <span className="truncate">{les.title}</span>
                        {isActive && <CheckCircle2 className="h-3.5 w-3.5 text-[#8083ff] flex-shrink-0 ml-1" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Backdrop for mobile sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/60 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Central Lesson Reader */}
        <main className="flex-1 max-w-4xl mx-auto px-4 py-8 sm:px-8 space-y-6">
          {/* Concept Header Card */}
          {conceptName && (
            <div className="rounded-2xl bg-[#131b2e] p-4 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#009bd1]/20 text-[#7bd0ff]">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-mono text-slate-400">Target Concept</p>
                  <p className="text-sm font-bold text-white">{conceptName}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {conceptDifficulty && (
                  <span className="rounded bg-[#222a3d] px-2.5 py-1 text-xs font-mono text-slate-300">
                    Difficulty {conceptDifficulty}/5
                  </span>
                )}
                {conceptMastery !== undefined && (
                  <span className="rounded bg-[#3626ce]/40 px-2.5 py-1 text-xs font-mono font-bold text-[#c3c0ff]">
                    {conceptMastery}% Mastery
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Video or Media embed (if available) */}
          {mediaUrl && (
            <div className="rounded-2xl overflow-hidden bg-[#060e20] border border-slate-800 shadow-xl">
              <div className="p-3 bg-[#131b2e] border-b border-slate-800 flex items-center gap-2 text-xs font-mono text-slate-300">
                <Video className="h-4 w-4 text-[#7bd0ff]" />
                <span>Lesson Media Preview</span>
              </div>
              <div className="aspect-video w-full flex items-center justify-center bg-black/40">
                <video controls className="w-full h-full max-h-[420px] object-cover">
                  <source src={mediaUrl} />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          )}

          {/* Markdown Content Card */}
          <article className="rounded-2xl bg-[#171f33] p-6 sm:p-8 shadow-xl border border-slate-800/80 prose prose-invert max-w-none space-y-4">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white border-b border-slate-800 pb-3">
              {lessonTitle}
            </h1>

            <div className="space-y-3 text-slate-300 text-sm leading-relaxed">
              {lines.map((line, idx) => {
                if (line.startsWith("# ")) {
                  return null; // Skip main title as rendered above
                }
                if (line.startsWith("## ")) {
                  return (
                    <h2
                      key={idx}
                      className="text-lg font-bold text-white pt-3 pb-1 border-b border-slate-800/60"
                    >
                      {line.replace("## ", "")}
                    </h2>
                  );
                }
                if (line.startsWith("### ")) {
                  return (
                    <h3 key={idx} className="text-base font-semibold text-slate-200 pt-2">
                      {line.replace("### ", "")}
                    </h3>
                  );
                }
                if (line.startsWith("- ")) {
                  return (
                    <li key={idx} className="ml-4 list-disc text-slate-300">
                      {line.replace("- ", "")}
                    </li>
                  );
                }
                if (line.startsWith("```")) {
                  return (
                    <div
                      key={idx}
                      className="rounded-lg bg-[#060e20] p-3 font-mono text-xs text-[#7bd0ff] border border-slate-800"
                    >
                      <code>{line.replace(/```[a-z]*/, "")}</code>
                    </div>
                  );
                }
                if (line.trim().length === 0) {
                  return <div key={idx} className="h-1" />;
                }
                return <p key={idx}>{line}</p>;
              })}
            </div>
          </article>

          {/* Navigation Deck: Previous, Next, Quiz */}
          <div className="pt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80">
            {prevLessonId ? (
              <Link
                href={`/learn/${prevLessonId}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#222a3d] px-4 py-2.5 text-xs font-medium text-slate-200 hover:bg-[#2d3449] transition"
              >
                <ChevronLeft className="h-4 w-4" /> Previous Lesson
              </Link>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2.5">
              <Link
                href={`/quiz/${moduleId}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#3626ce] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#494bd6] transition shadow-md"
              >
                <Zap className="h-3.5 w-3.5" /> Module Quiz
              </Link>

              {nextLessonId && (
                <Link
                  href={`/learn/${nextLessonId}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#8083ff] px-4 py-2.5 text-xs font-semibold text-[#0d0096] hover:bg-[#c0c1ff] transition shadow-md"
                >
                  <span>Next Lesson</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
