/* Sprocket's Run — website glue: starts the game and wires up the page */
(function () {
  const { game, input, audio, sprites } = window.SR;
  const canvas = document.getElementById('game');
  const screen = document.getElementById('screen');

  game.init(canvas);
  if (document.fonts && document.fonts.load) document.fonts.load('8px "Press Start 2P"');
  input.bindTouch(document);

  // Tapping or clicking the screen starts the game from the title screen
  canvas.addEventListener('pointerdown', () => {
    audio.unlock();
    canvas.focus({ preventScroll: true });
    if (['title', 'over', 'win', 'paused'].includes(game.state)) {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' }));
      setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Enter' })), 50);
    }
  });

  document.getElementById('btn-start').addEventListener('click', () => {
    audio.unlock();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' }));
    setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Enter' })), 50);
    canvas.focus({ preventScroll: true });
  });

  const muteBtn = document.getElementById('btn-mute');
  const paintMute = () => { muteBtn.textContent = audio.muted ? 'Sound off' : 'Sound on'; muteBtn.setAttribute('aria-pressed', String(audio.muted)); };
  muteBtn.addEventListener('click', () => { audio.unlock(); audio.toggleMute(); paintMute(); });
  addEventListener('keyup', e => { if (e.code === 'KeyM') paintMute(); });
  paintMute();

  const fullBtn = document.getElementById('btn-full');
  fullBtn.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (screen.requestFullscreen) screen.requestFullscreen().catch(() => {});
  });
  if (!document.fullscreenEnabled) fullBtn.hidden = true;

  // Pause when the game scrolls out of view
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) game.pause(); }), { threshold: 0.2 }).observe(screen);
  }

  // Character cards in "The world" section
  document.querySelectorAll('canvas[data-sprite]').forEach(c => {
    const name = c.dataset.sprite;
    const img = name === 'player' ? sprites.player.idle : name === 'beetle' ? sprites.beetle[0] : sprites[name];
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    x.drawImage(img, 0, 0, c.width, c.height);
  });
})();
