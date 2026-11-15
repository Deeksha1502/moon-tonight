// A 3D moon you can drag to spin, lit by the sun the way it is tonight.
import {
  AmbientLight, CanvasTexture, DirectionalLight, Mesh, MeshStandardMaterial, PerspectiveCamera,
  Quaternion, Scene, SphereGeometry, sRGBEncoding, Vector3, WebGLRenderer,
} from "three";
import { MARIA, NAMED_CRATERS } from "./features";
import { fbm3, noise3, seededRandom, smoothstep as ss } from "./noise";

type Vec3 = [number, number, number];

/** Point on the visible disc → unit vector (y up, z toward Earth). */
const fromDisc = (x: number, y: number): Vec3 => [x, -y, Math.sqrt(Math.max(0, 1 - x * x - y * y))];
const fromLatLon = (lat: number, lon: number): Vec3 => [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)];
const DEG = Math.PI / 180;

/** Paint the whole sphere (near and far side) into colour and bump textures. */
function buildTextures(W: number, H: number): { color: HTMLCanvasElement; bump: HTMLCanvasElement } {
  const rand = seededRandom(11);
  const alb = new Float32Array(W * H), hgt = new Float32Array(W * H);
  const P = new Float32Array(W * H * 3), maria = new Float32Array(W * H);
  const moscoviense = fromLatLon(27 * DEG, 147 * DEG);
  const aitken = fromLatLon(-53 * DEG, 191 * DEG);

  for (let j = 0; j < H; j++) {
    const lat = (0.5 - (j + 0.5) / H) * Math.PI;
    for (let i = 0; i < W; i++) {
      const lon = ((i + 0.5) / W) * 2 * Math.PI - Math.PI;
      const [x, y, z] = fromLatLon(lat, lon);
      const k = j * W + i;
      P[k * 3] = x; P[k * 3 + 1] = y; P[k * 3 + 2] = z;
      let a = 0.8 + (fbm3(x * 2 + 7, y * 2, z * 2, 4) - 0.5) * 0.12 + (fbm3(x * 16, y * 16 + 3, z * 16, 3) - 0.5) * 0.08;
      a += Math.max(0, -y) * 0.03;
      // Near-side seas
      let m = 0;
      if (z > -0.25) {
        const dn = (fbm3(x * 2.6 + 11, y * 2.6 + 5, z * 2.6, 4) - 0.5) * 0.9 + (noise3(x * 11, y * 11, z * 11) - 0.5) * 0.18;
        const inner = 0.78 + 0.44 * fbm3(x * 4.5 + 2, y * 4.5 + 7, z * 4.5, 3);
        for (const mare of MARIA) {
          const ex = (x - mare.x) / (mare.rx * 1.22), ey = (-y - mare.y) / (mare.ry * 1.22);
          const v = (1 - ss(0.62, 1.12, Math.sqrt(ex * ex + ey * ey) + dn)) * mare.depth * 1.1 * inner;
          if (v > m) m = v;
        }
        m *= ss(-0.25, 0.15, z);
      }
      // Far side: small Mare Moscoviense and the darker South Pole–Aitken basin
      const dm = Math.acos(Math.min(1, x * moscoviense[0] + y * moscoviense[1] + z * moscoviense[2]));
      m = Math.max(m, (1 - ss(0.08, 0.16, dm + (noise3(x * 9, y * 9, z * 9) - 0.5) * 0.08)) * 0.25);
      const ds = Math.acos(Math.min(1, x * aitken[0] + y * aitken[1] + z * aitken[2]));
      a -= (1 - ss(0.3, 0.75, ds)) * 0.07;
      alb[k] = a - m;
      hgt[k] = (fbm3(x * 20 + 3, y * 20 + 9, z * 20, 3) - 0.5) * 0.15;
      maria[k] = m;
    }
  }

  function crater(c: Vec3, R: number, bright: number): void {
    const lat = Math.asin(c[1]), lon = Math.atan2(c[0], c[2]);
    const ext = R * 1.6;
    const j0 = Math.max(0, Math.floor((0.5 - (lat + ext) / Math.PI) * H));
    const j1 = Math.min(H - 1, Math.ceil((0.5 - (lat - ext) / Math.PI) * H));
    const cl = Math.max(0.05, Math.cos(Math.min(Math.PI / 2 - 0.01, Math.abs(lat) + ext)));
    const lonExt = j0 === 0 || j1 === H - 1 ? Math.PI : ext / cl;
    const i0 = Math.floor(((lon - lonExt + Math.PI) / (2 * Math.PI)) * W);
    const i1 = Math.ceil(((lon + lonExt + Math.PI) / (2 * Math.PI)) * W);
    for (let j = j0; j <= j1; j++) {
      for (let ii = i0; ii <= i1; ii++) {
        const k = j * W + (((ii % W) + W) % W);
        const d = Math.acos(Math.min(1, P[k * 3] * c[0] + P[k * 3 + 1] * c[1] + P[k * 3 + 2] * c[2])) / R;
        if (d > 1.6) continue;
        hgt[k] += d < 1 ? -0.9 * (1 - d * d) + 0.28 * Math.pow(d, 8) : 0.28 * Math.pow(1 - (d - 1) / 0.6, 2);
        const rim = Math.exp(-Math.pow((d - 1) / 0.12, 2));
        alb[k] += rim * 0.015 + (d < 1 ? bright * (1 - d * 0.5) : bright * 0.5 * Math.max(0, 1 - (d - 1) / 0.6));
      }
    }
  }

  // Random craters all over the sphere, fewer inside the seas
  for (let n = 0; n < 1500; n++) {
    const zz = 2 * rand() - 1, t = rand() * 2 * Math.PI, q = Math.sqrt(1 - zz * zz);
    const c: Vec3 = [q * Math.cos(t), zz, q * Math.sin(t)];
    const lat = Math.asin(c[1]), lon = Math.atan2(c[0], c[2]);
    const j = Math.min(H - 1, Math.floor((0.5 - lat / Math.PI) * H));
    const i = Math.min(W - 1, Math.floor(((lon + Math.PI) / (2 * Math.PI)) * W));
    if (maria[j * W + i] > 0.15 && rand() < 0.85) continue;
    crater(c, 0.004 + Math.pow(rand(), 4) * 0.045, 0);
  }
  const named = NAMED_CRATERS.map((n) => ({ ...n, c: fromDisc(n.x, n.y) }));
  for (const n of named) crater(n.c, n.r, n.bright);

  // Bright rays around young craters (Tycho, Copernicus)
  for (const n of named) {
    if (n.rays < 0.2) continue;
    const c = n.c;
    const el = Math.hypot(c[2], c[0]);
    const e: Vec3 = [c[2] / el, 0, -c[0] / el]; // east, perpendicular to north and c
    const nn: Vec3 = [c[1] * e[2] - c[2] * e[1], c[2] * e[0] - c[0] * e[2], c[0] * e[1] - c[1] * e[0]];
    const rays = Array.from({ length: Math.round(10 + 8 * n.rays) }, () => ({
      a: rand() * 2 * Math.PI, w: 0.03 + rand() * 0.05, len: 0.25 + rand() * 0.75 * n.rays,
    }));
    for (let k = 0; k < W * H; k++) {
      const px = P[k * 3], py = P[k * 3 + 1], pz = P[k * 3 + 2];
      const dot = px * c[0] + py * c[1] + pz * c[2];
      if (dot < 0.4) continue;
      const dist = Math.acos(Math.min(1, dot));
      if (dist < n.r * 1.2) continue;
      const ang = Math.atan2(px * nn[0] + py * nn[1] + pz * nn[2], px * e[0] + py * e[1] + pz * e[2]);
      let s = 0;
      for (const r of rays) {
        if (dist > r.len) continue;
        let da = Math.abs(ang - r.a);
        if (da > Math.PI) da = 2 * Math.PI - da;
        s += Math.exp(-Math.pow(da / r.w, 2)) * (1 - dist / r.len);
      }
      alb[k] += Math.min(s, 1) * 0.05 * n.rays * (0.6 + 0.8 * noise3(px * 40, py * 40, pz * 40));
    }
  }

  const color = document.createElement("canvas"), bump = document.createElement("canvas");
  color.width = bump.width = W; color.height = bump.height = H;
  const cctx = color.getContext("2d")!, bctx = bump.getContext("2d")!;
  const ci = cctx.createImageData(W, H), bi = bctx.createImageData(W, H);
  for (let k = 0; k < W * H; k++) {
    const v = Math.max(0, Math.min(1, alb[k])) * 255;
    ci.data[k * 4] = v; ci.data[k * 4 + 1] = v * 0.975; ci.data[k * 4 + 2] = v * 0.93; ci.data[k * 4 + 3] = 255;
    const b = Math.max(0, Math.min(255, 128 + hgt[k] * 90));
    bi.data[k * 4] = bi.data[k * 4 + 1] = bi.data[k * 4 + 2] = b; bi.data[k * 4 + 3] = 255;
  }
  cctx.putImageData(ci, 0, 0);
  bctx.putImageData(bi, 0, 0);
  return { color, bump };
}

export class MoonGlobe {
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new PerspectiveCamera(30, 1, 0.1, 100);
  private mesh: Mesh;
  private sun = new DirectionalLight(0xfff8ec, 2.6);
  private ambient = new AmbientLight(0x8fa4d8, 0.004);
  private home: Quaternion;
  private needsRender = true;
  private velocity = { x: 0, y: 0 };
  private dragging = false;
  private last = { x: 0, y: 0, t: 0 };
  private resetAnim: { from: Quaternion; t0: number } | null = null;

  /** Returns null when WebGL isn't available, so the page can fall back to the 2D moon. */
  static create(host: HTMLElement): MoonGlobe | null {
    try {
      return new MoonGlobe(host, new WebGLRenderer({ antialias: true, alpha: true }));
    } catch {
      return null;
    }
  }

  private constructor(private host: HTMLElement, renderer: WebGLRenderer) {
    this.renderer = renderer;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setClearColor(0x000000, 0);
    renderer.outputEncoding = sRGBEncoding;
    host.appendChild(renderer.domElement);
    this.camera.position.set(0, 0, 3.87);

    const small = window.innerWidth < 500;
    const { color, bump } = buildTextures(small ? 1024 : 1536, small ? 512 : 768);
    const map = new CanvasTexture(color);
    map.encoding = sRGBEncoding;
    map.anisotropy = 4;
    const material = new MeshStandardMaterial({ map, bumpMap: new CanvasTexture(bump), bumpScale: 0.015, roughness: 1, metalness: 0 });
    this.mesh = new Mesh(new SphereGeometry(1, 128, 96), material);
    this.mesh.rotation.y = -Math.PI / 2; // texture centre (longitude 0) faces Earth
    this.home = this.mesh.quaternion.clone();
    this.scene.add(this.mesh, this.sun, this.ambient);

    this.resize();
    window.addEventListener("resize", () => this.resize());
    this.bindDrag(renderer.domElement);
    this.loop();
  }

  /** Point the sun so the globe shows the right phase. */
  setSun(lit: number, waxing: boolean): void {
    const c = 2 * lit - 1, s = Math.sqrt(Math.max(0, 1 - c * c)) * (waxing ? 1 : -1);
    this.sun.position.set(s, 0.08 * Math.abs(s), c).normalize();
    this.ambient.intensity = 0.002 + 0.012 * Math.pow(1 - lit, 2); // faint earthshine on the dark side
    this.needsRender = true;
  }

  /** Glide back to tonight's view from Earth. */
  reset = (): void => {
    this.velocity = { x: 0, y: 0 };
    this.resetAnim = { from: this.mesh.quaternion.clone(), t0: performance.now() };
    this.needsRender = true;
  };

  /** True when the user has turned the moon away from tonight's view. */
  isTurned(): boolean {
    return this.mesh.quaternion.angleTo(this.home) > 0.05;
  }

  private resize(): void {
    const s = this.host.clientWidth;
    this.renderer.setSize(s, s, false);
    this.renderer.domElement.style.width = this.renderer.domElement.style.height = "100%";
    this.needsRender = true;
  }

  private rotate(dx: number, dy: number): void {
    const qy = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), dx);
    const qx = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), dy);
    this.mesh.quaternion.premultiply(qy).premultiply(qx);
    this.needsRender = true;
  }

  private bindDrag(el: HTMLCanvasElement): void {
    el.style.touchAction = "none";
    el.style.cursor = "grab";
    el.addEventListener("pointerdown", (e) => {
      this.dragging = true;
      this.resetAnim = null;
      this.last = { x: e.clientX, y: e.clientY, t: performance.now() };
      this.velocity = { x: 0, y: 0 };
      el.setPointerCapture(e.pointerId);
      el.style.cursor = "grabbing";
    });
    el.addEventListener("pointermove", (e) => {
      if (!this.dragging) return;
      const k = 3.2 / el.clientWidth;
      const dx = (e.clientX - this.last.x) * k, dy = (e.clientY - this.last.y) * k;
      const now = performance.now(), dt = Math.max(1, now - this.last.t);
      this.velocity = { x: (dx / dt) * 16, y: (dy / dt) * 16 };
      this.rotate(dx, dy);
      this.last = { x: e.clientX, y: e.clientY, t: now };
    });
    const up = () => { this.dragging = false; el.style.cursor = "grab"; };
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("dblclick", this.reset);
  }

  private loop = (): void => {
    requestAnimationFrame(this.loop);
    const v = this.velocity;
    if (!this.dragging && (Math.abs(v.x) > 1e-4 || Math.abs(v.y) > 1e-4)) {
      this.rotate(v.x, v.y); // keep spinning after a flick, slowing down
      v.x *= 0.95; v.y *= 0.95;
    }
    if (this.resetAnim) {
      const t = Math.min(1, (performance.now() - this.resetAnim.t0) / 900);
      this.mesh.quaternion.copy(this.resetAnim.from).slerp(this.home, 1 - Math.pow(1 - t, 3));
      this.needsRender = true;
      if (t >= 1) this.resetAnim = null;
    }
    if (this.needsRender) {
      this.renderer.render(this.scene, this.camera);
      this.needsRender = false;
    }
  };
}
