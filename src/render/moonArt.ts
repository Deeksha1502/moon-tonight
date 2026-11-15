// Paints a realistic moon onto a 2D canvas, lit for a given phase.
// Used for the calendar's small moons, and as a fallback when WebGL isn't available.
import { MARIA, NAMED_CRATERS, type NamedCrater } from "./features";
import { fbm2, noise2, seededRandom, smoothstep } from "./noise";

interface Crater { x: number; y: number; r: number; bright: number; rays: number }

let size = 0;
let albedo = new Float32Array(0);
let height = new Float32Array(0);

function mariaAt(x: number, y: number): number {
  let m = 0;
  for (const a of MARIA) {
    const dx = (x - a.x) / (a.rx * 1.22), dy = (y - a.y) / (a.ry * 1.22);
    const d = Math.sqrt(dx * dx + dy * dy) + (fbm2(x * 5 + 11, y * 5 + 5, 4) - 0.5) * 0.9 + (noise2(x * 22, y * 22) - 0.5) * 0.18;
    const v = (1 - smoothstep(0.62, 1.12, d)) * a.depth * 1.1 * (0.78 + 0.44 * fbm2(x * 9 + 2, y * 9 + 7, 3));
    if (v > m) m = v;
  }
  return m;
}

function addCrater(c: Crater): void {
  const S = size;
  const r0 = Math.hypot(c.x, c.y);
  if (r0 > 0.985) return;
  const z = Math.sqrt(1 - r0 * r0);
  const ux = r0 > 1e-6 ? c.x / r0 : 1, uy = r0 > 1e-6 ? c.y / r0 : 0;
  const R = c.r, ext = R * 1.6;
  const x0 = Math.max(0, Math.floor(((c.x - ext + 1) / 2) * S)), x1 = Math.min(S - 1, Math.ceil(((c.x + ext + 1) / 2) * S));
  const y0 = Math.max(0, Math.floor(((c.y - ext + 1) / 2) * S)), y1 = Math.min(S - 1, Math.ceil(((c.y + ext + 1) / 2) * S));
  for (let py = y0; py <= y1; py++) {
    const y = ((py + 0.5) / S) * 2 - 1;
    for (let px = x0; px <= x1; px++) {
      const x = ((px + 0.5) / S) * 2 - 1;
      const dx = x - c.x, dy = y - c.y;
      const u = (dx * ux + dy * uy) / z, v = -dx * uy + dy * ux; // undo foreshortening near the edge
      const d = Math.sqrt(u * u + v * v) / R;
      if (d > 1.6) continue;
      const i = py * S + px;
      height[i] += d < 1 ? -0.16 * R * (1 - d * d) + 0.05 * R * Math.pow(d, 8) : 0.05 * R * Math.pow(1 - (d - 1) / 0.6, 2);
      const rim = Math.exp(-Math.pow((d - 1) / 0.12, 2));
      albedo[i] += rim * 0.015 + (d < 1 ? c.bright * (1 - d * 0.5) : c.bright * 0.5 * Math.max(0, 1 - (d - 1) / 0.6));
    }
  }
}

function addRays(c: NamedCrater, rand: () => number): void {
  const S = size;
  const rays = Array.from({ length: Math.round(10 + 8 * c.rays) }, () => ({
    a: rand() * Math.PI * 2, w: 0.03 + rand() * 0.05, len: 0.25 + rand() * 0.75 * c.rays,
  }));
  for (let py = 0; py < S; py++) {
    const y = ((py + 0.5) / S) * 2 - 1;
    for (let px = 0; px < S; px++) {
      const x = ((px + 0.5) / S) * 2 - 1;
      if (x * x + y * y > 1) continue;
      const dx = x - c.x, dy = y - c.y, dist = Math.hypot(dx, dy);
      if (dist < c.r * 1.2) continue;
      const ang = Math.atan2(dy, dx);
      let s = 0;
      for (const r of rays) {
        if (dist > r.len) continue;
        let da = Math.abs(ang - r.a);
        if (da > Math.PI) da = 2 * Math.PI - da;
        s += Math.exp(-Math.pow(da / r.w, 2)) * (1 - dist / r.len);
      }
      albedo[py * S + px] += Math.min(s, 1) * 0.05 * c.rays * (0.6 + 0.8 * noise2(x * 40, y * 40));
    }
  }
}

/** Build the surface maps for a canvas of `S`×`S` pixels (cached until the size changes). */
function build(S: number): void {
  size = S;
  const rand = seededRandom(7);
  albedo = new Float32Array(S * S);
  height = new Float32Array(S * S);
  for (let py = 0; py < S; py++) {
    const y = ((py + 0.5) / S) * 2 - 1;
    for (let px = 0; px < S; px++) {
      const x = ((px + 0.5) / S) * 2 - 1;
      if (x * x + y * y > 1.02) continue;
      const i = py * S + px;
      const south = Math.max(0, y) * 0.04; // southern highlands a touch brighter
      albedo[i] = 0.8 + south - mariaAt(x, y) + (fbm2(x * 4, y * 4, 4) - 0.5) * 0.12
        + (noise2(x * 90, y * 90) - 0.5) * 0.05 + (fbm2(x * 30 + 5, y * 30, 3) - 0.5) * 0.06;
      height[i] = (fbm2(x * 18 + 3, y * 18 + 9, 3) - 0.5) * 0.004;
    }
  }
  // Random craters, thicker in the highlands than in the seas
  for (let k = 0; k < 240; k++) {
    const a = rand() * Math.PI * 2, rr = Math.sqrt(rand()) * 0.98;
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
    if (mariaAt(x, y) > 0.15 && rand() < 0.85) continue;
    addCrater({ x, y, r: 0.004 + Math.pow(rand(), 4) * 0.04, bright: 0, rays: 0 });
  }
  for (const c of NAMED_CRATERS) addCrater(c);
  for (const c of NAMED_CRATERS) if (c.rays > 0.2) addRays(c, rand);
}

/**
 * Draw the moon into a square canvas.
 * @param lit fraction of the disc lit (0–1)
 * @param waxing true when the sunlit side is on the right
 */
export function drawMoon(canvas: HTMLCanvasElement, lit: number, waxing: boolean): void {
  const S = canvas.width;
  if (S !== size) build(S);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const img = ctx.createImageData(S, S), out = img.data;
  const c = 2 * lit - 1, s = Math.sqrt(Math.max(0, 1 - c * c)) * (waxing ? 1 : -1);
  const Ln = Math.hypot(s, 0.08 * Math.abs(s), c);
  const lx = s / Ln, ly = (-0.08 * Math.abs(s)) / Ln, lz = c / Ln; // sun direction, slightly tilted
  const earthshine = 0.07 * Math.pow(1 - lit, 2);
  const k = S / 2;
  for (let py = 0; py < S; py++) {
    const y = ((py + 0.5) / S) * 2 - 1;
    for (let px = 0; px < S; px++) {
      const x = ((px + 0.5) / S) * 2 - 1;
      const r2 = x * x + y * y;
      const o = (py * S + px) * 4;
      const edge = Math.min(1, Math.max(0, (1 - Math.sqrt(r2)) * k));
      if (edge <= 0) { out[o + 3] = 0; continue; }
      const i = py * S + px;
      const nz0 = Math.sqrt(Math.max(0, 1 - r2));
      // Surface slope from the height map gives craters their shadows
      const gx = px > 0 && px < S - 1 ? ((height[i + 1] - height[i - 1]) * k) / 2 : 0;
      const gy = py > 0 && py < S - 1 ? ((height[i + S] - height[i - S]) * k) / 2 : 0;
      let nx = x - gx * 0.8, ny = y - gy * 0.8, nz = nz0;
      const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
      const mu0 = nx * lx + ny * ly + nz * lz;
      const mu = Math.max(0.02, nz0);
      let b = mu0 > 0 ? Math.min(1.25, (2 * mu0) / (mu0 + mu)) : 0; // Lommel–Seeliger: the moon looks flat when full
      b *= smoothstep(-0.01, 0.05, mu0) * smoothstep(-0.05, 0.04, x * lx + y * ly + nz0 * lz);
      const a = albedo[i];
      const v = a * b * 0.98 + a * earthshine;
      out[o] = Math.min(255, v * 255);
      out[o + 1] = Math.min(255, v * 255 * 0.975);
      out[o + 2] = Math.min(255, v * 255 * 0.93 + earthshine * 40 * (1 - b));
      out[o + 3] = 255 * edge;
    }
  }
  ctx.putImageData(img, 0, 0);
}
