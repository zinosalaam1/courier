import { Component, Suspense, useEffect, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { useGLTF, useAnimations } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { computeBindPoseBoundingBox } from "./boundingBox";
import { CHARACTERS, DEFAULT_CHARACTER_ID, type ProceduralColorScheme } from "../data/characters";

export interface CharacterHandle {
  setAnimState: (speed: number, grounded: boolean, justJumped: boolean) => void;
}

const TARGET_HEIGHT = 1.8; // world units - keeps every character (and vehicles sized relative to it) at a consistent scale

/**
 * Renders whichever character the player selected (see data/characters.ts).
 * The one real rigged/animated model gets a Suspense (loading) + real error
 * boundary (failure) split, same as before; procedural characters render
 * directly since there's nothing to load or fail.
 */
export function CharacterModel({ characterId, onReady }: { characterId: string; onReady: (handle: CharacterHandle) => void }) {
  const def = CHARACTERS.find((c) => c.id === characterId) ?? CHARACTERS.find((c) => c.id === DEFAULT_CHARACTER_ID)!;

  if (!def.url) {
    return <FallbackCharacter onReady={onReady} scheme={def.colorScheme!} />;
  }

  const fallbackScheme = CHARACTERS.find((c) => c.id === DEFAULT_CHARACTER_ID)!.colorScheme!;
  return (
    <CharacterErrorBoundary fallback={<FallbackCharacter onReady={onReady} scheme={fallbackScheme} />}>
      <Suspense fallback={null}>
        <GltfCharacter url={def.url} onReady={onReady} />
      </Suspense>
    </CharacterErrorBoundary>
  );
}

class CharacterErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { /* swallow - fallback renders instead */ }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function GltfCharacter({ url, onReady }: { url: string; onReady: (h: CharacterHandle) => void }) {
  const group = useRef<THREE.Group>(null);
  const gltf = useGLTF(url); // suspends until loaded, or throws for the error boundary above
  const { scene, animations } = gltf;
  const { actions } = useAnimations(animations, group);
  const currentAction = useRef<string | null>(null);

  useEffect(() => {
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = true; }
    });

    // Auto-fit to a consistent height using the model's real bind-pose
    // geometry bounds (see boundingBox.ts for why this is safe to do the
    // instant the model loads, unlike THREE.Box3().setFromObject(scene)).
    // This replaces an earlier fixed-scale guess that assumed the model was
    // "already roughly human-sized" without ever actually measuring it -
    // which was the real cause of vehicles looking undersized next to the
    // character (the character was probably rendering larger than 1.8 units
    // tall, throwing off every relative-scale decision made for vehicles).
    const box = computeBindPoseBoundingBox(scene);
    const height = Math.max(0.1, box.max.y - box.min.y);
    const scale = TARGET_HEIGHT / height;
    scene.scale.setScalar(scale);
    scene.position.y = -box.min.y * scale;

    actions?.Idle?.reset().play();
    currentAction.current = "Idle";
  }, [scene, actions]);

  useEffect(() => {
    onReady({
      setAnimState: (speed, grounded, justJumped) => {
        if (!actions) return;
        let next = "Idle";
        if (justJumped && actions.Jump) next = "Jump";
        else if (!grounded) return; // keep whatever's playing through the air
        else if (speed > 7.5) next = "Running";
        else if (speed > 0.6) next = "Walking";
        if (next === currentAction.current) return;
        const nextAction = actions[next as keyof typeof actions];
        if (!nextAction) return;
        if (currentAction.current) actions[currentAction.current as keyof typeof actions]?.fadeOut(0.25);
        nextAction.reset().fadeIn(0.25).play();
        currentAction.current = next;
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions]);

  return <primitive ref={group} object={scene} />;
}

/** Hand-built, hand-animated low-poly humanoid (torso/head/arms/legs hierarchy) -
 *  a real articulated character, not a static shape. Proportions are set so
 *  its own height matches TARGET_HEIGHT, same as the GLTF path. */
function FallbackCharacter({ onReady, scheme }: { onReady: (h: CharacterHandle) => void; scheme: ProceduralColorScheme }) {
  const leftLeg = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const phase = useRef(0);
  const state = useRef({ speed: 0, grounded: true });

  useEffect(() => {
    onReady({ setAnimState: (speed, grounded) => { state.current = { speed, grounded }; } });
  }, [onReady]);

  useFrame((_, dt) => {
    const { speed, grounded } = state.current;
    const cycleSpeed = grounded ? Math.min(speed, 14) * 2.2 : 0;
    phase.current += dt * cycleSpeed;
    const swing = grounded ? Math.sin(phase.current) * Math.min(0.9, speed * 0.09) : 0;
    if (leftLeg.current) leftLeg.current.rotation.x = grounded ? swing : -0.5;
    if (rightLeg.current) rightLeg.current.rotation.x = grounded ? -swing : 0.6;
    if (leftArm.current) leftArm.current.rotation.x = -swing * 0.8;
    if (rightArm.current) rightArm.current.rotation.x = swing * 0.8;
    if (torso.current) torso.current.rotation.x = THREE.MathUtils.lerp(torso.current.rotation.x, grounded ? Math.min(speed * 0.02, 0.18) : 0, dt * 4);
  });

  // Total height: legs (0.72) + torso (0.72) + head radius (0.52) ~= 1.8, matching TARGET_HEIGHT.
  return (
    <group ref={torso} position={[0, 1.05, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.62, 0.72, 0.36]} />
        <meshStandardMaterial color={scheme.body} emissive={scheme.bodyEmissive} roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.55, 0]} castShadow>
        <sphereGeometry args={[0.26, 16, 12]} />
        <meshStandardMaterial color={scheme.head} roughness={0.7} />
      </mesh>
      <group ref={leftArm} position={[-0.42, 0.34, 0]}>
        <mesh position={[0, -0.31, 0]} castShadow>
          <boxGeometry args={[0.16, 0.62, 0.16]} />
          <meshStandardMaterial color={scheme.arms} roughness={0.7} />
        </mesh>
      </group>
      <group ref={rightArm} position={[0.42, 0.34, 0]}>
        <mesh position={[0, -0.31, 0]} castShadow>
          <boxGeometry args={[0.16, 0.62, 0.16]} />
          <meshStandardMaterial color={scheme.arms} roughness={0.7} />
        </mesh>
      </group>
      <group ref={leftLeg} position={[-0.18, -0.36, 0]}>
        <mesh position={[0, -0.36, 0]} castShadow>
          <boxGeometry args={[0.2, 0.72, 0.2]} />
          <meshStandardMaterial color={scheme.legs} roughness={0.7} />
        </mesh>
      </group>
      <group ref={rightLeg} position={[0.18, -0.36, 0]}>
        <mesh position={[0, -0.36, 0]} castShadow>
          <boxGeometry args={[0.2, 0.72, 0.2]} />
          <meshStandardMaterial color={scheme.legs} roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
}

CHARACTERS.filter((c) => c.url).forEach((c) => useGLTF.preload(c.url!));
