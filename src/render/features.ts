// Real near-side features, placed on the moon's disc as seen from India (north up).
// Coordinates: x to the right, y down, disc radius 1.

export interface Mare {
  name: string;
  x: number; y: number;
  rx: number; ry: number;
  /** How much darker than the highlands. */
  depth: number;
}

export interface NamedCrater {
  name: string;
  x: number; y: number;
  /** Radius in disc units (≈ radians on the sphere). */
  r: number;
  /** Extra brightness of a young crater's floor. */
  bright: number;
  /** Strength of bright rays, 0 for none. */
  rays: number;
}

export const MARIA: Mare[] = [
  { name: "Oceanus Procellarum", x: -0.58, y: -0.02, rx: 0.30, ry: 0.50, depth: 0.30 },
  { name: "Mare Imbrium", x: -0.30, y: -0.44, rx: 0.27, ry: 0.22, depth: 0.33 },
  { name: "Mare Serenitatis", x: 0.16, y: -0.42, rx: 0.15, ry: 0.14, depth: 0.31 },
  { name: "Mare Tranquillitatis", x: 0.32, y: -0.11, rx: 0.19, ry: 0.15, depth: 0.33 },
  { name: "Mare Crisium", x: 0.70, y: -0.28, rx: 0.10, ry: 0.085, depth: 0.34 },
  { name: "Mare Fecunditatis", x: 0.56, y: 0.10, rx: 0.11, ry: 0.15, depth: 0.27 },
  { name: "Mare Nectaris", x: 0.38, y: 0.30, rx: 0.08, ry: 0.08, depth: 0.26 },
  { name: "Mare Nubium", x: -0.20, y: 0.32, rx: 0.17, ry: 0.13, depth: 0.24 },
  { name: "Mare Humorum", x: -0.56, y: 0.38, rx: 0.08, ry: 0.08, depth: 0.28 },
  { name: "Mare Vaporum", x: 0.03, y: -0.22, rx: 0.07, ry: 0.05, depth: 0.24 },
  { name: "Mare Frigoris", x: -0.05, y: -0.76, rx: 0.40, ry: 0.07, depth: 0.16 },
  { name: "Sinus Medii", x: -0.05, y: 0.02, rx: 0.08, ry: 0.06, depth: 0.18 },
  { name: "Mare Cognitum", x: -0.40, y: 0.12, rx: 0.10, ry: 0.10, depth: 0.22 },
];

export const NAMED_CRATERS: NamedCrater[] = [
  { name: "Tycho", x: -0.13, y: 0.70, r: 0.050, bright: 0.16, rays: 1.0 },
  { name: "Copernicus", x: -0.32, y: -0.17, r: 0.055, bright: 0.12, rays: 0.45 },
  { name: "Kepler", x: -0.62, y: -0.13, r: 0.026, bright: 0.12, rays: 0.3 },
  { name: "Aristarchus", x: -0.75, y: -0.38, r: 0.020, bright: 0.22, rays: 0.15 },
  { name: "Clavius", x: 0.08, y: 0.60, r: 0.08, bright: 0.02, rays: 0 },
  { name: "Ptolemaeus", x: -0.04, y: 0.45, r: 0.06, bright: 0.02, rays: 0 },
  { name: "Petavius", x: 0.62, y: 0.42, r: 0.05, bright: 0.04, rays: 0 },
  { name: "Theophilus", x: 0.28, y: 0.48, r: 0.045, bright: 0.04, rays: 0 },
];
