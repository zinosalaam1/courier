import { useImperativeHandle, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { OBJModel } from "./CopLoader";
import { useGameStore } from "../store/gameStore";

const COP_SPEED = 13;
const COP_TURN_RATE = 3.0; // radians/sec max turn speed - keeps the chase readable instead of snapping to face the player instantly
const CATCH_RADIUS = 3.5;
const DESPAWN_DISTANCE = 70;
const MAX_CHASE_MS = 30000;
const DAMAGE_PER_SEC = 26;
const OBJ_URL = "/models/cop/Car5_Police.obj";
const MTL_URL = "/models/cop/Car5_Police.mtl";

export interface CopHandle {
  disable: (ms: number) => void;
}

/**
 * A real pursuit, not a scripted cutscene: every frame it steers toward the
 * player's actual current position (read from the same window-global the
 * HUD/other systems already use for live position), at a turn rate capped
 * so it reads as a car chasing you rather than an aimbot. Spawns once per
 * mission after a delay, gives up if you outrun it or evade long enough,
 * and drains package integrity (reusing the same universal damage system
 * every package type already has) rather than being an instant fail -
 * consistent with how Fragile/Unstable/collisions already work.
 *
 * Simplification worth knowing: the cop does not avoid buildings. Full
 * obstacle-avoiding chase AI (pathfinding around city blocks) is a much
 * bigger feature - this is a straight-line pursuit, which for an arcade
 * chase reads fine most of the time but can look odd if it happens to
 * clip through part of a building's collision volume from the player's
 * perspective. Documented here rather than quietly shipped as if it were
 * full pathfinding.
 */
export function CopCar({ copRef }: { copRef: RefObject<CopHandle> }) {
  const [active, setActive] = useState(false);
  const pos = useRef(new THREE.Vector3());
  const yaw = useRef(0);
  const spawnTimer = useRef(0);
  const spawnAt = useRef(15 + Math.random() * 25);
  const chaseStartedAt = useRef(0);
  const disabledUntil = useRef(0);
  const groupRef = useRef<THREE.Group>(null);
  const pushToast = useGameStore((s) => s.pushToast);

  useImperativeHandle(copRef, () => ({
    disable: (ms: number) => {
      if (!active) return;
      disabledUntil.current = performance.now() + ms;
      pushToast("EMP knocked out the pursuing cop car!");
    },
  }));

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const m = useGameStore.getState().mission;
    if (!m || m.ended) return;
    const playerPos = window.__tourArcadePlayerPos;
    if (!playerPos) return;

    if (!active) {
      spawnTimer.current += dt;
      if (spawnTimer.current > spawnAt.current) {
        const angle = Math.random() * Math.PI * 2;
        pos.current.set(playerPos.x + Math.cos(angle) * 35, 0, playerPos.z + Math.sin(angle) * 35);
        yaw.current = Math.atan2(playerPos.x - pos.current.x, playerPos.z - pos.current.z);
        chaseStartedAt.current = performance.now();
        setActive(true);
        window.__tourArcadeCopActive = true;
        pushToast("🚨 A police car has spotted you!");
      }
      return;
    }

    if (performance.now() >= disabledUntil.current) {
      const toPlayer = new THREE.Vector3(playerPos.x - pos.current.x, 0, playerPos.z - pos.current.z);
      const dist = toPlayer.length();
      const targetYaw = Math.atan2(toPlayer.x, toPlayer.z);
      let angleDiff = targetYaw - yaw.current;
      angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff)); // shortest turn direction
      yaw.current += THREE.MathUtils.clamp(angleDiff, -COP_TURN_RATE * dt, COP_TURN_RATE * dt);

      const forward = new THREE.Vector3(Math.sin(yaw.current), 0, Math.cos(yaw.current));
      pos.current.addScaledVector(forward, COP_SPEED * dt);

      if (dist < CATCH_RADIUS) {
        const store = useGameStore.getState();
        const mission = store.mission;
        if (mission && !mission.ended) {
          const newIntegrity = Math.max(0, mission.integrity - DAMAGE_PER_SEC * dt);
          store.updateMissionMeters({ integrity: newIntegrity });
          if (newIntegrity <= 0) {
            store.endMission(false, "Pulled over. The package was confiscated.");
          }
        }
      }

      if (dist > DESPAWN_DISTANCE || performance.now() - chaseStartedAt.current > MAX_CHASE_MS) {
        setActive(false);
        window.__tourArcadeCopActive = false;
        spawnTimer.current = 0;
        spawnAt.current = 20 + Math.random() * 25; // may come back later in a long mission
        pushToast(dist > DESPAWN_DISTANCE ? "You lost the cop." : "The cop gave up the chase.");
      }
    }

    if (groupRef.current) {
      groupRef.current.position.copy(pos.current);
      groupRef.current.rotation.y = yaw.current;
    }
    window.__tourArcadeCopPos = active ? pos.current : undefined;
  });

  if (!active) return null;

  return (
    <group ref={groupRef}>
      <OBJModel objUrl={OBJ_URL} mtlUrl={MTL_URL} scale={0.6} />
      <pointLight color="#ff3b3b" intensity={2.2} distance={10} position={[0, 1.6, 0]} />
    </group>
  );
}

declare global {
  interface Window { __tourArcadeCopActive?: boolean; __tourArcadeCopPos?: THREE.Vector3; }
}
