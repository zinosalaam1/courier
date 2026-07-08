import { useMemo } from "react";
import * as THREE from "three";
import { generateCityLayout, type CityLayout } from "./cityLayout";
import { makeFacadeTexture } from "../components/textures";

export function ChaosCity({ seed }: { seed: number }) {
  const layout: CityLayout = useMemo(() => generateCityLayout(seed), [seed]);
  const facadeTextures = useMemo(() => [makeFacadeTexture(1), makeFacadeTexture(2), makeFacadeTexture(3)], []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[layout.citySize, layout.citySize, 20, 20]} />
        <meshStandardMaterial color="#0d1117" roughness={0.55} metalness={0.35} />
      </mesh>
      <gridHelper args={[layout.citySize, 16, 0xc8f135, 0x1a222c]} position={[0, 0.01, 0]} />

      {layout.buildings.map((b, i) => (
        <mesh
          key={i}
          position={[b.x, b.y, b.z]}
          rotation={[0, b.rotationY, 0]}
          castShadow
          receiveShadow
        >
          {b.shape === "box" && <boxGeometry args={[b.width, b.height, b.depth]} />}
          {b.shape === "cylinder" && <cylinderGeometry args={[b.width * 0.4, b.width * 0.5, b.height, 10]} />}
          {b.shape === "cone" && <coneGeometry args={[b.width * 0.5, b.height, 8]} />}
          <meshStandardMaterial
            color="#9aa4b2"
            emissiveMap={facadeTextures[i % facadeTextures.length]}
            emissive={new THREE.Color(0xffffff)}
            emissiveIntensity={0.9}
            roughness={0.85}
            metalness={0.1}
          />
        </mesh>
      ))}

      {layout.heatZones.map((z, i) => (
        <mesh key={i} position={[z.x, 0.11, z.z]} receiveShadow>
          <cylinderGeometry args={[z.radius, z.radius, 0.2, 24]} />
          <meshStandardMaterial color="#ff3b3b" emissive="#ff3b3b" emissiveIntensity={1.2} roughness={0.4} />
        </mesh>
      ))}

      <mesh position={[layout.startPosition.x, 1.2, layout.startPosition.z]} castShadow>
        <coneGeometry args={[1.2, 2.4, 6]} />
        <meshStandardMaterial color="#7a8694" emissive="#333333" />
      </mesh>
      <mesh position={[layout.destinationPosition.x, 1.5, layout.destinationPosition.z]} castShadow>
        <coneGeometry args={[1.4, 3, 6]} />
        <meshStandardMaterial color="#c8f135" emissive="#c8f135" emissiveIntensity={1.4} />
      </mesh>
    </group>
  );
}
