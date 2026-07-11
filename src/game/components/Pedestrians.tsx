import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { SoloCityLayout } from "./cityGenerator";

const PED_COLORS = ["#c8f135", "#ff3b3b", "#60a5fa", "#a78bfa", "#f97316", "#e8d97a", "#7a8694"];

interface PedestrianSpec {
  x: number;
  z: number;
  color: string;
  phase: number;
}

/** Purely decorative - no pedestrian models existed in the uploaded kits
 *  (car kit + city kit commercial), so these are simple procedural figures,
 *  not an attempt at a real character. Non-collidable by design: this is
 *  atmosphere, not a gameplay obstacle (cones/debris already cover that). */
export function Pedestrians({ layout }: { layout: SoloCityLayout }) {
  const pedestrians: PedestrianSpec[] = useMemo(() => {
    const list: PedestrianSpec[] = [];
    for (let i = 0; i < 18; i++) {
      const road = layout.roadSegments[Math.floor(Math.random() * layout.roadSegments.length)];
      const along = (Math.random() - 0.5) * road.length * 0.8;
      const lateral = road.width / 2 + 1.5 + Math.random() * 2;
      const side = Math.random() < 0.5 ? -1 : 1;
      const x = road.axis === "ns" ? road.x + lateral * side : road.x + along;
      const z = road.axis === "ns" ? road.z + along : road.z + lateral * side;
      list.push({ x, z, color: PED_COLORS[i % PED_COLORS.length], phase: Math.random() * Math.PI * 2 });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <group>
      {pedestrians.map((p, i) => (
        <PedestrianFigure key={i} spec={p} />
      ))}
    </group>
  );
}

function PedestrianFigure({ spec }: { spec: PedestrianSpec }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current) return;
    // Gentle idle bob/sway - a hint of life, not a real walk cycle.
    group.current.position.y = Math.sin(clock.elapsedTime * 2 + spec.phase) * 0.03;
    group.current.rotation.y = spec.phase + Math.sin(clock.elapsedTime * 0.3 + spec.phase) * 0.4;
  });
  return (
    <group position={[spec.x, 0, spec.z]}>
      <group ref={group}>
        <mesh position={[0, 0.55, 0]} castShadow>
          <boxGeometry args={[0.34, 0.6, 0.2]} />
          <meshStandardMaterial color={spec.color} roughness={0.7} />
        </mesh>
        <mesh position={[0, 1.0, 0]} castShadow>
          <sphereGeometry args={[0.16, 10, 8]} />
          <meshStandardMaterial color="#2a2018" roughness={0.8} />
        </mesh>
        <mesh position={[-0.12, 0.15, 0]} castShadow>
          <boxGeometry args={[0.14, 0.5, 0.14]} />
          <meshStandardMaterial color="#1c2430" roughness={0.8} />
        </mesh>
        <mesh position={[0.12, 0.15, 0]} castShadow>
          <boxGeometry args={[0.14, 0.5, 0.14]} />
          <meshStandardMaterial color="#1c2430" roughness={0.8} />
        </mesh>
      </group>
    </group>
  );
}
