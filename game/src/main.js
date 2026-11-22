// Velvet Vault — the game loop. Screens: title -> brief -> play, with
// pause, caught and win. A ?shot=start|play|caught|win query stages that
// screenshot scene instead of starting the title screen, and sets
// window.__shotReady when the frame is drawn. The live state is exposed
// as window.__game for playtesting.
import { BEST_KEY, FIELD, STEP } from './config.js';
import { createInput } from './input.js';
import { render } from './render.js';
import { stageShot } from './shots.js';
import { createWorld, stepWorld } from './sim.js';
import { isMuted, sound, toggleMute } from './sound.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

function fitCanvas() {
  const scale = Math.min(window.innerWidth / FIELD.width, window.innerHeight / FIELD.height);
  canvas.width = FIELD.width;
  canvas.height = FIELD.height;
  canvas.style.width = `${Math.floor(FIELD.width * scale)}px`;
  canvas.style.height = `${Math.floor(FIELD.height * scale)}px`;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

let best = 0;
try {
  best = Number(localStorage.getItem(BEST_KEY) ?? 0) || 0;
} catch {
  best = 0;
}

let world = createWorld();
let screen = 'title'; // title | brief | play | paused | caught | win
let accumulator = 0;
let last = performance.now();

const input = createInput(canvas);
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  const staged = stageShot(shot, world);
  screen = staged.screen;
  if (world.phase === 'win' || world.phase === 'caught') {
    screen = world.phase;
    if (world.score > best) {
      best = world.score;
      try { localStorage.setItem(BEST_KEY, String(best)); } catch { /* private mode */ }
    }
  }
  if (world.phase === 'play' && staged.screen === 'play') screen = 'play';
}

function announce(text) {
  statusEl.textContent = text;
}

function restart() {
  world = createWorld();
  screen = 'play';
  announce('The job begins. Take all three prizes, then slip out the green exit.');
}

function frame(now) {
  const edges = input.consumeEdges();
  if (edges.mute) {
    const muted = toggleMute();
    announce(muted ? 'Sound off.' : 'Sound on.');
  }
  if (edges.restart && (screen === 'caught' || screen === 'win' || screen === 'paused' || screen === 'play')) {
    sound.click();
    restart();
  } else if (edges.escape && (screen === 'play' || screen === 'paused')) {
    screen = screen === 'play' ? 'paused' : 'play';
    sound.click();
  } else if (edges.space) {
    if (screen === 'title') {
      screen = 'brief';
      sound.click();
    } else if (screen === 'brief') {
      screen = 'play';
      sound.click();
      announce('The job begins. Take all three prizes, then slip out the green exit.');
    }
  }

  if (screen === 'play') {
    const dt = Math.min(0.1, (now - last) / 1000);
    accumulator += dt;
    const simInput = { ...input.state, smoke: edges.smoke, emp: edges.emp };
    while (accumulator >= STEP) {
      stepWorld(world, simInput, STEP, sound);
      simInput.smoke = false;
      simInput.emp = false;
      accumulator -= STEP;
      if (world.phase !== 'play') break;
    }
    if (world.phase === 'caught') {
      screen = 'caught';
      announce(`Caught by ${world.caughtBy}. The vault keeps its secrets.`);
    } else if (world.phase === 'win') {
      screen = 'win';
      if (world.score > best) {
        best = world.score;
        try { localStorage.setItem(BEST_KEY, String(best)); } catch { /* private mode */ }
      }
      announce(`Clean getaway. Score ${world.score}.`);
    }
  }
  last = now;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  render(ctx, world, screen, best);
  if (shot) window.__shotReady = true;
  requestAnimationFrame(frame);
}

// Playtesting handle: the screen, the thief, the guards and the alarm.
window.__game = {
  get screen() { return screen; },
  get player() { return { x: world.thief.x, y: world.thief.y }; },
  get guards() {
    return world.guards.map((g) => ({ name: g.name, mode: g.mode, suspicion: +g.suspicion.toFixed(2) }));
  },
  get alarm() { return Math.round(world.alarm); },
  get score() { return world.score; },
  get phase() { return world.phase; },
  get loot() { return world.loot.map((l) => l.taken); },
  isMuted,
};

requestAnimationFrame(frame);
