/* Sprocket's Run — game engine
 * Fixed 60 Hz simulation, 320x192 pixel canvas scaled up with CSS.
 * Depends on sprites.js, levels.js, audio.js and input.js. */
window.SR = window.SR || {};

(function () {
  const { sprites, audio, input } = SR;
  const W = 320, H = 192, T = 16, ROWS = SR.ROWS;
  const SOLID = new Set(['#', 'B', 'C', 'P', 'U', '=']);
  const FONT = '"Press Start 2P", "Courier New", monospace';

  const THEMES = {
    meadow: { sky: ['#5fb8ff', '#c8efff'], far: '#93c6e6', farHi: '#b9dcf0', mid: '#4fa86b', midDark: '#3a8a55',
      ground: '#a8643a', groundDark: '#7d4528', top: '#5cd65c', topDark: '#38a238',
      brick: '#c55b3b', mortar: '#7e3322', brickHi: '#e07a56', metal: '#7d8ea3', metalHi: '#c2cfdd', metalLo: '#4a586b', deco: 'meadow' },
    cave:   { sky: ['#100f22', '#2a2247'], far: '#231d40', farHi: '#2f2754', mid: '#3a3263', midDark: '#2c2550',
      ground: '#4f4a6b', groundDark: '#37334f', top: '#8a80bd', topDark: '#5d5689',
      brick: '#5f5a84', mortar: '#2a2742', brickHi: '#7a74a3', metal: '#6b7385', metalHi: '#a9b2c4', metalLo: '#3a4050', deco: 'cave' },
    dusk:   { sky: ['#ff8a63', '#ffd59a'], far: '#d77a8f', farHi: '#e898a5', mid: '#4e3163', midDark: '#3c2450',
      ground: '#6f4458', groundDark: '#4f2d3f', top: '#d77a6c', topDark: '#a3515a',
      brick: '#b65a4a', mortar: '#6e2f2a', brickHi: '#d27a66', metal: '#7f7894', metalHi: '#c4bdd8', metalLo: '#4c4660', deco: 'dusk' },
  };

  let cv, ctx;
  let level, grid, LW, th, levelIdx = 0;
  let player, cam = { x: 0 };
  let enemies = [], items = [], plats = [], parts = [], pops = [], floaters = [], bumps = [];
  let state = 'title', stateT = 0, frame = 0;
  let score = 0, gears = 0, lives = 3, time = 300, timeTick = 0, combo = 0;
  let checkpoint = null, lampsLit = new Set();
  let hi = 0;
  try { hi = +localStorage.getItem('sr-hi') || 0; } catch (e) {}

  // ---------------------------------------------------------------- helpers
  const hash = i => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const tileAt = (tx, ty) => (ty < 0 || ty >= ROWS) ? '.' : (tx < 0 || tx >= LW) ? '=' : grid[ty][tx];
  const isSolid = (tx, ty) => { if (ty < 0 || ty >= ROWS) return false; if (tx < 0 || tx >= LW) return true; return SOLID.has(grid[ty][tx]); };
  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  function collideX(o) {
    o.x += o.vx;
    const top = Math.floor(o.y / T), bot = Math.floor((o.y + o.h - 0.01) / T);
    if (o.vx > 0) {
      const tx = Math.floor((o.x + o.w - 0.01) / T);
      for (let ty = top; ty <= bot; ty++) if (isSolid(tx, ty)) { o.x = tx * T - o.w; return 1; }
    } else if (o.vx < 0) {
      const tx = Math.floor(o.x / T);
      for (let ty = top; ty <= bot; ty++) if (isSolid(tx, ty)) { o.x = (tx + 1) * T; return -1; }
    }
    return 0;
  }
  function collideY(o) {
    o.y += o.vy; o.onGround = false;
    const l = Math.floor(o.x / T), r = Math.floor((o.x + o.w - 0.01) / T);
    if (o.vy > 0) {
      const ty = Math.floor((o.y + o.h - 0.01) / T);
      for (let tx = l; tx <= r; tx++) if (isSolid(tx, ty)) { o.y = ty * T - o.h; o.vy = 0; o.onGround = true; return null; }
    } else if (o.vy < 0) {
      const ty = Math.floor(o.y / T);
      let best = null, bestD = 1e9;
      const cx = o.x + o.w / 2;
      for (let tx = l; tx <= r; tx++) if (isSolid(tx, ty)) { const d = Math.abs(tx * T + 8 - cx); if (d < bestD) { bestD = d; best = tx; } }
      if (best !== null) { o.y = (ty + 1) * T; o.vy = 0; return { tx: best, ty }; }
    }
    return null;
  }

  function floater(x, y, txt) { floaters.push({ x, y, txt: String(txt), t: 50 }); }
  function addScore(n, x, y) { score += n; if (x !== undefined) floater(x, y, n); }
  function addGear() {
    gears++; addScore(100);
    if (gears % 50 === 0) { lives++; audio.play('oneup'); floater(player.x, player.y - 10, '1UP'); }
    else audio.play('gear');
  }

  // ---------------------------------------------------------------- level
  function loadLevel(i, useCheckpoint) {
    levelIdx = i;
    level = SR.levels[i]();
    grid = level.grid; LW = level.width; th = THEMES[level.theme];
    enemies = []; items = []; plats = []; parts = []; pops = []; floaters = []; bumps = [];
    for (const d of level.ents) {
      if (d.t === 'beetle') enemies.push({ type: 'beetle', x: d.x * T, y: (d.y + 1) * T - 10, w: 16, h: 10, vx: -0.45, vy: 0, dead: 0, active: false });
      if (d.t === 'boing') enemies.push({ type: 'boing', x: d.x * T + 1, y: (d.y + 1) * T - 12, w: 14, h: 12, vx: -0.35, vy: 0, dead: 0, active: false, hop: 40 + (d.x % 3) * 20 });
      if (d.t === 'plat') plats.push({ x: d.x0 * T, y: d.y * T, w: 48, h: 8, x0: d.x0 * T, x1: d.x1 * T, v: 0.6 });
    }
    const sp = useCheckpoint && checkpoint ? checkpoint : { x: level.start.x * T, y: (level.start.y + 1) * T - 15 };
    if (!useCheckpoint) { checkpoint = null; lampsLit = new Set(); }
    // enemies too close to a checkpoint start are removed so you don't respawn into one
    if (useCheckpoint && checkpoint) enemies = enemies.filter(e => Math.abs(e.x - sp.x) > 64);
    player = { x: sp.x, y: sp.y, w: 10, h: 15, vx: 0, vy: 0, onGround: false, face: 1, power: false,
      inv: 0, coyote: 0, jbuf: 0, anim: 0, riding: null };
    time = level.time; timeTick = 0; combo = 0;
    cam.x = Math.max(0, Math.min(LW * T - W, player.x - W * 0.4));
  }

  function newGame() {
    score = 0; gears = 0; lives = 3; player = null;
    loadLevel(0, false);
    setState('intro');
  }

  function setState(s) { state = s; stateT = 0; }

  // ---------------------------------------------------------------- actions
  function headBump(tx, ty) {
    const ch = grid[ty][tx];
    const killOnTop = () => {
      for (const e of enemies) if (!e.dead && Math.abs(e.y + e.h - ty * T) < 3 && e.x + e.w > tx * T && e.x < tx * T + T) kill(e, true);
      if (tileAt(tx, ty - 1) === 'o') { grid[ty - 1][tx] = '.'; addGear(); }
    };
    if (ch === 'C') {
      grid[ty][tx] = 'U'; bumps.push({ tx, ty, t: 10 });
      pops.push({ x: tx * T + 3, y: ty * T - 10, vy: -4, t: 26 }); addGear(); killOnTop();
    } else if (ch === 'P') {
      grid[ty][tx] = 'U'; bumps.push({ tx, ty, t: 10 });
      items.push({ type: 'battery', x: tx * T + 3, y: ty * T, w: 10, h: 14, vx: 0, vy: 0, emerge: 28 });
      audio.play('sprout'); killOnTop();
    } else if (ch === 'B') {
      if (player.power) {
        grid[ty][tx] = '.'; addScore(50); audio.play('brk');
        for (let i = 0; i < 4; i++) parts.push({ x: tx * T + 4 + (i % 2) * 8, y: ty * T + 4 + (i > 1 ? 8 : 0), vx: (i % 2 ? 1 : -1) * (1 + Math.random()), vy: -4 - (i > 1 ? 0 : 2), t: 70, c: th.brick });
        killOnTop();
      } else { bumps.push({ tx, ty, t: 10 }); audio.play('bump'); killOnTop(); }
    } else {
      audio.play('bump');
    }
  }

  function kill(e, flip) {
    e.dead = 1; e.flip = !!flip;
    if (flip) { e.vy = -3; e.vx = player.x < e.x ? 1 : -1; }
    combo++;
    const pts = [100, 200, 400, 800, 1000, 2000, 4000][Math.min(combo - 1, 6)];
    addScore(pts, e.x, e.y - 6);
    audio.play('stomp');
  }

  function hurt() {
    if (player.inv > 0 || state !== 'play') return;
    if (player.power) { player.power = false; player.inv = 100; audio.play('hurt'); }
    else die();
  }
  function die() {
    if (state !== 'play') return;
    audio.stopMusic(); audio.play('die');
    player.vy = -5.5; player.vx = 0;
    setState('dying');
  }

  // ---------------------------------------------------------------- update
  function updatePlayer() {
    const p = player;
    if (p.inv > 0) p.inv--;
    const left = input.down('left'), right = input.down('right'), run = input.down('run');
    const maxV = run ? 2.6 : 1.6, acc = run ? 0.18 : 0.13;
    if (left && !right) { p.vx -= p.vx > 0 ? acc * 2 : acc; p.face = -1; }
    else if (right && !left) { p.vx += p.vx < 0 ? acc * 2 : acc; p.face = 1; }
    else { const f = p.onGround ? 0.14 : 0.03; p.vx = Math.abs(p.vx) <= f ? 0 : p.vx - Math.sign(p.vx) * f; }
    if (Math.abs(p.vx) > maxV) p.vx = Math.sign(p.vx) * Math.max(maxV, Math.abs(p.vx) - 0.08);

    if (input.hit('jump')) p.jbuf = 7; else if (p.jbuf > 0) p.jbuf--;
    if (p.onGround) { p.coyote = 6; combo = 0; } else if (p.coyote > 0) p.coyote--;
    if (p.jbuf > 0 && p.coyote > 0) {
      p.vy = -(5.3 + Math.abs(p.vx) * 0.28);
      p.jbuf = 0; p.coyote = 0; p.onGround = false; p.riding = null;
      audio.play('jump');
    }
    const g = (p.vy < 0 && input.down('jump')) ? 0.21 : 0.45;
    p.vy = Math.min(p.vy + g, 6.5);

    if (p.riding) { const keep = p.vx; p.vx = p.riding.v; collideX(p); p.vx = keep; }
    const prevBottom = p.y + p.h;
    if (collideX(p)) p.vx = 0;
    if (p.x < 0) { p.x = 0; p.vx = 0; }
    const head = collideY(p);
    if (head) headBump(head.tx, head.ty);
    p.riding = null;
    if (p.vy >= 0) {
      for (const pl of plats) {
        if (prevBottom <= pl.y + 1 && p.y + p.h >= pl.y && p.x + p.w > pl.x && p.x < pl.x + pl.w) {
          p.y = pl.y - p.h; p.vy = 0; p.onGround = true; p.riding = pl;
        }
      }
    }
    if (p.onGround && p.vx !== 0) p.anim += Math.abs(p.vx) * 0.09; else if (p.onGround) p.anim = 0;

    // tiles the player touches
    const l = Math.floor((p.x + 1) / T), r = Math.floor((p.x + p.w - 1) / T);
    const t0 = Math.floor((p.y + 1) / T), t1 = Math.floor((p.y + p.h - 1) / T);
    for (let ty = t0; ty <= t1; ty++) for (let tx = l; tx <= r; tx++) {
      const ch = tileAt(tx, ty);
      if (ch === 'o') { grid[ty][tx] = '.'; addGear(); }
      else if (ch === '^') { if (p.y + p.h > ty * T + 7) hurt(); }
      else if (ch === 'K' && !lampsLit.has(tx)) {
        lampsLit.add(tx); checkpoint = { x: tx * T, y: (ty + 1) * T - 15 }; audio.play('lamp'); floater(tx * T, ty * T - 8, 'SAVED');
      }
    }
    if (p.y > ROWS * T + 24) { if (state === 'play') { audio.stopMusic(); audio.play('die'); setState('dying'); p.vy = 0; } }
    if (p.x + p.w >= level.goal * T + 6 && state === 'play') {
      audio.stopMusic(); audio.play('clear');
      p.vx = 0; setState('clear');
    }
  }

  function updateEnemies() {
    for (const e of enemies) {
      if (!e.active) { if (e.x < cam.x + W + 24) e.active = true; else continue; }
      if (e.dead) {
        e.dead++;
        if (e.flip) { e.vy += 0.35; e.y += e.vy; e.x += e.vx; }
        continue;
      }
      e.vy = Math.min(e.vy + 0.4, 6);
      const dir = e.vx;
      if (collideX(e)) e.vx = -dir;
      collideY(e);
      if (e.type === 'beetle' && e.onGround) {
        const fx = e.vx > 0 ? e.x + e.w + 1 : e.x - 1;
        if (!isSolid(Math.floor(fx / T), Math.floor((e.y + e.h + 2) / T))) e.vx = -e.vx;
      }
      if (e.type === 'boing' && e.onGround) {
        if (--e.hop <= 0) { e.vy = -5.2; e.hop = 75; }
      }
      if (e.y > ROWS * T + 40) e.dead = 99;
      // enemies bounce off each other
      for (const o of enemies) {
        if (o !== e && !o.dead && o.active && overlap(e, o)) {
          if ((e.vx < 0 && o.x < e.x) || (e.vx > 0 && o.x > e.x)) e.vx = -e.vx;
        }
      }
      // player contact
      if (state === 'play' && overlap(player, e)) {
        const p = player;
        if (p.vy > 0 && p.y + p.h - p.vy <= e.y + 6) {
          kill(e, false);
          p.vy = input.down('jump') ? -6.2 : -4;
          p.y = e.y - p.h;
        } else hurt();
      }
    }
    enemies = enemies.filter(e => !(e.dead > 45) && e.x > cam.x - 200);
  }

  function updateItems() {
    for (const it of items) {
      if (it.emerge > 0) { it.y -= 0.55; if (--it.emerge === 0) it.vx = 0.9; continue; }
      it.vy = Math.min(it.vy + 0.4, 6);
      const dir = it.vx;
      if (collideX(it)) it.vx = -dir;
      collideY(it);
      if (overlap(player, it) && state === 'play') {
        it.gone = true;
        if (player.power) { addScore(1000, it.x, it.y); audio.play('power'); }
        else { player.power = true; addScore(1000, it.x, it.y); audio.play('power'); }
      }
      if (it.y > ROWS * T + 40) it.gone = true;
    }
    items = items.filter(i => !i.gone);
  }

  function updateFx() {
    for (const p of parts) { p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.t--; }
    parts = parts.filter(p => p.t > 0 && p.y < H + 20);
    for (const p of pops) { p.vy += 0.3; p.y += p.vy; p.t--; }
    pops = pops.filter(p => p.t > 0);
    for (const f of floaters) { f.y -= 0.5; f.t--; }
    floaters = floaters.filter(f => f.t > 0);
    for (const b of bumps) b.t--;
    bumps = bumps.filter(b => b.t > 0);
  }

  function updateCamera() {
    const target = player.x + player.w / 2 - W * 0.42;
    cam.x = Math.max(0, Math.min(LW * T - W, target));
  }

  function saveHi() {
    if (score > hi) { hi = score; try { localStorage.setItem('sr-hi', String(hi)); } catch (e) {} }
  }

  function update() {
    frame++; stateT++;
    input.pollPad();
    if (input.hit('mute')) audio.toggleMute();

    switch (state) {
      case 'title':
        cam.x = (frame * 0.4) % (LW * T - W);
        if (input.hit('start') || input.hit('jump')) newGame();
        break;
      case 'intro':
        if (stateT > 150 || (stateT > 30 && (input.hit('start') || input.hit('jump')))) { setState('play'); audio.music(level.theme); }
        break;
      case 'play':
        if (input.hit('pause') || input.hit('start')) { setState('paused'); audio.play('pause'); audio.stopMusic(); break; }
        for (const pl of plats) { pl.x += pl.v; if (pl.x < pl.x0 || pl.x > pl.x1) { pl.v = -pl.v; pl.x += pl.v; } }
        updatePlayer();
        if (state !== 'play' && state !== 'clear' && state !== 'dying') break;
        updateEnemies(); updateItems(); updateFx(); updateCamera();
        if (++timeTick >= 40) { timeTick = 0; time--; if (time === 60) floater(player.x - 10, player.y - 20, 'HURRY!'); if (time <= 0) { time = 0; die(); } }
        break;
      case 'paused':
        if (input.hit('pause') || input.hit('start')) { setState('play'); audio.music(level.theme); }
        break;
      case 'dying':
        if (stateT > 25) { player.vy = Math.min(player.vy + 0.3, 6); player.y += player.vy; }
        updateFx();
        if (stateT > 150) {
          lives--;
          if (lives < 0) { saveHi(); setState('over'); }
          else { loadLevel(levelIdx, true); setState('intro'); }
        }
        break;
      case 'clear':
        updateEnemies(); updateFx();
        if (stateT < 60) { player.vx = 0.8; player.face = 1; }
        else player.vx = 0;
        player.vy = Math.min(player.vy + 0.45, 6.5);
        collideX(player); collideY(player);
        if (player.vx) player.anim += 0.08;
        if (stateT > 90 && time > 0) {
          const step = Math.min(time, 3); time -= step; score += step * 50;
          if (stateT % 4 === 0) audio.play('gear');
        }
        if (stateT > 90 && time === 0 && !player.doneAt) player.doneAt = stateT;
        if (player.doneAt && stateT > player.doneAt + 60) {
          if (levelIdx + 1 < SR.levels.length) { const pw = player.power; loadLevel(levelIdx + 1, false); player.power = pw; setState('intro'); }
          else { saveHi(); setState('win'); }
        }
        break;
      case 'over':
      case 'win':
        if (stateT > 60 && (input.hit('start') || input.hit('jump'))) { loadLevel(0, false); setState('title'); }
        break;
    }
    input.endTick();
  }

  // ---------------------------------------------------------------- render
  function text(s, x, y, col = '#fff', align = 'left', size = 8) {
    ctx.font = `${size}px ${FONT}`;
    ctx.textAlign = align; ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(10,10,30,.85)'; ctx.fillText(s, x + 1, y + 1);
    ctx.fillStyle = col; ctx.fillText(s, x, y);
  }

  function drawBackground(camx) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    if (th.deco === 'meadow') {
      // clouds
      for (let i = -1; i < 6; i++) {
        const span = 110, off = camx * 0.2;
        const idx = Math.floor(off / span) + i;
        const x = idx * span - off + hash(idx) * 40, y = 18 + hash(idx + 9) * 40;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y + 6, 40, 8); ctx.fillRect(x + 8, y, 18, 8); ctx.fillRect(x + 22, y + 3, 12, 6);
        ctx.fillStyle = '#e2f3ff'; ctx.fillRect(x, y + 12, 40, 2);
      }
      // far mountains
      ctx.fillStyle = th.far;
      for (let sx = 0; sx < W; sx += 2) {
        const wx = sx + camx * 0.15;
        const ph = (wx % 140) / 140;
        const y = 92 + Math.abs(ph - 0.5) * 70 + hash(Math.floor(wx / 140)) * 14;
        ctx.fillRect(sx, y, 2, H - y);
      }
      // near hills
      for (let sx = 0; sx < W; sx += 2) {
        const wx = sx + camx * 0.4;
        const y = 132 + Math.sin(wx * 0.021) * 14 + Math.sin(wx * 0.053) * 6;
        ctx.fillStyle = th.mid; ctx.fillRect(sx, y, 2, H - y);
        ctx.fillStyle = th.midDark; ctx.fillRect(sx, y + 14, 2, H - y);
      }
    } else if (th.deco === 'cave') {
      // big slow gears in the dark
      ctx.save();
      for (let i = -1; i < 4; i++) {
        const span = 150, off = camx * 0.2;
        const idx = Math.floor(off / span) + i;
        const cx = idx * span - off + 60, cy = 70 + hash(idx) * 70, r = 22 + hash(idx + 3) * 20;
        ctx.fillStyle = th.farHi;
        ctx.translate(cx, cy); ctx.rotate((frame * 0.004) * (idx % 2 ? 1 : -1));
        for (let k = 0; k < 8; k++) { ctx.rotate(Math.PI / 4); ctx.fillRect(-4, -r - 6, 8, 10); }
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = th.sky[0]; ctx.beginPath(); ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2); ctx.fill();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
      ctx.restore();
      // stalactites and stalagmites
      for (let sx = 0; sx < W + 16; sx += 8) {
        const wx = sx + Math.floor(camx * 0.45 / 8) * 8 - camx * 0.45;
        const idx = Math.floor((sx + camx * 0.45) / 8);
        const h1 = 10 + hash(idx) * 34, h2 = 14 + hash(idx + 50) * 40;
        ctx.fillStyle = th.mid;
        ctx.fillRect(wx, 0, 8, h1); ctx.fillRect(wx + 2, h1, 4, 6);
        ctx.fillStyle = th.midDark;
        ctx.fillRect(wx, H - h2, 8, h2); ctx.fillRect(wx + 2, H - h2 - 6, 4, 6);
      }
    } else {
      // sun
      ctx.fillStyle = '#fff1c4';
      ctx.beginPath(); ctx.arc(230 - camx * 0.02, 96, 34, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = th.sky[1]; for (let i = 0; i < 4; i++) ctx.fillRect(180, 90 + i * 8, 110, 2);
      // far skyline
      for (let i = -1; i < 14; i++) {
        const span = 28, off = camx * 0.2;
        const idx = Math.floor(off / span) + i;
        const x = idx * span - off, h = 40 + hash(idx) * 50;
        ctx.fillStyle = th.far; ctx.fillRect(x, H - h - 20, span - 4, h + 20);
      }
      // near buildings with lit windows
      for (let i = -1; i < 9; i++) {
        const span = 46, off = camx * 0.45;
        const idx = Math.floor(off / span) + i;
        const x = idx * span - off, h = 50 + hash(idx + 7) * 60, y = H - h;
        ctx.fillStyle = th.mid; ctx.fillRect(x, y, span - 6, h);
        ctx.fillStyle = th.midDark; ctx.fillRect(x + span - 10, y, 4, h);
        for (let wy = y + 8; wy < H - 6; wy += 10) for (let wx = x + 5; wx < x + span - 14; wx += 8)
          if (hash(idx * 31 + wx * 7 + wy) > 0.55) { ctx.fillStyle = '#ffd36b'; ctx.fillRect(wx, wy, 3, 4); }
      }
    }
  }

  function drawGearSprite(x, y, spin) {
    const s = sprites.gear;
    const sc = Math.max(0.15, Math.abs(Math.cos(spin)));
    const w = Math.max(2, Math.round(10 * sc));
    ctx.drawImage(s, Math.round(x + (10 - w) / 2), Math.round(y), w, 10);
  }

  function drawTile(ch, tx, ty, sx, sy) {
    switch (ch) {
      case '#': {
        ctx.fillStyle = th.ground; ctx.fillRect(sx, sy, T, T);
        ctx.fillStyle = th.groundDark;
        const s = (tx * 73 + ty * 31) % 7;
        ctx.fillRect(sx + (s * 5) % 12 + 1, sy + (s * 3) % 9 + 5, 2, 2);
        ctx.fillRect(sx + ((s + 3) * 7) % 12 + 2, sy + ((s + 5) * 5) % 9 + 5, 3, 1);
        if (!isSolid(tx, ty - 1)) {
          ctx.fillStyle = th.top; ctx.fillRect(sx, sy, T, 4);
          ctx.fillStyle = th.topDark; ctx.fillRect(sx, sy + 4, T, 2);
          ctx.fillStyle = th.top; ctx.fillRect(sx + (tx * 5) % 12 + 1, sy + 4, 2, 2);
        }
        break;
      }
      case 'B': {
        ctx.fillStyle = th.brick; ctx.fillRect(sx, sy, T, T);
        ctx.fillStyle = th.brickHi; ctx.fillRect(sx, sy, T, 1); ctx.fillRect(sx, sy + 8, T, 1);
        ctx.fillStyle = th.mortar;
        ctx.fillRect(sx, sy + 7, T, 1); ctx.fillRect(sx, sy + 15, T, 1);
        ctx.fillRect(sx + 7, sy, 1, 7); ctx.fillRect(sx + 3, sy + 8, 1, 7); ctx.fillRect(sx + 11, sy + 8, 1, 7);
        break;
      }
      case 'C': case 'P': {
        ctx.fillStyle = '#6b3f17'; ctx.fillRect(sx, sy, T, T);
        ctx.fillStyle = '#c98a3e'; ctx.fillRect(sx + 1, sy + 1, 14, 14);
        ctx.fillStyle = '#a86d2c';
        for (let i = 0; i < 12; i++) { ctx.fillRect(sx + 2 + i, sy + 2 + i, 2, 1); }
        ctx.fillStyle = '#e0a55a'; ctx.fillRect(sx + 1, sy + 1, 14, 1);
        ctx.fillStyle = '#6b3f17'; ctx.fillRect(sx + 1, sy + 4, 14, 1); ctx.fillRect(sx + 1, sy + 11, 14, 1);
        const glow = (frame >> 4) % 4 === 0;
        ctx.globalAlpha = glow ? 1 : 0.85;
        ctx.drawImage(sprites.gear, sx + 3, sy + 3);
        ctx.globalAlpha = 1;
        break;
      }
      case 'U': {
        ctx.fillStyle = '#3e3328'; ctx.fillRect(sx, sy, T, T);
        ctx.fillStyle = '#6e5a48'; ctx.fillRect(sx + 1, sy + 1, 14, 14);
        ctx.fillStyle = '#3e3328';
        [[3, 3], [11, 3], [3, 11], [11, 11]].forEach(([a, b]) => ctx.fillRect(sx + a, sy + b, 2, 2));
        break;
      }
      case '=': {
        ctx.fillStyle = th.metal; ctx.fillRect(sx, sy, T, T);
        ctx.fillStyle = th.metalHi; ctx.fillRect(sx, sy, T, 2); ctx.fillRect(sx, sy, 2, T);
        ctx.fillStyle = th.metalLo; ctx.fillRect(sx, sy + 14, T, 2); ctx.fillRect(sx + 14, sy, 2, T);
        ctx.fillStyle = th.metalLo;
        [[4, 4], [10, 4], [4, 10], [10, 10]].forEach(([a, b]) => ctx.fillRect(sx + a, sy + b, 2, 2));
        break;
      }
      case '^': {
        for (let i = 0; i < 2; i++) {
          const bx = sx + i * 8;
          for (let r = 0; r < 8; r++) {
            ctx.fillStyle = r < 2 ? '#ffffff' : '#c9d2de';
            ctx.fillRect(bx + 4 - Math.floor(r / 2), sy + 8 + r, 1 + Math.floor(r / 2) * 2, 1);
          }
          ctx.fillStyle = '#7d8798'; ctx.fillRect(bx, sy + 15, 8, 1);
        }
        break;
      }
      case 'o':
        drawGearSprite(sx + 3, sy + 3, frame * 0.08 + tx * 0.6);
        break;
      case 'K': {
        const lit = lampsLit.has(tx);
        ctx.fillStyle = '#3a3d52'; ctx.fillRect(sx + 7, sy + 2, 2, 14);
        ctx.fillRect(sx + 4, sy + 14, 8, 2);
        ctx.fillStyle = lit ? '#ffe066' : '#7a7f95';
        ctx.fillRect(sx + 4, sy - 4, 8, 6);
        if (lit && (frame >> 3) % 2) { ctx.fillStyle = 'rgba(255,224,102,.35)'; ctx.fillRect(sx, sy - 8, 16, 14); }
        ctx.fillStyle = '#3a3d52'; ctx.fillRect(sx + 3, sy - 5, 10, 1);
        break;
      }
    }
  }

  function drawBeacon(camx) {
    const x = Math.round(level.goal * T - camx), base = 160, top = base - 7 * T;
    if (x < -40 || x > W + 40) return;
    ctx.fillStyle = '#2b2e44';
    ctx.fillRect(x + 1, top, 2, base - top); ctx.fillRect(x + 13, top, 2, base - top);
    for (let y = top; y < base; y += 16) {
      for (let i = 0; i < 12; i++) { ctx.fillRect(x + 2 + i, y + i, 1, 1); ctx.fillRect(x + 13 - i, y + i, 1, 1); }
      ctx.fillRect(x + 1, y, 14, 1);
    }
    ctx.fillRect(x - 2, base - 2, 20, 2);
    ctx.fillRect(x + 7, top - 14, 2, 14);
    const on = (frame >> 4) % 2 === 0 || state === 'clear';
    ctx.fillStyle = on ? '#41f0ff' : '#1d7f8a';
    ctx.fillRect(x + 4, top - 20, 8, 7);
    ctx.fillStyle = '#fff'; ctx.fillRect(x + 6, top - 18, 2, 2);
    if (on) {
      ctx.strokeStyle = 'rgba(65,240,255,.7)'; ctx.lineWidth = 1;
      const r0 = state === 'clear' ? 8 + (stateT % 30) : 10;
      for (let k = 0; k < 2; k++) {
        ctx.beginPath(); ctx.arc(x + 8, top - 17, r0 + k * 8, -Math.PI * 0.8, -Math.PI * 0.2); ctx.stroke();
      }
    }
  }

  function drawPlayer(camx) {
    const p = player;
    if (p.inv > 0 && (frame >> 2) % 2 === 0 && state === 'play') return;
    const set = p.power ? sprites.playerCharged : sprites.player;
    let img = set.idle;
    if (state === 'dying') img = set.jump;
    else if (!p.onGround) img = set.jump;
    else if (Math.abs(p.vx) > 0.05) img = Math.floor(p.anim) % 2 ? set.run1 : set.run2;
    const x = Math.round(p.x - 1 - camx), y = Math.round(p.y);
    if (p.power) {
      ctx.fillStyle = `rgba(255,224,102,${0.18 + 0.12 * Math.sin(frame * 0.2)})`;
      ctx.fillRect(x - 2, y - 2, 16, 19);
    }
    ctx.save();
    if (p.face < 0) { ctx.translate(x + 12, y); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0); }
    else ctx.drawImage(img, x, y);
    ctx.restore();
  }

  function drawEnemy(e, camx) {
    const x = Math.round(e.x - camx), y = Math.round(e.y);
    if (x < -20 || x > W + 20) return;
    ctx.save();
    if (e.type === 'beetle') {
      const img = sprites.beetle[(frame >> 3) % 2];
      if (e.dead && !e.flip) { ctx.drawImage(img, 0, 0, 16, 8, x, y + 6, 16, 4); }
      else if (e.flip) { ctx.translate(x, y + 10); ctx.scale(1, -1); ctx.drawImage(img, 0, 0); }
      else if (e.vx > 0) { ctx.translate(x + 16, y); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0); }
      else ctx.drawImage(img, x, y);
    } else {
      if (e.dead && !e.flip) ctx.drawImage(sprites.boingSquash, 0, 0, 14, 8, x, y + 8, 14, 4);
      else if (e.flip) { ctx.translate(x, y + 12); ctx.scale(1, -1); ctx.drawImage(sprites.boing, 0, 0); }
      else if (e.onGround) ctx.drawImage(sprites.boingSquash, x, y + 2);
      else ctx.drawImage(sprites.boing, x, y);
    }
    ctx.restore();
  }

  function drawHUD() {
    ctx.fillStyle = 'rgba(10,12,30,.35)'; ctx.fillRect(0, 0, W, 18);
    text('SCORE', 6, 2, '#ffb07a'); text(String(score).padStart(6, '0'), 6, 10);
    ctx.drawImage(sprites.gear, 92, 6);
    text('x' + String(gears).padStart(2, '0'), 104, 6);
    text('LEVEL', 150, 2, '#ffb07a'); text(levelIdx + 1 + '/' + SR.levels.length, 158, 10);
    text('TIME', 214, 2, '#ffb07a'); text(String(Math.max(0, time)).padStart(3, '0'), 218, 10, time <= 60 ? '#ff6b6b' : '#fff');
    ctx.drawImage(sprites.player.idle, 0, 0, 12, 9, 270, 5, 12, 9);
    text('x' + Math.max(0, lives), 286, 6);
  }

  function drawWorld() {
    const camx = Math.round(cam.x);
    drawBackground(camx);
    // a battery still rising out of its crate is drawn behind the tiles
    for (const it of items) if (it.emerge > 0) ctx.drawImage(sprites.battery, Math.round(it.x - camx), Math.round(it.y));
    const tx0 = Math.floor(camx / T), tx1 = tx0 + Math.ceil(W / T) + 1;
    for (let ty = 0; ty < ROWS; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const ch = tileAt(tx, ty);
        if (ch === '.' || tx >= LW) continue;
        let oy = 0;
        for (const b of bumps) if (b.tx === tx && b.ty === ty) oy = -Math.round(Math.sin((b.t / 10) * Math.PI) * 4);
        drawTile(ch, tx, ty, tx * T - camx, ty * T + oy);
      }
    }
    drawBeacon(camx);
    for (const pl of plats) {
      const x = Math.round(pl.x - camx);
      ctx.fillStyle = th.metalLo; ctx.fillRect(x, pl.y, pl.w, pl.h);
      ctx.fillStyle = th.metalHi; ctx.fillRect(x, pl.y, pl.w, 2);
      ctx.fillStyle = '#ffb347'; for (let i = 4; i < pl.w; i += 10) ctx.fillRect(x + i, pl.y + 4, 5, 2);
    }
    for (const it of items) if (!(it.emerge > 0)) ctx.drawImage(sprites.battery, Math.round(it.x - camx), Math.round(it.y));
    for (const e of enemies) drawEnemy(e, camx);
    for (const p of pops) drawGearSprite(Math.round(p.x - camx), Math.round(p.y), frame * 0.4);
    for (const p of parts) { ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x - camx), Math.round(p.y), 5, 5); ctx.fillStyle = th.mortar; ctx.fillRect(Math.round(p.x - camx) + 3, Math.round(p.y) + 3, 2, 2); }
    if (state !== 'title') drawPlayer(camx);
    for (const f of floaters) text(f.txt, Math.round(f.x - camx), Math.round(f.y), '#fff', 'left', 8);
  }

  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    if (state === 'intro') {
      ctx.fillStyle = '#0d0f22'; ctx.fillRect(0, 0, W, H);
      text('LEVEL ' + (levelIdx + 1), W / 2, 58, '#ffb07a', 'center', 16);
      text(level.name.toUpperCase(), W / 2, 84, '#ffffff', 'center');
      ctx.drawImage(sprites.player.idle, W / 2 - 34, 112, 24, 30);
      text('x ' + lives, W / 2 + 2, 124, '#fff');
      text('SCORE ' + String(score).padStart(6, '0'), W / 2, 162, '#8f96c8', 'center');
      return;
    }
    drawWorld();
    if (state === 'title') {
      ctx.fillStyle = 'rgba(13,15,34,.55)'; ctx.fillRect(0, 0, W, H);
      text("SPROCKET'S", W / 2, 34, '#ffb07a', 'center', 16);
      text('RUN', W / 2, 56, '#41f0ff', 'center', 24);
      ctx.drawImage(sprites.player.run1, W / 2 - 18, 92, 36, 45);
      if ((frame >> 5) % 2 === 0) text('PRESS ENTER OR TAP', W / 2, 150, '#ffffff', 'center');
      text('HI ' + String(hi).padStart(6, '0'), W / 2, 170, '#8f96c8', 'center');
      return;
    }
    drawHUD();
    if (state === 'paused') {
      ctx.fillStyle = 'rgba(13,15,34,.6)'; ctx.fillRect(0, 0, W, H);
      text('PAUSED', W / 2, 80, '#fff', 'center', 16);
      text('P OR ENTER TO RESUME', W / 2, 106, '#8f96c8', 'center');
    }
    if (state === 'clear' && stateT > 30) text('BEACON ON!', W / 2, 60, '#41f0ff', 'center', 16);
    if (state === 'over') {
      ctx.fillStyle = 'rgba(13,15,34,.8)'; ctx.fillRect(0, 0, W, H);
      text('GAME OVER', W / 2, 70, '#ff6b6b', 'center', 16);
      text('SCORE ' + String(score).padStart(6, '0'), W / 2, 98, '#fff', 'center');
      if (stateT > 60 && (frame >> 5) % 2 === 0) text('PRESS ENTER', W / 2, 130, '#8f96c8', 'center');
    }
    if (state === 'win') {
      ctx.fillStyle = 'rgba(13,15,34,.8)'; ctx.fillRect(0, 0, W, H);
      text('ALL BEACONS LIT!', W / 2, 52, '#41f0ff', 'center', 16);
      text('Sprocket made it home.', W / 2, 80, '#fff', 'center');
      text('SCORE ' + String(score).padStart(6, '0'), W / 2, 104, '#ffb07a', 'center');
      text('GEARS ' + gears, W / 2, 120, '#ffe066', 'center');
      if (stateT > 60 && (frame >> 5) % 2 === 0) text('PRESS ENTER', W / 2, 150, '#8f96c8', 'center');
    }
  }

  // ---------------------------------------------------------------- loop
  let last = 0, acc = 0;
  function loop(ts) {
    const dt = Math.min(0.1, (ts - last) / 1000 || 0);
    last = ts; acc += dt;
    const step = 1 / 60;
    while (acc >= step) { update(); acc -= step; }
    render();
    requestAnimationFrame(loop);
  }

  SR.gameActive = () => ['intro', 'play', 'paused', 'dying', 'clear'].includes(state);
  SR.game = {
    init(canvas) {
      cv = canvas; ctx = cv.getContext('2d');
      cv.width = W; cv.height = H;
      loadLevel(0, false);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && state === 'play') { setState('paused'); audio.stopMusic(); }
      });
      requestAnimationFrame(t => { last = t; requestAnimationFrame(loop); });
    },
    get state() { return state; },
    pause() { if (state === 'play') { setState('paused'); audio.stopMusic(); } },
  };
})();
