import { useEffect, useState } from "react";
import { useGameStore } from "../store/gameStore";
import { Auth, type LeaderboardRow } from "../backend/backend";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60), s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function EndScreen() {
  const result = useGameStore((s) => s.lastResult);
  const setScreen = useGameStore((s) => s.setScreen);
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);

  useEffect(() => {
    if (result?.success) Auth.fetchLeaderboard().then(setRows).catch(() => setRows([]));
  }, [result]);

  if (!result) return null;

  const profile = Auth.getProfile();
  const sorted = rows ? [...rows].sort((a, b) => b.reputation - a.reputation) : null;
  const myRank = sorted && profile ? sorted.findIndex((r) => r.callsign === profile.callsign) + 1 : 0;
  const topThree = sorted?.slice(0, 3) ?? [];

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-[#07090cea] px-6">
      <div className="w-full max-w-[520px] border border-[#c8f13524] bg-[#0d1117] p-8 text-center">
        <div className="mb-3.5 flex items-center justify-center gap-2.5">
          <div className="h-px w-[22px] bg-[#c8f135]" />
          <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#c8f135]">
            Mission Report · {result.success ? "Success" : "Failed"}
          </span>
          <div className="h-px w-[22px] bg-[#c8f135]" />
        </div>
        <h1 className="mb-2 font-['Chakra_Petch'] text-4xl font-bold uppercase" style={{ color: result.success ? "#c8f135" : "#ff3b3b" }}>
          {result.success ? "DELIVERED." : "PACKAGE LOST."}
        </h1>
        <p className="mb-5 text-[13px] text-[#7a8694]">{result.reason}</p>
        <div className="mb-5 flex justify-center gap-3">
          {[
            { v: formatTime(result.time), l: "TIME" },
            { v: `+${result.credits}`, l: "CREDITS" },
            { v: `+${result.reputation}`, l: "REPUTATION" },
          ].map((s, i) => (
            <div key={i} className="border border-[#c8f13524] bg-[#0d1117] px-[18px] py-3">
              <div className="text-xl font-bold text-[#c8f135]">{s.v}</div>
              <div className="text-[9px] uppercase tracking-wider text-[#7a8694]">{s.l}</div>
            </div>
          ))}
        </div>

        {result.success && (
          <div className="mb-5 border border-[#c8f13524] bg-[#c8f1350a] p-4 text-left">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#7a8694]">
              {rows === null ? "Checking the leaderboard…" : myRank > 0 ? `You're ranked #${myRank}` : "Community Records"}
            </div>
            <div className="space-y-1">
              {topThree.map((r, i) => (
                <div key={r.callsign} className="flex justify-between font-mono text-[12px]" style={{ color: profile?.callsign === r.callsign ? "#c8f135" : "#edf0f4" }}>
                  <span>#{i + 1} {r.callsign}</span>
                  <span className="text-[#7a8694]">{r.reputation} rep</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-2.5">
          <button
            className="bg-[#c8f135] px-5 py-3 font-['Chakra_Petch'] text-xs font-bold uppercase tracking-widest text-[#07090c] hover:opacity-90"
            onClick={() => setScreen("contract")}
          >
            New Contract
          </button>
          <button
            className="border border-[#c8f13524] px-5 py-3 font-['Chakra_Petch'] text-xs font-bold uppercase tracking-widest hover:border-[#c8f135] hover:text-[#c8f135]"
            onClick={() => setScreen("leaderboard")}
          >
            Full Leaderboard
          </button>
          <button
            className="border border-[#c8f13524] px-5 py-3 font-['Chakra_Petch'] text-xs font-bold uppercase tracking-widest hover:border-[#c8f135] hover:text-[#c8f135]"
            onClick={() => setScreen("menu")}
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}
