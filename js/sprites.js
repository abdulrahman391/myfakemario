/* Sprocket's Run — pixel sprites
 * Every sprite is a grid of palette letters ('.' = transparent).
 * They are rendered once into small offscreen canvases at load time. */
window.SR = window.SR || {};

(function () {
  const PAL = {
    k: '#1a1c2c', // outline
    w: '#e4ecf4', // light metal
    m: '#8a9bb0', // mid metal
    c: '#41f0ff', // visor glow
    o: '#ff8a3d', // orange chest plate
    r: '#ff4d6d', // red
    R: '#ffb3b5', // pink highlight
    p: '#7b4bd6', // beetle shell
    P: '#b8a0ff', // shell highlight
    y: '#ffe066', // yellow
    W: '#ffffff',
  };
  // Palette used while Sprocket is charged by a battery
  const PAL_CHARGED = Object.assign({}, PAL, { o: '#ffe066', c: '#ffffff', m: '#c9d6e6' });

  function make(rows, pal) {
    const h = rows.length, w = rows[0].length;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const ch = rows[j][i];
        if (ch === '.') continue;
        x.fillStyle = pal[ch] || '#ff00ff';
        x.fillRect(i, j, 1, 1);
      }
    }
    return c;
  }

  // ---- Sprocket (12 x 15) : a little tin robot with a side visor ----
  const BODY = [
    '......r.....',
    '......k.....',
    '...kkkkkk...',
    '..kwwwwwwk..',
    '..kwwkkkkk..',
    '..kwwkkcck..',
    '..kwwkkkkk..',
    '..kwwwwwwk..',
    '...kkkkkk...',
    '..kmoooomk..',
    '.kmmoooommk.',
    '.kmmmmmmmmk.',
    '..kkkkkkkk..',
  ];
  const LEGS = {
    idle: ['..km....mk..', '..kk....kk..'],
    run1: ['.km.....km..', 'kk......kk..'],
    run2: ['...km.km....', '...kkkk.....'],
    jump: ['..km....mk..', '.kk......kk.'],
  };

  // ---- Beetle (16 x 10) : purple shelled walker ----
  const BEETLE_TOP = [
    '.....kkkkkk.....',
    '...kkppppppkk...',
    '..kppPppppPppk..',
    '.kppppppppppppk.',
    '.kpPppppppppPpk.',
    'kkkkkkkkkkkkkkkk',
    'kwwkkkkkkkkkkwwk',
    '.kkkkkkkkkkkkkk.',
  ];
  const BEETLE_LEGS = [
    ['..k.k......k.k..', '.k...k....k...k.'],
    ['...k.k....k.k...', '..k...k..k...k..'],
  ];

  // ---- Boing (14 x 12) : a red ball on a spring that hops ----
  const BOING = [
    '....kkkkkk....',
    '..kkrrrrrrkk..',
    '.krrRrrrrrrrk.',
    '.krkkrrrkkrrk.',
    '.krkwrrrkwrrk.',
    '.krrrrrrrrrrk.',
    '..kkrrrrrrkk..',
    '....kkkkkk....',
    '.....kmmk.....',
    '....kmmmmk....',
    '.....kmmk.....',
    '...kkkkkkkk...',
  ];
  const BOING_SQUASH = [
    '....kkkkkk....',
    '..kkrrrrrrkk..',
    '.krrRrrrrrrrk.',
    '.krkkrrrkkrrk.',
    '.krkwrrrkwrrk.',
    '.krrrrrrrrrrk.',
    '..kkrrrrrrkk..',
    '....kkkkkk....',
    '....kmmmmk....',
    '...kkkkkkkk...',
  ];

  // ---- Battery power-up (10 x 14) ----
  const BATTERY = [
    '...kkkk...',
    '...kwwk...',
    '.kkkkkkkk.',
    '.kmmmmmmk.',
    '.kmyyyymk.',
    '.kmyyyymk.',
    '.kmyykymk.',
    '.kmykkymk.',
    '.kmyykymk.',
    '.kmyyyymk.',
    '.kmyyyymk.',
    '.kmmmmmmk.',
    '.kkkkkkkk.',
    '..........',
  ];

  // ---- Gear collectible (10 x 10) ----
  const GEAR = [
    '....yy....',
    '.y.yyyy.y.',
    '..yyyyyy..',
    '.yyykkyyy.',
    'yyyk..kyyO',
    'yyyk..kyOO',
    '.yyykkyOO.',
    '..yyyOOO..',
    '.y.yOOO.O.',
    '....OO....',
  ];

  function player(pal) {
    const out = {};
    for (const k in LEGS) out[k] = make(BODY.concat(LEGS[k]), pal);
    return out;
  }

  SR.PAL = PAL;
  SR.sprites = {
    player: player(PAL),
    playerCharged: player(PAL_CHARGED),
    beetle: BEETLE_LEGS.map(l => make(BEETLE_TOP.concat(l), PAL)),
    boing: make(BOING, PAL),
    boingSquash: make(BOING_SQUASH, PAL),
    battery: make(BATTERY, PAL),
    gear: make(GEAR, Object.assign({}, PAL, { O: '#d99a1e' })),
  };
})();
