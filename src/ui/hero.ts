// The top of the page: date, phase name, meaning, cycle timeline and next full/new moon.
import { phasesBetween, type MoonState, type PhaseKind } from "../astro/phases";
import { byId } from "../dom";
import { countdown, fmt, fmtTime } from "../time";

const TIMELINE_LABEL: Record<PhaseKind, string> = { new: "New", first: "1st Q", full: "Full", last: "Last Q" };

const MEANING = {
  Waxing: "<em>Waxing</em> means growing: a little more of the moon is lit each night until full moon (Shukla Paksha).",
  Waning: "<em>Waning</em> means shrinking: a little less of the moon is lit each night until new moon (Krishna Paksha).",
  "Full Moon": "<em>Full Moon</em>: the whole face is lit. From here it starts waning, or shrinking (Purnima).",
  "New Moon": "<em>New Moon</em>: the lit side faces away from us, so the moon is dark. From here it starts waxing, or growing (Amavasya).",
} as const;

function renderClock(now: Date): void {
  const date = fmt(now, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  byId("now").innerHTML = `<span>${date}</span><span class="sep"> · </span><span>${fmtTime(now)} IST</span>`;
}

/** The current lunar cycle as a line, with each phase at its true position and a "Now" marker. */
function renderCycle(m: MoonState, now: Date): void {
  const start = new Date(now.getTime() - m.ageDays * 86400000);
  const span = m.nextNew.getTime() - start.getTime();
  const pos = (d: Date) => Math.max(0, Math.min(100, ((d.getTime() - start.getTime()) / span) * 100));
  const nowP = pos(now);
  let marks = "", labels = "";
  for (const e of phasesBetween(new Date(start.getTime() - 60000), new Date(m.nextNew.getTime() + 60000))) {
    const p = pos(e.date), past = e.date <= now ? " past" : "";
    const edge = p < 4 ? " first" : p > 96 ? " last" : "";
    marks += `<span class="mk mk-${e.kind}${past}" style="left:${p}%"></span>`;
    labels += `<span class="lb${edge}${past}" style="left:${p}%"><b>${TIMELINE_LABEL[e.kind]}</b>${fmt(e.date, { day: "numeric", month: "short" })}</span>`;
  }
  byId("cycle").innerHTML =
    `<div class="cyc-track"><div class="cyc-fill" style="width:${nowP}%"></div>${marks}` +
    `<span class="cyc-now" style="left:${nowP}%"><i>Now</i></span></div><div class="cyc-labels">${labels}</div>`;
}

function nextEventCard(kind: "full" | "new", label: string, date: Date, now: Date): string {
  return `<div class="card ${kind}">
    <div class="label"><i></i>${label}</div>
    <div class="date">${fmt(date, { weekday: "short", day: "numeric", month: "short" })}</div>
    <div class="time">${fmt(date, { year: "numeric" })} · ${fmtTime(date)} IST</div>
    <div class="in">${countdown(date.getTime() - now.getTime())}</div>
  </div>`;
}

export function renderHero(m: MoonState, now: Date): void {
  renderClock(now);
  byId("name").textContent = m.name;
  byId("facts").innerHTML =
    `<b>${Math.round(m.lit * 100)}%</b> lit · ${m.waxing ? "growing" : "shrinking"} · day <b>${m.ageDays.toFixed(1)}</b> of 29.5`;
  const word = m.name === "Full Moon" || m.name === "New Moon" ? m.name : m.waxing ? "Waxing" : "Waning";
  byId("meaning").innerHTML = MEANING[word];
  renderCycle(m, now);
  const events = [
    { kind: "full" as const, label: "Next full moon", date: m.nextFull },
    { kind: "new" as const, label: "Next new moon", date: m.nextNew },
  ].sort((a, b) => a.date.getTime() - b.date.getTime());
  byId("cards").innerHTML = events.map((e) => nextEventCard(e.kind, e.label, e.date, now)).join("");
}
