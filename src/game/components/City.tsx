import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { WeeklyThemeDef } from "../data/gameData";
import type { WorldRefs } from "./worldRefs";
import { makeSignTexture } from "./textures";
import { Roads } from "./Roads";
import { GLTFModel } from "./GLTFModel";
import type { SoloCityLayout } from "./cityGenerator";

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
      <Roads segments={layout.roadSegments} intersections={layout.intersections} />

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

      {/* Water strip */}
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
        <mesh key={i} position={[(Math.random() - 0.5) * world.citySize * 0.7, 1.4, (Math.random() - 0.5) * world.citySize * 0.7]}>
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
