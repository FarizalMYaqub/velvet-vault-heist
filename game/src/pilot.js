// Velvet Vault — the autopilot. It plays the real rules (no cheats, no
// teleports) so the screenshots are frames a real game produces: it steers
// between waypoints, waits out a sweeping cone, hides in shadow when a
// guard grows suspicious, and spends smoke or an EMP when it is cornered.
import { GUARD } from './config.js';
import { blockedByWall, dist } from './sim.js';
import { SHADOWS, VENTS } from './vault.js';

/** The job, in order: diamond, ledger, vault door, gold, exit. */
const JOB = [
  { kind: 'goto', x: 460, y: 620 },
  { kind: 'goto', x: 460, y: 520 },
  { kind: 'goto', x: 460, y: 350 },
  { kind: 'goto', x: 620, y: 380 },
  { kind: 'loot', id: 'diamond' },
  { kind: 'goto', x: 460, y: 350 },
  { kind: 'goto', x: 170, y: 350 },
  { kind: 'goto', x: 170, y: 260 },
  { kind: 'goto', x: 120, y: 165 },
  { kind: 'loot', id: 'ledger' },
  { kind: 'goto', x: 170, y: 260 },
  { kind: 'goto', x: 170, y: 350 },
  { kind: 'goto', x: 460, y: 350 },
  { kind: 'goto', x: 900, y: 430 },
  { kind: 'goto', x: 1020, y: 430 },
  { kind: 'goto', x: 1090, y: 360 },
  { kind: 'vault' },
  { kind: 'goto', x: 1100, y: 200 },
  { kind: 'loot', id: 'gold' },
  { kind: 'goto', x: 1090, y: 430 },
  { kind: 'goto', x: 1090, y: 540 },
  { kind: 'goto', x: 1090, y: 620 },
  { kind: 'goto', x: 1198, y: 672 },
];

function guardThreat(state, x, y) {
  // How dangerous is it to stand at (x, y) right now? 0 = safe.
  let worst = 0;
  for (const g of state.guards) {
    const d = dist(g.x, g.y, x, y);
    if (d > GUARD.sightRange + 40) continue;
    const to = Math.atan2(y - g.y, x - g.x);
    let diff = Math.abs(to - g.face);
    while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);
    if (diff < GUARD.sightHalfAngle + 0.15) {
      worst = Math.max(worst, g.mode === 'chase' ? 2 : 1 + g.suspicion);
    }
  }
  return worst;
}

function nearestShadow(x, y) {
  // The nearest shadow the thief can actually walk to: a shadow behind
  // a wall is no hiding place, it is a trap on the other side.
  let best = null;
  let bestD = Infinity;
  for (const s of SHADOWS) {
    const cx = s.x + s.w / 2;
    const cy = s.y + s.h / 2;
    const d = dist(x, y, cx, cy);
    if (d < bestD && !blockedByWall(x, y, cx, cy)) { bestD = d; best = { x: cx, y: cy }; }
  }
  return best;
}

export function createPilot(mode) {
  return {
    mode, // 'play' | 'win' | 'caught'
    jobIndex: 0,
    waitTimer: 0,
    pushTimer: 0, // seconds of going anyway after a full wait
    hideTimer: 0, // seconds spent standing still in a guard's cone
    sidestepTimer: 0, // seconds left sliding along an obstacle
    sidestep: 0, // +1 or -1: which way along the wall to slide
    checkX: 0, // position at the last stuck check
    checkY: 0,
    checkT: 0, // seconds since the last stuck check
  };
}

/**
 * Stuck detection over a half-second window: a thief who moved less than
 * 8px in 0.5s is pinned. The window matters: sneaking moves only ~1.6px
 * a step, so a per-step test would call every sneak a stuck.
 * Returns true while a sidestep is running (caller: keep sliding).
 * A slide that makes no progress flips its side at once, so a corner
 * (crate on one side, wall on the other) does not eat the whole slide.
 */
function stuckCheck(pilot, t) {
  if (pilot.sidestepTimer > 0) {
    pilot.sidestepTimer -= 1 / 60;
    pilot.checkT += 1 / 60;
    if (pilot.checkT >= 0.5) {
      const moved = dist(t.x, t.y, pilot.checkX, pilot.checkY);
      pilot.checkX = t.x;
      pilot.checkY = t.y;
      pilot.checkT = 0;
      if (moved < 8) pilot.sidestep = -pilot.sidestep;
    }
    return true;
  }
  pilot.checkT += 1 / 60;
  if (pilot.checkT >= 0.5) {
    const moved = dist(t.x, t.y, pilot.checkX, pilot.checkY);
    pilot.checkX = t.x;
    pilot.checkY = t.y;
    pilot.checkT = 0;
    if (moved < 8) {
      pilot.sidestep = pilot.sidestep === 0 ? 1 : -pilot.sidestep;
      pilot.sidestepTimer = 1.5;
      return true;
    }
  }
  return false;
}

/**
 * Slide along the obstacle, on the side the current sign picks. The sign
 * alternates each time the thief is pinned, so one episode goes one way
 * around the obstacle and the next goes the other way — the way out of a
 * corner is whichever side is actually open, and the flip finds it.
 */
function sidestepInput(pilot, input, t, tx, ty) {
  const dx = tx - t.x;
  const dy = ty - t.y;
  const s = pilot.sidestep || 1;
  if (Math.abs(dy) >= Math.abs(dx)) {
    if (s > 0) input.right = true;
    else input.left = true;
  } else if (s > 0) {
    input.down = true;
  } else {
    input.up = true;
  }
}

/** Fill `input` for this step. Returns false when the pilot is done. */
export function pilotInput(pilot, state, input) {
  const t = state.thief;
  input.up = input.down = input.left = input.right = false;
  input.run = false;
  input.sneak = false;
  input.interact = false;
  input.smoke = false;
  input.emp = false;

  if (state.phase !== 'play') return false;

  // A chasing guard nearby: run away, and smoke if he is close.
  const chaser = state.guards.find((g) => g.mode === 'chase');
  if (chaser) {
    const d = dist(chaser.x, chaser.y, t.x, t.y);
    if (d < 130 && state.smoke > 0) input.smoke = true;
    const away = Math.atan2(t.y - chaser.y, t.x - chaser.x);
    steer(input, t, t.x + Math.cos(away) * 100, t.y + Math.sin(away) * 100);
    input.run = true;
    return true;
  }

  if (pilot.mode === 'caught') {
    // Blunder straight at Rook, the hall guard, running — the caught
    // scene. Rook patrols open floor, so the thief can actually reach
    // him; the nearest guard by straight line may sit behind a wall.
    const near = state.guards[0];
    // Walls pin a straight-line blunder, so slide along them when stuck.
    if (stuckCheck(pilot, t)) {
      sidestepInput(pilot, input, t, near.x, near.y);
      input.run = true;
      return true;
    }
    steer(input, t, near.x, near.y);
    input.run = true;
    return true;
  }

  const step = JOB[pilot.jobIndex];
  if (!step) return false;

  let tx;
  let ty;
  if (step.kind === 'goto') {
    tx = step.x;
    ty = step.y;
    if (dist(t.x, t.y, tx, ty) < 18) {
      pilot.jobIndex += 1;
      return true;
    }
  } else if (step.kind === 'loot') {
    const loot = state.loot.find((l) => l.id === step.id);
    if (loot.taken) {
      pilot.jobIndex += 1;
      return true;
    }
    tx = loot.x;
    ty = loot.y;
    if (dist(t.x, t.y, tx, ty) < 46) {
      input.interact = true;
      return true;
    }
  } else if (step.kind === 'vault') {
    if (state.vaultOpen) {
      pilot.jobIndex += 1;
      return true;
    }
    tx = 1090;
    ty = 360;
    if (dist(t.x, t.y, tx, ty) < 50) {
      input.interact = true;
      return true;
    }
  }

  // A guard is watching the next stretch: wait in place (sneaking) unless
  // the route is clear. Wait at most a few seconds — patrols move on —
  // then push through anyway, sneaking, for a few seconds: waiting one
  // step at a time would crawl. Standing still on purpose is not being
  // stuck: reset the check window.
  const threat = guardThreat(state, tx, ty);
  const here = guardThreat(state, t.x, t.y);
  if (threat >= 1 && here < 1 && pilot.pushTimer <= 0) {
    pilot.waitTimer += 1 / 60;
    pilot.checkT = 0;
    pilot.checkX = t.x;
    pilot.checkY = t.y;
    if (pilot.waitTimer < 6) {
      input.sneak = true;
      return true;
    }
    pilot.waitTimer = 0;
    pilot.pushTimer = 3;
  } else {
    pilot.waitTimer = 0;
  }
  if (pilot.pushTimer > 0) pilot.pushTimer -= 1 / 60;

  // The destination: the job target — or a nearby shadow, when a guard's
  // cone is on the thief right now. Hiding is a destination like any
  // other: it goes through the same stuck handling below, so a case
  // between the thief and the shadow cannot pin it forever. A push
  // overrules hiding: once the pilot has decided to go, it goes.
  // Standing still in a cone is a last resort, not a plan: after a few
  // seconds of it, give up and push through sneaking instead.
  let destX = tx;
  let destY = ty;
  if (here >= 1 && pilot.pushTimer <= 0) {
    const shadow = nearestShadow(t.x, t.y);
    if (shadow && dist(t.x, t.y, shadow.x, shadow.y) > 20
      && dist(t.x, t.y, shadow.x, shadow.y) < 220) {
      destX = shadow.x;
      destY = shadow.y;
    } else {
      // No shadow close by: stay put and sneak; the patrol moves on.
      pilot.hideTimer += 1 / 60;
      pilot.checkT = 0;
      pilot.checkX = t.x;
      pilot.checkY = t.y;
      if (pilot.hideTimer > 4) {
        pilot.hideTimer = 0;
        pilot.pushTimer = 3;
      } else {
        input.sneak = true;
        return true;
      }
    }
  } else {
    pilot.hideTimer = 0;
  }

  // Stuck against furniture or a wall? Slide along it, and flip the side
  // each time it pins again.
  if (stuckCheck(pilot, t)) {
    sidestepInput(pilot, input, t, destX, destY);
    return true;
  }

  // Cameras on the laser stretch: EMP them rather than walk the cones.
  const camSees = state.cameras.some((c) => c.seesThief);
  if (camSees && state.emp > 0 && t.x > 900) input.emp = true;

  steer(input, t, destX, destY);
  // Sneak through the office and the vault, where the cones are tight,
  // and while pushing through a watched stretch.
  if (pilot.pushTimer > 0 || (t.x < 344 && t.y < 324) || (t.x > 984 && t.y < 324)) input.sneak = true;
  return true;
}

function steer(input, t, tx, ty) {
  const dx = tx - t.x;
  const dy = ty - t.y;
  if (Math.abs(dx) > 2) {
    if (dx > 0) input.right = true;
    else input.left = true;
  }
  if (Math.abs(dy) > 2) {
    if (dy > 0) input.down = true;
    else input.up = true;
  }
}
