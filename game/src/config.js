// Velvet Vault — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it
// to the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

export const THIEF = {
  radius: 13,
  walk: 175,
  run: 265,
  sneak: 95,
  vent: 60,
};

export const GUARD = {
  radius: 14,
  patrol: 82,
  investigate: 130,
  chase: 205,
  lockdown: 235,
  catchRadius: 20,
  /** Vision cone: how far and how wide a guard sees. */
  sightRange: 225,
  sightHalfAngle: 0.61, // ~35 degrees
  /** Suspicion per second at point-blank, in the open, walking. */
  spotRate: 1.15,
  /** Seconds of no sight before a guard gives up the chase. */
  loseSight: 4,
};

export const CAMERA = {
  range: 250,
  halfAngle: 0.5, // ~29 degrees
  sweep: 0.55, // radians per second
  alarmRate: 14, // alarm points per second while the thief is in view
};

export const ALARM = {
  max: 100,
  lockdownAt: 75,
  decay: 1.6, // points per second while unseen
  laserTrip: 30,
  chaseRate: 9, // points per second while any guard chases
};

export const LASER = {
  cycle: 4.2, // seconds per on/off cycle
  onTime: 2.6,
  stagger: 1.4, // seconds between beams
};

export const TOOLS = {
  smokeStart: 3,
  empStart: 2,
  smokeRadius: 95,
  smokeSeconds: 5,
  empSeconds: 6,
};

export const CHANNEL = {
  loot: 1.6, // seconds to grab a loot target
  vaultDoor: 3.0, // seconds to pick the vault door
  vent: 1.4, // seconds to crawl through a vent
};

export const SCORE = {
  loot: 500,
  ghost: 600, // never chased
  unseen: 300, // never spotted at all (suspicion never passed 0.5)
  timeBonusMax: 500,
  timeBonusSeconds: 240, // full time bonus under this time
};

export const PALETTE = {
  floor: '#1c1f2b',
  floorAlt: '#20242f',
  rug: '#3a2330',
  marble: '#2a2e3d',
  wall: '#4a4f63',
  wallTop: '#5d6380',
  shadowFloor: '#14161f',
  gold: '#f2c94c',
  goldDim: '#a8842c',
  crimson: '#e5534b',
  emerald: '#3fce7c',
  panel: '#12141d',
  panelEdge: '#333950',
  text: '#eef1f5',
  muted: '#9aa1b5',
  thief: '#7dd3fc',
  thiefDark: '#0e7490',
  guard: '#f59e0b',
  guardSuit: '#2b2f3a',
  camera: '#c084fc',
  laser: '#ef4444',
  coneCalm: 'rgba(242, 201, 76, 0.20)',
  coneWary: 'rgba(245, 158, 11, 0.30)',
  coneChase: 'rgba(229, 83, 75, 0.38)',
  smoke: 'rgba(148, 163, 184, 0.55)',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'velvet-vault.best';
