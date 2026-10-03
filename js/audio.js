/* Sprocket's Run — sound effects and music
 * Everything is synthesized live with the Web Audio API: no audio files.
 * The melodies are original compositions written for this game. */
window.SR = window.SR || {};

(function () {
  let ac = null, master = null, musicGain = null, sfxGain = null;
  let muted = false;
  try { muted = localStorage.getItem('sr-muted') === '1'; } catch (e) {}

  function ensure() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return true; }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return false;
    ac = new Ctx();
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ac.destination);
    musicGain = ac.createGain(); musicGain.gain.value = 0.22; musicGain.connect(master);
    sfxGain = ac.createGain(); sfxGain.gain.value = 0.5; sfxGain.connect(master);
    return true;
  }

  function tone(type, f0, f1, dur, vol = 0.3, when = 0, dest) {
    if (!ac) return;
    const t = ac.currentTime + when;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || sfxGain);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(dur, vol = 0.3, when = 0) {
    if (!ac) return;
    const t = ac.currentTime + when;
    const len = Math.floor(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = ac.createBufferSource(), g = ac.createGain();
    s.buffer = buf; g.gain.value = vol;
    s.connect(g); g.connect(sfxGain); s.start(t);
  }

  const SFX = {
    jump()  { tone('square', 280, 620, 0.16, 0.18); },
    gear()  { tone('square', 1320, 0, 0.06, 0.15); tone('square', 1980, 0, 0.14, 0.15, 0.06); },
    stomp() { tone('triangle', 420, 120, 0.12, 0.4); noise(0.05, 0.15); },
    bump()  { tone('triangle', 160, 90, 0.08, 0.4); },
    brk()   { noise(0.25, 0.35); tone('square', 220, 60, 0.2, 0.12); },
    power() { [0, 4, 7, 12, 16, 19].forEach((n, i) => tone('square', 392 * Math.pow(2, n / 12), 0, 0.09, 0.15, i * 0.06)); },
    sprout(){ tone('triangle', 300, 700, 0.35, 0.25); },
    hurt()  { tone('sawtooth', 600, 150, 0.35, 0.18); },
    die()   { [12, 7, 3, 0, -5].forEach((n, i) => tone('square', 330 * Math.pow(2, n / 12), 0, 0.16, 0.18, i * 0.14)); },
    lamp()  { tone('sine', 880, 0, 0.12, 0.25); tone('sine', 1318, 0, 0.3, 0.25, 0.1); },
    clear() { [0, 4, 7, 12, 7, 12, 16, 19].forEach((n, i) => tone('square', 349 * Math.pow(2, n / 12), 0, i === 7 ? 0.6 : 0.13, 0.16, i * 0.13)); },
    oneup() { [7, 11, 14, 19].forEach((n, i) => tone('square', 440 * Math.pow(2, n / 12), 0, 0.1, 0.15, i * 0.08)); },
    pause() { tone('square', 660, 0, 0.06, 0.15); tone('square', 990, 0, 0.08, 0.15, 0.08); },
  };

  // ---------------- music ----------------
  // Steps are 16th notes. Numbers are semitones from the song root; null is a rest.
  const _ = null;
  const SONGS = {
    meadow: {
      root: 220, bpm: 132, wave: 'square',
      lead: [
        0, _, 3, _, 5, _, 7, 5, 3, _, 0, _, -2, _, 0, _,
        5, _, 7, _, 10, _, 12, 10, 7, _, 5, _, 3, 5, 7, _,
        0, _, 3, _, 5, _, 7, 5, 3, _, 0, _, -2, _, 0, _,
        12, _, 10, _, 7, _, 5, 7, 3, _, 5, _, 0, _, _, _,
      ],
      bass: [-12, -12, -7, -7, -9, -9, -5, -5],
    },
    cave: {
      root: 196, bpm: 104, wave: 'triangle',
      lead: [
        0, _, _, 3, _, _, 7, _, 6, _, 3, _, _, _, _, _,
        0, _, _, 3, _, _, 8, _, 7, _, 3, _, 2, _, _, _,
        -2, _, _, 2, _, _, 5, _, 3, _, 2, _, -2, _, _, _,
        0, _, 3, _, 7, _, 12, _, 11, _, 7, _, _, _, _, _,
      ],
      bass: [-12, -12, -16, -16, -14, -14, -12, -17],
    },
    dusk: {
      root: 247, bpm: 144, wave: 'square',
      lead: [
        7, _, 5, 7, _, 9, 7, _, 4, _, 2, _, 4, _, _, _,
        5, _, 4, 5, _, 7, 5, _, 2, _, 0, _, 2, _, _, _,
        7, _, 5, 7, _, 9, 12, _, 11, _, 9, _, 7, _, 9, _,
        11, _, 9, 7, _, 5, 4, _, 2, _, 4, _, 0, _, _, _,
      ],
      bass: [-12, -12, -10, -10, -7, -7, -5, -8],
    },
  };

  let song = null, step = 0, nextTime = 0, timer = null;

  function schedule() {
    if (!ac || !song) return;
    const stepDur = 60 / song.bpm / 4;
    while (nextTime < ac.currentTime + 0.12) {
      const n = song.lead[step % song.lead.length];
      const when = nextTime - ac.currentTime;
      if (n !== null) tone(song.wave, song.root * Math.pow(2, n / 12), 0, stepDur * 1.8, 0.16, when, musicGain);
      if (step % 2 === 0) {
        const b = song.bass[Math.floor(step / 8) % song.bass.length];
        tone('triangle', song.root * Math.pow(2, b / 12), 0, stepDur * 1.6, 0.35, when, musicGain);
      }
      if (step % 4 === 2) {
        // soft hi-hat tick
        const len = Math.floor(ac.sampleRate * 0.03);
        const buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
        const s = ac.createBufferSource(), g = ac.createGain();
        s.buffer = buf; g.gain.value = 0.05; s.connect(g); g.connect(musicGain);
        s.start(ac.currentTime + Math.max(0, when));
      }
      nextTime += stepDur; step++;
    }
  }

  SR.audio = {
    unlock: ensure,
    play(name) { if (ac && SFX[name]) SFX[name](); },
    music(name) {
      if (!ensure()) return;
      song = SONGS[name] || null; step = 0; nextTime = ac.currentTime + 0.05;
      if (!timer) timer = setInterval(schedule, 30);
    },
    stopMusic() { song = null; },
    get muted() { return muted; },
    toggleMute() {
      muted = !muted;
      try { localStorage.setItem('sr-muted', muted ? '1' : '0'); } catch (e) {}
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
  };
})();
