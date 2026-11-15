// Optional real photo: NASA's "Dial-A-Moon" image for the current hour.
// The button only appears once the image has actually loaded.
import { byId } from "../dom";

/**
 * NASA Scientific Visualization Studio "Moon Phase and Libration" sets, one per year, north up.
 * When NASA publishes next year's set, add its id from https://svs.gsfc.nasa.gov/gallery/moonphase/
 */
const SVS_IDS: Record<number, number> = { 2026: 5587 };

/** Direct link to this hour's frame (frame 1 = 1 January, 00:00 UTC). */
function frameUrl(now: Date): string | null {
  const year = now.getUTCFullYear();
  const id = SVS_IDS[year];
  if (!id) return null;
  const frame = Math.floor((now.getTime() - Date.UTC(year, 0, 1)) / 3600000) + 1;
  const dir = `a00${String(Math.floor(id / 100) * 100).padStart(4, "0")}`;
  return `https://svs.gsfc.nasa.gov/vis/a000000/${dir}/a00${id}/frames/730x730_1x1_30p/moon.${String(frame).padStart(4, "0")}.jpg`;
}

/** NASA's API works for any year, but the browser may block it, so it's only a backup. */
async function apiUrl(now: Date): Promise<string | null> {
  const stamp = `${now.toISOString().slice(0, 13)}:00`;
  const ctl = new AbortController();
  const timer = window.setTimeout(() => ctl.abort(), 4000);
  try {
    const res = await fetch(`https://svs.gsfc.nasa.gov/api/dialamoon/${stamp}`, { signal: ctl.signal });
    const json: { image?: { url?: string } } = await res.json();
    return json.image?.url ?? null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

function loads(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = new Image();
    probe.onload = () => resolve(true);
    probe.onerror = () => resolve(false);
    probe.src = url;
  });
}

export class NasaPhoto {
  private hourKey: string | null = null;
  private url: string | null = null;
  private showing = false;

  /** @param onToggle told when the view switches, so the page can show or hide the 3D moon */
  constructor(private onToggle: (showingPhoto: boolean) => void) {
    byId("photoBtn").addEventListener("click", () => this.setShowing(!this.showing));
  }

  get isShowing(): boolean {
    return this.showing;
  }

  /** Look for this hour's picture (does nothing if the hour hasn't changed). */
  async update(now: Date): Promise<void> {
    const key = now.toISOString().slice(0, 13);
    if (key === this.hourKey) return;
    this.hourKey = key;
    this.url = null;
    for (const url of [frameUrl(now), await apiUrl(now)]) {
      if (url && (await loads(url))) { this.url = url; break; }
    }
    if (this.url) byId<HTMLImageElement>("photo").src = this.url;
    byId("photoBtn").hidden = !this.url;
    byId("photoNote").hidden = !this.url;
    if (!this.url && this.showing) this.setShowing(false);
  }

  private setShowing(on: boolean): void {
    this.showing = on;
    byId("photo").hidden = !on;
    byId("credit").hidden = !on;
    byId("wrap").classList.toggle("photo", on);
    byId("photoBtn").textContent = on ? "Back to 3D moon" : "Show NASA photo";
    this.onToggle(on);
  }
}
