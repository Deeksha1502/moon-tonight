// Everything on the page is shown in India Standard Time (UTC+5:30).
export const IST = "Asia/Kolkata";
const IST_OFFSET_MIN = 330;

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

/** Format a date in IST with the given Intl options. */
export const fmt = (d: Date, o: Intl.DateTimeFormatOptions): string =>
  d.toLocaleString("en-IN", { timeZone: IST, ...o });

/** "8:23 pm" style time in IST. */
export const fmtTime = (d: Date): string => fmt(d, { hour: "numeric", minute: "2-digit", hour12: true });

/** The IST calendar day of a date as "YYYY-MM-DD". */
export const istKey = (d: Date): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone: IST, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

/** A Date for a wall-clock time in IST (month is 0-based). */
export const istDate = (y: number, m: number, d: number, h = 0, mi = 0): Date =>
  new Date(Date.UTC(y, m, d, h, mi) - IST_OFFSET_MIN * 60000);

/** "in 9 days, 21 hrs" style countdown. */
export function countdown(ms: number): string {
  const mins = Math.max(0, Math.round(ms / 60000));
  const d = Math.floor(mins / 1440), h = Math.floor((mins % 1440) / 60), m = mins % 60;
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
  if (d > 0) return `in ${plural(d, "day")}, ${plural(h, "hr")}`;
  if (h > 0) return `in ${plural(h, "hr")}, ${m} min`;
  return `in ${m} min`;
}
