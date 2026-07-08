import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { WeeklyThemeDef } from "../data/gameData";
import type { WorldRefs } from "./worldRefs";
import { makeFacadeTexture, makeSignTexture } from "./textures";

const SIGN_WORDS = ["COURIER", "ZERO", "DELIVER", "NO STOPS", "TOUR ARCADE"];

interface CityProps {
  world: WorldRefs;
  theme: WeeklyThemeDef | null;
}

interface BuildingSpec {
  position: [number, number, number];
  rotationY: number;
  size: [number, number, number];
  shape: "box" | "cylinder" | "cone";
  facadeIndex: number;
  isSignHost: boolean;
  height: number;
}

export function City({ world, theme }: CityProps) {
  const heatMult = theme?.mods.heatMult ?? 1;
  const extraHazards = theme?.mods.extraHazards ?? false;
  const flooded = theme?.mods.flood ?? false;

  const facadeTextures = useMemo(() => [makeFacadeTexture(1), makeFacadeTexture(2), makeFacadeTexture(3)], []);
  const signTextures = useMemo(
    () => SIGN_WORDS.map((w, i) => makeSignTexture(w, i % 2 === 0 ? "#c8f135" : "#ff3b3b")),
    []
  );

  const buildings: BuildingSpec[] = useMemo(() => {
    const specs: BuildingSpec[] = [];
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2;
      const radius = 28 + (i % 3) * 18;
      const w = 6 + Math.random() * 6, d = 6 + Math.random() * 6, h = 10 + Math.random() * 30;
      const shapeRoll = Math.random();
      const shape: BuildingSpec["shape"] = shapeRoll < 0.55 ? "box" : shapeRoll < 0.8 ? "cylinder" : "cone";
      specs.push({
        position: [Math.cos(angle) * radius, h / 2, Math.sin(angle) * radius],
        rotationY: Math.random() * Math.PI,
        size: [w, h, d],
        shape,
        facadeIndex: i % facadeTextures.length,
        isSignHost: i % 5 === 0,
        height: h,
      });
    }
    return specs;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildingRefs = useRef<(THREE.Mesh | null)[]>([]);

  useEffect(() => {
    world.buildings = buildingRefs.current
      .filter((m): m is THREE.Mesh => m !== null)
      .map((mesh) => ({ box: new THREE.Box3().setFromObject(mesh) }));
  }, [buildings, world]);

  useEffect(() => {
    world.waterCurrentY = flooded ? world.waterRaisedY : world.waterLoweredY;
  }, [flooded, world]);

  return (
    <group>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[world.citySize, world.citySize, 20, 20]} />
        <meshStandardMaterial color="#0d1117" roughness={0.55} metalness={0.35} />
      </mesh>
      <gridHelper args={[world.citySize, 16, 0xc8f135, 0x1a222c]} position={[0, 0.01, 0]} />

      {/* Buildings */}
      {buildings.map((b, i) => (
        <group key={i}>
          <mesh
            ref={(m) => { buildingRefs.current[i] = m; }}
            position={b.position}
            rotation={[0, b.rotationY, 0]}
            castShadow
            receiveShadow
          >
            {b.shape === "box" && <boxGeometry args={b.size} />}
            {b.shape === "cylinder" && <cylinderGeometry args={[b.size[0] * 0.4, b.size[0] * 0.5, b.size[1], 10]} />}
            {b.shape === "cone" && <coneGeometry args={[b.size[0] * 0.5, b.size[1], 8]} />}
            <meshStandardMaterial
              color="#9aa4b2"
              emissiveMap={facadeTextures[b.facadeIndex]}
              emissive={new THREE.Color(0xffffff)}
              emissiveIntensity={0.9}
              roughness={0.85}
              metalness={0.1}
            />
          </mesh>
          {b.isSignHost && (
            <mesh position={[b.position[0], b.height + 1.4, b.position[2]]} rotation={[0, b.rotationY + Math.PI, 0]}>
              <planeGeometry args={[8, 2]} />
              <meshBasicMaterial map={signTextures[i % signTextures.length]} transparent />
            </mesh>
          )}
        </group>
      ))}

      {/* Heat zones - Frozen package rule + Lava City theme */}
      {[0, 1].map((i) => {
        const r = 3.5 * heatMult;
        const pos: [number, number, number] = [-20 + i * 40, 0.11, -20];
        return (
          <group key={i}>
            <mesh position={pos} receiveShadow>
              <cylinderGeometry args={[r, r, 0.2, 24]} />
              <meshStandardMaterial color="#ff3b3b" emissive="#ff3b3b" emissiveIntensity={1.4} roughness={0.4} />
            </mesh>
            <pointLight position={[pos[0], 1.5, pos[2]]} color="#ff3b3b" intensity={1.6} distance={r * 6} decay={2} />
          </group>
        );
      })}

      {/* Water strip - Hover Bike / Drone crossing + Flood event / Heavy Rain theme */}
      <WaterPlane world={world} />

      {/* Jump pad */}
      <mesh position={world.jumpPadPosition}>
        <cylinderGeometry args={[1.4, 1.4, 0.3, 20]} />
        <meshStandardMaterial color="#c8f135" emissive="#c8f135" emissiveIntensity={0.7} />
      </mesh>

      {/* Teleporters */}
      {world.teleporters.map((pos, i) => (
        <mesh key={i} position={pos} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.4, 0.25, 12, 24]} />
          <meshStandardMaterial color={i === 0 ? "#60a5fa" : "#a78bfa"} emissive={i === 0 ? "#60a5fa" : "#a78bfa"} emissiveIntensity={0.6} />
        </mesh>
      ))}

      {/* Start marker */}
      <mesh position={[world.startPosition.x, 1.2, world.startPosition.z]} castShadow>
        <coneGeometry args={[1.2, 2.4, 6]} />
        <meshStandardMaterial color="#7a8694" emissive="#333333" />
      </mesh>

      {/* Destination marker + spotlight beam */}
      <mesh position={[world.destinationPosition.x, 1.5, world.destinationPosition.z]} castShadow>
        <coneGeometry args={[1.4, 3, 6]} />
        <meshStandardMaterial color="#c8f135" emissive="#c8f135" emissiveIntensity={1.6} />
      </mesh>
      <spotLight
        position={[world.destinationPosition.x, 25, world.destinationPosition.z]}
        target-position={[world.destinationPosition.x, 0, world.destinationPosition.z]}
        color="#c8f135"
        intensity={2.2}
        distance={40}
        angle={Math.PI / 8}
        penumbra={0.5}
        decay={1.2}
      />

      {/* Alien Invasion theme: extra hazard props scattered around */}
      {extraHazards && Array.from({ length: 4 }).map((_, i) => (
        <mesh key={i} position={[(Math.random() - 0.5) * 40, 1.4, (Math.random() - 0.5) * 80]}>
          <octahedronGeometry args={[1.4]} />
          <meshStandardMaterial color="#a78bfa" emissive="#a78bfa" emissiveIntensity={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function WaterPlane({ world }: { world: WorldRefs }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (ref.current) ref.current.position.y = THREE.MathUtils.lerp(ref.current.position.y, world.waterCurrentY, 0.05);
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, world.waterCurrentY, world.waterZ]}>
      <planeGeometry args={[world.citySize, 10]} />
      <meshStandardMaterial color="#1b3a4d" transparent opacity={0.75} />
    </mesh>
  );
}
