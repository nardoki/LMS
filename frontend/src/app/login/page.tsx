"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  BookOpen,
  ShieldCheck,
  Sparkles,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Zap,
  Award,
  GraduationCap,
  Network,
  Activity,
  FileCheck2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { extractRoleFromUser, getRoleHomePath } from "@/lib/roles";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("masterylms_saved_email") || "";
      } catch {
        return "";
      }
    }
    return "";
  });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [portalMode, setPortalMode] = useState<"student" | "staff">("student");
  const [activeShowcaseTab, setActiveShowcaseTab] = useState<"graph" | "diagnostics" | "certificate">("graph");

  const isValidEmail = email.length > 3 && email.includes("@") && email.includes(".");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (rememberMe) {
        try {
          localStorage.setItem("masterylms_saved_email", email);
        } catch {
          // ignore local storage restriction
        }
      }

      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError || !data.user) {
        setError(signInError?.message ?? "Unable to sign in. Please verify your email and password.");
        return;
      }

      const role = extractRoleFromUser(data.user);
      router.push(getRoleHomePath(role));
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected authentication error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      {/* Mobile Top Branded Banner */}
      <header className="lg:hidden bg-slate-900 text-white px-5 sm:px-8 py-5 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight leading-tight">MasteryLMS</h1>
              <p className="text-xs text-indigo-300 font-medium">Adaptive Concept Engine</p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-slate-800 text-indigo-300 text-xs border border-slate-700">
            v2.0
          </Badge>
        </div>

        {/* Mobile Interactive Pillars Strip */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-800 text-center">
          <div className="bg-slate-800/80 rounded-lg p-2">
            <Network className="h-3.5 w-3.5 text-indigo-400 mx-auto mb-1" />
            <div className="text-[11px] font-semibold text-white">Knowledge Graph</div>
            <div className="text-[9px] text-slate-400">BKT Algorithm</div>
          </div>
          <div className="bg-slate-800/80 rounded-lg p-2">
            <Zap className="h-3.5 w-3.5 text-amber-400 mx-auto mb-1" />
            <div className="text-[11px] font-semibold text-white">Diagnostics</div>
            <div className="text-[9px] text-slate-400">Adaptive Quizzes</div>
          </div>
          <div className="bg-slate-800/80 rounded-lg p-2">
            <Award className="h-3.5 w-3.5 text-emerald-400 mx-auto mb-1" />
            <div className="text-[11px] font-semibold text-white">Certificates</div>
            <div className="text-[9px] text-slate-400">SHA-256 Verified</div>
          </div>
        </div>
      </header>

      {/* Main Responsive Split Grid */}
      <div className="w-full flex-1 flex flex-col lg:grid lg:grid-cols-12 min-h-[calc(100vh-65px)] lg:min-h-screen">
        {/* Left Column: Rich Interactive Learning Showcase (Desktop Only, 6 Cols) */}
        <aside className="hidden lg:flex lg:col-span-6 xl:col-span-6 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-8 xl:p-14 flex-col justify-between relative overflow-hidden">
          {/* Ambient Lighting Spheres */}
          <div className="absolute -top-24 -left-24 w-[30rem] h-[30rem] bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-[30rem] h-[30rem] bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

          {/* Top Branding Section */}
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/40">
                <BookOpen className="h-7 w-7" />
              </div>
              <div>
                <span className="text-2xl font-black tracking-tight text-white block">
                  MasteryLMS
                </span>
                <span className="text-xs font-semibold text-indigo-300 uppercase tracking-widest">
                  Adaptive Concept Mastery Platform
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Empowering learners through real-time knowledge graphs.
              </h2>
              <p className="text-slate-300 text-sm xl:text-base leading-relaxed">
                Experience next-generation mastery education with Bayesian Knowledge Tracing, automated
                remedial diagnostics, and tamper-proof cryptographic credentials.
              </p>
            </div>

            {/* Interactive Showcase Card Switcher */}
            <div className="pt-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
                <span>Interactive Learning Preview</span>
                <span className="text-indigo-400 normal-case font-normal">Click tabs to explore</span>
              </div>

              {/* Segmented Controls */}
              <div className="flex gap-1.5 p-1 bg-slate-900/90 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveShowcaseTab("graph")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                    activeShowcaseTab === "graph"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Network className="h-3.5 w-3.5" />
                  Knowledge Graph
                </button>
                <button
                  type="button"
                  onClick={() => setActiveShowcaseTab("diagnostics")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                    activeShowcaseTab === "diagnostics"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Activity className="h-3.5 w-3.5" />
                  Adaptive Quiz
                </button>
                <button
                  type="button"
                  onClick={() => setActiveShowcaseTab("certificate")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                    activeShowcaseTab === "certificate"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <FileCheck2 className="h-3.5 w-3.5" />
                  Proof of Skill
                </button>
              </div>

              {/* Interactive Showcase Content Panels */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-md p-4 xl:p-5 transition-all">
                {activeShowcaseTab === "graph" && (
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">Prerequisite Concept Sequence</span>
                      <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Live DAG Synced
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {/* Node 1 */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs">
                            01
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-white">HTML Semantic Structure</div>
                            <div className="text-[11px] text-slate-400">Prerequisite Met • Score: 98%</div>
                          </div>
                        </div>
                        <Badge variant="success" className="text-[10px]">Mastered</Badge>
                      </div>

                      {/* Connecting Line */}
                      <div className="flex justify-center -my-1 text-slate-600 font-mono text-xs">↓</div>

                      {/* Node 2 */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-950/60 border border-indigo-700/50">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 font-bold text-xs">
                            02
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-white">CSS Flexbox & Layout</div>
                            <div className="text-[11px] text-indigo-300">Target: 80% • Current: 74%</div>
                          </div>
                        </div>
                        <Badge variant="warning" className="text-[10px]">In Progress</Badge>
                      </div>

                      {/* Connecting Line */}
                      <div className="flex justify-center -my-1 text-slate-600 font-mono text-xs">↓</div>

                      {/* Node 3 */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-500 font-bold text-xs">
                            03
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-slate-400">DOM Async Event Handlers</div>
                            <div className="text-[11px] text-slate-500">Unlocks upon Flexbox Mastery</div>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-[10px] text-slate-400 bg-slate-800">Locked</Badge>
                      </div>
                    </div>
                  </div>
                )}

                {activeShowcaseTab === "diagnostics" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">Adaptive Misconception Diagnostic</span>
                      <span className="text-[11px] text-indigo-400 font-mono">Bloom: Application</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-800/90 border border-slate-700 space-y-2">
                      <div className="text-xs font-medium text-slate-200">
                        &quot;Why does a child item with <code className="text-indigo-300">flex: 1</code> stretch in a column container?&quot;
                      </div>
                      <div className="space-y-1.5 pt-1 text-[11px]">
                        <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 flex items-center justify-between">
                          <span>✓ Main axis is vertical; space distributes along height</span>
                          <span className="text-[10px] font-bold uppercase">Correct</span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50 text-slate-400">
                          Cross axis stretch automatically overrides column width
                        </div>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      Incorrect selections trigger targeted micro-lessons to remediate specific conceptual blind spots instantly.
                    </p>
                  </div>
                )}

                {activeShowcaseTab === "certificate" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">Verifiable Cryptographic Proof</span>
                      <span className="text-[11px] text-emerald-400 font-mono">SHA-256 Verified</span>
                    </div>

                    <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-700/60 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          Certificate of Mastery
                        </span>
                        <Badge variant="success" className="text-[10px]">Active</Badge>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-indigo-300">Intro to Web Development</div>
                        <div className="text-xs text-slate-300">Awarded to: Alice Johnson</div>
                      </div>
                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span>Code: MLMS-2026-ALICE-WEBDEV</span>
                        <span className="text-emerald-400">Publicly Verifiable</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Live System Status & KPI Strip */}
          <div className="relative z-10 pt-6 border-t border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-300 font-medium">API Gateway & Supabase Connected</span>
              </div>
              <span className="text-slate-500 font-mono">Port 3000 / 3001</span>
            </div>

            <div className="grid grid-cols-4 gap-2 bg-slate-900/90 rounded-xl p-3 border border-slate-800 text-center">
              <div>
                <div className="text-sm font-bold text-white">100%</div>
                <div className="text-[9px] text-slate-400 uppercase">Auto Grading</div>
              </div>
              <div className="border-l border-slate-800">
                <div className="text-sm font-bold text-indigo-400">BKT</div>
                <div className="text-[9px] text-slate-400 uppercase">Knowledge Graph</div>
              </div>
              <div className="border-l border-slate-800">
                <div className="text-sm font-bold text-amber-400">DAG</div>
                <div className="text-[9px] text-slate-400 uppercase">Prerequisites</div>
              </div>
              <div className="border-l border-slate-800">
                <div className="text-sm font-bold text-emerald-400">RBAC</div>
                <div className="text-[9px] text-slate-400 uppercase">Role Governed</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Column: Spacious, Ergonomic Authentication Hub (6 Cols on Desktop) */}
        <main className="flex-1 lg:col-span-6 xl:col-span-6 flex flex-col justify-center px-6 sm:px-10 md:px-14 lg:px-12 xl:px-20 py-10 lg:py-16 bg-white">
          <div className="w-full max-w-xl mx-auto space-y-7">
            {/* Header Section */}
            <div className="space-y-3 text-left">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Secure Sign-In
                </div>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Sign in to your account
              </h2>

              {/* Portal Audience Mode Selector */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-medium text-slate-600">
                <button
                  type="button"
                  onClick={() => setPortalMode("student")}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-all ${
                    portalMode === "student"
                      ? "bg-white text-slate-900 shadow-sm font-semibold"
                      : "hover:text-slate-900 hover:bg-slate-200/60"
                  }`}
                >
                  <GraduationCap className="h-4 w-4 text-indigo-600" />
                  Student Portal
                </button>
                <button
                  type="button"
                  onClick={() => setPortalMode("staff")}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-all ${
                    portalMode === "staff"
                      ? "bg-white text-slate-900 shadow-sm font-semibold"
                      : "hover:text-slate-900 hover:bg-slate-200/60"
                  }`}
                >
                  <Sparkles className="h-4 w-4 text-amber-600" />
                  Instructor & Admin
                </button>
              </div>

              <p className="text-sm text-slate-500 leading-normal">
                {portalMode === "student"
                  ? "Access your enrolled courses, diagnostic concept quizzes, and verifiable certificates."
                  : "Manage course builder modules, review grading queues, or configure RBAC permissions."}
              </p>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Sign in failed</p>
                  <p className="text-xs text-red-700 mt-0.5">{error}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="text-red-500 hover:text-red-700 text-xs font-semibold"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                    Email address
                  </Label>
                  {isValidEmail && (
                    <span className="text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Valid format
                    </span>
                  )}
                </div>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={portalMode === "student" ? "student@masterylms.dev" : "instructor@masterylms.dev"}
                    className="pl-10 h-12 text-sm bg-white border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-xl"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                    Password
                  </Label>
                </div>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pl-10 pr-11 h-12 text-sm bg-white border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-slate-600 font-medium">Remember my email</span>
                </label>
              </div>

              {/* Submit CTA */}
              <Button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full h-12 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to MasteryLMS</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Footer Registration */}
            <div className="pt-4 border-t border-slate-100">
              <div className="text-center text-xs text-slate-500">
                New student joining a course?{" "}
                <Link
                  href="/register"
                  className="font-bold text-indigo-600 hover:text-indigo-800 underline underline-offset-4"
                >
                  Create a student account
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
