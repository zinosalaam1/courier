import { Component, Suspense, useEffect, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { useGLTF, useAnimations } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";

const CHARACTER_URL = "https://threejs.org/examples/models/gltf/RobotExpressive/RobotExpressive.glb";

export interface CharacterHandle {
  setAnimState: (speed: number, grounded: boolean, justJumped: boolean) => void;
}

/**
 * Real rigged/animated character via GLTF (Idle/Walking/Running/Jump), with a
 * hand-built, hand-animated procedural fallback if the model can't load - no
 * network, a blocked CDN, whatever. `useGLTF` is Suspense-based (it throws a
 * promise while loading, not a catchable error), so the loading state is
 * handled by <Suspense> and load *failure* is handled by a real error
 * boundary - not a try/catch, which would incorrectly swallow the Suspense
 * promise and break the loading state entirely.
 */
export function CharacterModel({ onReady }: { onReady: (handle: CharacterHandle) => void }) {
  return (
    <CharacterErrorBoundary fallback={<FallbackCharacter onReady={onReady} />}>
      <Suspense fallback={null}>
        <GltfCharacter onReady={onReady} />
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

function GltfCharacter({ onReady }: { onReady: (h: CharacterHandle) => void }) {
  const group = useRef<THREE.Group>(null);
  const gltf = useGLTF(CHARACTER_URL); // suspends until loaded, or throws for the error boundary above
  const { scene, animations } = gltf;
  const { actions } = useAnimations(animations, group);
  const currentAction = useRef<string | null>(null);

  useEffect(() => {
    // Normalize scale so the model is ~1.8 world units tall with feet at y=0,
    // regardless of the source model's original unit scale.
    const box = new THREE.Box3().setFromObject(scene);
    const height = Math.max(0.1, box.max.y - box.min.y);
    const scale = 1.8 / height;
    scene.scale.setScalar(scale);
    const box2 = new THREE.Box3().setFromObject(scene);
    scene.position.y -= box2.min.y;
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = true; }
    });
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
 *  a real articulated character, not a static shape. */
function FallbackCharacter({ onReady }: { onReady: (h: CharacterHandle) => void }) {
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

  return (
    <group ref={torso} position={[0, 1.05, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.62, 0.72, 0.36]} />
        <meshStandardMaterial color="#c8f135" emissive="#1a2000" roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.55, 0]} castShadow>
        <sphereGeometry args={[0.26, 16, 12]} />
        <meshStandardMaterial color="#1c2430" roughness={0.7} />
      </mesh>
      <group ref={leftArm} position={[-0.42, 0.34, 0]}>
        <mesh position={[0, -0.31, 0]} castShadow>
          <boxGeometry args={[0.16, 0.62, 0.16]} />
          <meshStandardMaterial color="#2a3140" roughness={0.7} />
        </mesh>
      </group>
      <group ref={rightArm} position={[0.42, 0.34, 0]}>
        <mesh position={[0, -0.31, 0]} castShadow>
          <boxGeometry args={[0.16, 0.62, 0.16]} />
          <meshStandardMaterial color="#2a3140" roughness={0.7} />
        </mesh>
      </group>
      <group ref={leftLeg} position={[-0.18, -0.36, 0]}>
        <mesh position={[0, -0.36, 0]} castShadow>
          <boxGeometry args={[0.2, 0.72, 0.2]} />
          <meshStandardMaterial color="#11151c" roughness={0.7} />
        </mesh>
      </group>
      <group ref={rightLeg} position={[0.18, -0.36, 0]}>
        <mesh position={[0, -0.36, 0]} castShadow>
          <boxGeometry args={[0.2, 0.72, 0.2]} />
          <meshStandardMaterial color="#11151c" roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
}

useGLTF.preload(CHARACTER_URL);
