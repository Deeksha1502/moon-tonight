// Moon phase maths from Jean Meeus, "Astronomical Algorithms" (ch. 48 & 49).
// Pure functions with no dependencies. All times are JS Dates (UTC inside).

export type PhaseKind = "new" | "first" | "full" | "last";

export interface PhaseEvent {
  kind: PhaseKind;
  date: Date;
}

export type PhaseName =
  | "New Moon"
  | "Waxing Crescent"
  | "First Quarter"
  | "Waxing Gibbous"
  | "Full Moon"
  | "Waning Gibbous"
  | "Last Quarter"
  | "Waning Crescent";

export interface MoonState {
  name: PhaseName;
  /** Fraction of the disc that is lit, 0–1. */
  lit: number;
  /** True while the lit part is growing (new → full). */
  waxing: boolean;
  /** Days since the last new moon. */
  ageDays: number;
  nextNew: Date;
  nextFull: Date;
}

const RAD = Math.PI / 180;
export const SYNODIC_MONTH = 29.530588861;
const DELTA_T_DAYS = 69 / 86400; // TT − UT, about 69 s in the 2020s
const EPOCH_JDE = 2451550.09766; // first new moon of 2000

const toJD = (date: Date): number => date.getTime() / 86400000 + 2440587.5;
const fromJD = (jd: number): Date => new Date((jd - 2440587.5) * 86400000);
const norm = (deg: number): number => ((deg % 360) + 360) % 360;

/** Mean anomalies and arguments shared by every phase formula. */
function lunationArgs(k: number) {
  const T = k / 1236.85, T2 = T * T, T3 = T2 * T, T4 = T3 * T;
  return {
    T2,
    jde: EPOCH_JDE + SYNODIC_MONTH * k + 0.00015437 * T2 - 0.00000015 * T3 + 0.00000000073 * T4,
    E: 1 - 0.002516 * T - 0.0000074 * T2,
    M: norm(2.5534 + 29.1053567 * k - 0.0000014 * T2 - 0.00000011 * T3) * RAD,
    Mp: norm(201.5643 + 385.81693528 * k + 0.0107582 * T2 + 0.00001238 * T3 - 0.000000058 * T4) * RAD,
    F: norm(160.7108 + 390.67050284 * k - 0.0016118 * T2 - 0.00000227 * T3 + 0.000000011 * T4) * RAD,
    O: norm(124.7746 - 1.56375588 * k + 0.0020672 * T2 + 0.00000215 * T3) * RAD,
  };
}

/** Small corrections from the planets (same for every phase). */
function planetaryCorrection(k: number, T2: number): number {
  const A = [
    299.77 + 0.107408 * k - 0.009173 * T2, 251.88 + 0.016321 * k, 251.83 + 26.651886 * k,
    349.42 + 36.412478 * k, 84.66 + 18.206239 * k, 141.74 + 53.303771 * k,
    207.14 + 2.453732 * k, 154.84 + 7.30686 * k, 34.52 + 27.261239 * k,
    207.19 + 0.121824 * k, 291.34 + 1.844379 * k, 161.72 + 24.198154 * k,
    239.56 + 25.513099 * k, 331.55 + 3.592518 * k,
  ];
  const W = [325, 165, 164, 126, 110, 62, 60, 56, 47, 42, 40, 37, 35, 23];
  return A.reduce((sum, a, i) => sum + W[i] * 1e-6 * Math.sin(a * RAD), 0);
}

/** Exact time of a new moon (frac 0) or full moon (frac 0.5) for lunation k. */
export function newOrFullTime(lunation: number, frac: 0 | 0.5): Date {
  const k = lunation + frac;
  const { T2, jde, E, M, Mp, F, O } = lunationArgs(k);
  const s = Math.sin;
  const isNew = frac === 0;
  const c = (isNew ? -0.4072 : -0.40614) * s(Mp)
    + (isNew ? 0.17241 : 0.17302) * E * s(M)
    + (isNew ? 0.01608 : 0.01614) * s(2 * Mp)
    + (isNew ? 0.01039 : 0.01043) * s(2 * F)
    + (isNew ? 0.00739 : 0.00734) * E * s(Mp - M)
    + (isNew ? -0.00514 : -0.00515) * E * s(Mp + M)
    + (isNew ? 0.00208 : 0.00209) * E * E * s(2 * M)
    - 0.00111 * s(Mp - 2 * F) - 0.00057 * s(Mp + 2 * F)
    + 0.00056 * E * s(2 * Mp + M) - 0.00042 * s(3 * Mp)
    + 0.00042 * E * s(M + 2 * F) + 0.00038 * E * s(M - 2 * F)
    - 0.00024 * E * s(2 * Mp - M) - 0.00017 * s(O)
    - 0.00007 * s(Mp + 2 * M) + 0.00004 * s(2 * Mp - 2 * F)
    + 0.00004 * s(3 * M) + 0.00003 * s(Mp + M - 2 * F)
    + 0.00003 * s(2 * Mp + 2 * F) - 0.00003 * s(Mp + M + 2 * F)
    + 0.00003 * s(Mp - M + 2 * F) - 0.00002 * s(Mp - M - 2 * F)
    - 0.00002 * s(3 * Mp + M) + 0.00002 * s(4 * Mp);
  return fromJD(jde + c + planetaryCorrection(k, T2) - DELTA_T_DAYS);
}

/** Exact time of a first quarter (frac 0.25) or last quarter (frac 0.75) for lunation k. */
export function quarterTime(lunation: number, frac: 0.25 | 0.75): Date {
  const k = lunation + frac;
  const { T2, jde, E, M, Mp, F, O } = lunationArgs(k);
  const s = Math.sin, c = Math.cos;
  let x = -0.62801 * s(Mp) + 0.17172 * E * s(M) - 0.01183 * E * s(Mp + M) + 0.00862 * s(2 * Mp)
    + 0.00804 * s(2 * F) + 0.00454 * E * s(Mp - M) + 0.00204 * E * E * s(2 * M) - 0.0018 * s(Mp - 2 * F)
    - 0.0007 * s(Mp + 2 * F) - 0.0004 * s(3 * Mp) - 0.00034 * E * s(2 * Mp - M) + 0.00032 * E * s(M + 2 * F)
    + 0.00032 * E * s(M - 2 * F) - 0.00028 * E * E * s(Mp + 2 * M) + 0.00027 * E * s(2 * Mp + M) - 0.00017 * s(O)
    - 0.00005 * s(Mp - M - 2 * F) + 0.00004 * s(2 * Mp + 2 * F) - 0.00004 * s(Mp + M + 2 * F) + 0.00004 * s(Mp - 2 * M)
    + 0.00003 * s(Mp + M - 2 * F) + 0.00003 * s(3 * M) + 0.00002 * s(2 * Mp - 2 * F) + 0.00002 * s(Mp - M + 2 * F)
    - 0.00002 * s(3 * Mp + M);
  const W = 0.00306 - 0.00038 * E * c(M) + 0.00026 * c(Mp) - 0.00002 * c(Mp - M) + 0.00002 * c(Mp + M) + 0.00002 * c(2 * F);
  x += frac === 0.25 ? W : -W;
  return fromJD(jde + x + planetaryCorrection(k, T2) - DELTA_T_DAYS);
}

const lunationNear = (date: Date): number => Math.floor((toJD(date) - EPOCH_JDE) / SYNODIC_MONTH);

/** The next new or full moon strictly after `after`. */
export function nextPhase(kind: "new" | "full", after: Date = new Date()): Date {
  const frac = kind === "full" ? 0.5 : 0;
  for (let k = lunationNear(after) - 2; ; k++) {
    const d = newOrFullTime(k, frac);
    if (d.getTime() > after.getTime()) return d;
  }
}

/** The most recent new moon at or before `before`. */
export function previousNewMoon(before: Date = new Date()): Date {
  for (let k = lunationNear(before) + 2; ; k--) {
    const d = newOrFullTime(k, 0);
    if (d.getTime() <= before.getTime()) return d;
  }
}

/** All four main phases in [from, to), sorted by time. */
export function phasesBetween(from: Date, to: Date): PhaseEvent[] {
  const out: PhaseEvent[] = [];
  for (let k = lunationNear(from) - 1; ; k++) {
    const events: PhaseEvent[] = [
      { kind: "new", date: newOrFullTime(k, 0) },
      { kind: "first", date: quarterTime(k, 0.25) },
      { kind: "full", date: newOrFullTime(k, 0.5) },
      { kind: "last", date: quarterTime(k, 0.75) },
    ];
    for (const e of events) if (e.date >= from && e.date < to) out.push(e);
    if (events[0].date > to) break;
  }
  return out.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** Fraction of the disc lit at `date` (0–1), Meeus ch. 48 low-precision form. */
export function illumination(date: Date = new Date()): number {
  const T = (toJD(date) + DELTA_T_DAYS - 2451545) / 36525;
  const D = norm(297.8501921 + 445267.1114034 * T - 0.0018819 * T * T) * RAD;
  const M = norm(357.5291092 + 35999.0502909 * T - 0.0001536 * T * T) * RAD;
  const Mp = norm(134.9633964 + 477198.8675055 * T + 0.0087414 * T * T) * RAD;
  const i = 180 - D / RAD
    - 6.289 * Math.sin(Mp) + 2.1 * Math.sin(M)
    - 1.274 * Math.sin(2 * D - Mp) - 0.658 * Math.sin(2 * D)
    - 0.214 * Math.sin(2 * Mp) - 0.11 * Math.sin(D);
  return (1 + Math.cos(i * RAD)) / 2;
}

export function phaseName(lit: number, waxing: boolean): PhaseName {
  if (lit < 0.02) return "New Moon";
  if (lit > 0.98) return "Full Moon";
  if (Math.abs(lit - 0.5) < 0.04) return waxing ? "First Quarter" : "Last Quarter";
  if (lit < 0.5) return waxing ? "Waxing Crescent" : "Waning Crescent";
  return waxing ? "Waxing Gibbous" : "Waning Gibbous";
}

/** Everything the page needs to describe the moon at `now`. */
export function moonNow(now: Date = new Date()): MoonState {
  const nextNew = nextPhase("new", now);
  const nextFull = nextPhase("full", now);
  const lit = illumination(now);
  const waxing = nextFull < nextNew;
  const ageDays = (now.getTime() - previousNewMoon(now).getTime()) / 86400000;
  return { name: phaseName(lit, waxing), lit, waxing, ageDays, nextNew, nextFull };
}
