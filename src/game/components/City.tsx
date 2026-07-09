import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { WeeklyThemeDef } from "../data/gameData";
import type { WorldRefs } from "./worldRefs";
import { makeSignTexture } from "./textures";
import { Roads } from "./Roads";
import { ROAD_SEGMENTS } from "./roadLayout";
import { GLTFModel } from "./GLTFModel";
import { BUILDING_MODELS, FOOTPRINT_HALF_WIDTH_AT_SCALE_1, scaleRangeFor } from "./buildingModels";

const SIGN_WORDS = ["COURIER", "ZERO", "DELIVER", "NO STOPS", "TOUR ARCADE"];

/** True if (x,z) falls inside any road's corridor (plus a building setback),
 *  so procedural building placement can avoid dropping towers in the street. */
function isOnRoad(x: number, z: number, setback = 3): boolean {
  for (const road of ROAD_SEGMENTS) {
    const halfW = road.width / 2 + setback;
    if (road.axis === "ns") {
      if (Math.abs(x - road.x) < halfW && Math.abs(z - road.z) < road.length / 2) return true;
    } else {
      if (Math.abs(z - road.z) < halfW && Math.abs(x - road.x) < road.length / 2) return true;
    }
  }
  return false;
}

interface CityProps {
  world: WorldRefs;
  theme: WeeklyThemeDef | null;
}

interface BuildingSpec {
  position: [number, number, number];
  rotationY: number; // always a multiple of 90deg - keeps the (square) footprint axis-aligned so the collision box built from placement data stays accurate at any rotation
  modelUrl: string;
  scale: number;
  approxHeight: number; // for sign placement only, not collision (collision never used height, even pre-GLB)
  isSignHost: boolean;
}

export function City({ world, theme }: CityProps) {
  const heatMult = theme?.mods.heatMult ?? 1;
  const extraHazards = theme?.mods.extraHazards ?? false;
  const flooded = theme?.mods.flood ?? false;

  const signTextures = useMemo(
    () => SIGN_WORDS.map((w, i) => makeSignTexture(w, i % 2 === 0 ? "#c8f135" : "#ff3b3b")),
    []
  );

  const buildings: BuildingSpec[] = useMemo(() => {
    const specs: BuildingSpec[] = [];
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2;
      let radius = 28 + (i % 3) * 18;
      let x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;

      let attempts = 0;
      while (isOnRoad(x, z) && attempts < 8) {
        radius += 6;
        x = Math.cos(angle) * radius; z = Math.sin(angle) * radius;
        attempts++;
      }

      const modelDef = BUILDING_MODELS[i % BUILDING_MODELS.length];
      const [minScale, maxScale] = scaleRangeFor(modelDef.category);
      const scale = minScale + Math.random() * (maxScale - minScale);
      const rotationY = Math.floor(Math.random() * 4) * (Math.PI / 2);
      const approxHeight = (modelDef.category === "skyscraper" ? 3.9 : 2.4) * scale;

      specs.push({
        position: [x, 0, z],
        rotationY,
        modelUrl: modelDef.url,
        scale,
        approxHeight,
        isSignHost: i % 5 === 0 && modelDef.category !== "low-detail",
      });
    }
    return specs;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Collision boxes built directly from placement data (position/scale),
    // not from waiting on the async GLTF to finish loading - the whole kit
    // shares a fixed 2x2 unit footprint (confirmed by inspecting the raw
    // GLBs), so this is accurate immediately and can't race the model load.
    world.buildings = buildings.map((b) => {
      const half = b.scale * FOOTPRINT_HALF_WIDTH_AT_SCALE_1;
      return {
        box: new THREE.Box3(
          new THREE.Vector3(b.position[0] - half, 0, b.position[2] - half),
          new THREE.Vector3(b.position[0] + half, 100, b.position[2] + half)
        ),
      };
    });
  }, [buildings, world]);

  useEffect(() => {
    world.waterCurrentY = flooded ? world.waterRaisedY : world.waterLoweredY;
  }, [flooded, world]);

  return (
    <group>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[world.citySize, world.citySize, 20, 20]} />
        <meshStandardMaterial color="#171512" roughness={0.9} metalness={0.05} />
      </mesh>
      <Roads />

      {/* Buildings - real Kenney city-kit models */}
      {buildings.map((b, i) => (
        <group key={i}>
          <group position={b.position}>
            <GLTFModel url={b.modelUrl} scale={b.scale} yOffset={b.scale} rotationY={b.rotationY} />
          </group>
          {b.isSignHost && (
            <mesh position={[b.position[0], b.approxHeight + 1.4, b.position[2]]} rotation={[0, b.rotationY + Math.PI, 0]}>
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
