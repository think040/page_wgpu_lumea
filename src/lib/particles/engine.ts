import { mat4, vec4 } from "wgpu-matrix";
import computeSource from "@/shaders/particles.compute.wgsl";
import renderSource from "@/shaders/particles.render.wgsl";
import { loadWordmarkFont, sampleWord, type WordMask } from "./wordmark";

const PARTICLE_FLOATS = 8; // pos(2) vel(2) home(2) seed kind
const PARTICLE_BYTES = PARTICLE_FLOATS * 4;
const SIM_BYTES = 64;
const VIEW_BYTES = 80;
const WORKGROUP = 256;

const CAMERA_Z = 3.2;
const FOV = (45 * Math.PI) / 180;

export type PointerState = { x: number; y: number; active: boolean };

/** Most particles trace the wordmark; the rest drift as an ambient field. */
function buildParticles(count: number, mask: WordMask): Float32Array<ArrayBuffer> {
  const data = new Float32Array(new ArrayBuffer(count * PARTICLE_BYTES));
  const pts = mask.points;
  const nPts = pts.length / 2;
  const textShare = nPts > 0 ? 0.8 : 0;

  for (let i = 0; i < count; i++) {
    let hx: number;
    let hy: number;
    let kind = 0;

    if (Math.random() < textShare) {
      const k = Math.floor(Math.random() * nPts) * 2;
      hx = pts[k] + (Math.random() * 2 - 1) * mask.jitter;
      hy = pts[k + 1] + (Math.random() * 2 - 1) * mask.jitter;
    } else {
      // ambient field, normalized to [-1, 1]
      hx = Math.random() * 2 - 1;
      hy = Math.random() * 2 - 1;
      kind = 1;
    }

    const o = i * PARTICLE_FLOATS;
    // start scattered so the word gathers on first frame
    data[o + 0] = (Math.random() * 2 - 1) * 2.5;
    data[o + 1] = (Math.random() * 2 - 1) * 1.5;
    data[o + 2] = 0;
    data[o + 3] = 0;
    data[o + 4] = hx;
    data[o + 5] = hy;
    data[o + 6] = Math.random();
    data[o + 7] = kind;
  }
  return data;
}

export class ParticleEngine {
  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private format!: GPUTextureFormat;
  private computePipeline!: GPUComputePipeline;
  private renderPipeline!: GPURenderPipeline;
  private simBuffer!: GPUBuffer;
  private viewBuffer!: GPUBuffer;
  private particleBuffer: GPUBuffer | null = null;
  private computeBindGroup: GPUBindGroup | null = null;
  private renderBindGroup: GPUBindGroup | null = null;

  private count = 0;
  private mask: WordMask = { points: new Float32Array(), aspect: 5, jitter: 0 };
  private word = "";
  private simData = new ArrayBuffer(SIM_BYTES);
  private simF32 = new Float32Array(this.simData);
  private simU32 = new Uint32Array(this.simData);
  private viewData: Float32Array<ArrayBuffer> = new Float32Array(new ArrayBuffer(VIEW_BYTES));

  private viewProj = mat4.identity();
  private invViewProj = mat4.identity();

  private lastTime = 0;
  private time = 0;
  private ghostStrength = 0;
  private scrollVelSmoothed = 0;
  private destroyed = false;

  /** Scroll progress through the hero, 0..1. */
  scrollProgress = 0;
  /** Instantaneous scroll velocity in px per frame (signed). */
  scrollVelocity = 0;
  pointer: PointerState = { x: 0, y: 0, active: false };

  constructor(private canvas: HTMLCanvasElement) {}

  /** Returns false when the browser cannot run the effect. */
  static isSupported(): boolean {
    return typeof navigator !== "undefined" && "gpu" in navigator;
  }

  async init(count: number, word: string): Promise<boolean> {
    if (!ParticleEngine.isSupported()) return false;
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return false;
    this.device = await adapter.requestDevice();
    if (this.destroyed) {
      this.device.destroy();
      return false;
    }
    this.device.lost.then(() => {
      this.destroyed = true;
    });

    const ctx = this.canvas.getContext("webgpu");
    if (!ctx) return false;
    this.context = ctx;
    this.format = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({ device: this.device, format: this.format, alphaMode: "premultiplied" });

    const computeModule = this.device.createShaderModule({ code: computeSource });
    const renderModule = this.device.createShaderModule({ code: renderSource });

    this.computePipeline = this.device.createComputePipeline({
      layout: "auto",
      compute: { module: computeModule, entryPoint: "main" },
    });

    const additive: GPUBlendComponent = { srcFactor: "one", dstFactor: "one", operation: "add" };
    this.renderPipeline = this.device.createRenderPipeline({
      layout: "auto",
      vertex: { module: renderModule, entryPoint: "vs" },
      fragment: {
        module: renderModule,
        entryPoint: "fs",
        targets: [{ format: this.format, blend: { color: additive, alpha: additive } }],
      },
      primitive: { topology: "triangle-list" },
    });

    this.simBuffer = this.device.createBuffer({
      size: SIM_BYTES,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.viewBuffer = this.device.createBuffer({
      size: VIEW_BYTES,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    await loadWordmarkFont();
    if (this.destroyed) return false;
    this.word = word;
    this.mask = sampleWord(word);
    this.setCount(count);
    return true;
  }

  /** Re-traces the particles onto a new word. */
  setWord(word: string) {
    if (!this.device || word === this.word) return;
    this.word = word;
    this.mask = sampleWord(word);
    this.rebuild(this.count);
  }

  /** Rebuilds the particle buffer; the pipelines are reused. */
  setCount(count: number) {
    if (!this.device || count === this.count) return;
    this.rebuild(count);
  }

  private rebuild(count: number) {
    this.count = count;
    this.particleBuffer?.destroy();
    const data = buildParticles(count, this.mask);
    this.particleBuffer = this.device.createBuffer({
      size: count * PARTICLE_BYTES,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(this.particleBuffer, 0, data);

    this.computeBindGroup = this.device.createBindGroup({
      layout: this.computePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.particleBuffer } },
        { binding: 1, resource: { buffer: this.simBuffer } },
      ],
    });
    this.renderBindGroup = this.device.createBindGroup({
      layout: this.renderPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.particleBuffer } },
        { binding: 1, resource: { buffer: this.viewBuffer } },
      ],
    });
  }

  resize(cssWidth: number, cssHeight: number, dpr: number) {
    const w = Math.max(1, Math.floor(cssWidth * dpr));
    const h = Math.max(1, Math.floor(cssHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  private updateCamera(aspect: number) {
    const tilt = this.scrollProgress * 0.85;
    const spin = this.scrollProgress * 0.5 + Math.sin(this.time * 0.15) * 0.04;

    const proj = mat4.perspective(FOV, aspect, 0.1, 50);
    const view = mat4.lookAt([0, 0, CAMERA_Z], [0, 0, 0], [0, 1, 0]);
    const model = mat4.identity();
    mat4.rotateX(model, -tilt, model);
    mat4.rotateZ(model, spin, model);

    mat4.multiply(proj, view, this.viewProj);
    mat4.multiply(this.viewProj, model, this.viewProj);
    mat4.inverse(this.viewProj, this.invViewProj);
  }

  /** Projects a canvas-space CSS pixel onto the particle plane (z = 0, model space). */
  private unproject(px: number, py: number, cssW: number, cssH: number): [number, number] {
    const ndcX = (px / cssW) * 2 - 1;
    const ndcY = 1 - (py / cssH) * 2;
    const near = vec4.transformMat4([ndcX, ndcY, 0, 1], this.invViewProj);
    const far = vec4.transformMat4([ndcX, ndcY, 1, 1], this.invViewProj);
    const nz = near[2] / near[3];
    const fz = far[2] / far[3];
    const t = Math.abs(fz - nz) < 1e-6 ? 0 : -nz / (fz - nz);
    const x = near[0] / near[3] + (far[0] / far[3] - near[0] / near[3]) * t;
    const y = near[1] / near[3] + (far[1] / far[3] - near[1] / near[3]) * t;
    return [x, y];
  }

  /** Advances and draws one frame. `now` in milliseconds. */
  frame(now: number, cssW: number, cssH: number) {
    if (this.destroyed || !this.particleBuffer || !this.computeBindGroup || !this.renderBindGroup) return;

    const dt = this.lastTime ? Math.min((now - this.lastTime) / 1000, 1 / 30) : 1 / 60;
    this.lastTime = now;
    this.time += dt;

    const aspect = cssW / cssH;
    this.updateCamera(aspect);

    const halfHeight = Math.tan(FOV / 2) * CAMERA_Z;
    const halfWidth = halfHeight * aspect;
    const wide = aspect > 1.15;
    // the word spans most of the canvas width; the copy sits in the lower left
    const baseScale = halfWidth * (wide ? 0.86 : 0.9);
    const textHalfHeight = baseScale / this.mask.aspect;
    const offsetX = 0;
    const offsetY = wide ? halfHeight * 0.2 : halfHeight * 0.34;
    const spread = baseScale * (1 + this.scrollProgress * 0.6);
    const radius = Math.min(0.36, Math.max(0.12, textHalfHeight * 1.1));

    // scroll velocity drives the swirl and a ghost pointer that sweeps across the word
    const vel = Math.max(-60, Math.min(60, this.scrollVelocity));
    this.scrollVelocity *= 0.85;
    this.scrollVelSmoothed += (vel - this.scrollVelSmoothed) * Math.min(1, dt * 8);
    const targetGhost = Math.min(1, Math.abs(this.scrollVelSmoothed) / 12);
    this.ghostStrength += (targetGhost - this.ghostStrength) * Math.min(1, dt * 6);
    const ghostX = offsetX + Math.sin(this.time * 0.9 + this.scrollProgress * 7) * spread * 0.9;
    const ghostY = offsetY + Math.cos(this.time * 1.7) * textHalfHeight * 0.7;

    const [mx, my] = this.pointer.active
      ? this.unproject(this.pointer.x, this.pointer.y, cssW, cssH)
      : [9999, 9999];

    const f = this.simF32;
    f[0] = mx;
    f[1] = my;
    f[2] = ghostX;
    f[3] = ghostY;
    f[4] = offsetX;
    f[5] = offsetY;
    f[6] = dt;
    f[7] = this.time;
    f[8] = radius; // repel radius in world units
    f[9] = 26; // repel strength
    f[10] = this.pointer.active ? 1 : 0;
    f[11] = this.ghostStrength;
    f[12] = this.scrollVelSmoothed * 0.004;
    f[13] = spread;
    f[14] = halfWidth;
    this.simU32[15] = this.count;
    this.device.queue.writeBuffer(this.simBuffer, 0, this.simData);

    const v = this.viewData;
    v.set(this.viewProj, 0);
    v[16] = this.canvas.width;
    v[17] = this.canvas.height;
    v[18] = Math.max(1.6, this.canvas.height / 470); // sprite radius in device pixels
    v[19] = this.time;
    this.device.queue.writeBuffer(this.viewBuffer, 0, v);

    const encoder = this.device.createCommandEncoder();
    const cpass = encoder.beginComputePass();
    cpass.setPipeline(this.computePipeline);
    cpass.setBindGroup(0, this.computeBindGroup);
    cpass.dispatchWorkgroups(Math.ceil(this.count / WORKGROUP));
    cpass.end();

    const rpass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    rpass.setPipeline(this.renderPipeline);
    rpass.setBindGroup(0, this.renderBindGroup);
    rpass.draw(6, this.count);
    rpass.end();

    this.device.queue.submit([encoder.finish()]);
  }

  /** Call after a pause so the next frame does not integrate a huge dt. */
  resetClock() {
    this.lastTime = 0;
  }

  destroy() {
    this.destroyed = true;
    this.particleBuffer?.destroy();
    this.simBuffer?.destroy();
    this.viewBuffer?.destroy();
    this.device?.destroy();
  }
}
