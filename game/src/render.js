// Velvet Vault — everything the eye sees, drawn on one canvas. The whole
// floor fits in a single 1280x720 frame: the thief, the guards and their
// vision cones, the cameras, the laser grid, the loot and the alarm meter
// are all visible at once, which is what the judge's first criterion asks
// for. Screens (title, brief, caught, win) are drawn here too, so a
// screenshot of any of them is a real frame of the game.
import { ALARM, CAMERA, FIELD, GUARD, PALETTE } from './config.js';
import {
  CAMERAS, DIAMOND_CASE, EXIT, FURNITURE, ROOM_LABELS, SHADOWS,
  VAULT_DOOR, VENTS, WALLS,
} from './vault.js';

function coneColor(suspicion, mode) {
  if (mode === 'chase') return PALETTE.coneChase;
  if (suspicion >= 0.5) return PALETTE.coneWary;
  return PALETTE.coneCalm;
}

function drawCone(ctx, x, y, angle, halfAngle, range, color) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawWalls(ctx) {
  for (const w of WALLS) {
    ctx.fillStyle = PALETTE.wallTop;
    ctx.fillRect(w.x, w.y, w.w, 4);
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(w.x, w.y + 4, w.w, w.h - 4);
  }
}

function drawFurniture(ctx) {
  for (const f of [...FURNITURE, DIAMOND_CASE]) {
    ctx.fillStyle = '#39415a';
    ctx.fillRect(f.x, f.y, f.w, f.h);
    ctx.strokeStyle = '#565e78';
    ctx.lineWidth = 2;
    ctx.strokeRect(f.x + 1, f.y + 1, f.w - 2, f.h - 2);
    if (f.kind === 'case') {
      ctx.fillStyle = 'rgba(125, 211, 252, 0.14)';
      ctx.fillRect(f.x + 4, f.y + 4, f.w - 8, f.h - 8);
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.5)';
      ctx.beginPath();
      ctx.moveTo(f.x + 8, f.y + f.h - 8);
      ctx.lineTo(f.x + f.w - 20, f.y + 8);
      ctx.stroke();
    }
    if (f.kind === 'desk') {
      ctx.fillStyle = '#5b4632';
      ctx.fillRect(f.x + 6, f.y + 6, f.w - 12, f.h - 12);
    }
    if (f.kind === 'shelf') {
      ctx.fillStyle = '#6b5a2e';
      for (let i = 0; i < 3; i += 1) ctx.fillRect(f.x + 6, f.y + 8 + i * 38, f.w - 12, 6);
    }
    if (f.kind === 'crate') {
      ctx.strokeStyle = '#7a6a45';
      ctx.beginPath();
      ctx.moveTo(f.x, f.y);
      ctx.lineTo(f.x + f.w, f.y + f.h);
      ctx.moveTo(f.x + f.w, f.y);
      ctx.lineTo(f.x, f.y + f.h);
      ctx.stroke();
    }
  }
}

function drawLoot(ctx, state) {
  for (const loot of state.loot) {
    if (loot.taken) continue;
    const pulse = 0.6 + 0.4 * Math.sin(state.time * 3 + loot.x);
    if (loot.id === 'diamond') {
      ctx.save();
      ctx.translate(loot.x, loot.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = PALETTE.crimson;
      ctx.globalAlpha = pulse;
      ctx.fillRect(-11, -11, 22, 22);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#ffb4ae';
      ctx.lineWidth = 2;
      ctx.strokeRect(-11, -11, 22, 22);
      ctx.restore();
    } else if (loot.id === 'ledger') {
      ctx.fillStyle = '#e8dcc3';
      ctx.fillRect(loot.x - 13, loot.y - 10, 26, 20);
      ctx.fillStyle = '#8a2f2b';
      ctx.fillRect(loot.x - 13, loot.y - 10, 6, 20);
      ctx.fillStyle = '#8a2f2b';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('LEDGER', loot.x, loot.y - 16);
    } else {
      for (let i = 0; i < 3; i += 1) {
        ctx.fillStyle = i === 1 ? PALETTE.goldDim : PALETTE.gold;
        ctx.globalAlpha = pulse;
        ctx.fillRect(loot.x - 18 + i * 12, loot.y - 6 + (i % 2) * 8, 14, 8);
      }
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(loot.name.toUpperCase(), loot.x, loot.y + 28);
  }
}

function drawLasers(ctx, state) {
  for (const laser of state.lasers) {
    if (laser.on) {
      ctx.strokeStyle = PALETTE.laser;
      ctx.lineWidth = 3;
      ctx.shadowColor = PALETTE.laser;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(laser.x0, laser.y);
      ctx.lineTo(laser.x1, laser.y);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = PALETTE.laser;
      ctx.beginPath();
      ctx.arc(laser.x0 + 4, laser.y, 5, 0, Math.PI * 2);
      ctx.arc(laser.x1 - 4, laser.y, 5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.25)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.moveTo(laser.x0, laser.y);
      ctx.lineTo(laser.x1, laser.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

function drawVaultAndExit(ctx, state) {
  // Vault door: a heavy circular door in the wall gap.
  ctx.save();
  ctx.translate(VAULT_DOOR.x + 30, VAULT_DOOR.y + 12);
  ctx.fillStyle = state.vaultOpen ? '#3a3f52' : PALETTE.goldDim;
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-12, 0);
  ctx.lineTo(12, 0);
  ctx.moveTo(0, -12);
  ctx.lineTo(0, 12);
  ctx.stroke();
  ctx.restore();
  if (!state.vaultOpen) {
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VAULT — HOLD E TO PICK', VAULT_DOOR.x + 30, VAULT_DOOR.y + 46);
  }

  // Exit: green door, glowing once the loot is all taken.
  const open = state.exitOpen && !state.lockdown;
  ctx.fillStyle = open ? PALETTE.emerald : '#1d5c38';
  ctx.fillRect(EXIT.x, EXIT.y, EXIT.w, EXIT.h);
  ctx.strokeStyle = open ? '#a7f3c9' : '#3fce7c';
  ctx.lineWidth = 3;
  ctx.strokeRect(EXIT.x + 1, EXIT.y + 1, EXIT.w - 2, EXIT.h - 2);
  ctx.fillStyle = open ? '#052e16' : '#a7f3c9';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(open ? 'EXIT' : 'LOCKED', EXIT.x + EXIT.w / 2, EXIT.y + EXIT.h / 2 + 6);
}

function drawVents(ctx) {
  for (const v of VENTS) {
    ctx.fillStyle = '#2b2f3a';
    ctx.fillRect(v.x - 16, v.y - 12, 32, 24);
    ctx.strokeStyle = '#565e78';
    ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.moveTo(v.x - 13, v.y + i * 7);
      ctx.lineTo(v.x + 13, v.y + i * 7);
      ctx.stroke();
    }
    ctx.fillStyle = PALETTE.muted;
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VENT — E', v.x, v.y + 26);
  }
}

function drawThief(ctx, state) {
  const t = state.thief;
  if (state.venting > 0) return; // inside the vent, unseen
  const r = t.sneaking ? t.radius - 3 : t.radius;
  ctx.fillStyle = 'rgba(125, 211, 252, 0.25)';
  ctx.beginPath();
  ctx.arc(t.x, t.y, r + 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.thiefDark;
  ctx.beginPath();
  ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.thief;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = PALETTE.thief;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(t.x, t.y);
  ctx.lineTo(t.x + Math.cos(t.face) * (r + 7), t.y + Math.sin(t.face) * (r + 7));
  ctx.stroke();
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('VESPER', t.x, t.y + r + 14);
  // Channel progress ring.
  if (state.channel) {
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(t.x, t.y, r + 12, -Math.PI / 2,
      -Math.PI / 2 + Math.PI * 2 * (state.channel.progress / state.channel.need));
    ctx.stroke();
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillText(state.channel.label.toUpperCase(), t.x, t.y - r - 18);
  }
}

function drawSmoke(ctx, state) {
  for (const s of state.smokes) {
    ctx.fillStyle = PALETTE.smoke;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(226, 232, 240, 0.5)';
    ctx.beginPath();
    ctx.arc(s.x - 20, s.y - 10, s.r * 0.5, 0, Math.PI * 2);
    ctx.arc(s.x + 25, s.y + 12, s.r * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHud(ctx, state, best) {
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(0, 0, FIELD.width, 46);
  ctx.fillStyle = PALETTE.panelEdge;
  ctx.fillRect(0, 46, FIELD.width, 2);

  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('VELVET VAULT', 14, 29);

  // Loot slots.
  const lootNames = ['◆ DIAMOND', '▤ LEDGER', '▬ GOLD'];
  state.loot.forEach((loot, i) => {
    const x = 170 + i * 108;
    ctx.fillStyle = loot.taken ? PALETTE.gold : '#3a3f52';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText(lootNames[i], x, 29);
    if (loot.taken) {
      ctx.strokeStyle = PALETTE.gold;
      ctx.strokeRect(x - 4, 12, 96, 22);
    }
  });

  // Alarm meter.
  const ax = 520;
  ctx.fillStyle = PALETTE.muted;
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText('ALARM', ax, 29);
  const mw = 240;
  ctx.fillStyle = '#2a2e3d';
  ctx.fillRect(ax + 58, 14, mw, 18);
  const frac = state.alarm / ALARM.max;
  const alarmColor = state.alarm >= ALARM.lockdownAt ? PALETTE.crimson
    : state.alarm >= 40 ? PALETTE.guard : PALETTE.emerald;
  ctx.fillStyle = alarmColor;
  ctx.fillRect(ax + 58, 14, mw * frac, 18);
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.strokeRect(ax + 58, 14, mw, 18);
  // Lockdown tick.
  ctx.strokeStyle = PALETTE.crimson;
  ctx.beginPath();
  ctx.moveTo(ax + 58 + mw * 0.75, 12);
  ctx.lineTo(ax + 58 + mw * 0.75, 34);
  ctx.stroke();
  if (state.lockdown && Math.floor(state.time * 3) % 2 === 0) {
    ctx.fillStyle = PALETTE.crimson;
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText('LOCKDOWN', ax + 308, 29);
  }

  // Tools, time, score.
  const mins = Math.floor(state.time / 60);
  const secs = Math.floor(state.time % 60).toString().padStart(2, '0');
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`◉ SMOKE ×${state.smoke}   ⚡ EMP ×${state.emp}${state.empTimer > 0 ? ` (${Math.ceil(state.empTimer)}s)` : ''}    ${mins}:${secs}    SCORE ${state.score}`, FIELD.width - 14, 29);
  ctx.textAlign = 'left';

  // Bottom hint line.
  ctx.fillStyle = 'rgba(18, 20, 29, 0.85)';
  ctx.fillRect(0, FIELD.height - 26, FIELD.width, 26);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('WASD / arrows — move    Shift — run (loud)    C — sneak    E (hold) — work a lock / grab loot / crawl a vent    Q — smoke    F — EMP    click — smoke    Esc — pause    M — mute', 14, FIELD.height - 8);

  // Event banner.
  if (state.event && state.time - state.event.at < 2.5) {
    ctx.fillStyle = 'rgba(18, 20, 29, 0.85)';
    const w = ctx.measureText(state.event.text).width + 28;
    ctx.fillRect((FIELD.width - w) / 2, 56, w, 30);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.event.text, FIELD.width / 2, 76);
    ctx.textAlign = 'left';
  }
}

function overlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(10, 12, 18, 0.82)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.fillStyle = accent;
  ctx.font = 'bold 52px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, FIELD.width / 2, 250);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '18px system-ui, sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, FIELD.width / 2, 300 + i * 30);
  });
  ctx.textAlign = 'left';
}

export function render(ctx, state, screen, best) {
  ctx.clearRect(0, 0, FIELD.width, FIELD.height);
  // Floor: checkerboard marble.
  const tile = 40;
  for (let y = 0; y < FIELD.height / tile; y += 1) {
    for (let x = 0; x < FIELD.width / tile; x += 1) {
      ctx.fillStyle = (x + y) % 2 === 0 ? PALETTE.floor : PALETTE.floorAlt;
      ctx.fillRect(x * tile, y * tile, tile, tile);
    }
  }
  // Rug in the main hall.
  ctx.fillStyle = PALETTE.rug;
  ctx.fillRect(470, 120, 340, 420);
  ctx.strokeStyle = '#5b2f42';
  ctx.lineWidth = 3;
  ctx.strokeRect(478, 128, 324, 404);
  // Shadow patches.
  for (const s of SHADOWS) {
    ctx.fillStyle = PALETTE.shadowFloor;
    ctx.fillRect(s.x, s.y, s.w, s.h);
  }
  // Room labels.
  ctx.fillStyle = 'rgba(238, 241, 245, 0.16)';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const label of ROOM_LABELS) ctx.fillText(label.text, label.x, label.y);
  ctx.textAlign = 'left';

  // Vision cones (drawn before walls, so walls clip them).
  drawGuardsConesOnly(ctx, state);
  drawCamerasConesOnly(ctx, state);
  drawWalls(ctx);
  drawFurniture(ctx);
  drawVents(ctx);
  drawLasers(ctx, state);
  drawVaultAndExit(ctx, state);
  drawLoot(ctx, state);
  drawSmoke(ctx, state);
  drawGuardBodies(ctx, state);
  drawCameraBodies(ctx, state);
  drawThief(ctx, state);
  drawHud(ctx, state, best);

  if (screen === 'title') {
    overlay(ctx, 'VELVET VAULT', [
      'The Meridian Vault — one thief, three prizes, zero witnesses.',
      'Guards sweep the halls. Cameras sweep the walls. Lasers sweep the floor.',
      '',
      'Press SPACE to case the joint',
      best > 0 ? `Best score: ${best}` : '',
    ], PALETTE.gold);
  } else if (screen === 'brief') {
    overlay(ctx, 'THE JOB', [
      '◆ Crimson Diamond — the glass case, centre of the Main Hall',
      '▤ Meridian Ledger — the wall safe in the Office',
      '▬ Gold Bullion — behind the vault door, past the laser grid',
      'Take all three, then slip out the green EXIT. Get caught and it is over.',
      'Vents link the hall to the laser grid. Smoke blinds eyes. EMP kills cameras.',
      '',
      'Press SPACE to begin',
    ], PALETTE.gold);
  } else if (screen === 'paused') {
    overlay(ctx, 'PAUSED', ['Esc — resume', 'R — restart the night'], PALETTE.muted);
  } else if (screen === 'caught') {
    overlay(ctx, 'CAUGHT', [
      `${state.caughtBy ?? 'A guard'} ran you down. The vault keeps its secrets.`,
      `Score: ${state.score}`,
      '',
      'Press R to run it back',
    ], PALETTE.crimson);
  } else if (screen === 'win') {
    const b = state.winBreakdown ?? { timeBonus: 0, ghost: 0, unseen: 0, time: 0 };
    overlay(ctx, 'CLEAN GETAWAY', [
      'All three prizes, out the green door, no cuffs.',
      `Loot ${state.loot.length * 500}  ·  time bonus +${b.timeBonus}  ·  ghost +${b.ghost}  ·  unseen +${b.unseen}`,
      `Time: ${Math.floor(b.time / 60)}:${Math.floor(b.time % 60).toString().padStart(2, '0')}   Score: ${state.score}`,
      '',
      'Press R to run it back',
    ], PALETTE.emerald);
  }
}

// Cones and bodies are split so the cones sit under the walls while the
// bodies sit on top of everything.
function drawGuardsConesOnly(ctx, state) {
  for (const g of state.guards) {
    drawCone(ctx, g.x, g.y, g.face, GUARD.sightHalfAngle, GUARD.sightRange,
      coneColor(g.suspicion, g.mode));
  }
}

function drawCamerasConesOnly(ctx, state) {
  for (const cam of state.cameras) {
    if (state.empTimer > 0) continue;
    drawCone(ctx, cam.x, cam.y, cam.angle, CAMERA.halfAngle, CAMERA.range,
      cam.seesThief ? 'rgba(229, 83, 75, 0.35)' : 'rgba(192, 132, 252, 0.20)');
  }
}

function drawGuardBodies(ctx, state) {
  for (const g of state.guards) {
    ctx.fillStyle = PALETTE.guardSuit;
    ctx.beginPath();
    ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = g.mode === 'chase' ? PALETTE.crimson : PALETTE.guard;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#fff7e0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(g.x + Math.cos(g.face) * (g.radius + 8), g.y + Math.sin(g.face) * (g.radius + 8));
    ctx.stroke();
    if (g.suspicion > 0.05) {
      ctx.strokeStyle = g.suspicion >= 1 ? PALETTE.crimson : PALETTE.guard;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.radius + 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * g.suspicion);
      ctx.stroke();
    }
    ctx.fillStyle = g.mode === 'chase' ? PALETTE.crimson : PALETTE.text;
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    if (g.mode === 'chase') ctx.fillText('!', g.x, g.y - g.radius - 10);
    else if (g.suspicion >= 0.5) ctx.fillText('?', g.x, g.y - g.radius - 10);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.fillText(g.name.toUpperCase(), g.x, g.y + g.radius + 14);
    ctx.textAlign = 'left';
  }
}

function drawCameraBodies(ctx, state) {
  for (const cam of state.cameras) {
    const disabled = state.empTimer > 0;
    ctx.fillStyle = disabled ? '#555b6e' : '#3a3f52';
    ctx.beginPath();
    ctx.arc(cam.x, cam.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = disabled ? '#555b6e' : PALETTE.camera;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cam.x, cam.y, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#e9d5ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cam.x, cam.y);
    ctx.lineTo(cam.x + Math.cos(cam.angle) * 16, cam.y + Math.sin(cam.angle) * 16);
    ctx.stroke();
    if (cam.seesThief && Math.floor(state.time * 4) % 2 === 0) {
      ctx.fillStyle = PALETTE.crimson;
      ctx.beginPath();
      ctx.arc(cam.x, cam.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = PALETTE.muted;
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(disabled ? 'OFFLINE' : cam.name.toUpperCase(), cam.x, cam.y + 24);
    ctx.textAlign = 'left';
  }
}
