// Moon Tonight: wires the page together.
import "./styles.css";
import { moonNow } from "./astro/phases";
import { byId } from "./dom";
import type { MoonGlobe } from "./render/globe";
import { drawMoon } from "./render/moonArt";
import { startStars } from "./render/stars";
import { MoonCalendar } from "./ui/calendar";
import { renderHero } from "./ui/hero";
import { NasaPhoto } from "./ui/nasaPhoto";

let globe: MoonGlobe | null = null;

const photo = new NasaPhoto((showingPhoto) => {
  byId("globe").hidden = showingPhoto;
  byId("moon").hidden = showingPhoto || globe !== null;
  byId("hint").hidden = showingPhoto;
  byId("reset").style.display = showingPhoto ? "none" : "";
});

/** Show the moon's phase on the 3D globe, or on the flat 2D drawing if WebGL isn't available. */
function showPhase(lit: number, waxing: boolean): void {
  if (globe) {
    globe.setSun(lit, waxing);
    return;
  }
  if (photo.isShowing) return;
  const canvas = byId<HTMLCanvasElement>("moon");
  const px = Math.round(canvas.clientWidth * Math.min(2, window.devicePixelRatio || 1)) || 520;
  if (canvas.width !== px) canvas.width = canvas.height = px;
  drawMoon(canvas, lit, waxing);
  const wrap = byId("wrap");
  wrap.style.setProperty("--glow", `${20 + lit * 50}px`);
  wrap.style.setProperty("--glowa", (0.04 + lit * 0.16).toFixed(2));
}

function render(): void {
  const now = new Date();
  const moon = moonNow(now);
  renderHero(moon, now);
  showPhase(moon.lit, moon.waxing);
}

startStars(byId<HTMLCanvasElement>("sky"));
render();
new MoonCalendar();

// Load three.js and build the 3D globe after the first paint, so the page appears instantly.
window.setTimeout(async () => {
  const { MoonGlobe } = await import("./render/globe");
  globe = MoonGlobe.create(byId("globe"));
  if (!globe) return;
  byId("moon").hidden = true;
  byId("spin").hidden = false;
  const resetBtn = byId("reset");
  resetBtn.addEventListener("click", () => globe?.reset());
  window.setInterval(() => { resetBtn.hidden = !globe?.isTurned(); }, 250);
  render();
}, 30);

void photo.update(new Date()).then(render);
window.setInterval(() => {
  render();
  void photo.update(new Date());
}, 30000);
