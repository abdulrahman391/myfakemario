/* Sprocket's Run — keyboard, touch and gamepad input
 * Actions: left, right, down, jump, run, start, pause, mute */
window.SR = window.SR || {};

(function () {
  const held = {};
  const hit = {};

  const KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ArrowDown: 'down', KeyS: 'down',
    ArrowUp: 'jump', KeyW: 'jump', Space: 'jump', KeyZ: 'jump', KeyK: 'jump',
    ShiftLeft: 'run', ShiftRight: 'run', KeyX: 'run', KeyJ: 'run',
    Enter: 'start', NumpadEnter: 'start',
    KeyP: 'pause', Escape: 'pause',
    KeyM: 'mute',
  };
  const GAME_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space']);

  function press(a) { if (!held[a]) hit[a] = true; held[a] = true; if (SR.audio) SR.audio.unlock(); }
  function release(a) { held[a] = false; }

  addEventListener('keydown', e => {
    const a = KEYMAP[e.code];
    if (!a) return;
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName);
    if (typing) return;
    if (GAME_KEYS.has(e.code) && SR.gameActive && SR.gameActive()) e.preventDefault();
    if (e.repeat) return;
    press(a);
  });
  addEventListener('keyup', e => { const a = KEYMAP[e.code]; if (a) release(a); });
  addEventListener('blur', () => { for (const k in held) held[k] = false; });

  // On-screen buttons: any element with data-btn="left|right|jump|run|start|pause"
  function bindTouch(root) {
    root.querySelectorAll('[data-btn]').forEach(el => {
      const a = el.dataset.btn;
      const down = e => { e.preventDefault(); el.setPointerCapture && el.setPointerCapture(e.pointerId); el.classList.add('on'); press(a); };
      const up = e => { e.preventDefault(); el.classList.remove('on'); release(a); };
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('lostpointercapture', up);
      el.addEventListener('contextmenu', e => e.preventDefault());
    });
  }

  // Gamepad (standard mapping): d-pad / left stick, A = jump, X or B = run, Start = pause
  const padPrev = {};
  function pollPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const p = pads && pads[0];
    if (!p) return;
    const ax = p.axes[0] || 0;
    const btn = i => !!(p.buttons[i] && p.buttons[i].pressed);
    const st = {
      left: ax < -0.4 || btn(14), right: ax > 0.4 || btn(15), down: btn(13),
      jump: btn(0), run: btn(2) || btn(1), pause: btn(9), start: false,
    };
    for (const a in st) {
      if (st[a] && !padPrev[a]) press(a);
      if (!st[a] && padPrev[a]) release(a);
      padPrev[a] = st[a];
    }
  }

  SR.input = {
    down: a => !!held[a],
    hit: a => !!hit[a],
    endTick() { for (const k in hit) hit[k] = false; },
    pollPad,
    bindTouch,
  };
})();
