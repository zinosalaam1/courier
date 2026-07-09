import * as THREE from "three";

export function makeFacadeTexture(seed: number): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#0c1118"; ctx.fillRect(0, 0, 128, 256);
  const cols = 6, rows = 12;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const lit = Math.abs(Math.sin(x * 12.9898 + y * 78.233 + seed * 37.1) * 43758.5453) % 1 > 0.45;
      if (lit) {
        ctx.fillStyle = Math.random() > 0.85 ? "#ff3b3b" : "#ffd98a";
        ctx.globalAlpha = 0.75 + Math.random() * 0.25;
        ctx.fillRect(x * (128 / cols) + 3, y * (256 / rows) + 3, 128 / cols - 6, 256 / rows - 6);
      }
    }
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeSignTexture(text: string, color: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 64;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, 256, 64);
  ctx.font = "bold 34px Arial Narrow, sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.shadowColor = color; ctx.shadowBlur = 18;
  ctx.fillStyle = color;
  ctx.fillText(text.toUpperCase(), 128, 34);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeRoadTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#15181e";
  ctx.fillRect(0, 0, 128, 128);
  // Non-directional asphalt speckle - safe to tile/repeat at any orientation
  // without needing to reason about texture rotation vs. mesh rotation.
  // Lane markings are separate, simple axis-aligned box meshes (see Roads.tsx)
  // rather than baked into this texture, specifically to avoid combining
  // multiple Euler rotations for road orientation, which is easy to get
  // subtly wrong and hard to verify without running the app.
  for (let i = 0; i < 500; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.035})`;
    ctx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}


export function makeSkyTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 2; c.height = 256;
  const ctx = c.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0.0, "#0a0f1c");
  grad.addColorStop(0.35, "#161c33");
  grad.addColorStop(0.62, "#3a2a4a");
  grad.addColorStop(0.8, "#6b3550");
  grad.addColorStop(1.0, "#c8f135");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 2, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
