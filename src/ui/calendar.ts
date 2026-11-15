// Month calendar with each day's moon (as it looks at 8 pm IST) and the four main phases marked.
import { illumination, phaseName, phasesBetween, type PhaseEvent, type PhaseKind } from "../astro/phases";
import { byId } from "../dom";
import { drawMoon } from "../render/moonArt";
import { fmt, fmtTime, istDate, istKey, MONTHS } from "../time";

const PHASE_NAME: Record<PhaseKind, string> = { new: "New Moon", first: "First Quarter", full: "Full Moon", last: "Last Quarter" };
const SHORT: Record<PhaseKind, string> = { new: "New", first: "1st Q", full: "Full", last: "Last Q" };
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const EVENING_HOUR = 20; // calendar moons show the moon at 8 pm IST

interface DayInfo {
  day: number;
  lit: number;
  waxing: boolean;
  event?: PhaseEvent;
}

const pad = (n: number) => String(n).padStart(2, "0");

export class MoonCalendar {
  private year: number;
  private month: number; // 0-based
  private selected: string;
  private days = new Map<string, DayInfo>();

  constructor() {
    const today = istKey(new Date());
    const [y, m] = today.split("-").map(Number);
    this.year = y;
    this.month = m - 1;
    this.selected = today;

    byId("calGrid").addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(".day");
      if (btn?.dataset.key) this.select(btn.dataset.key);
    });
    byId("calPrev").addEventListener("click", () => this.shiftMonth(-1));
    byId("calNext").addEventListener("click", () => this.shiftMonth(1));
    byId("calToday").addEventListener("click", () => {
      const key = istKey(new Date());
      const [ty, tm] = key.split("-").map(Number);
      this.year = ty; this.month = tm - 1; this.selected = key;
      this.render();
    });
    this.render();
  }

  private shiftMonth(delta: number): void {
    const d = new Date(Date.UTC(this.year, this.month + delta, 1));
    this.year = d.getUTCFullYear();
    this.month = d.getUTCMonth();
    this.render();
  }

  render(): void {
    const { year, month } = this;
    const prefix = `${year}-${pad(month + 1)}`;
    const events = new Map<string, PhaseEvent>();
    for (const e of phasesBetween(istDate(year, month, 1), istDate(year, month + 1, 1))) events.set(istKey(e.date), e);

    const startDow = new Date(Date.UTC(year, month, 1)).getUTCDay();
    const nDays = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const todayKey = istKey(new Date());
    byId("calTitle").textContent = `${MONTHS[month]} ${year}`;
    byId("calToday").hidden = todayKey.startsWith(prefix);
    byId("calDows").innerHTML = WEEKDAYS.map((d) => `<div class="dow">${d}</div>`).join("");

    let html = `<div class="blank"></div>`.repeat(startDow);
    this.days.clear();
    for (let d = 1; d <= nDays; d++) {
      const key = `${prefix}-${pad(d)}`;
      const t = istDate(year, month, d, EVENING_HOUR);
      const lit = illumination(t);
      const waxing = illumination(new Date(t.getTime() + 3 * 3600000)) > lit;
      const event = events.get(key);
      this.days.set(key, { day: d, lit, waxing, event });
      const cls = ["day", key === todayKey && "today", event && `ev ev-${event.kind}`, key === this.selected && "sel"].filter(Boolean).join(" ");
      const tag = event
        ? `<span class="tag">${SHORT[event.kind]}<span class="t"> ${fmtTime(event.date).replace(" ", "")}</span></span>`
        : `<span class="tag"></span>`;
      const label = event ? PHASE_NAME[event.kind] : phaseName(lit, waxing);
      html += `<button type="button" class="${cls}" data-key="${key}" aria-label="${d} ${MONTHS[month]}: ${label}"><span class="num">${d}</span><canvas class="mini" width="64" height="64"></canvas>${tag}</button>`;
    }
    const trailing = (7 - ((startDow + nDays) % 7)) % 7; // fill the last week
    html += `<div class="blank"></div>`.repeat(trailing);

    const grid = byId("calGrid");
    grid.innerHTML = html;
    grid.querySelectorAll<HTMLButtonElement>(".day").forEach((btn) => {
      const info = this.days.get(btn.dataset.key ?? "");
      const canvas = btn.querySelector("canvas");
      if (info && canvas) drawMoon(canvas, info.lit, info.waxing);
    });

    const firstEvent = events.keys().next().value as string | undefined;
    this.select(this.days.has(this.selected) ? this.selected : firstEvent ?? `${prefix}-01`);
  }

  private select(key: string): void {
    this.selected = key;
    byId("calGrid").querySelectorAll<HTMLElement>(".day").forEach((b) => b.classList.toggle("sel", b.dataset.key === key));
    const info = this.days.get(key);
    if (!info) return;
    const dayText = fmt(istDate(this.year, this.month, info.day, 12), { weekday: "long", day: "numeric", month: "long" });
    byId("calInfo").innerHTML = info.event
      ? `<b>${dayText}</b> · <span class="nw">${PHASE_NAME[info.event.kind]}</span> <span class="nw">at ${fmtTime(info.event.date)} IST</span>`
      : `<b>${dayText}</b> · <span class="nw">${phaseName(info.lit, info.waxing)}</span> · <span class="nw">${Math.round(info.lit * 100)}% lit at 8 pm</span>`;
  }
}
