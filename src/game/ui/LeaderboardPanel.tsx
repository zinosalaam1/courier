import { useEffect, useState } from "react";
import { useGameStore } from "../store/gameStore";
import { Auth, SUPABASE_CONFIGURED, type LeaderboardRow } from "../backend/backend";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60), s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function LeaderboardPanel() {
  const setScreen = useGameStore((s) => s.setScreen);
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Auth.fetchLeaderboard().then(setRows).catch((e) => setError((e as Error).message));
  }, []);

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-[#07090cea] px-6">
      <div className="relative w-full max-w-[640px] border border-[#c8f13524] bg-[#0d1117] p-8">
        <button className="absolute right-4 top-4 font-mono text-lg text-[#7a8694] hover:text-[#c8f135]" onClick={() => setScreen("menu")}>✕</button>
        <div className="mb-3.5 flex items-center gap-2.5">
          <div className="h-px w-[22px] bg-[#c8f135]" />
          <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#c8f135]">Community Records</span>
        </div>
        <h2 className="mb-5 font-['Chakra_Petch'] text-2xl font-bold uppercase">Prove You're The Best.</h2>

        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              {["#", "Courier", "Best Time", "Deliveries", "Reputation"].map((h) => (
                <th key={h} className="border-b border-[#c8f13524] px-1.5 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-[#7a8694]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {error && <tr><td colSpan={5} className="py-3 text-[#ff3b3b]">Could not load leaderboard: {error}</td></tr>}
            {!error && !rows && <tr><td colSpan={5} className="py-3 text-[#7a8694]">Loading…</td></tr>}
            {!error && rows?.length === 0 && <tr><td colSpan={5} className="py-3 text-[#7a8694]">No records yet — be the first.</td></tr>}
            {rows?.map((r, i) => (
              <tr key={r.callsign}>
                <td className="border-b border-white/5 px-1.5 py-2">{i + 1}</td>
                <td className="border-b border-white/5 px-1.5 py-2">{r.callsign}</td>
                <td className="border-b border-white/5 px-1.5 py-2">{r.best_time ? formatTime(r.best_time) : "—"}</td>
                <td className="border-b border-white/5 px-1.5 py-2">{r.deliveries}</td>
                <td className="border-b border-white/5 px-1.5 py-2">{r.reputation}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-3.5 text-[13px] text-[#7a8694]">
          {SUPABASE_CONFIGURED ? "" : "Local demo mode: scores are stored on this device only."}
        </p>
      </div>
    </div>
  );
}
