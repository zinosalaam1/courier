import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ChaosCity } from "./ChaosCity";
import { CharacterModel, type CharacterHandle } from "../components/CharacterModel";
import { useKeyboard } from "../components/useKeyboard";
import { MultiplayerClient, type ChaosSnapshot } from "./MultiplayerClient";

// Module-level constant, not an inline object literal in JSX: R3F re-applies
// the <Canvas camera={...}> prop whenever it changes reference, so a fresh
// object every render would keep resetting the camera to spawn and fight the
// chase-camera logic in LocalPlayer below (see the identical fix + longer
// explanation in ../components/Scene.tsx).
const CAMERA_CONFIG = { fov: 58, near: 0.1, far: 900, position: [0, 4.5, -68] as [number, number, number] };

export function ChaosScene() {
  const [snapshot, setSnapshot] = useState<ChaosSnapshot | null>(null);

  useEffect(() => {
    return MultiplayerClient.onSnapshot(setSnapshot);
  }, []);

  if (!snapshot) {
    return <div className="flex h-full items-center justify-center font-mono text-sm text-[#7a8694]">Connecting to the chaos server…</div>;
  }

  return (
    <Canvas
      shadows
      camera={CAMERA_CONFIG}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.15;
        gl.outputColorSpace = THREE.SRGBColorSpace;
      }}
    >
      <ChaosSceneContents snapshot={snapshot} />
    </Canvas>
  );
}

function ChaosSceneContents({ snapshot }: { snapshot: ChaosSnapshot }) {
  const { scene } = useThree();
  useEffect(() => {
    scene.fog = new THREE.FogExp2(0x0a0e14, 0.011);
    scene.background = new THREE.Color(0x07090c);
  }, [scene]);

  return (
    <>
      <hemisphereLight args={[0x2a3550, 0x0a0806, 0.65]} />
      <directionalLight position={[80, 140, 60]} intensity={1.1} color="#ffd9a0" castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-60, 40, -80]} intensity={0.35} color="#c8f135" />

      <ChaosCity seed={snapshot.seed} />

      {snapshot.hazardCars.map((c) => (
        <mesh key={c.id} position={[c.x, 0.7, c.z]} castShadow>
          <boxGeometry args={[2.2, 1.4, 4]} />
          <meshStandardMaterial color="#ff3b3b" emissive="#330000" />
        </mesh>
      ))}
      {snapshot.blockedZones.map((z) => (
        <mesh key={z.id} position={[z.x, 0.05, z.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[z.radius - 0.3, z.radius, 24]} />
          <meshBasicMaterial color="#ff3b3b" transparent opacity={0.6} />
        </mesh>
      ))}

      {snapshot.players.map((p) =>
        p.sessionId === MultiplayerClient.sessionId
          ? <LocalPlayer key={p.sessionId} player={p} />
          : <RemotePlayer key={p.sessionId} player={p} />
      )}
    </>
  );
}

/** Sends input to the server every frame and renders itself at whatever
 *  position the server last confirmed - no local physics prediction. This is
 *  the simplest version of "authoritative": it costs a little responsiveness
 *  (you'll feel network latency on movement) in exchange for being provably
 *  correct and not fighting the server's simulation. Client-side prediction +
 *  reconciliation is the natural next optimization once this feels solid. */
function LocalPlayer({ player }: { player: ChaosSnapshot["players"][number] }) {
  const groupRef = useRef<THREE.Group>(null);
  const characterHandle = useRef<CharacterHandle | null>(null);
  const keys = useKeyboard();
  const { camera } = useThree();

  useFrame(() => {
    let turn = 0, move = 0;
    if (keys.current["a"] || keys.current["arrowleft"]) turn += 1;
    if (keys.current["d"] || keys.current["arrowright"]) turn -= 1;
    if (keys.current["w"] || keys.current["arrowup"]) move += 1;
    if (keys.current["s"] || keys.current["arrowdown"]) move -= 1;
    MultiplayerClient.sendInput(turn, move, Boolean(keys.current[" "]));

    if (groupRef.current) {
      groupRef.current.position.set(player.x, player.y, player.z);
      groupRef.current.rotation.y = player.yaw;
    }
    const camOffset = new THREE.Vector3(-Math.sin(player.yaw) * 8, 4.5, -Math.cos(player.yaw) * 8);
    camera.position.lerp(new THREE.Vector3(player.x, 0, player.z).add(camOffset), 0.1);
    camera.lookAt(player.x, player.y + 1.2, player.z);

    const speed = Math.abs(move) * 10;
    characterHandle.current?.setAnimState(speed, true, false);
  });

  return (
    <group ref={groupRef}>
      <CharacterModel onReady={(h) => { characterHandle.current = h; }} />
    </group>
  );
}

/** Every other player, driven purely by server snapshots. */
function RemotePlayer({ player }: { player: ChaosSnapshot["players"][number] }) {
  const groupRef = useRef<THREE.Group>(null);
  const characterHandle = useRef<CharacterHandle | null>(null);
  const lastPos = useRef(new THREE.Vector3(player.x, player.y, player.z));

  useFrame((_, dt) => {
    if (!groupRef.current) return;
    const target = new THREE.Vector3(player.x, player.y, player.z);
    groupRef.current.position.lerp(target, Math.min(1, dt * 12)); // smooth over network jitter
    groupRef.current.rotation.y = player.yaw;
    groupRef.current.visible = !player.smoked;

    const speed = lastPos.current.distanceTo(target) / Math.max(dt, 0.001);
    characterHandle.current?.setAnimState(Math.min(speed, 14), true, false);
    lastPos.current.copy(target);
  });

  return (
    <group ref={groupRef}>
      <CharacterModel onReady={(h) => { characterHandle.current = h; }} />
    </group>
  );
}
