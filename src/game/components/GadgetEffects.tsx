import { forwardRef, useImperativeHandle, useState } from "react";
import * as THREE from "three";
import type { WorldRefs } from "./worldRefs";

export interface GadgetEffectsHandle {
  addBridge: (position: THREE.Vector3) => void;
  addJumpPad: (position: THREE.Vector3) => void;
}

interface BridgeSpec { id: number; position: [number, number, number]; }
interface PadSpec { id: number; position: [number, number, number]; }

let idCounter = 0;

export const GadgetEffects = forwardRef<GadgetEffectsHandle, { world: WorldRefs }>(({ world }, ref) => {
  const [bridges, setBridges] = useState<BridgeSpec[]>([]);
  const [pads, setPads] = useState<PadSpec[]>([]);

  useImperativeHandle(ref, () => ({
    addBridge: (position) => {
      const id = ++idCounter;
      setBridges((b) => [...b, { id, position: [position.x, 0.3, position.z] }]);
      setTimeout(() => setBridges((b) => b.filter((x) => x.id !== id)), 15000);
    },
    addJumpPad: (position) => {
      const id = ++idCounter;
      const padPos = new THREE.Vector3(position.x, 0.05, position.z);
      world.extraJumpPads.push(padPos);
      setPads((p) => [...p, { id, position: [padPos.x, padPos.y, padPos.z] }]);
    },
  }));

  return (
    <>
      {bridges.map((b) => (
        <mesh key={b.id} position={b.position}>
          <boxGeometry args={[4, 0.3, 6]} />
          <meshStandardMaterial color="#60a5fa" emissive="#102030" />
        </mesh>
      ))}
      {pads.map((p) => (
        <mesh key={p.id} position={p.position}>
          <cylinderGeometry args={[1.4, 1.4, 0.3, 20]} />
          <meshStandardMaterial color="#c8f135" emissive="#c8f135" emissiveIntensity={0.7} />
        </mesh>
      ))}
    </>
  );
});
GadgetEffects.displayName = "GadgetEffects";
