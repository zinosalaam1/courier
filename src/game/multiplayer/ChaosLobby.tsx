import { useEffect, useState } from "react";
import { useGameStore } from "../store/gameStore";
import { MultiplayerClient } from "./MultiplayerClient";
import { ChaosScene } from "./ChaosScene";
import { ChaosHUD } from "./ChaosHUD";

type Status = "connecting" | "connected" | "failed" | "not_configured";

export function ChaosLobby() {
  const setScreen = useGameStore((s) => s.setScreen);
  const [status, setStatus] = useState<Status>("connecting");

  useEffect(() => {
    if (!MultiplayerClient.isConfigured()) { setStatus("not_configured"); return; }
    let cancelled = false;
    MultiplayerClient.connect("bicycle", "standard").then((ok) => {
      if (!cancelled) setStatus(ok ? "connected" : "failed");
    });
    return () => {
      cancelled = true;
      MultiplayerClient.disconnect();
    };
  }, []);

  if (status === "connected") {
    return (
      <>
        <ChaosScene />
        <ChaosHUD />
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-[#07090cea] px-6">
      <div className="w-full max-w-[520px] border border-[#c8f13524] bg-[#0d1117] p-8 text-center">
        <h2 className="mb-3 font-['Chakra_Petch'] text-2xl font-bold uppercase text-[#ff3b3b]">20-Player Chaos Mode</h2>
        {status === "connecting" && <p className="text-[13px] text-[#7a8694]">Connecting to the chaos server…</p>}
        {status === "not_configured" && (
          <p className="text-[13px] leading-relaxed text-[#7a8694]">
            No chaos server is configured. Deploy <code className="text-[#c8f135]">server/</code> (see its README)
            and set <code className="text-[#c8f135]">VITE_CHAOS_SERVER_URL</code> in this app's <code className="text-[#c8f135]">.env.local</code>
            to a <code className="text-[#c8f135]">wss://</code> URL pointing at it.
          </p>
        )}
        {status === "failed" && <p className="text-[13px] text-[#ff3b3b]">Could not reach the chaos server. Is it running?</p>}
        <button
          className="mt-5 border border-[#c8f13524] px-5 py-3 font-['Chakra_Petch'] text-xs font-bold uppercase tracking-widest hover:border-[#c8f135] hover:text-[#c8f135]"
          onClick={() => setScreen("menu")}
        >
          Back to Menu
        </button>
      </div>
    </div>
  );
}
