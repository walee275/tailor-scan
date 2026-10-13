import type { Flare } from "@tailor-scan/core";
import { ramanujanCircumference } from "@tailor-scan/core";

export type LoftDims = {
  chestCm: number;
  waistCm: number;
  sleeveCm: number;
  lengthCm: number;
  flare: Flare;
};

export type LoftHandle = {
  update: (dims: LoftDims) => void;
  dispose: () => void;
};

export async function mountLoft(canvas: HTMLCanvasElement, initial: LoftDims): Promise<LoftHandle> {
  const THREE = await import("three");
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(canvas.clientWidth || 320, canvas.clientHeight || 220, false);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 320 / 220, 0.1, 100);
  camera.position.set(0, 0.2, 4.2);
  const group = new THREE.Group();
  scene.add(group);
  scene.add(new THREE.AmbientLight(0xf4efe4, 0.85));
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(2, 3, 4);
  scene.add(key);
  let torso = new THREE.Mesh(buildTorso(THREE, initial), material(THREE));
  let sleeves = sleeveMeshes(THREE, initial);
  group.add(torso, ...sleeves);
  let frame = 0;
  const draw = () => {
    frame = requestAnimationFrame(draw);
    renderer.render(scene, camera);
  };
  draw();
  const onPointer = (event: PointerEvent) => {
    group.rotation.y += event.movementX * 0.01;
  };
  canvas.addEventListener("pointermove", onPointer);
  return {
    update(dims) {
      group.remove(torso, ...sleeves);
      torso.geometry.dispose();
      sleeves.forEach((mesh) => mesh.geometry.dispose());
      torso = new THREE.Mesh(buildTorso(THREE, dims), material(THREE));
      sleeves = sleeveMeshes(THREE, dims);
      group.add(torso, ...sleeves);
    },
    dispose() {
      cancelAnimationFrame(frame);
      canvas.removeEventListener("pointermove", onPointer);
      torso.geometry.dispose();
      sleeves.forEach((mesh) => mesh.geometry.dispose());
      renderer.dispose();
    },
  };
}

type ThreeModule = typeof import("three");

function material(THREE: ThreeModule) {
  return new THREE.MeshStandardMaterial({ color: 0x1f3a34, roughness: 0.72, metalness: 0 });
}

function buildTorso(THREE: ThreeModule, dims: LoftDims) {
  const chest = axes(dims.chestCm, 0.7);
  const waist = axes(dims.waistCm, 0.75);
  const hip = { width: waist.width * 1.08, depth: waist.depth * 1.08 };
  const hemScale = dims.flare === "aline" ? 1.45 : dims.flare === "none" ? 1 : 1.08;
  const hem = { width: waist.width * hemScale, depth: waist.depth * hemScale };
  const length = Math.max(40, dims.lengthCm) / 100;
  const rings = [
    ring(THREE, length * 0.5, 0.12, 0.1),
    ring(THREE, length * 0.28, chest.width / 200, chest.depth / 200),
    ring(THREE, length * 0.05, waist.width / 200, waist.depth / 200),
    ring(THREE, -length * 0.12, hip.width / 200, hip.depth / 200),
    ring(THREE, -length * 0.5, hem.width / 200, hem.depth / 200),
  ];
  return loftGeometry(THREE, rings);
}

function sleeveMeshes(THREE: ThreeModule, dims: LoftDims) {
  const length = Math.max(20, dims.sleeveCm) / 100;
  return ([-1, 1] as const).map((side) => {
    const geometry = new THREE.CylinderGeometry(0.045, 0.03, length, 8);
    geometry.translate(0, -length / 2, 0);
    geometry.rotateZ(side * 0.9);
    geometry.translate(side * 0.28, 0.35, 0);
    return new THREE.Mesh(geometry, material(THREE));
  });
}

function axes(girthCm: number, prior: number): { width: number; depth: number } {
  const unit = ramanujanCircumference(1, prior);
  const semi = girthCm / unit;
  return { width: semi * 2, depth: semi * 2 * prior };
}

function ring(THREE: ThreeModule, y: number, rx: number, rz: number) {
  const points = [];
  const steps = 16;
  for (let index = 0; index < steps; index += 1) {
    const angle = (index / steps) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * rx, y, Math.sin(angle) * rz));
  }
  return points;
}

function loftGeometry(THREE: ThreeModule, rings: Array<Array<{ x: number; y: number; z: number }>>) {
  const positions: number[] = [];
  const steps = rings[0]?.length ?? 0;
  for (let band = 0; band < rings.length - 1; band += 1) {
    for (let index = 0; index < steps; index += 1) {
      const next = (index + 1) % steps;
      const a = rings[band]![index]!;
      const b = rings[band]![next]!;
      const c = rings[band + 1]![index]!;
      const d = rings[band + 1]![next]!;
      positions.push(a.x, a.y, a.z, c.x, c.y, c.z, b.x, b.y, b.z);
      positions.push(b.x, b.y, b.z, c.x, c.y, c.z, d.x, d.y, d.z);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}
