// Velvet Vault — keyboard and mouse state. WASD or arrows to move, Shift
// to run, C to sneak, E (hold) to work a lock or grab loot, Q for a smoke
// pellet, F for an EMP burst, Space to start, Esc to pause, R to restart,
// M to mute. A mouse click also drops a smoke pellet where the thief stands.
export function createInput(canvas) {
  const keys = new Set();
  const state = {
    up: false, down: false, left: false, right: false,
    run: false, sneak: false, interact: false,
    smoke: false, emp: false,
  };
  const edge = { smoke: false, emp: false, space: false, escape: false, restart: false, mute: false };

  function sync() {
    state.up = keys.has('KeyW') || keys.has('ArrowUp');
    state.down = keys.has('KeyS') || keys.has('ArrowDown');
    state.left = keys.has('KeyA') || keys.has('ArrowLeft');
    state.right = keys.has('KeyD') || keys.has('ArrowRight');
    state.run = keys.has('ShiftLeft') || keys.has('ShiftRight');
    state.sneak = keys.has('KeyC');
    state.interact = keys.has('KeyE');
  }

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    keys.add(e.code);
    if (e.code === 'KeyQ') edge.smoke = true;
    if (e.code === 'KeyF') edge.emp = true;
    if (e.code === 'Space') edge.space = true;
    if (e.code === 'Escape') edge.escape = true;
    if (e.code === 'KeyR') edge.restart = true;
    if (e.code === 'KeyM') edge.mute = true;
    sync();
  });
  window.addEventListener('keyup', (e) => {
    keys.delete(e.code);
    sync();
  });
  window.addEventListener('blur', () => {
    keys.clear();
    sync();
  });
  canvas.addEventListener('mousedown', () => {
    edge.smoke = true;
  });

  return {
    state,
    /** Edge-triggered actions, consumed once per frame. */
    consumeEdges() {
      const out = { ...edge };
      edge.smoke = false;
      edge.emp = false;
      edge.space = false;
      edge.escape = false;
      edge.restart = false;
      edge.mute = false;
      return out;
    },
  };
}
