// Velvet Vault — the screenshot scenes behind ?shot=start|play|caught|win.
// Each one plays the real rules forward from a fresh world for a fixed
// number of steps, steered by the autopilot in pilot.js, so the frame is
// what a short game really looks like and the same seed always gives the
// same frame. No teleports, no staged states: the pilot only presses the
// same keys a player can.
import { STEP } from './config.js';
import { createPilot, pilotInput } from './pilot.js';
import { createWorld, stepWorld } from './sim.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 26;
const CAUGHT_LIMIT_SECONDS = 240;
const WIN_LIMIT_SECONDS = 420;

const silentAudio = {
  step() {}, pickup() {}, suspicious() {}, spotted() {}, cameraBeep() {},
  caught() {}, win() {}, click() {}, door() {}, laser() {}, smoke() {}, emp() {},
};

function runPilot(world, pilot, limitSeconds) {
  const input = {
    up: false, down: false, left: false, right: false,
    run: false, sneak: false, interact: false, smoke: false, emp: false,
  };
  const limit = Math.floor(limitSeconds / STEP);
  for (let i = 0; i < limit; i += 1) {
    if (world.phase !== 'play') break;
    pilotInput(pilot, world, input);
    stepWorld(world, input, STEP, silentAudio);
  }
}

/**
 * Set `world` to the named scene (start, play, caught or win) and return
 * the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  if (name === 'play') {
    const pilot = createPilot('play');
    runPilot(world, pilot, PLAY_SECONDS);
    return { screen: 'play', best: 0 };
  }
  if (name === 'caught') {
    const pilot = createPilot('caught');
    runPilot(world, pilot, CAUGHT_LIMIT_SECONDS);
    return { screen: world.phase === 'caught' ? 'caught' : 'play', best: 0 };
  }
  if (name === 'win') {
    const pilot = createPilot('win');
    runPilot(world, pilot, WIN_LIMIT_SECONDS);
    return { screen: world.phase === 'win' ? 'win' : 'play', best: world.score };
  }
  // start: a few seconds of patrols moving, title screen over the live floor.
  const pilot = createPilot('play');
  runPilot(world, pilot, START_SECONDS);
  return { screen: 'title', best: 0 };
}
