import { useEffect, useState } from "react";
import { useGameStore } from "../store/gameStore";
import { Auth } from "../backend/backend";
import { Link } from "react-router";

export function MainMenu() {
  const setScreen = useGameStore((s) => s.setScreen);
  const pushToast = useGameStore((s) => s.pushToast);
  const [, forceUpdate] = useState(0);
  const profile = Auth.getProfile();

  useEffect(() => { forceUpdate((n) => n + 1); }, []);

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-[#07090cea] px-6">
      <div className="w-full max-w-[760px] border border-[#c8f13524] bg-[#0d1117] p-8">
        <div className="mb-3.5 flex items-center gap-2.5">
          <div className="h-px w-[22px] bg-[#c8f135]" />
          <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#c8f135]">Courier Zero · Tour Arcade</span>
        </div>
        <h1 className="mb-1.5 font-['Chakra_Petch'] text-[42px] font-bold uppercase leading-none">
          DO NOT LOSE<br /><span className="text-[#c8f135]">THE PACKAGE.</span>
        </h1>
        <p className="mb-[18px] text-[13px] leading-relaxed text-[#7a8694]">
          Every player is a courier working for an anonymous organization. Your mission seems simple: deliver a package
          from Point A to Point B. The world does not stay still while you do it.
        </p>
        {profile && (
          <div className="mb-3 border-l-2 border-[#c8f135] bg-[#c8f1350d] px-2.5 py-2 font-mono text-[11px]">
            Signed in as {profile.callsign} · {profile.credits} credits · {profile.reputation} reputation
          </div>
        )}
        <div className="flex flex-wrap gap-2.5">
          <button
            className="bg-[#c8f135] px-5 py-3 font-['Chakra_Petch'] text-xs font-bold uppercase tracking-widest text-[#07090c] hover:opacity-90"
            onClick={() => setScreen("contract")}
          >
            Play as Guest
          </button>
          <button
            className="border border-[#c8f13524] px-5 py-3 font-['Chakra_Petch'] text-xs font-bold uppercase tracking-widest hover:border-[#c8f135] hover:text-[#c8f135]"
            onClick={() => setScreen("auth")}
          >
            Sign In / Sign Up
          </button>
          <button
            className="border border-[#c8f13524] px-5 py-3 font-['Chakra_Petch'] text-xs font-bold uppercase tracking-widest hover:border-[#c8f135] hover:text-[#c8f135]"
            onClick={() => setScreen("character")}
          >
            Choose Courier
          </button>
          <button
            className="border border-[#c8f13524] px-5 py-3 font-['Chakra_Petch'] text-xs font-bold uppercase tracking-widest hover:border-[#c8f135] hover:text-[#c8f135]"
            onClick={() => setScreen("leaderboard")}
          >
            Community Records
          </button>
          <button
            className="border border-[#ff3b3b40] px-5 py-3 font-['Chakra_Petch'] text-xs font-bold uppercase tracking-widest text-[#ff3b3b] hover:opacity-80"
            onClick={() => setScreen("chaos")}
          >
            20-Player Chaos Mode
          </button>
          {profile && (
            <button
              className="border border-[#ff3b3b] px-5 py-3 font-['Chakra_Petch'] text-xs font-bold uppercase tracking-widest text-[#ff3b3b] hover:opacity-80"
              onClick={() => { Auth.signOut(); forceUpdate((n) => n + 1); pushToast("Signed out."); }}
            >
              Sign Out
            </button>
          )}
          <Link
            to="/"
            className="inline-flex items-center border border-[#c8f13524] px-5 py-3 font-['Chakra_Petch'] text-xs font-bold uppercase tracking-widest hover:border-[#c8f135] hover:text-[#c8f135]"
          >
            ← Back to Site
          </Link>
        </div>
      </div>
    </div>
  );
}
