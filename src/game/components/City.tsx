import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { WeeklyThemeDef } from "../data/gameData";
import type { WorldRefs } from "./worldRefs";
import { makeSignTexture } from "./textures";
import { Roads } from "./Roads";
import { GLTFModel } from "./GLTFModel";
import type { SoloCityLayout } from "./cityGenerator";
import { Pedestrians } from "./Pedestrians";
import { TREE_MODELS, TREE_SCALE_RANGE } from "./natureModels";

const SIGN_WORDS = ["COURIER", "ZERO", "DELIVER", "NO STOPS", "TOUR ARCADE"];

interface CityProps {
  world: WorldRefs;
  theme: WeeklyThemeDef | null;
  layout: SoloCityLayout;
}

export function City({ world, theme, layout }: CityProps) {
  const extraHazards = theme?.mods.extraHazards ?? false;
  const flooded = theme?.mods.flood ?? false;

  const signTextures = useMemo(
    () => SIGN_WORDS.map((w, i) => makeSignTexture(w, i % 2 === 0 ? "#c8f135" : "#ff3b3b")),
    []
  );

  // Precomputed once (not re-rolled every render) so tree species/scale stay
  // stable for the lifetime of the mission instead of flickering between models.
  const treeInstances = useMemo(
    () =>
      layout.parks.flatMap((p) =>
        p.trees.map((t) => ({
          x: t.x,
          z: t.z,
          model: TREE_MODELS[Math.floor(Math.random() * TREE_MODELS.length)],
          scale: TREE_SCALE_RANGE[0] + Math.random() * (TREE_SCALE_RANGE[1] - TREE_SCALE_RANGE[0]),
          rotationY: Math.random() * Math.PI * 2,
        }))
      ),
    [layout.parks]
  );

  useEffect(() => {
    world.waterCurrentY = flooded ? world.waterRaisedY : world.waterLoweredY;
    world.floodOverflow = flooded ? 10 : 0;
  }, [flooded, world]);

  return (
    <group>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[world.citySize, world.citySize, 20, 20]} />
        <meshStandardMaterial color="#171512" roughness={0.9} metalness={0.05} />
      </mesh>
      <Roads segments={layout.roadSegments} intersections={layout.intersections} />

      {/* Crosswalks - real painted road markings, not just gray asphalt */}
      {layout.crosswalks.map((c, i) => (
        <group key={i} position={[c.x, 0.025, c.z]}>
          {[-5, -3, -1, 1, 3, 5].map((offset) => (
            <mesh key={offset} position={offset % 2 === 0 ? [offset, 0, 0] : [0, 0, offset]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[1.1, 5]} />
              <meshStandardMaterial color="#e8e4d8" roughness={0.8} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Buildings - real Kenney city-kit models, one per block-placement from the generated layout */}
      {layout.buildings.map((b, i) => {
        const approxHeight = b.model.height * b.scale;
        const isSignHost = i % 6 === 0 && b.model.category !== "low-detail";
        return (
          <group key={i}>
            <group position={[b.position[0], 0, b.position[1]]}>
              <GLTFModel url={b.model.url} scale={b.scale} minY={0} rotationY={b.rotationY} />
            </group>
            {isSignHost && (
              <mesh position={[b.position[0], approxHeight + 1.4, b.position[1]]} rotation={[0, b.rotationY + Math.PI, 0]}>
                <planeGeometry args={[8, 2]} />
                <meshBasicMaterial map={signTextures[i % signTextures.length]} transparent />
              </mesh>
            )}
          </group>
        );
      })}

      {/* Obstacles - cones/debris scattered along roads, real collidable hazards */}
      {layout.obstacles.map((o, i) => (
        <group key={i} position={[o.position[0], 0, o.position[1]]}>
          <GLTFModel url={o.model.url} scale={o.scale} minY={o.model.minY} rotationY={o.rotationY} />
        </group>
      ))}

      {/* Park - grass patch + real trees, one full block instead of buildings */}
      {layout.parks.map((p, i) => (
        <mesh key={i} position={[p.x, 0.02, p.z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[p.halfX * 2, p.halfZ * 2]} />
          <meshStandardMaterial color="#2f4a26" roughness={1} />
        </mesh>
      ))}
      {treeInstances.map((t, i) => (
        <Tree key={i} x={t.x} z={t.z} model={t.model} scale={t.scale} rotationY={t.rotationY} />
      ))}

      {/* Heat zones - Frozen package rule + Lava City theme (radius already
          scaled by heatMult in Scene.tsx, so this stays consistent with the
          actual gameplay distance check in Player.tsx) */}
      {world.heatZones.map((z, i) => (
        <group key={i}>
          <mesh position={[z.position.x, 0.11, z.position.z]} receiveShadow>
            <cylinderGeometry args={[z.radius, z.radius, 0.2, 24]} />
            <meshStandardMaterial color="#ff3b3b" emissive="#ff3b3b" emissiveIntensity={1.4} roughness={0.4} />
          </mesh>
          <pointLight position={[z.position.x, 1.5, z.position.z]} color="#ff3b3b" intensity={1.6} distance={z.radius * 6} decay={2} />
        </group>
      ))}

      {/* Lake - a real body of water, not a strip across the whole map */}
      <Lake world={world} />

      {/* Boundary walls - the playable city is now visibly bounded */}
      {layout.boundaryWalls.map((w, i) => (
        <BoundaryWall key={i} wall={w} />
      ))}

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
        <mesh key={i} position={[(Math.random() - 0.5) * world.citySize * 0.7, 1.4, (Math.random() - 0.5) * world.citySize * 0.7]}>
          <octahedronGeometry args={[1.4]} />
          <meshStandardMaterial color="#a78bfa" emissive="#a78bfa" emissiveIntensity={0.4} />
        </mesh>
      ))}

      <Pedestrians layout={layout} />
    </group>
  );
}

function Lake({ world }: { world: WorldRefs }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.y = THREE.MathUtils.lerp(ref.current.position.y, world.waterCurrentY, 0.05);
    // Gentle shimmer - a real animated material without needing a custom shader.
    const mat = ref.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = 0.12 + Math.sin(clock.elapsedTime * 0.8) * 0.05;
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[world.lake.x, world.waterCurrentY, world.lake.z]} receiveShadow>
      <circleGeometry args={[Math.max(world.lake.radiusX, world.lake.radiusZ), 32]} />
      <meshStandardMaterial color="#1b5a7d" emissive="#3a8ab0" emissiveIntensity={0.12} transparent opacity={0.85} roughness={0.15} metalness={0.3} />
    </mesh>
  );
}

function BoundaryWall({ wall }: { wall: { x: number; z: number; length: number; axis: "ns" | "ew" } }) {
  const isEW = wall.axis === "ew";
  const size: [number, number, number] = isEW ? [wall.length, 6, 2] : [2, 6, wall.length];
  return (
    <mesh position={[wall.x, 3, wall.z]} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#1c222c" roughness={0.75} metalness={0.4} emissive="#0a1420" emissiveIntensity={0.3} />
    </mesh>
  );
}

function Tree({ x, z, model, scale, rotationY }: { x: number; z: number; model: (typeof TREE_MODELS)[number]; scale: number; rotationY: number }) {
  return (
    <group position={[x, 0, z]}>
      <GLTFModel url={model.url} scale={scale} minY={model.minY} rotationY={rotationY} />
    </group>
  );
}
