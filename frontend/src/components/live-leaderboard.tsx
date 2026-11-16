"use client";

import { useEffect, useState } from "react";
import {
  Crown,
  Flame,
  Sparkles,
  Trophy,
} from "lucide-react";

export interface LeaderboardEntry {
  rank: number;
  studentId: string;
  name: string;
  score: number;
  streak: number;
  timeSeconds: number;
  isCurrentUser?: boolean;
}

const INITIAL_LEADERBOARD: LeaderboardEntry[] = [
  {
    rank: 1,
    studentId: "22222222-2222-2222-2222-222222222222",
    name: "Alice Johnson",
    score: 950,
    streak: 5,
    timeSeconds: 42,
  },
  {
    rank: 2,
    studentId: "user-charles",
    name: "Charles Babbage",
    score: 880,
    streak: 4,
    timeSeconds: 51,
  },
  {
    rank: 3,
    studentId: "33333333-3333-3333-3333-333333333333",
    name: "Bob Smith",
    score: 810,
    streak: 3,
    timeSeconds: 58,
  },
  {
    rank: 4,
    studentId: "user-grace",
    name: "Grace Hopper",
    score: 790,
    streak: 2,
    timeSeconds: 65,
  },
  {
    rank: 5,
    studentId: "user-alan",
    name: "Alan Turing",
    score: 740,
    streak: 2,
    timeSeconds: 70,
  },
];

export function LiveLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>(INITIAL_LEADERBOARD);
  const [isLive, setIsLive] = useState(true);

  // Live simulation tick: periodically adds points to simulate streaming live quiz participants
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      setEntries((prev) => {
        const updated = prev.map((entry) => {
          // Subtle probability of score increase
          if (Math.random() > 0.6) {
            const added = Math.floor(Math.random() * 40) + 10;
            return {
              ...entry,
              score: entry.score + added,
              streak: entry.streak + (Math.random() > 0.5 ? 1 : 0),
            };
          }
          return entry;
        });

        // Re-sort by score descending
        return updated
          .sort((a, b) => b.score - a.score)
          .map((item, idx) => ({ ...item, rank: idx + 1 }));
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [isLive]);

  const top3 = entries.slice(0, 3);
  const remaining = entries.slice(3);

  return (
    <div className="rounded-2xl bg-[#171f33] p-6 shadow-xl border border-slate-800/80 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3626ce]/40 text-[#c0c1ff]">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Live Quiz Arena</span>
              {isLive && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              Real-time concept diagnostic sprint leaderboard
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsLive((l) => !l)}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-mono font-medium transition ${
            isLive
              ? "bg-emerald-950/60 text-emerald-300 border border-emerald-500/40"
              : "bg-[#222a3d] text-slate-300"
          }`}
        >
          <Sparkles className="h-3 w-3" />
          <span>{isLive ? "Live Stream Active" : "Stream Paused"}</span>
        </button>
      </div>

      {/* Top 3 Podium */}
      <div className="grid grid-cols-3 gap-3 pt-2">
        {/* 2nd Place */}
        {top3[1] && (
          <div className="flex flex-col items-center justify-end rounded-xl bg-[#131b2e] p-3 text-center border border-slate-800 order-1">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-700 text-slate-200 text-xs font-bold mb-1 shadow-sm">
              2
            </span>
            <p className="text-xs font-bold text-white truncate w-full">{top3[1].name}</p>
            <p className="font-mono text-xs font-bold text-slate-300 mt-1">{top3[1].score} pts</p>
            <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-400 font-mono mt-0.5">
              <Flame className="h-2.5 w-2.5" /> {top3[1].streak}
            </span>
          </div>
        )}

        {/* 1st Place (Winner) */}
        {top3[0] && (
          <div className="flex flex-col items-center justify-end rounded-xl bg-[#3626ce]/20 p-4 text-center border border-[#8083ff]/40 shadow-lg order-2 relative scale-105">
            <Crown className="h-5 w-5 text-amber-400 mb-1 animate-bounce" />
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-amber-950 text-xs font-extrabold mb-1 shadow-md">
              1
            </span>
            <p className="text-xs font-bold text-white truncate w-full">{top3[0].name}</p>
            <p className="font-mono text-sm font-extrabold text-[#7bd0ff] mt-1">{top3[0].score} pts</p>
            <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-400 font-mono mt-0.5">
              <Flame className="h-3 w-3" /> {top3[0].streak} streak
            </span>
          </div>
        )}

        {/* 3rd Place */}
        {top3[2] && (
          <div className="flex flex-col items-center justify-end rounded-xl bg-[#131b2e] p-3 text-center border border-slate-800 order-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-900/60 text-amber-300 text-xs font-bold mb-1 shadow-sm">
              3
            </span>
            <p className="text-xs font-bold text-white truncate w-full">{top3[2].name}</p>
            <p className="font-mono text-xs font-bold text-slate-300 mt-1">{top3[2].score} pts</p>
            <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-400 font-mono mt-0.5">
              <Flame className="h-2.5 w-2.5" /> {top3[2].streak}
            </span>
          </div>
        )}
      </div>

      {/* Remaining Participants List */}
      <div className="space-y-1.5 pt-2">
        {remaining.map((entry) => (
          <div
            key={entry.studentId}
            className="flex items-center justify-between rounded-xl bg-[#131b2e] px-3.5 py-2.5 text-xs border border-slate-800/80"
          >
            <div className="flex items-center gap-3">
              <span className="font-mono font-bold text-slate-500 w-4 text-center">
                #{entry.rank}
              </span>
              <span className="font-medium text-white">{entry.name}</span>
            </div>

            <div className="flex items-center gap-4 font-mono">
              <span className="inline-flex items-center gap-1 text-amber-400 text-[11px]">
                <Flame className="h-3 w-3" /> {entry.streak}
              </span>
              <span className="font-bold text-white">{entry.score} pts</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
