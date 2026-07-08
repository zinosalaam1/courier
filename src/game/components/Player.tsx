import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useKeyboard } from "./useKeyboard";
import { CharacterModel, type CharacterHandle } from "./CharacterModel";
import type { WorldRefs } from "./worldRefs";
import type { GadgetEffectsHandle } from "./GadgetEffects";
import type { HazardCarsHandle } from "./HazardCars";
import { useGameStore } from "../store/gameStore";
import { Presence } from "../backend/backend";
import type { VehicleDef } from "../data/gameData";

interface PlayerProps {
  world: WorldRefs;
  vehicle: VehicleDef;
  gadgetEffectsRef: RefObject<GadgetEffectsHandle>;
  hazardCarsRef: RefObject<HazardCarsHandle>;
}

const DEFAULT_GRAVITY = -22;
const STILL_SPEED_THRESHOLD = 0.6;

export function Player({ world, vehicle, gadgetEffectsRef, hazardCarsRef }: PlayerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const keys = useKeyboard();

  const pos = useRef(world.startPosition.clone());
  const vel = useRef(new THREE.Vector3(0, 0, 0));
  const yaw = useRef(0);
  const onGround = useRef(true);
  const lastImpactSpeed = useRef(0);
  const fuel = useRef(vehicle.fuel ?? Infinity);
  const flightActive = useRef(vehicle.fly);
  const lastTeleport = useRef(0);
  const characterHandle = useRef<CharacterHandle | null>(null);
  const presenceTimer = useRef(0);

  const updateMissionMeters = useGameStore((s) => s.updateMissionMeters);
  const endMission = useGameStore((s) => s.endMission);
  const revealUnknown = useGameStore((s) => s.revealUnknown);
  const registerCollision = useGameStore((s) => s.registerCollision);
  const applyRepairKit = useGameStore((s) => s.applyRepairKit);
  const setSmokeUntil = useGameStore((s) => s.setSmokeUntil);
  const pushToast = useGameStore((s) => s.pushToast);

  // Gadget key handling (1-6). Reads store state fresh each press via getState()
  // to avoid re-subscribing this effect on every mission-meter change.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const idx = ["1", "2", "3", "4", "5", "6"].indexOf(e.key);
      if (idx === -1) return;
      const m = useGameStore.getState().mission;
      if (!m) return;
      switch (idx) {
        case 0: { // EMP
          const near = world.hazardCars
            .slice()
            .sort((a, b) => a.mesh.position.distanceTo(pos.current) - b.mesh.position.distanceTo(pos.current))[0];
          if (near) { near.disabledUntil = performance.now() + 6000; pushToast("EMP disabled a hazard vehicle."); }
          else pushToast("No hazard in range for EMP.");
          break;
        }
        case 1: { // Portable Bridge
          const bridgePos = pos.current.clone();
          bridgePos.z += 6;
          gadgetEffectsRef.current?.addBridge(bridgePos);
          pushToast("Portable bridge deployed for 15s.");
          break;
        }
        case 2: { // Fake GPS
          Presence.broadcast(`decoy_${Math.random()}`, pos.current.x + (Math.random() - 0.5) * 30, 0, pos.current.z + (Math.random() - 0.5) * 30, "??? DECOY", "#7a8694");
          pushToast("Fake GPS ping sent — rivals see a decoy.");
          break;
        }
        case 3: // Smoke Device
          setSmokeUntil(performance.now() + 8000);
          pushToast("Smoke deployed — hidden from minimap & rivals for 8s.");
          break;
        case 4: // Repair Kit
          applyRepairKit();
          pushToast("Repair kit used: +40 integrity, -40 heat/radiation.");
          break;
        case 5: // Jump Pads
          gadgetEffectsRef.current?.addJumpPad(pos.current.clone());
          pushToast("Jump pad placed beneath you.");
          break;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const m = useGameStore.getState().mission;
    if (!m || m.ended) return;

    const gravity = world.gravityOverride ?? DEFAULT_GRAVITY;
    const reverse = world.reverseControls ? -1 : 1;
    const frozenWorld = world.timeFrozen;

    let turnInput = 0, moveInput = 0;
    if (keys.current["a"] || keys.current["arrowleft"]) turnInput += 1 * reverse;
    if (keys.current["d"] || keys.current["arrowright"]) turnInput -= 1 * reverse;
    if (keys.current["w"] || keys.current["arrowup"]) moveInput += 1;
    if (keys.current["s"] || keys.current["arrowdown"]) moveInput -= 1;

    yaw.current += turnInput * vehicle.turn * dt;

    const heavyPenalty = m.pkg.speedMult ?? 1;
    const flooded = world.waterCurrentY > -1 && Math.abs(pos.current.z - world.waterZ) < 5;
    const tractionMult = m.theme?.mods.traction ?? 1;
    const maxSpeed = vehicle.speed * heavyPenalty * (flooded && !vehicle.water ? 0.35 : 1) * tractionMult;

    const forward = new THREE.Vector3(Math.sin(yaw.current), 0, Math.cos(yaw.current));
    const targetVel = forward.clone().multiplyScalar(moveInput * maxSpeed);
    vel.current.x += (targetVel.x - vel.current.x) * Math.min(1, vehicle.accel * dt);
    vel.current.z += (targetVel.z - vel.current.z) * Math.min(1, vehicle.accel * dt);

    let justJumped = false;
    if (vehicle.fly && flightActive.current) {
      pos.current.y = THREE.MathUtils.lerp(pos.current.y, 3.2, dt * 2);
      if (vehicle.fuel) {
        fuel.current -= dt;
        if (fuel.current <= 0) { pushToast("Drone out of fuel — forced landing."); flightActive.current = false; }
      }
    } else {
      vel.current.y += gravity * dt;
      if (pos.current.y <= 0.01) {
        pos.current.y = 0;
        if (!onGround.current) lastImpactSpeed.current = Math.abs(vel.current.y);
        vel.current.y = 0;
        onGround.current = true;
      } else {
        onGround.current = false;
      }
      if (keys.current[" "] && onGround.current) {
        vel.current.y = vehicle.jump;
        onGround.current = false;
        justJumped = true;
      }
    }

    if (!frozenWorld) {
      const next = pos.current.clone();
      next.x += vel.current.x * dt;
      next.z += vel.current.z * dt;
      next.y += vehicle.fly ? 0 : vel.current.y * dt;

      const hit = collidesBuilding(next, world);
      if (hit) {
        registerCollision(vehicle.armored ?? false);
        vel.current.x *= -0.2; vel.current.z *= -0.2;
      } else {
        pos.current.copy(next);
      }
      const half = world.citySize / 2 - 2;
      pos.current.x = THREE.MathUtils.clamp(pos.current.x, -half, half);
      pos.current.z = THREE.MathUtils.clamp(pos.current.z, -half, half);
    }

    // Jump pads (static + gadget-placed)
    const allPads = [world.jumpPadPosition, ...world.extraJumpPads];
    for (const pad of allPads) {
      if (pad.distanceTo(pos.current) < 1.6 && onGround.current) {
        vel.current.y = 14; onGround.current = false; pushToast("Jump pad!");
      }
    }
    // Teleporters
    world.teleporters.forEach((t, i) => {
      if (t.distanceTo(pos.current) < 1.6 && performance.now() > lastTeleport.current + 1000) {
        const other = world.teleporters[(i + 1) % world.teleporters.length];
        pos.current.set(other.x, pos.current.y, other.z + 3);
        lastTeleport.current = performance.now();
        pushToast("Teleported.");
      }
    });

    // Sync visible group + expose position globally for hazard-car collision checks.
    if (groupRef.current) {
      groupRef.current.position.set(pos.current.x, pos.current.y + (vehicle.fly ? 1.6 : 0), pos.current.z);
      groupRef.current.rotation.y = yaw.current;
    }
    window.__tourArcadePlayerPos = pos.current;

    // Camera: third-person chase, with an Upside Down camera roll if active.
    const camOffset = new THREE.Vector3(-Math.sin(yaw.current) * 8, 4.5, -Math.cos(yaw.current) * 8);
    const desired = pos.current.clone().add(camOffset);
    camera.position.lerp(desired, Math.min(1, dt * 6));
    camera.rotation.z = performance.now() < world.upsideUntil ? Math.PI : 0;
    camera.lookAt(pos.current.x, pos.current.y + 1.2, pos.current.z);

    // Character animation
    const horizSpeed = Math.hypot(vel.current.x, vel.current.z);
    characterHandle.current?.setAnimState(horizSpeed, onGround.current, justJumped);

    // ---- Package mission-rule evaluation ----
    const rules = m.pkg.id === "unknown" ? m.revealedUnknown : m.pkg;
    const nearHeat = world.heatZones.some((z) => new THREE.Vector3(pos.current.x, 0, pos.current.z).distanceTo(z.position) < z.radius);
    const isStill = horizSpeed < STILL_SPEED_THRESHOLD;

    if (m.pkg.id === "unknown" && !m.revealedUnknown) {
      const total = world.startPosition.distanceTo(world.destinationPosition);
      const remaining = pos.current.distanceTo(world.destinationPosition);
      if ((total - remaining) / total >= 0.5) {
        const revealed = revealUnknown();
        if (revealed) pushToast(`UNKNOWN PACKAGE REVEALED: ${revealed.name} — ${revealed.rule}`);
      }
    }

    if (rules?.id === "fragile" && onGround.current && lastImpactSpeed.current > (rules.fallLimit ?? Infinity)) {
      endMission(false, "The fragile package shattered on impact.");
      return;
    }
    if (rules?.id === "frozen") {
      const heat = THREE.MathUtils.clamp(m.heat + (nearHeat ? dt * 22 : -dt * 8), 0, 100);
      updateMissionMeters({ heat });
      if (heat >= (rules.heatTolerance ?? 100)) { endMission(false, "The frozen package thawed and spoiled."); return; }
    }
    if (rules?.id === "radioactive") {
      const radiation = THREE.MathUtils.clamp(m.radiation + (isStill ? dt * 14 : -dt * 10), 0, 100);
      updateMissionMeters({ radiation });
      if (radiation >= (rules.radiationCap ?? 100)) { endMission(false, "Radiation levels critical. Containment failed."); return; }
    }
    if (rules?.id === "unstable" && m.integrity <= 0) {
      endMission(false, "The unstable package took one hit too many.");
      return;
    }
    if (rules?.timeLimit) {
      const elapsed = (performance.now() - m.startedAt) / 1000;
      if (elapsed >= rules.timeLimit) { endMission(false, "Time-locked contract expired."); return; }
    }
    if (m.lastImpactSpeed !== lastImpactSpeed.current) {
      updateMissionMeters({ lastImpactSpeed: lastImpactSpeed.current });
    }

    if (pos.current.distanceTo(world.destinationPosition) < 3.2) {
      endMission(true, "Package delivered intact. Courier Zero logs the run.");
      return;
    }

    // Live "ghost" presence broadcast (Supabase Realtime), throttled.
    if (Presence.active() && performance.now() >= m.smokeUntil) {
      presenceTimer.current += dt;
      if (presenceTimer.current > 0.25) {
        presenceTimer.current = 0;
        Presence.broadcast("player", pos.current.x, pos.current.y, pos.current.z, "COURIER", "#c8f135");
      }
    }
  });

  return (
    <group ref={groupRef}>
      <CharacterModel onReady={(h) => { characterHandle.current = h; }} />
    </group>
  );
}

function collidesBuilding(candidate: THREE.Vector3, world: WorldRefs) {
  for (const b of world.buildings) {
    if (
      candidate.x > b.box.min.x - 0.8 && candidate.x < b.box.max.x + 0.8 &&
      candidate.z > b.box.min.z - 0.8 && candidate.z < b.box.max.z + 0.8
    ) return b;
  }
  return null;
}
