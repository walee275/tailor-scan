declare module "three" {
  export class Vector3 {
    constructor(x?: number, y?: number, z?: number);
    x: number;
    y: number;
    z: number;
  }
  export class WebGLRenderer {
    constructor(params?: { canvas?: HTMLCanvasElement; alpha?: boolean; antialias?: boolean });
    setSize(width: number, height: number, updateStyle?: boolean): void;
    render(scene: object, camera: object): void;
    dispose(): void;
  }
  export class Scene {
    add(...objects: object[]): void;
  }
  export class PerspectiveCamera {
    constructor(fov: number, aspect: number, near: number, far: number);
    position: { set(x: number, y: number, z: number): void };
  }
  export class Group {
    add(...objects: object[]): void;
    remove(...objects: object[]): void;
    rotation: { y: number };
  }
  export class AmbientLight {
    constructor(color: number, intensity?: number);
  }
  export class DirectionalLight {
    constructor(color: number, intensity?: number);
    position: { set(x: number, y: number, z: number): void };
  }
  export class MeshStandardMaterial {
    constructor(params?: object);
  }
  export class Mesh {
    constructor(geometry: BufferGeometry, material: object);
    geometry: BufferGeometry;
  }
  export class CylinderGeometry extends BufferGeometry {
    constructor(radiusTop: number, radiusBottom: number, height: number, segments: number);
    translate(x: number, y: number, z: number): this;
    rotateZ(angle: number): this;
  }
  export class BufferGeometry {
    setAttribute(name: string, attribute: object): void;
    computeVertexNormals(): void;
    dispose(): void;
  }
  export class Float32BufferAttribute {
    constructor(array: number[], itemSize: number);
  }
}
