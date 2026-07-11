import { useMemo } from "react";
import * as THREE from "three";

function makeCloudTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, 256, 128);
  const blobs = [
    [90, 70, 55], [150, 65, 60], [110, 45, 40], [170, 50, 35], [60, 75, 30], [200, 75, 28],
  ];
  for (const [x, y, r] of blobs) {
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, "rgba(255,255,255,0.9)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface CloudSpec { x: number; y: number; z: number; scale: number; rotationY: number; opacity: number; }

export function Clouds({ citySize }: { citySize: number }) {
  const texture = useMemo(() => makeCloudTexture(), []);
  const clouds = useMemo<CloudSpec[]>(() => {
    const list: CloudSpec[] = [];
    for (let i = 0; i < 24; i++) {
      list.push({
        x: (Math.random() - 0.5) * citySize * 1.6,
        y: 90 + Math.random() * 60,
        z: (Math.random() - 0.5) * citySize * 1.6,
        scale: 18 + Math.random() * 22,
        rotationY: Math.random() * Math.PI * 2,
        opacity: 0.35 + Math.random() * 0.35,
      });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [citySize]);

  return (
    <group>
      {clouds.map((c, i) => (
        <mesh key={i} position={[c.x, c.y, c.z]} rotation={[0, c.rotationY, 0]}>
          <planeGeometry args={[c.scale, c.scale * 0.5]} />
          <meshBasicMaterial map={texture} transparent opacity={c.opacity} depthWrite={false} fog={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}
