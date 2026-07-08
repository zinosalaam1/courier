import { useEffect, useState, type ReactNode } from "react";
import { useGameStore, PACKAGES, VEHICLES, WEEKLY } from "../store/gameStore";
import { Auth } from "../backend/backend";
import type { PackageDef, VehicleDef, WeeklyThemeDef } from "../data/gameData";

const GUEST_UNLOCKED = VEHICLES.map((v) => v.id);

export function ContractBoard() {
  const startMission = useGameStore((s) => s.startMission);
  const setScreen = useGameStore((s) => s.setScreen);
  const pushToast = useGameStore((s) => s.pushToast);
  const deepLink = useGameStore((s) => s.deepLink);
  const setDeepLink = useGameStore((s) => s.setDeepLink);

  const profile = Auth.getProfile();
  const unlocked = profile?.unlocked ?? GUEST_UNLOCKED;

  const [pkg, setPkg] = useState<PackageDef>(() => PACKAGES.find((p) => p.id === deepLink.packageId) ?? PACKAGES[0]);
  const [vehicle, setVehicle] = useState<VehicleDef>(() => {
    const dl = VEHICLES.find((v) => v.id === deepLink.vehicleId);
    if (dl && unlocked.includes(dl.id)) return dl;
    return VEHICLES.find((v) => unlocked.includes(v.id)) ?? VEHICLES[0];
  });
  const [theme, setTheme] = useState<WeeklyThemeDef | null>(() => WEEKLY.find((t) => t.id === deepLink.themeId) ?? null);

  useEffect(() => {
    if (deepLink.packageId || deepLink.vehicleId || deepLink.themeId) {
      if (deepLink.vehicleId && !unlocked.includes(deepLink.vehicleId)) {
        pushToast(`${VEHICLES.find((v) => v.id === deepLink.vehicleId)?.name ?? "That vehicle"} isn't unlocked yet — earn more reputation.`);
      }
      pushToast("Contract pre-loaded from the briefing file.");
      setDeepLink({ packageId: null, vehicleId: null, themeId: null }); // consume once
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-[#07090cea] px-6">
      <div className="relative max-h-[88vh] w-full max-w-[900px] overflow-y-auto border border-[#c8f13524] bg-[#0d1117] p-8">
        <button className="absolute right-4 top-4 font-mono text-lg text-[#7a8694] hover:text-[#c8f135]" onClick={() => setScreen("menu")}>✕</button>
        <div className="mb-3.5 flex items-center gap-2.5">
          <div className="h-px w-[22px] bg-[#c8f135]" />
          <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#c8f135]">Briefing File</span>
        </div>
        <h2 className="mb-5 font-['Chakra_Petch'] text-2xl font-bold uppercase">Choose Your Contract</h2>

        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#7a8694]">1. Package Type</p>
        <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {PACKAGES.map((p) => (
            <Card key={p.id} selected={p.id === pkg.id} onClick={() => setPkg(p)}>
              <h4 className="mb-1 text-[13px] font-bold uppercase" style={{ color: p.color }}>{p.name}</h4>
              <p className="text-[11px] leading-snug text-[#7a8694]">{p.rule}</p>
              <span className="mt-1.5 inline-block border px-1.5 py-0.5 font-mono text-[9px]" style={{ borderColor: p.color, color: p.color }}>{p.threat}</span>
            </Card>
          ))}
        </div>

        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#7a8694]">2. Vehicle</p>
        <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {VEHICLES.map((v) => {
            const locked = !unlocked.includes(v.id);
            return (
              <Card
                key={v.id}
                selected={v.id === vehicle.id}
                dimmed={locked}
                onClick={() => { if (locked) { pushToast("Locked. Earn more reputation."); return; } setVehicle(v); }}
              >
                <h4 className="mb-1 text-[13px] font-bold uppercase">{v.tier} · {v.name}</h4>
                <p className="text-[11px] leading-snug text-[#7a8694]">{locked ? "Locked — earn reputation to unlock." : `Speed ${v.speed} · Jump ${v.jump.toFixed(1)}`}</p>
              </Card>
            );
          })}
        </div>

        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#7a8694]">3. Season Theme</p>
        <div className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
          <Card selected={theme === null} onClick={() => setTheme(null)}>
            <h4 className="mb-1 text-[13px] font-bold uppercase">None</h4>
            <p className="text-[11px] text-[#7a8694]">Standard city rules.</p>
          </Card>
          {WEEKLY.map((t) => (
            <Card key={t.id} selected={theme?.id === t.id} onClick={() => setTheme(t)}>
              <h4 className="mb-1 text-[13px] font-bold uppercase" style={{ color: t.color }}>W{t.week}</h4>
              <p className="text-[11px] text-[#7a8694]">{t.theme}</p>
            </Card>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[13px] text-[#7a8694]">
            {pkg.name} package · {vehicle.name}{theme ? ` · ${theme.theme}` : ""}
          </span>
          <button
            className="bg-[#c8f135] px-6 py-3 font-['Chakra_Petch'] text-xs font-bold uppercase tracking-widest text-[#07090c] hover:opacity-90"
            onClick={() => startMission(pkg.id, vehicle.id, theme?.id ?? null)}
          >
            Accept Mission →
          </button>
        </div>
      </div>
    </div>
  );
}

function Card({ children, selected, dimmed, onClick }: { children: ReactNode; selected: boolean; dimmed?: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer border p-3.5 transition-colors ${selected ? "border-[#c8f135] bg-[#c8f1350d]" : "border-[#c8f13524] bg-[#0d1117]"}`}
      style={{ opacity: dimmed ? 0.45 : 1 }}
    >
      {children}
    </div>
  );
}
