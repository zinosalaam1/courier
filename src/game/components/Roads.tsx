import { useMemo } from "react";
import * as THREE from "three";
import { makeRoadTexture } from "./textures";
import { ROAD_SEGMENTS, INTERSECTIONS, type RoadSegment } from "./roadLayout";

/** Real road geometry: asphalt strips along each segment, intersection patches
 *  where they cross, and lane markings built as individual axis-aligned box
 *  meshes (not a rotated texture) so "north-south" vs "east-west" roads never
 *  need more than one simple rotation to get right. */
export function Roads() {
  const asphaltTexture = useMemo(() => makeRoadTexture(), []);

  return (
    <group>
      {ROAD_SEGMENTS.map((road, i) => (
        <RoadStrip key={i} road={road} texture={asphaltTexture} />
      ))}
      {INTERSECTIONS.map((it, i) => (
        <mesh key={i} position={[it.x, 0.02, it.z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[it.size, it.size]} />
          <meshStandardMaterial map={asphaltTexture} roughness={0.85} metalness={0.05} />
        </mesh>
      ))}
    </group>
  );
}

function RoadStrip({ road, texture }: { road: RoadSegment; texture: THREE.CanvasTexture }) {
  const isNS = road.axis === "ns";
  const planeArgs: [number, number] = isNS ? [road.width, road.length] : [road.length, road.width];

  // Clone the texture per-strip so each can have its own independent repeat
  // without fighting other strips that share the base texture object.
  const tex = useMemo(() => {
    const t = texture.clone();
    t.needsUpdate = true;
    t.repeat.set(planeArgs[0] / 6, planeArgs[1] / 6);
    return t;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texture, road]);

  const dashCount = Math.floor(road.length / 6);
  const dashes = useMemo(() => {
    const arr: number[] = [];
    const start = -road.length / 2 + 3;
    for (let i = 0; i < dashCount; i++) arr.push(start + i * 6);
    return arr;
  }, [dashCount, road.length]);

  return (
    <group>
      <mesh position={[road.x, 0.015, road.z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={planeArgs} />
        <meshStandardMaterial map={tex} roughness={0.85} metalness={0.05} />
      </mesh>

      {/* Center dashed line - built as real boxes, oriented per-axis via
          dimension choice only, never via rotation. */}
      {dashes.map((offset, i) => (
        <mesh
          key={i}
          position={isNS ? [road.x, 0.03, road.z + offset] : [road.x + offset, 0.03, road.z]}
        >
          <boxGeometry args={isNS ? [0.28, 0.02, 1.6] : [1.6, 0.02, 0.28]} />
          <meshStandardMaterial color="#e8d97a" emissive="#e8d97a" emissiveIntensity={0.3} />
        </mesh>
      ))}

      {/* Edge lines - two continuous strips, offset to either side of center. */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={
            isNS
              ? [road.x + (side * road.width) / 2 - side * 0.5, 0.025, road.z]
              : [road.x, 0.025, road.z + (side * road.width) / 2 - side * 0.5]
          }
        >
          <boxGeometry args={isNS ? [0.15, 0.02, road.length] : [road.length, 0.02, 0.15]} />
          <meshStandardMaterial color="#c8f135" emissive="#c8f135" emissiveIntensity={0.35} />
        </mesh>
      ))}
    </group>
  );
}
