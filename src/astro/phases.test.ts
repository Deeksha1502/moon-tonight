import { describe, expect, it } from "vitest";
import * as Astronomy from "astronomy-engine";
import { illumination, phasesBetween } from "./phases";

// Checks our Meeus formulas against Astronomy Engine, a high-precision reference library.
const LONGITUDE = { new: 0, first: 90, full: 180, last: 270 } as const;

describe("moon phase times", () => {
  const events = phasesBetween(new Date("2026-01-01T00:00:00Z"), new Date("2028-01-01T00:00:00Z"));

  it("finds every main phase in 2026–2027", () => {
    expect(events.length).toBeGreaterThanOrEqual(98);
  });

  it("matches the reference within 2 minutes", () => {
    for (const e of events) {
      const start = new Date(e.date.getTime() - 2 * 86400000);
      const ref = Astronomy.SearchMoonPhase(LONGITUDE[e.kind], start, 5);
      expect(ref).not.toBeNull();
      const diffSeconds = Math.abs(ref!.date.getTime() - e.date.getTime()) / 1000;
      expect(diffSeconds).toBeLessThan(120);
    }
  });
});

describe("illumination", () => {
  it("matches the reference within 1%", () => {
    for (let h = 0; h < 24 * 60; h += 7) {
      const d = new Date(Date.UTC(2026, 10, 1) + h * 3600000);
      const ref = Astronomy.Illumination(Astronomy.Body.Moon, d).phase_fraction;
      expect(Math.abs(illumination(d) - ref)).toBeLessThan(0.01);
    }
  });
});
