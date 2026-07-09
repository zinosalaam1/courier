import { useEffect, useRef, useState } from "react";
import { useGameStore } from "../store/gameStore";
import { Auth } from "../backend/backend";
import { GADGETS } from "../data/gameData";

// Must match the fixed defaults in components/worldRefs.ts (createWorldRefs) -
// these never vary by theme/package, so it's safe to mirror them here rather
// than plumb the whole WorldRefs object through to the UI layer.
const CITY_SIZE = 160;
const DESTINATION = { x: 0, z: 55 };
const START = { x: 0, z: -60 };

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60), s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function HUD() {
  const mission = useGameStore((s) => s.mission);
  const toasts = useGameStore((s) => s.toasts);
  const [, forceTick] = useState(0);

  // Timer/speed readouts need to tick even though mission state itself only
  // updates a few times a second - a small rAF-driven re-render keeps them live.
  useEffect(() => {
    let raf: number;
    const tick = () => { forceTick((n) => n + 1); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (!mission) return null;

  const rules = mission.pkg.id === "unknown" ? mission.revealedUnknown : mission.pkg;
  const displayName = mission.pkg.id === "unknown" ? "UNKNOWN" : mission.pkg.name.toUpperCase();
  const displayRule = mission.pkg.id === "unknown"
    ? (mission.revealedUnknown ? mission.revealedUnknown.rule : "Rules unknown. Stay alert.")
    : mission.pkg.rule;

  const elapsed = (performance.now() - mission.startedAt) / 1000;
  const timerValue = rules?.timeLimit ? Math.max(0, rules.timeLimit - elapsed) : elapsed;
  const profile = Auth.getProfile();

  return (
    <div className="pointer-events-none fixed inset-0 z-10 font-mono text-[#edf0f4]">
      <div className="flex items-start justify-between p-5">
        <div className="max-w-[320px] border border-[#c8f13524] bg-[#07090cb8] px-4 py-3">
          <div className="mb-1 text-[9px] uppercase tracking-[0.2em] text-[#c8f135]">{displayName} PACKAGE</div>
          <div className="text-[11px] leading-snug text-[#edf0f4e6]">{displayRule}</div>
        </div>
        <div className="flex gap-2.5">
          {[
            { v: String(Math.round((window.__tourArcadePlayerSpeed ?? 0) * 11)), l: "km/h" },
            { v: formatTime(timerValue), l: "time" },
            { v: profile ? String(profile.credits) : "GUEST", l: "credits" },
          ].map((s, i) => (
            <div key={i} className="min-w-[70px] border border-[#c8f13524] bg-[#07090cb8] px-3 py-2 text-center">
              <div className="text-base font-bold text-[#c8f135]">{s.v}</div>
              <div className="text-[8px] uppercase tracking-[0.15em] text-[#7a8694]">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute left-5 top-24 w-[260px] space-y-2">
        {rules?.id === "frozen" && <Meter label="Heat" value={mission.heat} color="#67e8f9" />}
        {rules?.id === "radioactive" && <Meter label="Radiation" value={mission.radiation} color="#c8f135" />}
        {rules?.id === "unstable" && <Meter label="Integrity" value={mission.integrity} color="#f97316" />}
        {rules?.id === "fragile" && (
          <Meter label="Integrity (fall risk)" value={100 - Math.min(100, (mission.lastImpactSpeed / (rules.fallLimit ?? 6)) * 100)} color="#60a5fa" />
        )}
      </div>

      {mission.activeEvent && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[100px] text-center">
          <div className="text-4xl text-[#ff3b3b]">{mission.activeEvent.glyph}</div>
          <div className="text-2xl font-bold uppercase tracking-wide text-[#ff3b3b]">{mission.activeEvent.name}</div>
          <div className="mt-0.5 text-[11px] text-[#7a8694]">{mission.activeEvent.desc}</div>
        </div>
      )}

      <div className="absolute bottom-5 left-5 flex flex-col gap-1.5">
        {toasts.map((t) => (
          <div key={t.id} className="max-w-[260px] border-l-2 border-[#c8f135] bg-[#07090cd9] px-2.5 py-1.5 text-[11px]">
            {t.text}
          </div>
        ))}
      </div>

      <Minimap blackedOut={mission.activeEvent?.id === "blackout"} smoked={performance.now() < mission.smokeUntil} />
      <GadgetHotbar />

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 border border-[#c8f13524] bg-[#07090c99] px-3 py-1.5 text-[10px] uppercase tracking-wider text-[#7a8694]">
        W/S move · A/D turn · SPACE jump · 1-6 gadget
      </div>
    </div>
  );
}

function Minimap({ blackedOut, smoked }: { blackedOut: boolean; smoked: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let raf: number;
    const draw = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) {
        ctx.clearRect(0, 0, 150, 150);
        if (!blackedOut) {
          ctx.fillStyle = "#0d1117";
          ctx.fillRect(0, 0, 150, 150);
          const scale = 150 / CITY_SIZE;
          const toMap = (x: number, z: number) => [75 + x * scale, 75 + z * scale];

          // Destination
          const [dx, dz] = toMap(DESTINATION.x, DESTINATION.z);
          ctx.fillStyle = "rgba(200,241,53,0.6)";
          ctx.beginPath(); ctx.arc(dx, dz, 4, 0, Math.PI * 2); ctx.fill();

          // Start
          const [sx, sz] = toMap(START.x, START.z);
          ctx.fillStyle = "rgba(122,134,148,0.5)";
          ctx.beginPath(); ctx.arc(sx, sz, 3, 0, Math.PI * 2); ctx.fill();

          // Player (hidden while smoked, same as the Smoke Device gadget's effect)
          const playerPos = window.__tourArcadePlayerPos;
          if (playerPos && !smoked) {
            const [px, pz] = toMap(playerPos.x, playerPos.z);
            ctx.fillStyle = "#edf0f4";
            ctx.beginPath(); ctx.arc(px, pz, 3, 0, Math.PI * 2); ctx.fill();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [blackedOut, smoked]);

  return (
    <div className={`absolute bottom-5 right-5 h-[150px] w-[150px] border border-[#c8f13524] ${blackedOut ? "bg-black" : "bg-[#07090cbf]"}`}>
      <canvas ref={canvasRef} width={150} height={150} className="h-full w-full" />
    </div>
  );
}

function GadgetHotbar() {
  return (
    <div className="absolute bottom-24 left-1/2 flex -translate-x-1/2 gap-1.5">
      {GADGETS.map((g) => (
        <div key={g.id} className="flex h-11 w-11 flex-col items-center justify-center border border-[#c8f13524] bg-[#07090ccc] text-center">
          <div className="text-[11px] font-bold text-[#c8f135]">{g.key}</div>
          <div className="text-[8px] leading-none text-[#7a8694]">{g.name.split(" ")[0]}</div>
        </div>
      ))}
    </div>
  );
}

function Meter({ label, value, color }: { label: string; value: number; color: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="mb-0.5 flex justify-between text-[9px] uppercase tracking-wider text-[#7a8694]">
        <span>{label}</span><span>{Math.round(clamped)}%</span>
      </div>
      <div className="h-1.5 border border-[#c8f13524] bg-white/10">
        <div className="h-full transition-[width] duration-150" style={{ width: `${clamped}%`, background: color }} />
      </div>
    </div>
  );
}
