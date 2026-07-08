import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

export function Rain({ active, citySize }: { active: boolean; citySize: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 1400;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * citySize;
      arr[i * 3 + 1] = Math.random() * 60;
      arr[i * 3 + 2] = (Math.random() - 0.5) * citySize;
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, dt) => {
    if (!active || !pointsRef.current) return;
    const attr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < attr.count; i++) {
      let y = attr.getY(i) - dt * 40;
      if (y < 0) y = 55 + Math.random() * 5;
      attr.setY(i, y);
    }
    attr.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <points ref={pointsRef} visible={active}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#9fd8ff" size={0.12} transparent opacity={0.55} />
    </points>
  );
}
