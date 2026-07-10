import { create } from "zustand";
import { PACKAGES, VEHICLES, WEEKLY, REALITY_EVENTS, type PackageDef, type VehicleDef, type WeeklyThemeDef, type RealityEventDef } from "../data/gameData";
import { Auth } from "../backend/backend";
import { DEFAULT_CHARACTER_ID } from "../data/characters";

export type GameScreen = "menu" | "auth" | "contract" | "mission" | "end" | "leaderboard" | "chaos" | "character";

interface ToastItem { id: number; text: string; }

interface MissionState {
  pkg: PackageDef;
  vehicle: VehicleDef;
  theme: WeeklyThemeDef | null;
  startedAt: number;
  revealedUnknown: PackageDef | null;
  integrity: number;   // Fragile-impact / Unstable
  heat: number;        // Frozen
  radiation: number;   // Radioactive
  lastImpactSpeed: number;
  activeEvent: RealityEventDef | null;
  smokeUntil: number;
  ended: boolean;
}

interface GameStore {
  screen: GameScreen;
  setScreen: (s: GameScreen) => void;

  toasts: ToastItem[];
  pushToast: (text: string) => void;

  mission: MissionState | null;
  startMission: (pkgId: string, vehicleId: string, themeId: string | null) => void;
  endMission: (success: boolean, reason: string) => void;
  updateMissionMeters: (patch: Partial<Pick<MissionState, "integrity" | "heat" | "radiation" | "lastImpactSpeed">>) => void;
  revealUnknown: () => PackageDef | null;
  registerCollision: (armored: boolean) => void;
  applyRepairKit: () => void;
  setActiveEvent: (ev: RealityEventDef | null) => void;
  setSmokeUntil: (t: number) => void;

  lastResult: { success: boolean; reason: string; time: number; credits: number; reputation: number } | null;

  deepLink: { packageId: string | null; vehicleId: string | null; themeId: string | null };
  setDeepLink: (d: { packageId: string | null; vehicleId: string | null; themeId: string | null }) => void;

  characterId: string;
  setCharacterId: (id: string) => void;
}

let toastCounter = 0;

export const useGameStore = create<GameStore>((set, get) => ({
  screen: "menu",
  setScreen: (s) => set({ screen: s }),

  toasts: [],
  pushToast: (text) => {
    const id = ++toastCounter;
    set((s) => ({ toasts: [...s.toasts, { id, text }].slice(-4) }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3400);
  },

  mission: null,

  startMission: (pkgId, vehicleId, themeId) => {
    const pkg = PACKAGES.find((p) => p.id === pkgId) ?? PACKAGES[0];
    const vehicle = VEHICLES.find((v) => v.id === vehicleId) ?? VEHICLES[0];
    const theme = themeId ? WEEKLY.find((t) => t.id === themeId) ?? null : null;
    set({
      mission: {
        pkg, vehicle, theme,
        startedAt: performance.now(),
        revealedUnknown: null,
        integrity: 100, heat: 0, radiation: 0, lastImpactSpeed: 0,
        activeEvent: null, smokeUntil: 0, ended: false,
      },
      screen: "mission",
    });
  },

  endMission: (success, reason) => {
    const m = get().mission;
    if (!m || m.ended) return;
    const elapsed = (performance.now() - m.startedAt) / 1000;
    let credits = 0, reputation = 0;
    if (success) {
      const base = m.pkg.threat === "CRITICAL" ? 220 : m.pkg.threat === "HIGH" ? 180 : m.pkg.threat === "MEDIUM" ? 140 : 100;
      const rewardMult = m.theme?.mods.rewardMult ?? 1;
      credits = Math.round(base * rewardMult);
      reputation = 10 + (m.pkg.threat === "CRITICAL" ? 15 : 5);
      Auth.saveProgress({ credits, reputation, time: elapsed }).catch(() => {});
    }
    set({
      mission: { ...m, ended: true },
      lastResult: { success, reason, time: elapsed, credits, reputation },
      screen: "end",
    });
  },

  updateMissionMeters: (patch) => set((s) => (s.mission ? { mission: { ...s.mission, ...patch } } : s)),

  revealUnknown: () => {
    const m = get().mission;
    if (!m || m.pkg.id !== "unknown" || m.revealedUnknown) return m?.revealedUnknown ?? null;
    const pool = PACKAGES.filter((p) => p.id !== "standard" && p.id !== "unknown");
    const revealed = pool[Math.floor(Math.random() * pool.length)];
    set({ mission: { ...m, revealedUnknown: revealed } });
    return revealed;
  },

  registerCollision: (armored) => {
    const m = get().mission;
    if (!m) return;
    const activeId = m.pkg.id === "unknown" ? m.revealedUnknown?.id : m.pkg.id;
    if (activeId === "unstable" && !armored) {
      set({ mission: { ...m, integrity: Math.max(0, m.integrity - 22) } });
    }
  },

  applyRepairKit: () => {
    const m = get().mission;
    if (!m) return;
    set({
      mission: {
        ...m,
        integrity: Math.min(100, m.integrity + 40),
        heat: Math.max(0, m.heat - 40),
        radiation: Math.max(0, m.radiation - 40),
      },
    });
  },

  setActiveEvent: (ev) => set((s) => (s.mission ? { mission: { ...s.mission, activeEvent: ev } } : s)),
  setSmokeUntil: (t) => set((s) => (s.mission ? { mission: { ...s.mission, smokeUntil: t } } : s)),

  lastResult: null,

  deepLink: { packageId: null, vehicleId: null, themeId: null },
  setDeepLink: (d) => set({ deepLink: d }),

  characterId: (() => {
    try { return localStorage.getItem("tourarcade_character") || DEFAULT_CHARACTER_ID; }
    catch { return DEFAULT_CHARACTER_ID; }
  })(),
  setCharacterId: (id) => {
    try { localStorage.setItem("tourarcade_character", id); } catch { /* private browsing etc - selection just won't persist */ }
    set({ characterId: id });
  },
}));

// Convenience re-exports so components don't need to import from two places.
export { PACKAGES, VEHICLES, WEEKLY, REALITY_EVENTS };
