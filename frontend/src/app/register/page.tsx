"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  BookOpen,
  GraduationCap,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Zap,
  Sparkles,
  Award,
  Network,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isValidEmail = email.length > 3 && email.includes("@") && email.includes(".");
  const isPasswordStrong = password.length >= 8;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (data.session) {
        router.push("/dashboard");
        router.refresh();
        return;
      }

      setNotice(
        "Account created! Check your email to confirm your address, then sign in.",
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      {/* Top Banner on Mobile / Tablet */}
      <header className="lg:hidden bg-slate-900 text-white px-5 sm:px-8 py-5 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight leading-tight">MasteryLMS</h1>
              <p className="text-xs text-indigo-300 font-medium">Student Registration</p>
            </div>
          </div>
          <Link
            href="/login"
            className="text-xs font-semibold text-indigo-300 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700"
          >
            Sign In
          </Link>
        </div>

        {/* Mobile Pillars Strip */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-800 text-center">
          <div className="bg-slate-800/80 rounded-lg p-2">
            <Network className="h-3.5 w-3.5 text-indigo-400 mx-auto mb-1" />
            <div className="text-[11px] font-semibold text-white">Adaptive Path</div>
            <div className="text-[9px] text-slate-400">Bayesian Graph</div>
          </div>
          <div className="bg-slate-800/80 rounded-lg p-2">
            <Zap className="h-3.5 w-3.5 text-amber-400 mx-auto mb-1" />
            <div className="text-[11px] font-semibold text-white">Diagnostics</div>
            <div className="text-[9px] text-slate-400">Instant Remediation</div>
          </div>
          <div className="bg-slate-800/80 rounded-lg p-2">
            <Award className="h-3.5 w-3.5 text-emerald-400 mx-auto mb-1" />
            <div className="text-[11px] font-semibold text-white">Certificates</div>
            <div className="text-[9px] text-slate-400">Verifiable Proof</div>
          </div>
        </div>
      </header>

      {/* Main Container - Split View on Desktop (6 cols / 6 cols) */}
      <div className="w-full flex-1 flex flex-col lg:grid lg:grid-cols-12 min-h-[calc(100vh-65px)] lg:min-h-screen">
        {/* Left Column: Rich Showcase / Feature Overview (Desktop Only, 6 Cols) */}
        <aside className="hidden lg:flex lg:col-span-6 xl:col-span-6 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-8 xl:p-14 flex-col justify-between relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-[30rem] h-[30rem] bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-[30rem] h-[30rem] bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

          {/* Top Brand Header */}
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
                  Student Enrollment Portal
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Unlock your personalized adaptive learning journey.
              </h2>
              <p className="text-slate-300 text-sm xl:text-base leading-relaxed">
                Join thousands of learners mastering web technologies and computer science fundamentals through concept-driven paths.
              </p>
            </div>

            {/* Feature Highlights Cards */}
            <div className="space-y-3.5 pt-6 border-t border-slate-800/80">
              <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-800/60">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Targeted Mastery Progression</h4>
                  <p className="text-xs text-slate-400">
                    Skip busywork. Focus directly on concepts that unlock your next level of understanding.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-800/60">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Instant Remedial Feedback</h4>
                  <p className="text-xs text-slate-400">
                    Diagnostics detect misconceptions immediately and serve targeted review exercises.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-800/60">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Earn Cryptographic Certificates</h4>
                  <p className="text-xs text-slate-400">
                    Get verifiable proof of mastery to share on LinkedIn and resume portfolios.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Live Pill */}
          <div className="relative z-10 pt-8 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Instant Account Activation • 100% Free
              </span>
              <Badge variant="secondary" className="bg-slate-800 text-indigo-300 border border-slate-700">
                Auto Enrolled
              </Badge>
            </div>
          </div>
        </aside>

        {/* Right Column: Register Form (6 Cols on Desktop) */}
        <main className="flex-1 lg:col-span-6 xl:col-span-6 flex flex-col justify-center px-6 sm:px-10 md:px-14 lg:px-12 xl:px-20 py-10 lg:py-16 bg-white">
          <div className="w-full max-w-xl mx-auto space-y-7">
            {/* Header Section */}
            <div className="space-y-3 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold">
                <Sparkles className="h-3.5 w-3.5" />
                Get Started Today
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Create your student account
              </h2>
              <p className="text-sm text-slate-500 leading-normal">
                Sign up in seconds. You will be automatically enrolled as a student with instant access to the mastery dashboard.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Sign up failed</p>
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

            {/* Success Notice */}
            {notice && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Account created!</p>
                  <p className="text-xs text-emerald-700 mt-0.5">{notice}</p>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-semibold text-slate-700">
                  Full name
                </Label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <Input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Carol Danvers"
                    className="pl-10 h-12 text-sm bg-white border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-xl"
                  />
                </div>
              </div>

              {/* Email Address */}
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
                    placeholder="carol@example.com"
                    className="pl-10 h-12 text-sm bg-white border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-xl"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                    Password (min. 8 characters)
                  </Label>
                  {isPasswordStrong && (
                    <span className="text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Strong
                    </span>
                  )}
                </div>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
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

              {/* Submit CTA */}
              <Button
                type="submit"
                disabled={loading || !name || !email || !password || password.length < 8}
                className="w-full h-12 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <span>Complete Registration</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Footer Registration Link */}
            <div className="pt-4 border-t border-slate-100">
              <div className="text-center text-xs text-slate-500">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-bold text-indigo-600 hover:text-indigo-800 underline underline-offset-4"
                >
                  Sign in to your portal
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
