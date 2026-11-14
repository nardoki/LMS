"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { gatewayFetch } from "@/lib/api";

export function GatewayRbacTester() {
  const [result, setResult] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function callEndpoint(path: string) {
    setResult("Calling Gateway...");
    setIsError(false);
    try {
      const data = await gatewayFetch<unknown>(path);
      setResult(JSON.stringify(data, null, 2));
    } catch (err) {
      setIsError(true);
      setResult(err instanceof Error ? err.message : "Request failed");
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-slate-700" />
          <CardTitle>Gateway JWT & RBAC Verification</CardTitle>
        </div>
        <CardDescription>
          Calls the NestJS API Gateway with your Supabase Bearer JWT (`app_metadata.role`).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => callEndpoint("/auth/me")}>
            GET /auth/me
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => callEndpoint("/auth/student-area")}
          >
            GET /auth/student-area
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => callEndpoint("/auth/instructor-area")}
          >
            GET /auth/instructor-area (403 for students)
          </Button>
        </div>

        {result && (
          <pre
            className={`overflow-x-auto rounded-lg p-3 text-xs ${
              isError
                ? "bg-red-50 text-red-800"
                : "bg-slate-900 text-slate-100"
            }`}
          >
            {result}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
