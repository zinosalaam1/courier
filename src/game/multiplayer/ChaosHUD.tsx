import { useEffect, useState } from "react";
import { useGameStore } from "../store/gameStore";
import { MultiplayerClient, type ChaosSnapshot } from "./MultiplayerClient";

const ACTION_LABELS: Record<string, string> = {
  block_road: "Block Road",
  cause_traffic: "Cause Traffic",
  trigger_event: "Trigger Event",
  deploy_emp: "Deploy EMP",
  drop_smoke: "Drop Smoke",
};

export function ChaosHUD() {
  const setScreen = useGameStore((s) => s.setScreen);
  const pushToast = useGameStore((s) => s.pushToast);
  const [snapshot, setSnapshot] = useState<ChaosSnapshot | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  useEffect(() => MultiplayerClient.onSnapshot(setSnapshot), []);
  useEffect(() => MultiplayerClient.onRejection((info) => {
    pushToast(info.reason === "cooldown"
      ? `${ACTION_LABELS[info.action] ?? info.action} on cooldown (${Math.ceil((info.retryInMs ?? 0) / 1000)}s).`
      : `${ACTION_LABELS[info.action] ?? info.action} isn't implemented on this server yet.`);
  }), [pushToast]);

  if (!snapshot) return null;
  const me = snapshot.players.find((p) => p.sessionId === MultiplayerClient.sessionId);
  const rivals = snapshot.players.filter((p) => p.sessionId !== MultiplayerClient.sessionId);

  return (
    <div className="pointer-events-none fixed inset-0 z-10 font-mono text-[#edf0f4]">
      <div className="flex items-start justify-between p-5">
        <div className="border border-[#ff3b3b40] bg-[#07090cb8] px-4 py-3">
          <div className="mb-1 text-[9px] uppercase tracking-[0.2em] text-[#ff3b3b]">20-Player Chaos Mode</div>
          <div className="text-[11px] text-[#edf0f4e6]">
            {snapshot.players.length} courier{snapshot.players.length === 1 ? "" : "s"} in the city
            {snapshot.activeEventId && <> · event: <span className="text-[#ff3b3b]">{snapshot.activeEventId}</span></>}
          </div>
        </div>
        <button
          className="pointer-events-auto border border-[#c8f13540] bg-[#07090cb8] px-3 py-2 text-[10px] uppercase tracking-wider text-[#7a8694] hover:text-[#c8f135]"
          onClick={() => { MultiplayerClient.disconnect(); setScreen("menu"); }}
        >
          Leave Chaos Mode
        </button>
      </div>

      {me && (
        <div className="absolute left-5 top-24 w-[220px] border border-[#c8f13524] bg-[#07090cb8] p-3">
          <div className="mb-1.5 text-[9px] uppercase tracking-[0.2em] text-[#7a8694]">Rival Couriers</div>
          <div className="max-h-[220px] space-y-1 overflow-y-auto pointer-events-auto">
            {rivals.length === 0 && <div className="text-[11px] text-[#7a8694]">Nobody else here yet.</div>}
            {rivals.map((r) => (
              <button
                key={r.sessionId}
                onClick={() => setSelectedTarget(r.sessionId)}
                className={`block w-full truncate border px-2 py-1 text-left text-[11px] ${selectedTarget === r.sessionId ? "border-[#ff3b3b] text-[#ff3b3b]" : "border-transparent text-[#edf0f4]"}`}
              >
                {r.callsign}{r.empDisabled ? " ⚡" : ""}{r.smoked ? " 💨" : ""}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="pointer-events-auto absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2">
        {Object.entries(ACTION_LABELS).map(([action, label]) => (
          <button
            key={action}
            className="border border-[#ff3b3b40] bg-[#07090cd9] px-3 py-2 text-[10px] uppercase tracking-wider text-[#edf0f4] hover:border-[#ff3b3b] hover:text-[#ff3b3b]"
            onClick={() => {
              if (!me) return;
              MultiplayerClient.sendInterfere(action, me.x, me.z, action === "deploy_emp" ? selectedTarget ?? undefined : undefined);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="absolute bottom-5 left-5 text-[10px] uppercase tracking-wider text-[#7a8694]">
        W/S move · A/D turn · SPACE jump · select a rival, then Deploy EMP
      </div>
    </div>
  );
}
