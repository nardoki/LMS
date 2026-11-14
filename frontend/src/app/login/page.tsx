"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { extractRoleFromUser, getRoleHomePath } from "@/lib/roles";
import { createClient } from "@/lib/supabase/client";

const DEMO_ACCOUNTS = [
  { label: "Alice (Student)", email: "alice@masterylms.dev" },
  { label: "Bob (Student)", email: "bob@masterylms.dev" },
  { label: "Prof. Ada (Instructor)", email: "instructor@masterylms.dev" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError || !data.user) {
        setError(signInError?.message ?? "Unable to sign in");
        return;
      }

      const role = extractRoleFromUser(data.user);
      router.push(getRoleHomePath(role));
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2 text-slate-900">
            <BookOpen className="h-5 w-5" />
            <span className="font-semibold tracking-tight">MasteryLMS</span>
          </div>
          <CardTitle>Sign in to your account</CardTitle>
          <CardDescription>
            Students go to their mastery dashboard; instructors open the course studio.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alice@masterylms.dev"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password123!"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="space-y-2 border-t border-slate-100 pt-4">
            <p className="text-xs font-medium text-slate-500">
              Quick-fill seeded demo accounts (password: <code>Password123!</code>)
            </p>
            <div className="flex flex-wrap gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <Button
                  key={acc.email}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEmail(acc.email);
                    setPassword("Password123!");
                  }}
                >
                  {acc.label}
                </Button>
              ))}
            </div>
          </div>

          <p className="text-center text-sm text-slate-600">
            New student?{" "}
            <Link href="/register" className="font-medium text-slate-900 underline">
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
