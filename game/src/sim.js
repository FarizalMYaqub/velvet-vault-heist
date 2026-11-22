// Velvet Vault — the simulation. Pure logic, no DOM: Node can import it
// and play a whole heist headless, which is how the screenshots are staged
// and how the logic tests run. The renderer only draws this state.
import {
  ALARM, CAMERA, CHANNEL, FIELD, GUARD, LASER, SCORE, THIEF, TOOLS,
} from './config.js';
import {
  CAMERAS, DIAMOND_CASE, EXIT, FURNITURE, GUARD_ROUTES, LASERS, LOOT,
  SHADOWS, SPAWN, VAULT_DOOR, VENTS, WALLS,
} from './vault.js';

const SOLIDS = [...WALLS, ...FURNITURE, DIAMOND_CASE];

export function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** True when the segment a->b crosses any solid rectangle. */
export function blockedByWall(ax, ay, bx, by) {
  for (const r of SOLIDS) {
    if (segmentHitsRect(ax, ay, bx, by, r)) return true;
  }
  return false;
}

function segmentHitsRect(ax, ay, bx, by, r) {
  // Liang-Barsky slab test.
  const dx = bx - ax;
  const dy = by - ay;
  let t0 = 0;
  let t1 = 1;
  const p = [-dx, dx, -dy, dy];
  const q = [ax - r.x, r.x + r.w - ax, ay - r.y, r.y + r.h - ay];
  for (let i = 0; i < 4; i += 1) {
    if (p[i] === 0) {
      if (q[i] < 0) return false;
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) {
        if (t > t1) return false;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return false;
        if (t < t1) t1 = t;
      }
    }
  }
  return true;
}

/** True when the segment a->b passes through the circle. */
function segmentHitsCircle(ax, ay, bx, by, cx, cy, r) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((cx - ax) * dx + (cy - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const px = ax + t * dx;
  const py = ay + t * dy;
  return dist(px, py, cx, cy) < r;
}

function circleHitsRect(x, y, radius, r) {
  const cx = Math.max(r.x, Math.min(x, r.x + r.w));
  const cy = Math.max(r.y, Math.min(y, r.y + r.h));
  return dist(x, y, cx, cy) < radius;
}

function inShadow(x, y) {
  return SHADOWS.some((s) => x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h);
}

/** Move a circle through the solids, axis by axis, sliding along walls. */
function moveCircle(body, dx, dy) {
  const nx = body.x + dx;
  if (!SOLIDS.some((r) => circleHitsRect(nx, body.y, body.radius, r))) body.x = nx;
  const ny = body.y + dy;
  if (!SOLIDS.some((r) => circleHitsRect(body.x, ny, body.radius, r))) body.y = ny;
}

const silentAudio = {
  step() {}, pickup() {}, suspicious() {}, spotted() {}, cameraBeep() {},
  caught() {}, win() {}, click() {}, door() {}, laser() {}, smoke() {}, emp() {},
};

export function createWorld() {
  return {
    time: 0,
    phase: 'play', // play | caught | win
    thief: {
      x: SPAWN.x, y: SPAWN.y, radius: THIEF.radius,
      face: -Math.PI / 2, moving: false, running: false, sneaking: false,
    },
    guards: GUARD_ROUTES.map((route) => ({
      name: route.name,
      route,
      x: route.waypoints[0].x, y: route.waypoints[0].y,
      radius: GUARD.radius,
      waypoint: 1,
      face: Math.atan2(
        route.waypoints[1].y - route.waypoints[0].y,
        route.waypoints[1].x - route.waypoints[0].x,
      ),
      mode: 'patrol', // patrol | pause | investigate | chase
      suspicion: 0,
      pauseTimer: 0,
      scanTimer: 0,
      pauseFace: Math.atan2(
        route.waypoints[1].y - route.waypoints[0].y,
        route.waypoints[1].x - route.waypoints[0].x,
      ),
      lastSeen: null,
      unseenTimer: 0,
      investigateTarget: null,
    })),
    cameras: CAMERAS.map((c) => ({ ...c, angle: c.baseAngle, seesThief: false })),
    lasers: LASERS.map((l) => ({ ...l, on: false })),
    loot: LOOT.map((l) => ({ ...l, taken: false })),
    vaultOpen: false,
    exitOpen: false,
    alarm: 0,
    lockdown: false,
    smoke: 3,
    emp: 2,
    empTimer: 0,
    smokes: [], // {x, y, r, ttl}
    channel: null, // {kind, id, progress, need}
    venting: 0, // seconds left crawling through a vent
    ventTarget: null,
    score: 0,
    everChased: false,
    maxSuspicion: 0,
    caughtBy: null,
    event: null, // {text, at} — the latest banner for the HUD
    events: [],
  };
}

function announce(state, text) {
  state.event = { text, at: state.time };
  state.events.push({ text, at: state.time });
}

function smokeBlocks(state, ax, ay, bx, by) {
  return state.smokes.some((s) => segmentHitsCircle(ax, ay, bx, by, s.x, s.y, s.r));
}

function thiefVisibleTo(state, ox, oy) {
  const t = state.thief;
  if (state.venting > 0) return false;
  if (smokeBlocks(state, ox, oy, t.x, t.y)) return false;
  return !blockedByWall(ox, oy, t.x, t.y);
}

function stepGuard(state, g, dt, input, audio) {
  const t = state.thief;
  const d = dist(g.x, g.y, t.x, t.y);
  const toThief = Math.atan2(t.y - g.y, t.x - g.x);
  const inCone = d < GUARD.sightRange
    && Math.abs(angleDiff(toThief, g.face)) < GUARD.sightHalfAngle;
  const seen = inCone && thiefVisibleTo(state, g.x, g.y);

  if (seen) {
    let rate = GUARD.spotRate;
    if (t.running) rate *= 2;
    if (t.sneaking) rate *= 0.55;
    if (inShadow(t.x, t.y)) rate *= 0.5;
    if (state.channel) rate *= 0.6; // crouched over a lock or a loot case
    if (d < 90) rate *= 1.5;
    else if (d > 160) rate *= 0.7;
    const before = g.suspicion;
    g.suspicion = Math.min(1, g.suspicion + rate * dt);
    state.maxSuspicion = Math.max(state.maxSuspicion, g.suspicion);
    if (before < 0.5 && g.suspicion >= 0.5) {
      announce(state, `${g.name} is suspicious…`);
      audio.suspicious();
    }
    g.lastSeen = { x: t.x, y: t.y };
    g.unseenTimer = 0;
    if (g.suspicion >= 1 && g.mode !== 'chase') {
      g.mode = 'chase';
      state.everChased = true;
      announce(state, `${g.name} spotted you — RUN!`);
      audio.spotted();
    }
  } else {
    g.suspicion = Math.max(0, g.suspicion - 0.25 * dt);
    g.unseenTimer += dt;
  }

  if (g.mode === 'chase') {
    if (g.lastSeen) {
      const a = Math.atan2(g.lastSeen.y - g.y, g.lastSeen.x - g.x);
      g.face = a;
      const speed = state.lockdown ? GUARD.lockdown : GUARD.chase;
      moveCircle(g, Math.cos(a) * speed * dt, Math.sin(a) * speed * dt);
      if (dist(g.x, g.y, t.x, t.y) < GUARD.catchRadius + t.radius - 6) {
        state.phase = 'caught';
        state.caughtBy = g.name;
        announce(state, `Caught by ${g.name}!`);
        audio.caught();
        return;
      }
      if (g.unseenTimer > GUARD.loseSight) {
        g.mode = 'investigate';
        g.investigateTarget = { ...g.lastSeen };
      }
    } else {
      g.mode = 'patrol';
    }
    return;
  }

  if (g.mode === 'investigate' && g.investigateTarget) {
    const target = g.investigateTarget;
    const a = Math.atan2(target.y - g.y, target.x - g.x);
    g.face = a;
    moveCircle(g, Math.cos(a) * GUARD.investigate * dt, Math.sin(a) * GUARD.investigate * dt);
    if (dist(g.x, g.y, target.x, target.y) < 16) {
      g.investigateTarget = null;
      g.mode = 'pause';
      g.pauseTimer = 2.5;
    }
    return;
  }

  if (g.mode === 'pause') {
    g.pauseTimer -= dt;
    g.scanTimer += dt;
    // Look around while waiting: sweep either side of the direction the
    // guard arrived facing, then settle back — never drift away.
    g.face = g.pauseFace + Math.sin(g.scanTimer * 1.2) * 0.8;
    if (g.pauseTimer <= 0) {
      g.mode = 'patrol';
      g.waypoint = (g.waypoint + 1) % g.route.waypoints.length;
    }
    return;
  }

  // Patrol: walk to the next waypoint, pause and look around there.
  const wp = g.route.waypoints[g.waypoint];
  const a = Math.atan2(wp.y - g.y, wp.x - g.x);
  g.face = a;
  moveCircle(g, Math.cos(a) * GUARD.patrol * dt, Math.sin(a) * GUARD.patrol * dt);
  if (dist(g.x, g.y, wp.x, wp.y) < 10) {
    g.mode = 'pause';
    g.pauseTimer = g.route.pause;
    g.scanTimer = 0;
    g.pauseFace = g.face;
  }
}

function stepCamera(state, cam, dt, audio) {
  if (state.empTimer > 0) {
    cam.seesThief = false;
    return;
  }
  cam.angle = cam.baseAngle
    + Math.sin(state.time * CAMERA.sweep) * cam.sweepRange;
  const t = state.thief;
  const d = dist(cam.x, cam.y, t.x, t.y);
  const toThief = Math.atan2(t.y - cam.y, t.x - cam.x);
  const inCone = d < CAMERA.range
    && Math.abs(angleDiff(toThief, cam.angle)) < CAMERA.halfAngle;
  const seen = inCone && thiefVisibleTo(state, cam.x, cam.y);
  cam.seesThief = seen;
  if (seen) {
    state.alarm = Math.min(ALARM.max, state.alarm + CAMERA.alarmRate * dt);
    if (!state.event || state.time - state.event.at > 2) {
      announce(state, `${cam.name} has eyes on you!`);
      audio.cameraBeep();
    }
  }
}

function stepLasers(state, dt, audio) {
  const active = state.empTimer <= 0;
  const t = state.thief;
  for (const laser of state.lasers) {
    const phase = (state.time + laser.offset) % LASER.cycle;
    laser.on = active && phase < LASER.onTime;
    if (!laser.on || state.venting > 0) continue;
    // The thief crosses the beam's line while standing in the zone.
    if (Math.abs(t.y - laser.y) < t.radius + 2 && t.x > laser.x0 && t.x < laser.x1) {
      if (!laser.trippedAt || state.time - laser.trippedAt > 1.5) {
        laser.trippedAt = state.time;
        state.alarm = Math.min(ALARM.max, state.alarm + ALARM.laserTrip);
        announce(state, 'Laser grid tripped!');
        audio.laser();
        for (const g of state.guards) {
          if (g.mode === 'patrol' || g.mode === 'pause') {
            g.mode = 'investigate';
            g.investigateTarget = { x: t.x, y: laser.y };
          }
        }
      }
    }
  }
}

function nearestInteractable(state) {
  const t = state.thief;
  for (const loot of state.loot) {
    if (!loot.taken && dist(t.x, t.y, loot.x, loot.y) < 48) {
      return { kind: 'loot', id: loot.id, need: CHANNEL.loot, label: `Grab ${loot.name}` };
    }
  }
  if (!state.vaultOpen && dist(t.x, t.y, VAULT_DOOR.x + 30, VAULT_DOOR.y + 12) < 56) {
    return { kind: 'vault', id: 'vault', need: CHANNEL.vaultDoor, label: 'Pick the vault lock' };
  }
  for (const vent of VENTS) {
    if (dist(t.x, t.y, vent.x, vent.y) < 42) {
      return { kind: 'vent', id: vent.id, need: CHANNEL.vent, label: 'Crawl through the vent' };
    }
  }
  return null;
}

/** Advance the world one fixed step. `input` is {up,down,left,right,run,sneak,interact,smoke,emp}. */
export function stepWorld(state, input, dt, audio = silentAudio) {
  if (state.phase !== 'play') return;
  state.time += dt;

  // Tools.
  if (input.smoke && state.smoke > 0) {
    state.smoke -= 1;
    state.smokes.push({ x: state.thief.x, y: state.thief.y, r: TOOLS.smokeRadius, ttl: TOOLS.smokeSeconds });
    announce(state, 'Smoke out — they lost you');
    audio.smoke();
  }
  if (input.emp && state.emp > 0 && state.empTimer <= 0) {
    state.emp -= 1;
    state.empTimer = TOOLS.empSeconds;
    announce(state, 'EMP burst — cameras and lasers down');
    audio.emp();
  }
  if (state.empTimer > 0) state.empTimer -= dt;
  for (const s of state.smokes) s.ttl -= dt;
  state.smokes = state.smokes.filter((s) => s.ttl > 0);

  const t = state.thief;

  // Vent crawl: hidden and immobile until it finishes.
  if (state.venting > 0) {
    state.venting -= dt;
    if (state.venting <= 0 && state.ventTarget) {
      t.x = state.ventTarget.x;
      t.y = state.ventTarget.y;
      state.ventTarget = null;
      announce(state, 'Through the vent — unseen');
      audio.door();
    }
  } else {
    // Movement.
    let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    const moving = mx !== 0 || my !== 0;
    t.moving = moving;
    t.running = moving && !!input.run;
    t.sneaking = moving && !!input.sneak && !input.run;
    if (moving) {
      const len = Math.hypot(mx, my);
      mx /= len;
      my /= len;
      const speed = t.running ? THIEF.run : t.sneaking ? THIEF.sneak : THIEF.walk;
      t.face = Math.atan2(my, mx);
      moveCircle(t, mx * speed * dt, my * speed * dt);
      if (t.running && state.time % 0.34 < dt) audio.step();
    }

    // Noise: running is heard through the dark.
    if (t.running) {
      for (const g of state.guards) {
        if ((g.mode === 'patrol' || g.mode === 'pause')
          && dist(g.x, g.y, t.x, t.y) < 170) {
          g.mode = 'investigate';
          g.investigateTarget = { x: t.x, y: t.y };
        }
      }
    }

    // Interaction channel (hold E near a target).
    const near = nearestInteractable(state);
    if (input.interact && near) {
      if (!state.channel || state.channel.id !== near.id) {
        state.channel = { kind: near.kind, id: near.id, progress: 0, need: near.need, label: near.label };
      }
      state.channel.progress += dt;
      if (state.channel.progress >= state.channel.need) {
        if (near.kind === 'loot') {
          const loot = state.loot.find((l) => l.id === near.id);
          loot.taken = true;
          state.score += SCORE.loot;
          announce(state, `${loot.name} secured (+${SCORE.loot})`);
          audio.pickup();
        } else if (near.kind === 'vault') {
          state.vaultOpen = true;
          announce(state, 'Vault door open — the gold is yours');
          audio.door();
        } else if (near.kind === 'vent') {
          const vent = VENTS.find((v) => v.id === near.id);
          const other = VENTS.find((v) => v.id === vent.other);
          state.venting = CHANNEL.vent;
          state.ventTarget = { x: other.x, y: other.y };
        }
        state.channel = null;
      }
    } else {
      state.channel = null;
    }
  }

  // The world reacts.
  for (const g of state.guards) stepGuard(state, g, dt, input, audio);
  if (state.phase !== 'play') return;
  for (const cam of state.cameras) stepCamera(state, cam, dt, audio);
  stepLasers(state, dt, audio);

  // Alarm: chases push it up, silence lets it fall.
  const anyChase = state.guards.some((g) => g.mode === 'chase');
  if (anyChase) {
    state.alarm = Math.min(ALARM.max, state.alarm + ALARM.chaseRate * dt);
  } else if (!state.cameras.some((c) => c.seesThief)) {
    state.alarm = Math.max(0, state.alarm - ALARM.decay * dt);
  }
  const wasLockdown = state.lockdown;
  state.lockdown = state.alarm >= ALARM.lockdownAt;
  if (state.lockdown && !wasLockdown) {
    announce(state, 'LOCKDOWN — the exit is sealed!');
    audio.spotted();
  }
  if (!state.lockdown && wasLockdown) announce(state, 'Lockdown lifted');

  // The exit opens once every loot target is taken.
  state.exitOpen = state.loot.every((l) => l.taken);
  if (state.exitOpen && !state.lockdown
    && t.x > EXIT.x && t.x < EXIT.x + EXIT.w
    && t.y > EXIT.y && t.y < EXIT.y + EXIT.h) {
    state.phase = 'win';
    const timeBonus = Math.max(0, Math.round(
      SCORE.timeBonusMax * (1 - state.time / (SCORE.timeBonusSeconds * 2)),
    ));
    const ghost = !state.everChased ? SCORE.ghost : 0;
    const unseen = state.maxSuspicion < 0.5 ? SCORE.unseen : 0;
    state.score += timeBonus + ghost + unseen;
    state.winBreakdown = { timeBonus, ghost, unseen, time: state.time };
    announce(state, 'Clean getaway!');
    audio.win();
  }
}
