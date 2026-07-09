import { useEffect, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { REALITY_EVENTS, type RealityEventDef, type RealityEventId, type WeeklyThemeDef } from "../data/gameData";
import type { WorldRefs } from "./worldRefs";
import type { HazardCarsHandle } from "./HazardCars";
import { useGameStore } from "../store/gameStore";

interface EventsControllerProps {
  world: WorldRefs;
  theme: WeeklyThemeDef | null;
  hazardCarsRef: RefObject<HazardCarsHandle>;
}

/**
 * Fires a random reality-glitch event every 14-24s and applies its real effect
 * by mutating `world` (read every frame by Player/City) or the R3F scene
 * directly (fog, camera shake). "Upside Down" is intentionally a camera-roll
 * visual effect only - true world-inversion physics is a much larger feature
 * (documented in the project README, same call as the earlier HTML prototype).
 */
export function EventsController({ world, theme, hazardCarsRef }: EventsControllerProps) {
  const { scene, camera } = useThree();
  const pushToast = useGameStore((s) => s.pushToast);
  const setActiveEvent = useGameStore((s) => s.setActiveEvent);

  const timerRef = useRef(0);
  const nextAtRef = useRef(4 + Math.random() * 4); // first event within ~4-8s, matching "the world immediately starts changing"
  const waterBaseline = theme?.mods.flood ? world.waterRaisedY : world.waterLoweredY;

  useEffect(() => {
    // Permanent forced event from a weekly theme (Upside Down City / Cyber Attack).
    if (theme?.mods.forceEvent) {
      const ev = REALITY_EVENTS.find((e) => e.id === theme.mods.forceEvent);
      if (ev) applyEvent(ev, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  function applyEvent(ev: RealityEventDef, permanent: boolean) {
    setActiveEvent(ev);
    pushToast(`EVENT: ${ev.name}`);
    if (!permanent) setTimeout(() => setActiveEvent(null), 3200);
    runEffect(ev.id, permanent ? Infinity : ev.durationMs);
  }

  function runEffect(id: RealityEventId, durationMs: number) {
    switch (id) {
      case "gravity":
        world.gravityOverride = -6;
        if (isFinite(durationMs)) setTimeout(() => { world.gravityOverride = null; }, durationMs);
        break;
      case "reverse":
        world.reverseControls = true;
        if (isFinite(durationMs)) setTimeout(() => { world.reverseControls = false; }, durationMs);
        break;
      case "traffic":
        hazardCarsRef.current?.spawnWave(5);
        break;
      case "blackout":
        world.blackout = true;
        if (isFinite(durationMs)) setTimeout(() => { world.blackout = false; }, durationMs);
        break;
      case "fog": {
        const prev = world.fogDensity;
        world.fogDensity = 0.09;
        if (isFinite(durationMs)) setTimeout(() => { world.fogDensity = prev; }, durationMs);
        break;
      }
      case "flood":
        world.waterCurrentY = world.waterRaisedY;
        if (isFinite(durationMs)) setTimeout(() => { world.waterCurrentY = waterBaseline; }, durationMs);
        break;
      case "quake":
        world.quakeUntil = performance.now() + durationMs;
        break;
      case "freeze":
        world.timeFrozen = false; // player is exempt, per the landing page copy - obstacles freeze instead
        hazardCarsRef.current?.setAllFrozen(true);
        if (isFinite(durationMs)) setTimeout(() => hazardCarsRef.current?.setAllFrozen(false), durationMs);
        break;
      case "teleport": {
        const [a, b] = world.teleporters;
        world.teleporters = [b.clone(), a.clone()];
        break;
      }
      case "upside":
        world.upsideUntil = performance.now() + durationMs;
        break;
    }
  }

  useFrame((_, dt) => {
    // Keep the scene's fog density synced to world.fogDensity (mutated by the
    // fog event above) without re-rendering React every frame.
    if (scene.fog && "density" in scene.fog) {
      (scene.fog as THREE.FogExp2).density = world.fogDensity;
    }
    // Earthquake camera shake.
    if (performance.now() < world.quakeUntil) {
      camera.position.x += (Math.random() - 0.5) * 0.12;
      camera.position.y += (Math.random() - 0.5) * 0.12;
    }

    timerRef.current += dt;
    if (timerRef.current > nextAtRef.current) {
      timerRef.current = 0;
      nextAtRef.current = 14 + Math.random() * 10;
      const pool = REALITY_EVENTS.filter((e) => e.id !== "teleport" || world.teleporters.length >= 2);
      const ev = pool[Math.floor(Math.random() * pool.length)];
      applyEvent(ev, false);
    }
  });

  return null;
}
