"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Flame,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import { gatewayFetch } from "@/lib/api";

export type MasteryStatus =
  | "not_started"
  | "blind_spot"
  | "in_progress"
  | "mastered";

export interface DashboardConceptNode {
  id: string;
  name: string;
  difficulty: number;
  mastery: number; // 0..100 integer percentage
  status: MasteryStatus;
  locked: boolean;
  prereqHint?: string;
}

export interface DashboardAssignment {
  id: string;
  title: string;
  description: string;
  tier: "remedial" | "standard" | "challenge";
  conceptName: string;
}

export interface StudentDashboardProps {
  studentName: string;
  studentEmail: string;
  courseTitle: string;
  instructorName: string;
  concepts: DashboardConceptNode[];
  assignments: DashboardAssignment[];
}

function classifyPercent(pct: number): MasteryStatus {
  if (pct <= 0) return "not_started";
  if (pct < 40) return "blind_spot";
  if (pct < 80) return "in_progress";
  return "mastered";
}

function statusMeta(status: MasteryStatus, locked: boolean) {
  if (locked) {
    return {
      label: "Locked",
      badgeClass: "bg-slate-800 text-slate-400",
      cardClass: "bg-[#131b2e]/70 opacity-75 border border-slate-800/80",
      icon: Lock,
      iconClass: "text-slate-400",
    };
  }
  switch (status) {
    case "mastered":
      return {
        label: "Mastered",
        badgeClass: "bg-emerald-500/15 text-emerald-400",
        cardClass: "bg-[#131b2e] border border-emerald-500/15",
        icon: CheckCircle2,
        iconClass: "text-emerald-400",
      };
    case "in_progress":
      return {
        label: "In Progress",
        badgeClass: "bg-amber-500/15 text-amber-400",
        cardClass: "bg-[#131b2e] border border-amber-500/15",
        icon: RefreshCw,
        iconClass: "text-amber-400",
      };
    case "blind_spot":
      return {
        label: "Blind Spot",
        badgeClass: "bg-rose-500/20 text-rose-400",
        cardClass: "bg-rose-500/10 border border-rose-500/30",
        icon: AlertTriangle,
        iconClass: "text-rose-400",
      };
    default:
      return {
        label: "Not Started",
        badgeClass: "bg-slate-800 text-slate-300",
        cardClass: "bg-[#131b2e] border border-slate-800",
        icon: BookOpen,
        iconClass: "text-slate-400",
      };
  }
}

export function StudentDashboard({
  studentName,
  studentEmail,
  courseTitle,
  instructorName,
  concepts,
  assignments,
}: StudentDashboardProps) {
  const [simulated, setSimulated] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [rbacOutput, setRbacOutput] = useState<string | null>(null);
  const [rbacError, setRbacError] = useState(false);

  // Apply an optional +20% preview boost to the first blind spot so learners can see the heatmap react
  const displayConcepts = useMemo(() => {
    if (!simulated) return concepts;
    let boosted = false;
    return concepts.map((c) => {
      if (!boosted && c.status === "blind_spot") {
        boosted = true;
        const nextPct = Math.min(100, c.mastery + 20);
        return {
          ...c,
          mastery: nextPct,
          status: classifyPercent(nextPct),
          prereqHint: "Improving rapidly",
        };
      }
      return c;
    });
  }, [concepts, simulated]);

  const stats = useMemo(() => {
    const mastered = displayConcepts.filter((c) => !c.locked && c.status === "mastered").length;
    const inProgress = displayConcepts.filter((c) => !c.locked && c.status === "in_progress").length;
    const blindSpot = displayConcepts.filter((c) => !c.locked && c.status === "blind_spot").length;
    const locked = displayConcepts.filter((c) => c.locked || c.status === "not_started").length;
    const avg =
      displayConcepts.length > 0
        ? Math.round(
            displayConcepts.reduce((sum, c) => sum + c.mastery, 0) /
              displayConcepts.length,
          )
        : 0;
    return { mastered, inProgress, blindSpot, locked, avg };
  }, [displayConcepts]);

  // Build a simple Smart Queue prioritizing blind spots first, then in-progress concepts
  const queueItems = useMemo(() => {
    return displayConcepts
      .filter((c) => !c.locked && (c.status === "blind_spot" || c.status === "in_progress"))
      .sort((a, b) => a.mastery - b.mastery)
      .filter((c) => !dismissedIds.includes(c.id))
      .map((c) => ({
        id: c.id,
        conceptName: c.name,
        tag: c.status === "blind_spot" ? "Blind Spot Recovery" : "Concept Practice",
        isUrgent: c.status === "blind_spot",
        title:
          c.status === "blind_spot"
            ? `${c.name} Micro-Drill`
            : `Continue ${c.name}`,
        description:
          c.status === "blind_spot"
            ? `Current mastery is ${c.mastery}%. Complete a 5-min diagnostic drill to unblock dependent topics.`
            : `Current mastery is ${c.mastery}%. Push past 80% to mark this concept mastered.`,
        cta: c.status === "blind_spot" ? "Start Review" : "Continue",
      }));
  }, [displayConcepts, dismissedIds]);

  const ringRadius = 30;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - stats.avg / 100);

  async function testGateway(path: string) {
    setRbacError(false);
    setRbacOutput("Checking Gateway...");
    try {
      const res = await gatewayFetch<unknown>(path);
      setRbacOutput(JSON.stringify(res, null, 2));
    } catch (err) {
      setRbacError(true);
      setRbacOutput(err instanceof Error ? err.message : "Request failed");
    }
  }

  return (
    <div className="min-h-screen bg-[#0b1326] text-[#dae2fd]">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#060e20]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#8083ff]/20 text-[#c0c1ff]">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-none text-white">
                MasteryLMS
              </p>
              <p className="mt-1 text-xs text-slate-400">Student Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-medium text-slate-200">{studentName}</p>
              <p className="text-[11px] text-slate-400">{studentEmail}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#222a3d] px-3 py-1 text-xs font-medium text-[#7bd0ff]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#7bd0ff]" />
              Student
            </span>
            <div className="[&_button]:border-slate-700 [&_button]:bg-[#171f33] [&_button]:text-slate-200 [&_button]:hover:bg-[#222a3d]">
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-6 sm:px-6">
        {/* 1. Mastery Overview Hero Card */}
        <section className="relative overflow-hidden rounded-2xl bg-[#171f33] p-5 shadow-lg border border-slate-800/70">
          <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[#8083ff]/15 blur-3xl" />

          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              {/* Progress Ring */}
              <div className="relative flex flex-shrink-0 items-center justify-center">
                <svg className="h-20 w-20 -rotate-90" viewBox="0 0 72 72">
                  <circle
                    cx="36"
                    cy="36"
                    r={ringRadius}
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="5"
                    className="text-[#2d3449]"
                  />
                  <circle
                    cx="36"
                    cy="36"
                    r={ringRadius}
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringOffset}
                    className="text-[#c0c1ff] transition-all duration-500"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-lg font-semibold leading-none text-white">
                    {stats.avg}%
                  </span>
                  <span className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-400">
                    Mastery
                  </span>
                </div>
              </div>

              <div>
                <div className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-[#009bd1]/20 px-2.5 py-0.5 text-xs font-medium text-[#7bd0ff]">
                  <Flame className="h-3.5 w-3.5" />
                  Adaptive Pacing
                </div>
                <h1 className="text-xl font-semibold text-white">{courseTitle}</h1>
                <p className="text-sm text-slate-400">
                  Instructor: <span className="text-slate-200">{instructorName}</span>
                </p>
              </div>
            </div>

            {/* 4-Stat Mastery Grid */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 md:min-w-[420px]">
              <div className="rounded-xl bg-[#131b2e] p-3 border border-slate-800/70">
                <p className="text-xs text-slate-400">Mastered</p>
                <p className="mt-1 flex items-center gap-1.5 font-mono text-sm font-semibold text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  {stats.mastered}
                </p>
              </div>
              <div className="rounded-xl bg-[#131b2e] p-3 border border-slate-800/70">
                <p className="text-xs text-slate-400">In Progress</p>
                <p className="mt-1 flex items-center gap-1.5 font-mono text-sm font-semibold text-amber-400">
                  <RefreshCw className="h-4 w-4" />
                  {stats.inProgress}
                </p>
              </div>
              <div className="rounded-xl bg-[#131b2e] p-3 border border-slate-800/70">
                <p className="text-xs text-slate-400">Blind Spot</p>
                <p className="mt-1 flex items-center gap-1.5 font-mono text-sm font-semibold text-rose-400">
                  <AlertTriangle className="h-4 w-4" />
                  {stats.blindSpot}
                </p>
              </div>
              <div className="rounded-xl bg-[#131b2e] p-3 border border-slate-800/70">
                <p className="text-xs text-slate-400">New / Locked</p>
                <p className="mt-1 flex items-center gap-1.5 font-mono text-sm font-semibold text-slate-400">
                  <Lock className="h-4 w-4" />
                  {stats.locked}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Knowledge Heatmap */}
        <section className="rounded-2xl bg-[#171f33] p-5 shadow-lg border border-slate-800/70">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                <Sparkles className="h-4 w-4 text-[#c0c1ff]" />
                Knowledge Heatmap
              </h2>
              <p className="mt-0.5 text-sm text-slate-400">
                Live concept scores from Supabase. Blind spots (&lt;40%) unlock remedial drills.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSimulated((s) => !s)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#222a3d] px-3 py-1.5 text-xs font-medium text-slate-100 transition hover:bg-[#2d3449]"
            >
              <Zap className="h-3.5 w-3.5 text-[#7bd0ff]" />
              {simulated ? "Reset Preview" : "Simulate +20%"}
            </button>
          </div>

          {displayConcepts.length === 0 ? (
            <p className="rounded-xl bg-[#131b2e] p-4 text-sm text-slate-400">
              No enrolled course concepts yet. Course enrollment arrives in Step 3.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {displayConcepts.map((node) => {
                const meta = statusMeta(node.status, node.locked);
                const Icon = meta.icon;
                return (
                  <div
                    key={node.id}
                    className={`flex min-h-[96px] flex-col justify-between rounded-xl p-3.5 transition-all ${meta.cardClass}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium text-slate-100">
                        {node.name}
                      </span>
                      <Icon className={`h-4 w-4 flex-shrink-0 ${meta.iconClass}`} />
                    </div>

                    {node.prereqHint && (
                      <p className="mt-1 text-[11px] text-slate-400">
                        {node.prereqHint}
                      </p>
                    )}

                    <div className="mt-3 flex items-center justify-between">
                      <span
                        className={`rounded px-2 py-0.5 text-[11px] font-medium ${meta.badgeClass}`}
                      >
                        {meta.label}
                      </span>
                      <span className="font-mono text-sm font-semibold text-white">
                        {node.mastery}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 3. Smart Queue & Active Assignments */}
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Today's Smart Queue */}
          <section className="rounded-2xl bg-[#171f33] p-5 shadow-lg border border-slate-800/70">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                Today&apos;s Smart Queue
              </h2>
              <span className="rounded-full bg-[#3626ce]/70 px-2.5 py-0.5 text-xs font-medium text-[#c3c0ff]">
                {queueItems.length} queued
              </span>
            </div>

            {queueItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl bg-[#131b2e] px-4 py-8 text-center">
                <CheckCircle2 className="mb-2 h-7 w-7 text-[#7bd0ff]" />
                <p className="text-sm font-semibold text-white">Queue is cleared!</p>
                <p className="mt-1 text-xs text-slate-400">
                  No urgent blind spots remaining right now.
                </p>
                {dismissedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setDismissedIds([])}
                    className="mt-3 rounded-lg bg-[#222a3d] px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-[#2d3449]"
                  >
                    Reload Queue
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {queueItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl bg-[#131b2e] p-3.5 border border-slate-800/70"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span
                        className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                          item.isUrgent
                            ? "bg-rose-500/15 text-rose-400"
                            : "bg-[#009bd1]/25 text-[#7bd0ff]"
                        }`}
                      >
                        {item.tag}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {item.conceptName}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                    <p className="mt-1 text-xs text-slate-400">{item.description}</p>
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          setDismissedIds((prev) => [...prev, item.id])
                        }
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                          item.isUrgent
                            ? "bg-[#c0c1ff] text-[#1000a9] hover:opacity-90"
                            : "bg-[#222a3d] text-slate-100 hover:bg-[#2d3449]"
                        }`}
                      >
                        {item.cta}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Active Assignments + Compact RBAC Test */}
          <div className="flex flex-col gap-5">
            <section className="rounded-2xl bg-[#171f33] p-5 shadow-lg border border-slate-800/70">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                  <ClipboardList className="h-4 w-4 text-[#7bd0ff]" />
                  Tiered Assignments
                </h2>
                <span className="text-xs text-slate-400">
                  Matched to mastery
                </span>
              </div>

              {assignments.length === 0 ? (
                <p className="rounded-xl bg-[#131b2e] p-4 text-sm text-slate-400">
                  No assignments published yet.
                </p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {assignments.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-xl bg-[#131b2e] p-3.5 border border-slate-800/70"
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
                            a.tier === "remedial"
                              ? "bg-amber-500/20 text-amber-300"
                              : a.tier === "challenge"
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-[#3626ce]/70 text-[#c3c0ff]"
                          }`}
                        >
                          {a.tier} tier
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {a.conceptName}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-white">{a.title}</h3>
                      <p className="mt-1 text-xs text-slate-400">{a.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Compact Gateway RBAC Verification Strip */}
            <section className="rounded-2xl bg-[#171f33] p-4 border border-slate-800/70">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
                  <ShieldCheck className="h-4 w-4 text-[#7bd0ff]" />
                  Gateway Auth Check
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => testGateway("/auth/me")}
                    className="rounded-md bg-[#222a3d] px-2.5 py-1 text-xs text-slate-200 hover:bg-[#2d3449]"
                  >
                    /auth/me
                  </button>
                  <button
                    type="button"
                    onClick={() => testGateway("/auth/instructor-area")}
                    className="rounded-md bg-[#222a3d] px-2.5 py-1 text-xs text-slate-200 hover:bg-[#2d3449]"
                  >
                    /auth/instructor-area
                  </button>
                </div>
              </div>
              {rbacOutput && (
                <pre
                  className={`mt-3 overflow-x-auto rounded-lg p-2.5 text-[11px] ${
                    rbacError
                      ? "bg-rose-950/60 text-rose-300"
                      : "bg-[#060e20] text-slate-200"
                  }`}
                >
                  {rbacOutput}
                </pre>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
