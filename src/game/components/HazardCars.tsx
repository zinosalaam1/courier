import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { WorldRefs, HazardCarEntry } from "./worldRefs";
import { useGameStore } from "../store/gameStore";

export interface HazardCarsHandle {
  spawnWave: (count: number) => void;
  setAllFrozen: (frozen: boolean) => void;
}

interface CarSpec { id: number; startPos: [number, number, number]; dir: [number, number]; speed: number; }

let carIdCounter = 0;

export const HazardCars = forwardRef<HazardCarsHandle, { world: WorldRefs }>(({ world }, ref) => {
  const [cars, setCars] = useState<CarSpec[]>([]);
  const boundsHalf = world.citySize / 2;

  useImperativeHandle(ref, () => ({
    spawnWave: (count) => {
      const newCars: CarSpec[] = Array.from({ length: count }).map(() => ({
        id: ++carIdCounter,
        startPos: [(Math.random() - 0.5) * 50, 0.7, (Math.random() - 0.5) * 100],
        dir: [Math.random() - 0.5, Math.random() - 0.5],
        speed: 6 + Math.random() * 6,
      }));
      setCars((c) => [...c, ...newCars]);
    },
    setAllFrozen: (frozen) => {
      world.hazardCars.forEach((c) => { c.frozen = frozen; });
    },
  }));

  return (
    <>
      {cars.map((c) => (
        <HazardCarMesh key={c.id} spec={c} world={world} boundsHalf={boundsHalf} />
      ))}
    </>
  );
});
HazardCars.displayName = "HazardCars";

function HazardCarMesh({ spec, world, boundsHalf }: { spec: CarSpec; world: WorldRefs; boundsHalf: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const entryRef = useRef<HazardCarEntry | null>(null);
  const registerCollision = useGameStore((s) => s.registerCollision);
  const mission = useGameStore((s) => s.mission);

  useEffect(() => {
    if (!meshRef.current) return;
    const entry: HazardCarEntry = {
      mesh: meshRef.current,
      direction: new THREE.Vector3(spec.dir[0], 0, spec.dir[1]).normalize(),
      speed: spec.speed,
      disabledUntil: 0,
      frozen: false,
    };
    entryRef.current = entry;
    world.hazardCars.push(entry);
    return () => {
      world.hazardCars = world.hazardCars.filter((e) => e !== entry);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame(() => {
    const entry = entryRef.current;
    const mesh = meshRef.current;
    if (!entry || !mesh) return;

    const disabled = performance.now() < entry.disabledUntil;
    (mesh.material as THREE.MeshStandardMaterial).opacity = disabled ? 0.3 : 1;
    (mesh.material as THREE.MeshStandardMaterial).transparent = disabled;

    if (!entry.frozen && !disabled) {
      mesh.position.addScaledVector(entry.direction, entry.speed * (1 / 60));
      if (Math.abs(mesh.position.x) > boundsHalf) entry.direction.x *= -1;
      if (Math.abs(mesh.position.z) > boundsHalf) entry.direction.z *= -1;
    }

    // Player collision (armored vehicles - the Van - take no unstable-package damage).
    const player = window.__tourArcadePlayerPos as THREE.Vector3 | undefined;
    if (player && mesh.position.distanceTo(player) < 2.2 && !disabled) {
      const armored = mission?.vehicle.armored ?? false;
      registerCollision(armored);
      entry.direction.multiplyScalar(-1);
    }
  });

  return (
    <mesh ref={meshRef} position={spec.startPos} castShadow>
      <boxGeometry args={[2.2, 1.4, 4]} />
      <meshStandardMaterial color="#ff3b3b" emissive="#330000" />
    </mesh>
  );
}

declare global {
  interface Window { __tourArcadePlayerPos?: THREE.Vector3; __tourArcadePlayerSpeed?: number; }
}
