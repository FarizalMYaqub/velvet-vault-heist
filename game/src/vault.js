// Velvet Vault — the floor plan of the Meridian Vault.
// One floor, 1280x720: an office (the Ledger), a main hall (the Crimson
// Diamond), a vault (gold bullion), a laser antechamber between hall and
// vault, a service corridor (spawn) and a green exit room. Walls are
// rectangles; doors are gaps between them. Everything here is data: the
// simulation in sim.js reads it, the renderer in render.js draws it.

export const WALLS = [
  // Outer border.
  { x: 0, y: 0, w: 1280, h: 24 },
  { x: 0, y: 696, w: 1280, h: 24 },
  { x: 0, y: 0, w: 24, h: 720 },
  { x: 1256, y: 0, w: 24, h: 720 },
  // Office bottom wall (y 300..324), door gap x 140..200.
  { x: 24, y: 300, w: 116, h: 24 },
  { x: 200, y: 300, w: 124, h: 24 },
  // Vault bottom wall (y 300..324), vault-door gap x 1060..1120.
  { x: 984, y: 300, w: 76, h: 24 },
  { x: 1120, y: 300, w: 136, h: 24 },
  // Office right wall (x 320..344, y 24..300), solid.
  { x: 320, y: 24, w: 24, h: 276 },
  // Vault left wall (x 960..984, y 24..560), door gap y 400..460.
  { x: 960, y: 24, w: 24, h: 376 },
  { x: 960, y: 460, w: 24, h: 100 },
  // Exit room left wall (x 960..984, y 560..696), door gap y 600..660.
  { x: 960, y: 560, w: 24, h: 40 },
  { x: 960, y: 660, w: 24, h: 36 },
  // Hall bottom wall (y 560..584), hall-door gap x 430..490,
  // exit-door gap x 1060..1120.
  { x: 24, y: 560, w: 406, h: 24 },
  { x: 490, y: 560, w: 570, h: 24 },
  { x: 1120, y: 560, w: 136, h: 24 },
];

/** Decorative furniture: solid blocks the thief cannot cross. */
export const FURNITURE = [
  // Display cases in the main hall (the diamond case stands alone).
  { x: 400, y: 200, w: 90, h: 46, kind: 'case' },
  { x: 790, y: 200, w: 90, h: 46, kind: 'case' },
  { x: 400, y: 430, w: 90, h: 46, kind: 'case' },
  { x: 790, y: 430, w: 90, h: 46, kind: 'case' },
  // Office desk and shelves.
  { x: 60, y: 60, w: 120, h: 40, kind: 'desk' },
  { x: 240, y: 60, w: 56, h: 120, kind: 'shelf' },
  // Vault shelves flanking the gold.
  { x: 1010, y: 60, w: 56, h: 120, kind: 'shelf' },
  { x: 1170, y: 60, w: 56, h: 120, kind: 'shelf' },
  // Service corridor crates (cover on the way in).
  { x: 120, y: 620, w: 70, h: 40, kind: 'crate' },
  { x: 700, y: 620, w: 70, h: 40, kind: 'crate' },
];

/** The diamond's glass case, centre of the main hall. */
export const DIAMOND_CASE = { x: 596, y: 288, w: 88, h: 56, kind: 'case' };

/** Dark floor patches: a guard spots the thief half as fast inside one. */
export const SHADOWS = [
  { x: 344, y: 24, w: 150, h: 110 }, // office corner, west of the safe
  { x: 700, y: 470, w: 190, h: 90 }, // hall south, under the cases
  { x: 984, y: 470, w: 272, h: 90 }, // laser zone south edge
  { x: 24, y: 600, w: 180, h: 96 }, // service corridor west
  { x: 1030, y: 40, w: 60, h: 90 }, // vault west shelf shadow
  { x: 1040, y: 330, w: 110, h: 70 }, // the vault door approach, in the dark
];

export const LOOT = [
  {
    id: 'diamond',
    name: 'Crimson Diamond',
    x: 640, y: 316,
    room: 'Main Hall',
    blurb: 'in the glass case, centre of the hall',
  },
  {
    id: 'ledger',
    name: 'Meridian Ledger',
    x: 120, y: 120,
    room: 'Office',
    blurb: 'in the wall safe behind the desk',
  },
  {
    id: 'gold',
    name: 'Gold Bullion',
    x: 1100, y: 150,
    room: 'Vault',
    blurb: 'stacked behind the vault door',
  },
];

/** The vault door: a lockpick channel opens it, and it stays open. */
export const VAULT_DOOR = { x: 1060, y: 300, w: 60, h: 24 };

/** The green exit: locked until every loot target is taken. */
export const EXIT = { x: 1160, y: 648, w: 76, h: 48 };

/** Where the thief slips in. */
export const SPAWN = { x: 70, y: 650 };

/** Vent grates: press E at one to crawl to the other, unseen. */
export const VENTS = [
  { id: 'hall', x: 380, y: 520, other: 'laser' },
  { id: 'laser', x: 1150, y: 500, other: 'hall' },
];

/** Laser beams across the antechamber; each toggles on its own offset. */
export const LASERS = [
  { y: 380, x0: 1000, x1: 1240, offset: 0 },
  { y: 440, x0: 1000, x1: 1240, offset: 1.4 },
  { y: 500, x0: 1000, x1: 1240, offset: 2.8 },
];

export const GUARD_ROUTES = [
  {
    name: 'Rook',
    waypoints: [
      { x: 420, y: 170 }, { x: 880, y: 170 },
      { x: 880, y: 470 }, { x: 420, y: 470 },
    ],
    pause: 1.6,
  },
  {
    name: 'Bishop',
    waypoints: [
      { x: 90, y: 90 }, { x: 270, y: 90 },
      { x: 270, y: 270 }, { x: 90, y: 270 },
    ],
    pause: 2.2,
  },
  {
    name: 'Queen',
    waypoints: [
      { x: 1030, y: 440 }, { x: 1210, y: 440 },
      { x: 1210, y: 540 }, { x: 1030, y: 540 },
    ],
    pause: 1.2,
  },
];

export const CAMERAS = [
  {
    name: 'Cam A',
    x: 640, y: 30, baseAngle: Math.PI / 2, // hangs on the hall's north wall
    sweepRange: 0.9, // radians either side of straight down
  },
  {
    name: 'Cam B',
    x: 1250, y: 440, baseAngle: Math.PI, // east wall of the laser zone
    sweepRange: 0.7,
  },
  {
    name: 'Cam C',
    x: 1100, y: 30, baseAngle: Math.PI / 2, // above the gold
    sweepRange: 0.8,
  },
];

/** Room labels drawn faintly on the floor. */
export const ROOM_LABELS = [
  { x: 170, y: 50, text: 'OFFICE' },
  { x: 620, y: 50, text: 'MAIN HALL' },
  { x: 1110, y: 50, text: 'VAULT' },
  { x: 1120, y: 340, text: 'LASER GRID' },
  { x: 480, y: 600, text: 'SERVICE CORRIDOR' },
  { x: 1120, y: 600, text: 'EXIT' },
];
