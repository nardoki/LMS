"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Flame,
  HelpCircle,
  Lightbulb,
  Radio,
  RefreshCw,
  Sparkles,
  Terminal,
  Timer,
  XCircle,
  Zap,
} from "lucide-react";
import { gatewayFetch } from "@/lib/api";

export interface QuizPlayerConcept {
  id: string;
  name: string;
  difficulty: number;
  mastery: number; // 0..100
  status: "not_started" | "blind_spot" | "in_progress" | "mastered";
  prereqName?: string;
}

export interface QuizQuestionItem {
  id: string;
  moduleId: string;
  conceptId: string;
  conceptName?: string;
  questionText: string;
  options: string[];
  difficulty: number;
  isDiagnostic: boolean;
  hint?: string;
  explanation?: string;
  visualType?: "flexbox" | "boxmodel" | "dom" | "code";
  codeSnippet?: string;
}

export interface QuizPlayerProps {
  moduleId: string;
  moduleTitle: string;
  courseTitle: string;
  studentName: string;
  studentEmail: string;
  targetConceptId?: string;
  concepts: QuizPlayerConcept[];
}

// Fallback questions mirroring seed data & design mockup if gateway is offline
const FALLBACK_MODULE_QUESTIONS: Record<string, QuizQuestionItem[]> = {
  // Module 2: CSS & Layout
  "bbbbbbbb-0001-0001-0001-000000000002": [
    {
      id: "eeeeeeee-0001-0001-0001-000000000003",
      moduleId: "bbbbbbbb-0001-0001-0001-000000000002",
      conceptId: "cccccccc-0001-0001-0001-000000000003",
      conceptName: "Flexbox & Grid Layout",
      questionText:
        "Which CSS property combination aligns flex items along the cross axis when space is distributed unevenly, without stretching?",
      options: [
        "align-items: center;",
        "justify-content: space-between;",
        "align-content: flex-start;",
        "flex-wrap: nowrap;",
      ],
      difficulty: 3,
      isDiagnostic: true,
      hint: "Remember: align-items operates on items within a flex line along the perpendicular cross axis, while justify-content manages the main axis.",
      explanation:
        "align-items: center aligns flex children along the perpendicular cross axis for each line without stretching child heights. In contrast, justify-content targets the main axis, and align-content handles multi-line track spacing.",
      visualType: "flexbox",
    },
    {
      id: "eeeeeeee-0001-0001-0001-000000000002",
      moduleId: "bbbbbbbb-0001-0001-0001-000000000002",
      conceptId: "cccccccc-0001-0001-0001-000000000002",
      conceptName: "CSS Box Model & Selectors",
      questionText:
        "With box-sizing: border-box, which properties are included inside the declared width?",
      options: [
        "Content only",
        "Content and padding only",
        "Content, padding, and border",
        "Content, padding, border, and margin",
      ],
      difficulty: 2,
      isDiagnostic: true,
      hint: "Margins always sit strictly outside the border box boundary.",
      explanation:
        "Under `box-sizing: border-box`, width = content + padding + border. Margin remains outside the box calculation.",
      visualType: "boxmodel",
    },
  ],
  // Module 1: HTML & Semantics
  "bbbbbbbb-0001-0001-0001-000000000001": [
    {
      id: "eeeeeeee-0001-0001-0001-000000000001",
      moduleId: "bbbbbbbb-0001-0001-0001-000000000001",
      conceptId: "cccccccc-0001-0001-0001-000000000001",
      conceptName: "HTML Elements & Semantics",
      questionText:
        "Which HTML element should wrap the primary unique content of a document?",
      options: ["<div>", "<main>", "<section>", "<span>"],
      difficulty: 1,
      isDiagnostic: true,
      hint: "Look for the semantic landmark tag intended to appear once per document for accessibility.",
      explanation:
        "The `<main>` landmark element is reserved for the dominant, central content unique to the page.",
      visualType: "dom",
    },
  ],
  // Module 3: JavaScript & DOM
  "bbbbbbbb-0001-0001-0001-000000000003": [
    {
      id: "eeeeeeee-0001-0001-0001-000000000004",
      moduleId: "bbbbbbbb-0001-0001-0001-000000000003",
      conceptId: "cccccccc-0001-0001-0001-000000000004",
      conceptName: "JavaScript Variables & Functions",
      questionText:
        "What is the scope of a variable declared with let inside an if-block?",
      options: [
        "Global scope",
        "Function scope",
        "Block scope",
        "Module-only global scope",
      ],
      difficulty: 2,
      isDiagnostic: true,
      hint: "Unlike `var`, ES6 `let` and `const` adhere to curly brace `{}` containment.",
      explanation:
        "Variables declared with `let` and `const` are block-scoped to the nearest enclosing pair of curly braces.",
      visualType: "code",
      codeSnippet: "if (isValid) {\n  let token = 'xyz'; // scoped to block\n}",
    },
    {
      id: "eeeeeeee-0001-0001-0001-000000000005",
      moduleId: "bbbbbbbb-0001-0001-0001-000000000003",
      conceptId: "cccccccc-0001-0001-0001-000000000005",
      conceptName: "DOM Manipulation & Events",
      questionText:
        "Why is event delegation on a parent list useful when list items are added dynamically?",
      options: [
        "It disables bubbling",
        "Newly added children automatically trigger the parent listener",
        "It avoids CSS reflow",
        "It runs handlers before DOM load",
      ],
      difficulty: 4,
      isDiagnostic: true,
      hint: "Think about event propagation from dynamic child nodes up to the permanent ancestor.",
      explanation:
        "Because events bubble up to the parent, dynamically appended children trigger the existing listener without requiring re-binding.",
      visualType: "dom",
    },
  ],
};

export function QuizPlayer({
  moduleId,
  moduleTitle,
  courseTitle,
  studentName,
  concepts: initialConcepts,
  targetConceptId,
}: QuizPlayerProps) {
  const [concepts, setConcepts] = useState<QuizPlayerConcept[]>(initialConcepts);
  const [questions, setQuestions] = useState<QuizQuestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFlagged, setIsFlagged] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [sandboxAlign, setSandboxAlign] = useState<"center" | "flex-start" | "flex-end">("center");
  const [secondsLeft, setSecondsLeft] = useState(105);
  const [timerActive, setTimerActive] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  // History tracking of answers
  const [answersHistory, setAnswersHistory] = useState<
    Array<{
      questionId: string;
      conceptId: string;
      selected: string;
      correct: boolean;
      correctAnswer: string;
      timeSpent: number;
      oldMastery: number;
      newMastery: number;
    }>
  >([]);

  const questionStartTimeRef = useRef<number>(0);
  const diagnosisRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    questionStartTimeRef.current = Date.now();
  }, [currentIndex]);

  // Map concept names for fast lookup
  const conceptMap = useMemo(() => {
    return new Map(concepts.map((c) => [c.id, c]));
  }, [concepts]);

  // Load questions on mount from Gateway or fallback
  useEffect(() => {
    let isCancelled = false;

    async function loadQuizQuestions() {
      setLoading(true);
      try {
        const response = await gatewayFetch<{
          module_id: string;
          questions: Array<{
            id: string;
            module_id: string;
            concept_id: string;
            question_text: string;
            options: string[];
            difficulty: number;
            is_diagnostic: boolean;
          }>;
        }>(`/assessments/modules/${moduleId}/quiz?diagnosticOnly=false`);

        if (!isCancelled && response.questions && response.questions.length > 0) {
          const loaded: QuizQuestionItem[] = response.questions.map((q) => {
            const c = conceptMap.get(q.concept_id);
            // Enrich with visual hints based on concept/content
            const isFlex =
              q.question_text.toLowerCase().includes("flex") ||
              q.concept_id === "cccccccc-0001-0001-0001-000000000003";
            const isBox =
              q.question_text.toLowerCase().includes("box") ||
              q.concept_id === "cccccccc-0001-0001-0001-000000000002";

            return {
              id: q.id,
              moduleId: q.module_id,
              conceptId: q.concept_id,
              conceptName: c?.name ?? "Course Concept",
              questionText: q.question_text,
              options: q.options,
              difficulty: q.difficulty,
              isDiagnostic: q.is_diagnostic,
              hint: isFlex
                ? "Remember: align-items operates on items within a flex line along the cross axis, while justify-content manages the main axis."
                : isBox
                  ? "Margins always sit strictly outside the border box boundary."
                  : "Consider how standard web standards isolate component scope.",
              explanation: isFlex
                ? "align-items: center aligns children along the perpendicular cross axis per line without stretching."
                : undefined,
              visualType: isFlex ? "flexbox" : isBox ? "boxmodel" : undefined,
            };
          });

          // If targetConceptId is specified, sort target concept questions first
          if (targetConceptId) {
            loaded.sort((a, b) =>
              a.conceptId === targetConceptId
                ? -1
                : b.conceptId === targetConceptId
                  ? 1
                  : 0,
            );
          }

          setQuestions(loaded);
          setLoading(false);
          return;
        }
      } catch {
        // Gateway offline or error; gracefully fallback to rich seed questions
      }

      if (!isCancelled) {
        const fallback =
          FALLBACK_MODULE_QUESTIONS[moduleId] ??
          FALLBACK_MODULE_QUESTIONS["bbbbbbbb-0001-0001-0001-000000000002"];
        setQuestions(fallback);
        setLoading(false);
      }
    }

    loadQuizQuestions();
    return () => {
      isCancelled = true;
    };
  }, [moduleId, conceptMap, targetConceptId]);

  // Timer countdown effect
  useEffect(() => {
    if (!timerActive || isCompleted || loading) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerActive, isCompleted, loading]);

  const currentQ = questions[currentIndex];
  const currentConcept = currentQ ? conceptMap.get(currentQ.conceptId) : undefined;
  const isBlindSpot = currentConcept?.status === "blind_spot";

  const formatTimer = useCallback((totalSec: number) => {
    const mins = String(Math.floor(totalSec / 60)).padStart(2, "0");
    const secs = String(totalSec % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  }, []);

  // Answer submission
  async function handleCheckAnswer() {
    if (!selectedOption || !currentQ || isSubmitted || isSubmitting) return;

    setIsSubmitting(true);
    const timeTakenSec = Math.max(
      1,
      Math.round((Date.now() - questionStartTimeRef.current) / 1000),
    );

    let isCorrect = false;
    let correctAnswer = "";

    try {
      const res = await gatewayFetch<{
        attempt_id: string;
        question_id: string;
        concept_id: string;
        correct: boolean;
        correct_answer: string;
      }>("/assessments/quiz/answer", {
        method: "POST",
        body: JSON.stringify({
          questionId: currentQ.id,
          selectedAnswer: selectedOption,
          timeTakenSec,
        }),
      });

      isCorrect = res.correct;
      correctAnswer = res.correct_answer;
    } catch {
      // Local fallback calculation if gateway offline
      const knownCorrect =
        currentQ.id === "eeeeeeee-0001-0001-0001-000000000003"
          ? "align-items: center;"
          : currentQ.id === "eeeeeeee-0001-0001-0001-000000000002"
            ? "Content, padding, and border"
            : currentQ.id === "eeeeeeee-0001-0001-0001-000000000001"
              ? "<main>"
              : currentQ.id === "eeeeeeee-0001-0001-0001-000000000004"
                ? "Block scope"
                : "Newly added children automatically trigger the parent listener";

      correctAnswer = knownCorrect;
      isCorrect =
        selectedOption.trim().toLowerCase() === knownCorrect.trim().toLowerCase();
    }

    // Adaptive Mastery Engine calculation (matches backend mastery.engine.ts)
    const oldScore = currentConcept?.mastery ?? 42;
    // mastery_new = mastery + k * (correct - mastery) * difficulty_weight
    const k = 0.35; // learning rate
    const diffWeight = 0.8 + (currentQ.difficulty - 1) * 0.1;
    const outcome = isCorrect ? 100 : 0;
    const delta = Math.round(k * (outcome - oldScore) * diffWeight);
    const newScore = Math.min(100, Math.max(0, oldScore + delta));

    // Classify new status
    const newStatus: QuizPlayerConcept["status"] =
      newScore < 40 ? "blind_spot" : newScore < 80 ? "in_progress" : "mastered";

    // Update concepts state
    setConcepts((prev) =>
      prev.map((c) =>
        c.id === currentQ.conceptId
          ? { ...c, mastery: newScore, status: newStatus }
          : c,
      ),
    );

    // Save into history
    setAnswersHistory((prev) => [
      ...prev,
      {
        questionId: currentQ.id,
        conceptId: currentQ.conceptId,
        selected: selectedOption,
        correct: isCorrect,
        correctAnswer: correctAnswer || selectedOption,
        timeSpent: timeTakenSec,
        oldMastery: oldScore,
        newMastery: newScore,
      },
    ]);

    setIsSubmitted(true);
    setIsSubmitting(false);

    // Scroll to diagnosis panel smoothly
    setTimeout(() => {
      diagnosisRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 100);
  }

  function handleNext() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsSubmitted(false);
      setIsFlagged(false);
      setShowHint(false);
      questionStartTimeRef.current = Date.now();
    } else {
      setIsCompleted(true);
      setTimerActive(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b1326] text-white">
        <div className="flex items-center gap-3 rounded-xl bg-[#131b2e] px-6 py-4 border border-slate-800">
          <RefreshCw className="h-5 w-5 animate-spin text-[#7bd0ff]" />
          <span className="text-sm font-medium">Loading Adaptive Quiz Session...</span>
        </div>
      </div>
    );
  }

  if (!currentQ || questions.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0b1326] p-6 text-center text-white">
        <div className="max-w-md rounded-2xl bg-[#171f33] p-8 border border-slate-800">
          <HelpCircle className="mx-auto mb-3 h-10 w-10 text-[#7bd0ff]" />
          <h2 className="text-lg font-semibold">No Questions Found</h2>
          <p className="mt-2 text-sm text-slate-400">
            This module currently has no active quiz questions available.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#8083ff] px-5 py-2.5 text-sm font-semibold text-[#0d0096] hover:bg-[#c0c1ff]"
          >
            <ArrowLeft className="h-4 w-4" /> Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const latestHistory = answersHistory.find((h) => h.questionId === currentQ.id);
  const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);

  // Summary View when completed
  if (isCompleted) {
    const totalCount = questions.length;
    const correctCount = answersHistory.filter((h) => h.correct).length;
    const scorePct = Math.round((correctCount / totalCount) * 100);

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0b1326] p-4 text-white">
        <div className="w-full max-w-xl rounded-2xl bg-[#171f33] p-8 shadow-2xl border border-slate-800 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#3626ce]/40 text-[#7bd0ff] shadow-inner">
            <CheckCircle2 className="h-10 w-10" />
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#009bd1]/20 px-3 py-1 text-xs font-medium text-[#7bd0ff]">
            <Sparkles className="h-3.5 w-3.5" /> Session Complete
          </span>

          <h2 className="mt-3 text-2xl font-bold text-slate-100">
            Concept Drill Finished!
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {courseTitle} • {moduleTitle}
          </p>

          <div className="my-6 grid grid-cols-3 gap-3 rounded-xl bg-[#131b2e] p-4 text-center">
            <div>
              <p className="text-xs text-slate-400">Score</p>
              <p className="mt-1 text-xl font-bold text-white">
                {correctCount}/{totalCount}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Accuracy</p>
              <p
                className={`mt-1 text-xl font-bold ${
                  scorePct >= 70 ? "text-[#7bd0ff]" : "text-amber-400"
                }`}
              >
                {scorePct}%
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Remaining Time</p>
              <p className="mt-1 text-xl font-bold text-slate-300">
                {formatTimer(secondsLeft)}
              </p>
            </div>
          </div>

          <div className="space-y-2 text-left">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Concept Mastery Trajectory
            </h4>
            {answersHistory.map((ans) => {
              const c = conceptMap.get(ans.conceptId);
              const isGain = ans.newMastery >= ans.oldMastery;
              return (
                <div
                  key={ans.questionId}
                  className="flex items-center justify-between rounded-lg bg-[#131b2e] p-3 text-sm border border-slate-800/80"
                >
                  <div className="flex items-center gap-2.5">
                    {ans.correct ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <XCircle className="h-4 w-4 text-rose-400" />
                    )}
                    <span className="font-medium text-slate-200">
                      {c?.name ?? "Concept"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-slate-400">{ans.oldMastery}%</span>
                    <ArrowRight className="h-3 w-3 text-slate-500" />
                    <span
                      className={`font-bold ${
                        isGain ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {ans.newMastery}% ({isGain ? "+" : ""}
                      {ans.newMastery - ans.oldMastery}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#8083ff] px-6 py-3 text-sm font-semibold text-[#0d0096] hover:bg-[#c0c1ff] transition-all shadow-md"
            >
              <ArrowLeft className="h-4 w-4" /> Return to Dashboard
            </Link>
            <button
              type="button"
              onClick={() => {
                setCurrentIndex(0);
                setSelectedOption(null);
                setIsSubmitted(false);
                setIsCompleted(false);
                setAnswersHistory([]);
                setSecondsLeft(105);
                setTimerActive(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#222a3d] px-5 py-3 text-sm font-medium text-slate-200 hover:bg-[#2d3449] transition-all"
            >
              <RefreshCw className="h-4 w-4" /> Retake Drill
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0b1326] text-[#dae2fd]">
      {/* 1. Header Bar */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-[#060e20]/80 backdrop-blur-xl shadow-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              aria-label="Back to dashboard"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-[#222a3d] hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white">Active Quiz Session</span>
              <span className="text-[11px] font-mono text-slate-400">
                MasteryLMS • {courseTitle}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-full bg-[#171f33] px-3 py-1 font-mono text-xs text-[#7bd0ff] border border-slate-800 shadow-sm">
              <Timer className="h-3.5 w-3.5" />
              <span>{formatTimer(secondsLeft)}</span>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3626ce] text-xs font-bold text-white shadow-sm">
              {studentName.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col p-4 sm:p-6 space-y-4 pb-28">
        {/* 2. Quiz Meta & Header */}
        <section className="rounded-2xl bg-[#131b2e] p-5 shadow-lg border border-slate-800/80 flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  isBlindSpot
                    ? "bg-[#93000a] text-[#ffdad6]"
                    : "bg-[#009bd1]/25 text-[#7bd0ff]"
                }`}
              >
                {isBlindSpot ? (
                  <AlertTriangle className="h-3 w-3" />
                ) : (
                  <Zap className="h-3 w-3" />
                )}
                {isBlindSpot ? "Blind Spot Recovery" : "Concept Diagnostic Drill"}
              </span>
              <span className="text-xs font-mono font-medium text-[#7bd0ff]">
                {currentConcept?.name ?? "Target Concept"}
              </span>
            </div>

            <span className="text-xs font-mono text-slate-400">
              Module {moduleTitle}
            </span>
          </div>

          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white leading-snug">
              Adaptive Concept Drill: {moduleTitle}
            </h1>
            <p className="mt-0.5 text-xs text-slate-400">
              Target Concept:{" "}
              <strong className="text-slate-200">
                {currentConcept?.name ?? "Layout Diagnostics"}
              </strong>
            </p>
          </div>

          {/* Progress Meter */}
          <div className="pt-2 flex flex-col space-y-1.5">
            <div className="flex justify-between items-center text-xs font-mono text-slate-400">
              <span>
                Question {currentIndex + 1} of {questions.length}
              </span>
              <span className="text-[#8083ff] font-medium">
                {progressPercent}% Complete
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#2d3449] overflow-hidden">
              <div
                className="h-full bg-[#8083ff] rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </section>

        {/* 3. Question Card */}
        <section className="rounded-2xl bg-[#171f33] p-5 shadow-lg border border-slate-800/80 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#222a3d] text-slate-300 text-xs font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7bd0ff]" />
              Difficulty {currentQ.difficulty} • Prereq:{" "}
              {currentConcept?.prereqName ?? "Foundation"}
            </span>

            <button
              type="button"
              onClick={() => setShowHint((prev) => !prev)}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#7bd0ff] hover:text-white transition-colors"
            >
              <Lightbulb className="h-3.5 w-3.5" />
              <span>{showHint ? "Hide Hint" : "Hint"}</span>
            </button>
          </div>

          {showHint && currentQ.hint && (
            <div className="rounded-xl bg-[#131b2e] p-3 text-xs text-[#7bd0ff] border border-[#009bd1]/30 flex items-start gap-2 animate-fadeIn">
              <Lightbulb className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p>{currentQ.hint}</p>
            </div>
          )}

          <div className="space-y-1">
            <h2 className="text-base sm:text-lg font-semibold text-white leading-relaxed">
              {currentQ.questionText}
            </h2>
            <p className="text-xs text-slate-400">
              Analyze how room behaves inside single or multi-line containers.
            </p>
          </div>

          {/* Visual Sandbox Demonstration */}
          {currentQ.visualType === "flexbox" && (
            <div className="rounded-xl bg-[#060e20] p-4 flex flex-col space-y-2 border border-slate-800/80">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#7bd0ff]" />
                  Container: display: flex; align-items: {sandboxAlign};
                </span>
                <span className="text-[#7bd0ff]">cross-axis</span>
              </div>
              <div
                className="h-24 rounded-lg bg-[#222a3d] p-3 flex justify-around gap-2 relative overflow-hidden transition-all"
                style={{ alignItems: sandboxAlign }}
              >
                <div className="w-12 h-10 rounded bg-[#3626ce] text-[#dae2fd] flex items-center justify-center font-mono text-xs font-bold shadow-md">
                  #1
                </div>
                <div className="w-12 h-16 rounded bg-[#3626ce] text-[#dae2fd] flex items-center justify-center font-mono text-xs font-bold shadow-md">
                  #2
                </div>
                <div className="w-12 h-8 rounded bg-[#3626ce] text-[#dae2fd] flex items-center justify-center font-mono text-xs font-bold shadow-md">
                  #3
                </div>
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-dashed border-t border-slate-500/40 pointer-events-none" />
              </div>
            </div>
          )}

          {currentQ.visualType === "boxmodel" && (
            <div className="rounded-xl bg-[#060e20] p-4 flex items-center justify-center border border-slate-800/80">
              <div className="w-full max-w-sm rounded border border-dashed border-amber-500/50 p-2 text-center text-[10px] text-amber-400">
                MARGIN
                <div className="rounded border border-sky-500/60 p-2 text-sky-400">
                  BORDER
                  <div className="rounded border border-emerald-500/60 p-2 text-emerald-400">
                    PADDING
                    <div className="rounded bg-[#222a3d] p-3 font-mono font-bold text-white">
                      CONTENT BOX
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentQ.visualType === "code" && currentQ.codeSnippet && (
            <div className="rounded-xl bg-[#060e20] p-3 font-mono text-xs text-[#7bd0ff] border border-slate-800">
              <pre>{currentQ.codeSnippet}</pre>
            </div>
          )}

          {/* Interactive Options List */}
          <div
            className="flex flex-col space-y-2.5"
            role="radiogroup"
            aria-label="Quiz options"
          >
            {currentQ.options.map((optText, idx) => {
              const letter = String.fromCharCode(65 + idx); // A, B, C, D
              const isSelected = selectedOption === optText;
              const hasChecked = isSubmitted && latestHistory;
              const isThisCorrect =
                hasChecked &&
                optText.trim().toLowerCase() ===
                  latestHistory?.correctAnswer.trim().toLowerCase();
              const isMissedPick = hasChecked && isSelected && !latestHistory?.correct;

              let cardBg = "bg-[#131b2e] hover:bg-[#222a3d] border-transparent";
              if (isSelected && !hasChecked) {
                cardBg = "bg-[#222a3d] border-[#8083ff]/60 shadow-md";
              }
              if (hasChecked) {
                if (isThisCorrect) {
                  cardBg = "bg-[#009bd1]/20 border-[#7bd0ff]/60 shadow-md";
                } else if (isMissedPick) {
                  cardBg = "bg-rose-950/30 border-rose-500/60 shadow-md";
                }
              }

              return (
                <button
                  type="button"
                  key={optText}
                  disabled={isSubmitted}
                  onClick={() => setSelectedOption(optText)}
                  className={`flex w-full items-start rounded-xl p-3.5 text-left transition-all border ${cardBg}`}
                >
                  <div className="mr-3 flex h-6 items-center">
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-full transition-all ${
                        isSelected
                          ? "bg-[#8083ff] text-[#0d0096]"
                          : "bg-[#2d3449] text-transparent"
                      }`}
                    >
                      <span className="h-2 w-2 rounded-full bg-current" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase text-slate-400">
                        Option {letter}
                      </span>
                      {hasChecked && isThisCorrect && (
                        <span className="inline-flex items-center gap-1 rounded bg-[#009bd1] px-2 py-0.5 text-[10px] font-semibold text-[#002d40]">
                          <CheckCircle2 className="h-3 w-3" /> Correct Key
                        </span>
                      )}
                      {hasChecked && isMissedPick && (
                        <span className="inline-flex items-center gap-1 rounded bg-rose-900 px-2 py-0.5 text-[10px] font-semibold text-rose-200">
                          <XCircle className="h-3 w-3" /> Missed
                        </span>
                      )}
                    </div>
                    <p className="mt-1 font-mono text-sm font-medium text-white">
                      {optText}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 4. Diagnostics & Deep Feedback Panel (Visible after Check) */}
        {isSubmitted && latestHistory && (
          <section
            ref={diagnosisRef}
            className="rounded-2xl bg-[#131b2e] p-5 shadow-xl border border-slate-800 space-y-4 animate-fadeIn"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#222a3d] text-[#7bd0ff]">
                  <Flame className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Question Analysis & Concept Feedback
                  </h3>
                  <p className="text-[11px] font-mono text-slate-400">
                    Real-time adaptive learning engine
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded bg-[#222a3d] px-2.5 py-1 text-[11px] font-mono font-medium text-[#7bd0ff]">
                Live Telemetry
              </span>
            </div>

            {/* Diagnostic Cards Breakdown */}
            <div className="space-y-2">
              <div className="rounded-xl bg-[#171f33] p-3.5 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      latestHistory.correct ? "bg-emerald-400" : "bg-rose-400"
                    }`}
                  />
                  <div>
                    <p className="text-sm font-semibold text-white truncate">
                      {currentConcept?.name ?? "Target Concept"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {latestHistory.correct
                        ? "Mastery promoted via adaptive update"
                        : "Identified gap: Needs reinforcement"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-mono text-sm font-bold ${
                      latestHistory.correct ? "text-[#7bd0ff]" : "text-rose-400"
                    }`}
                  >
                    {latestHistory.newMastery}%
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {latestHistory.correct
                      ? `+${latestHistory.newMastery - latestHistory.oldMastery}%`
                      : `${latestHistory.newMastery - latestHistory.oldMastery}%`}
                  </p>
                </div>
              </div>

              {/* Identified explanation */}
              <div className="rounded-xl bg-[#171f33] p-3.5 border border-slate-800 text-xs text-slate-300 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-white">
                  <Zap className="h-4 w-4 text-amber-400" />
                  <span>Concept Diagnosis & Feedback</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  {currentQ.explanation ??
                    (latestHistory.correct
                      ? "Great work! You correctly identified the target property according to standard layout specifications."
                      : `The correct answer was: ${latestHistory.correctAnswer}. Aligning along the cross axis uses align-items, whereas main-axis alignment uses justify-content.`)}
                </p>
                <p className="pt-1 font-mono text-[10px] text-slate-400">
                  Engine formula: mastery_new = mastery + k * (outcome - mastery) * weight
                </p>
              </div>
            </div>

            {/* Remedial Recommendation */}
            <div className="rounded-xl bg-[#3626ce]/30 p-4 border border-[#3626ce]/50 text-xs text-slate-200 flex items-start gap-3">
              <Terminal className="h-5 w-5 text-[#7bd0ff] flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-white">Recommended Adaptive Action</h4>
                <p className="mt-1 text-slate-300">
                  {latestHistory.correct
                    ? "Advance to higher tier challenges or continue to the next diagnostic question."
                    : "Launch a 5-minute interactive sandbox to visually manipulate align-items vs justify-content."}
                </p>

                {currentQ.visualType === "flexbox" && (
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSandboxAlign("center")}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#060e20] px-3 py-1.5 font-mono text-xs font-semibold text-[#7bd0ff] hover:bg-[#171f33] border border-slate-700 transition"
                    >
                      <Terminal className="h-3.5 w-3.5" />
                      Try align-items: center
                    </button>
                    <button
                      type="button"
                      onClick={() => setSandboxAlign("flex-start")}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#060e20] px-3 py-1.5 font-mono text-xs font-semibold text-slate-300 hover:bg-[#171f33] border border-slate-700 transition"
                    >
                      Try align-items: flex-start
                    </button>
                    <button
                      type="button"
                      onClick={() => setSandboxAlign("flex-end")}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#060e20] px-3 py-1.5 font-mono text-xs font-semibold text-slate-300 hover:bg-[#171f33] border border-slate-700 transition"
                    >
                      Try align-items: flex-end
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* 5. Sticky Bottom Controls Deck */}
      <footer className="fixed bottom-0 inset-x-0 z-40 bg-[#060e20]/90 backdrop-blur-xl border-t border-slate-800/80 p-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <button
            type="button"
            aria-label="Flag question for review"
            onClick={() => setIsFlagged((prev) => !prev)}
            className={`flex h-11 items-center gap-1.5 rounded-xl px-4 text-xs font-medium transition-all ${
              isFlagged
                ? "bg-rose-950/80 text-rose-300 border border-rose-700/60"
                : "bg-[#222a3d] text-slate-300 hover:bg-[#2d3449]"
            }`}
          >
            <Radio className={`h-4 w-4 ${isFlagged ? "text-rose-400" : ""}`} />
            <span>{isFlagged ? "Flagged" : "Flag"}</span>
          </button>

          <div className="flex items-center gap-2">
            {!isSubmitted ? (
              <button
                type="button"
                disabled={!selectedOption || isSubmitting}
                onClick={handleCheckAnswer}
                className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#8083ff] px-6 text-sm font-semibold text-[#0d0096] shadow-md hover:bg-[#c0c1ff] active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all"
              >
                {isSubmitting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                <span>Check</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#7bd0ff] px-6 text-sm font-semibold text-[#00354a] shadow-md hover:bg-[#c4e7ff] active:scale-95 transition-all"
              >
                <span>{currentIndex < questions.length - 1 ? "Next" : "Finish"}</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
