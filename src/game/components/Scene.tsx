import { useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { City } from "./City";
import { Player } from "./Player";
import { HazardCars, type HazardCarsHandle } from "./HazardCars";
import { GadgetEffects, type GadgetEffectsHandle } from "./GadgetEffects";
import { EventsController } from "./EventsController";
import { Rain } from "./Rain";
import { makeSkyTexture } from "./textures";
import { createWorldRefs } from "./worldRefs";
import type { VehicleDef, WeeklyThemeDef } from "../data/gameData";

interface SceneProps {
  vehicle: VehicleDef;
  theme: WeeklyThemeDef | null;
}

/** Renders once per mission (key={missionId} from the parent) so world refs and
 *  player physics state are always fresh for a new contract. */
export function Scene({ vehicle, theme }: SceneProps) {
  const world = useMemo(() => createWorldRefs(), []);
  const hazardCarsRef = useRef<HazardCarsHandle>(null);
  const gadgetEffectsRef = useRef<GadgetEffectsHandle>(null);

  return (
    <Canvas
      shadows
      camera={{ fov: 58, near: 0.1, far: 900, position: [0, 4.5, -68] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.15;
        gl.outputColorSpace = THREE.SRGBColorSpace;
      }}
    >
      <SceneContents
        world={world}
        vehicle={vehicle}
        theme={theme}
        hazardCarsRef={hazardCarsRef}
        gadgetEffectsRef={gadgetEffectsRef}
      />
    </Canvas>
  );
}

function SceneContents({
  world, vehicle, theme, hazardCarsRef, gadgetEffectsRef,
}: SceneProps & {
  world: ReturnType<typeof createWorldRefs>;
  hazardCarsRef: RefObject<HazardCarsHandle>;
  gadgetEffectsRef: RefObject<GadgetEffectsHandle>;
}) {
  const { scene } = useThree();
  const skyTexture = useMemo(() => makeSkyTexture(), []);

  useMemo(() => {
    scene.fog = new THREE.FogExp2(0x0a0e14, world.fogDensity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  useFrame(() => {
    // Blackout event dims these live; kept here (rather than JSX props) since
    // world.blackout can flip mid-mission without a React re-render.
    const sun = scene.getObjectByName("sun-light") as THREE.DirectionalLight | undefined;
    const hemi = scene.getObjectByName("hemi-light") as THREE.HemisphereLight | undefined;
    if (sun) sun.intensity = world.blackout ? 0.06 : 1.1;
    if (hemi) hemi.intensity = world.blackout ? 0.12 : 0.65;
  });

  return (
    <>
      <mesh>
        <sphereGeometry args={[400, 24, 16]} />
        <meshBasicMaterial map={skyTexture} side={THREE.BackSide} fog={false} />
      </mesh>

      <hemisphereLight name="hemi-light" args={[0x2a3550, 0x0a0806, 0.65]} />
      <directionalLight
        name="sun-light"
        position={[80, 140, 60]}
        intensity={1.1}
        color="#ffd9a0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-110}
        shadow-camera-right={110}
        shadow-camera-top={110}
        shadow-camera-bottom={-110}
        shadow-camera-near={1}
        shadow-camera-far={350}
        shadow-bias={-0.0005}
      />
      <directionalLight position={[-60, 40, -80]} intensity={0.35} color="#c8f135" />

      <City world={world} theme={theme} />
      <Player world={world} vehicle={vehicle} gadgetEffectsRef={gadgetEffectsRef} hazardCarsRef={hazardCarsRef} />
      <HazardCars ref={hazardCarsRef} world={world} />
      <GadgetEffects ref={gadgetEffectsRef} world={world} />
      <EventsController world={world} theme={theme} hazardCarsRef={hazardCarsRef} />
      <Rain active={Boolean(theme?.mods.rainVisual)} citySize={world.citySize} />
    </>
  );
}
