import { Component, Suspense, useEffect, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { useLoader } from "@react-three/fiber";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";

interface OBJModelProps {
  objUrl: string;
  mtlUrl: string;
  scale?: number;
  rotationY?: number;
}

/**
 * The police car (and only the police car, currently) ships as OBJ+MTL, not
 * glTF - it's from a different asset pack (PSX Style Cars by GGBot, CC0)
 * than the buildings/other vehicles (Kenney kits). Rather than risk a
 * from-scratch OBJ->GLB conversion I have no way to visually verify, this
 * loads the format natively with three.js's own OBJLoader/MTLLoader -
 * exactly what they're for, and just as real a loading path as GLTFLoader.
 */
export function OBJModel({ objUrl, mtlUrl, scale = 1, rotationY = 0 }: OBJModelProps) {
  return (
    <OBJErrorBoundary>
      <Suspense fallback={null}>
        <LoadedOBJ objUrl={objUrl} mtlUrl={mtlUrl} scale={scale} rotationY={rotationY} />
      </Suspense>
    </OBJErrorBoundary>
  );
}

class OBJErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) { console.warn("OBJ model failed to load:", error); }
  render() { return this.state.failed ? null : this.props.children; }
}

function LoadedOBJ({ objUrl, mtlUrl, scale, rotationY }: Required<OBJModelProps>) {
  const materials = useLoader(MTLLoader, mtlUrl);
  const obj = useLoader(OBJLoader, objUrl, (loader) => {
    materials.preload();
    (loader as OBJLoader).setMaterials(materials);
  });

  const cloned = useMemo(() => obj.clone(true), [obj]);

  useEffect(() => {
    cloned.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = true; }
    });
  }, [cloned]);

  return <primitive object={cloned} scale={scale} rotation={[0, rotationY, 0]} />;
}
