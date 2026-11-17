"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Award,
  CheckCircle2,
  Copy,
  GraduationCap,
  Printer,
  ShieldCheck,
} from "lucide-react";

export interface CertificateVerifyData {
  valid: boolean;
  verificationCode: string;
  studentName: string;
  courseTitle: string;
  instructorName: string;
  issuedAt: string;
  masteredConcepts: string[];
  payloadHash?: string;
  qrCodeDataUrl?: string;
}

export interface CertificateVerifyProps {
  certificate: CertificateVerifyData;
}

export function CertificateVerify({ certificate }: CertificateVerifyProps) {
  const [copied, setCopied] = useState(false);

  const formattedDate = new Date(certificate.issuedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  function handleCopy() {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handlePrint() {
    if (typeof window !== "undefined") {
      window.print();
    }
  }

  return (
    <div className="min-h-screen bg-[#060e20] text-[#dae2fd] py-10 px-4 sm:px-6">
      {/* Top Banner & Actions Deck (Hidden on Print) */}
      <div className="max-w-4xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition"
        >
          <GraduationCap className="h-4 w-4 text-[#8083ff]" />
          <span>Return to MasteryLMS</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#171f33] px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-[#222a3d] border border-slate-700/80 transition"
          >
            {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? "Link Copied!" : "Share Link"}</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#8083ff] px-4 py-2 text-xs font-semibold text-[#0d0096] hover:bg-[#c0c1ff] transition shadow-md"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Certificate</span>
          </button>
        </div>
      </div>

      {/* Official Certificate Card */}
      <div className="max-w-4xl mx-auto rounded-3xl bg-[#0b1326] p-8 sm:p-14 shadow-2xl border-4 border-[#3626ce]/50 relative overflow-hidden print:p-8 print:border-2 print:border-black print:bg-white print:text-black">
        {/* Subtle Ornamental Corners */}
        <div className="absolute top-3 left-3 w-12 h-12 border-t-2 border-l-2 border-[#8083ff]/40 pointer-events-none" />
        <div className="absolute top-3 right-3 w-12 h-12 border-t-2 border-r-2 border-[#8083ff]/40 pointer-events-none" />
        <div className="absolute bottom-3 left-3 w-12 h-12 border-b-2 border-l-2 border-[#8083ff]/40 pointer-events-none" />
        <div className="absolute bottom-3 right-3 w-12 h-12 border-b-2 border-r-2 border-[#8083ff]/40 pointer-events-none" />

        <div className="text-center space-y-6">
          {/* Header Seal */}
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-[#171f33] text-[#7bd0ff] border border-slate-700 shadow-inner">
            <Award className="h-12 w-12 text-[#8083ff]" />
          </div>

          <div className="space-y-1">
            <p className="text-xs font-mono tracking-widest uppercase text-[#7bd0ff] font-semibold">
              Mastery Learning Management System
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight uppercase">
              Certificate of Mastery
            </h1>
            <p className="text-xs font-mono text-slate-400">
              Verified Concept-Driven Competency Record
            </p>
          </div>

          {/* Recipient */}
          <div className="pt-4 space-y-1.5">
            <p className="text-xs text-slate-400 italic">This is proudly conferred upon</p>
            <h2 className="text-2xl sm:text-4xl font-serif font-bold text-white tracking-wide border-b border-slate-800 pb-3 max-w-lg mx-auto">
              {certificate.studentName}
            </h2>
            <p className="text-xs text-slate-300 pt-1">
              for demonstrating adaptive mastery and passing all diagnostic benchmarks in
            </p>
            <h3 className="text-xl sm:text-2xl font-bold text-[#c0c1ff]">
              {certificate.courseTitle}
            </h3>
          </div>

          {/* Mastered Concepts Breakdown */}
          {certificate.masteredConcepts.length > 0 && (
            <div className="py-4 max-w-xl mx-auto space-y-2">
              <p className="text-[11px] font-mono uppercase text-slate-400 font-semibold tracking-wider">
                Demonstrated Concept Competencies
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {certificate.masteredConcepts.map((concept) => (
                  <span
                    key={concept}
                    className="inline-flex items-center gap-1 rounded-full bg-[#171f33] px-3 py-1 text-xs font-mono text-[#7bd0ff] border border-slate-800 shadow-sm"
                  >
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    <span>{concept}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Signature & QR Verification Deck */}
          <div className="pt-6 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-6 items-center text-center">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">{certificate.instructorName}</p>
              <div className="h-px w-28 bg-slate-700 mx-auto my-1" />
              <p className="text-[10px] font-mono text-slate-400 uppercase">Authorized Faculty</p>
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center space-y-1">
              <div className="p-2 rounded-xl bg-white text-black shadow-md flex items-center justify-center">
                {certificate.qrCodeDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={certificate.qrCodeDataUrl}
                    alt={`Verification QR Code for ${certificate.verificationCode}`}
                    className="h-20 w-20 object-contain"
                  />
                ) : (
                  /* Clean SVG QR Code fallback */
                  <svg className="h-16 w-16" viewBox="0 0 100 100" fill="currentColor">
                    <path d="M0,0 h30 v30 h-30 z M10,10 h10 v10 h-10 z" />
                    <path d="M70,0 h30 v30 h-30 z M80,10 h10 v10 h-10 z" />
                    <path d="M0,70 h30 v30 h-30 z M10,80 h10 v10 h-10 z" />
                    <rect x="38" y="10" width="10" height="20" />
                    <rect x="52" y="10" width="10" height="10" />
                    <rect x="40" y="40" width="20" height="20" />
                    <rect x="10" y="40" width="15" height="10" />
                    <rect x="75" y="40" width="15" height="15" />
                    <rect x="40" y="70" width="10" height="20" />
                    <rect x="60" y="75" width="25" height="15" />
                  </svg>
                )}
              </div>
              <span className="text-[10px] font-mono text-slate-400">Scan to Verify</span>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">{formattedDate}</p>
              <div className="h-px w-28 bg-slate-700 mx-auto my-1" />
              <p className="text-[10px] font-mono text-slate-400 uppercase">Date of Issue</p>
            </div>
          </div>

          {/* Verification Code & Cryptographic SHA-256 Footer */}
          <div className="pt-4 border-t border-slate-800/60 space-y-2 text-[11px] font-mono text-slate-400">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck className="h-4 w-4" /> Cryptographically Verified Record
              </span>
              <span>
                Code: <strong className="text-white">{certificate.verificationCode}</strong>
              </span>
            </div>
            {certificate.payloadHash && (
              <div className="text-left text-[10px] text-slate-500 break-all bg-slate-950/50 rounded-lg p-2 border border-slate-800 font-mono">
                <span className="text-slate-400 uppercase tracking-wider font-semibold mr-1">SHA-256 Hash:</span>
                <span className="text-indigo-300">{certificate.payloadHash}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
