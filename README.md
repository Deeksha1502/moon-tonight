# Moon Tonight 🌙

Tonight's moon phase in India Standard Time, a 3D moon you can spin, and a moon calendar.

**Live:** https://deeksha1502.github.io/moon-tonight/

## What it does

- Shows the current phase, how much of the moon is lit, and whether it's waxing or waning
- Gives the next full moon and new moon in IST, with a countdown
- Shows a timeline of the current lunar cycle, with each phase at its true position
- Lets you drag a 3D moon to spin it and see the far side, lit the way the sun lights it tonight
- Has a month calendar with each evening's moon and the four main phases marked
- Can show NASA's real moon image for the current hour

Everything is calculated in the browser. There's no backend and no API key.

## How the moon maths works

Phase times use the formulas from Jean Meeus, *Astronomical Algorithms* (chapters 48–49). The tests in `src/astro/phases.test.ts` check every new moon, first quarter, full moon and last quarter in 2026–2027 against [Astronomy Engine](https://github.com/cosinekitty/astronomy), a high-precision reference library. All of them land within about 45 seconds of the reference.

## Tech

- TypeScript (strict mode) and Vite
- three.js for the 3D globe. Its surface (seas, craters and Tycho's rays) is generated in code; there are no image textures.
- Canvas 2D for the calendar moons and the twinkling stars
- Vitest for tests
- GitHub Actions deploys to GitHub Pages on every push to `main`

## Project structure

```
src/
  astro/phases.ts       moon phase maths (Meeus) + tests
  render/moonArt.ts     2D moon painter (calendar + fallback)
  render/globe.ts       3D globe with drag-to-spin (three.js)
  render/stars.ts       twinkling star background
  render/noise.ts       noise helpers for the moon surface
  render/features.ts    real seas and craters, positioned on the disc
  ui/hero.ts            phase, meaning, cycle timeline, next full/new moon
  ui/calendar.ts        month calendar
  ui/nasaPhoto.ts       optional NASA hourly photo
  time.ts               IST formatting helpers
  main.ts               wires it all together
```

## Run it locally

```bash
npm install
npm run dev        # start a local server
npm test           # check the moon maths
npm run build      # type-check and build into dist/
```

## Yearly upkeep

NASA publishes a new hourly moon image set each year. When the next year's set is out, add its id to `SVS_IDS` in `src/ui/nasaPhoto.ts`. Until then, the photo button simply stays hidden.

## Credits

Moon images: [NASA Scientific Visualization Studio](https://svs.gsfc.nasa.gov/gallery/moonphase/).
