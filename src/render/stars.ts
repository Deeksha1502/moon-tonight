// A full-screen canvas of twinkling stars behind the page.

interface Star {
  x: number; y: number; r: number;
  base: number; amp: number; speed: number; phase: number;
  tint: string; big: boolean;
}

const TINTS = ["255,255,255", "255,255,255", "210,225,255", "255,240,215"];

export function startStars(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  let stars: Star[] = [];
  let W = 0, H = 0;

  function setup(): void {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth;
    H = Math.max(window.innerHeight, window.screen?.height ?? 0) + 80; // cover the mobile address bar
    canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.height = `${H}px`;
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = Array.from({ length: Math.round((W * H) / 3200) }, () => {
      const big = Math.random() < 0.08;
      return {
        x: Math.random() * W, y: Math.random() * H,
        r: big ? 1.1 + Math.random() * 0.9 : 0.4 + Math.random() * 0.7,
        base: big ? 0.65 : 0.2 + Math.random() * 0.45,
        amp: 0.75 + Math.random() * 0.25,
        speed: 1.2 + Math.random() * 2.8,
        phase: Math.random() * Math.PI * 2,
        tint: TINTS[Math.floor(Math.random() * TINTS.length)],
        big,
      };
    });
  }

  function draw(t: number): void {
    const c = ctx!;
    c.clearRect(0, 0, W, H);
    const s = t / 1000;
    for (const st of stars) {
      const v = (Math.sin(s * st.speed + st.phase) + 1) / 2;
      const a = st.base * 0.25 + (1 - st.base * 0.25) * Math.pow(v, 3) * st.amp;
      if (st.big) {
        const g = c.createRadialGradient(st.x, st.y, 0, st.x, st.y, st.r * 5);
        g.addColorStop(0, `rgba(${st.tint},${a * 0.6})`);
        g.addColorStop(1, `rgba(${st.tint},0)`);
        c.fillStyle = g;
        c.beginPath(); c.arc(st.x, st.y, st.r * 5, 0, Math.PI * 2); c.fill();
      }
      c.fillStyle = `rgba(${st.tint},${a})`;
      c.beginPath(); c.arc(st.x, st.y, st.r, 0, Math.PI * 2); c.fill();
      if (st.big && a > 0.6) { // sparkle glint at peak brightness
        const L = st.r * 7 * (a - 0.5) * 2;
        c.strokeStyle = `rgba(${st.tint},${(a - 0.6) * 1.5})`;
        c.lineWidth = 0.8;
        c.beginPath();
        c.moveTo(st.x - L, st.y); c.lineTo(st.x + L, st.y);
        c.moveTo(st.x, st.y - L); c.lineTo(st.x, st.y + L);
        c.stroke();
      }
    }
    requestAnimationFrame(draw);
  }

  setup();
  requestAnimationFrame(draw);
  let timer: number | undefined;
  window.addEventListener("resize", () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      if (window.innerWidth !== W || window.innerHeight > H) setup();
    }, 150);
  });
}
