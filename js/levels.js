/* Sprocket's Run — level definitions
 *
 * Levels are 12 tiles tall (each tile is 16x16 px). Row 0 is the top,
 * rows 10-11 are the usual ground. Levels are built with small helper
 * calls instead of giant strings, so they are easy to read and edit.
 *
 * Tile legend
 *   #  ground          B  brick (breaks when charged)
 *   C  gear crate      P  battery crate        U  used crate
 *   =  metal block     ^  spikes               o  gear (collectible)
 *   K  checkpoint lamp
 *
 * Entities (added with b.beetle / b.boing / b.platform)
 *   beetle   walks and turns at walls and ledges
 *   boing    hops every second or so
 *   platform moves left and right between two columns
 */
window.SR = window.SR || {};

(function () {
  const ROWS = 12;

  function builder(width) {
    const grid = Array.from({ length: ROWS }, () => Array(width).fill('.'));
    const ents = [];
    const b = {
      grid, ents, width,
      put(x, y, ch) { if (x >= 0 && x < width && y >= 0 && y < ROWS) grid[y][x] = ch; return b; },
      row(y, x0, x1, ch) { for (let x = x0; x <= x1; x++) b.put(x, y, ch); return b; },
      fill(x0, y0, x1, y1, ch) { for (let y = y0; y <= y1; y++) b.row(y, x0, x1, ch); return b; },
      ground(x0, x1) { return b.fill(x0, 10, x1, 11, '#'); },
      // a pattern string placed left to right, '.' leaves the tile alone
      pattern(x, y, s) { [...s].forEach((ch, i) => { if (ch !== '.') b.put(x + i, y, ch); }); return b; },
      // staircase of metal blocks: dir 1 rises to the right, -1 falls
      stairs(x, h, dir) {
        for (let i = 0; i < h; i++) {
          const height = dir > 0 ? i + 1 : h - i;
          for (let j = 0; j < height; j++) b.put(x + i, 9 - j, '=');
        }
        return b;
      },
      gears(x0, x1, y) { return b.row(y, x0, x1, 'o'); },
      beetle(x, y = 9) { ents.push({ t: 'beetle', x, y }); return b; },
      boing(x, y = 9) { ents.push({ t: 'boing', x, y }); return b; },
      platform(x0, x1, y) { ents.push({ t: 'plat', x: x0, x0, x1, y }); return b; },
    };
    return b;
  }

  // ------------------------------------------------------------ 1
  function meadow() {
    const b = builder(212);
    b.ground(0, 68).ground(72, 122).ground(126, 211);

    b.pattern(14, 6, 'C');
    b.pattern(20, 6, 'BCBPB');
    b.pattern(22, 2, 'C');
    b.gears(30, 33, 8);
    b.stairs(36, 2, 1).put(37, 7, 'o');
    b.beetle(26).beetle(44).beetle(46);
    b.fill(50, 8, 51, 9, '=').put(50, 7, 'o').put(51, 7, 'o');
    b.pattern(56, 6, 'BBCBB');
    b.gears(57, 59, 4);
    b.beetle(62);
    b.stairs(64, 4, 1).stairs(72, 4, -1);   // over the first gap
    b.gears(68, 71, 4);
    b.put(84, 9, 'K');
    b.pattern(88, 6, 'BCB');
    b.pattern(92, 3, 'BBBBBBPB');
    b.beetle(95).beetle(97).boing(104);
    b.gears(100, 103, 8);
    b.fill(110, 7, 111, 9, '=');
    b.fill(116, 8, 117, 9, '=');
    b.pattern(120, 5, 'CC');
    b.gears(123, 125, 6);
    b.beetle(132).beetle(140).boing(146);
    b.pattern(134, 6, 'BCBCB');
    b.gears(150, 155, 8);
    b.put(150, 9, '^').put(151, 9, '^');
    b.stairs(160, 6, 1);
    b.gears(167, 170, 3);
    b.fill(166, 4, 166, 9, '=');
    b.stairs(174, 3, -1);
    b.beetle(182).beetle(186);
    return { name: 'Meadow Works', theme: 'meadow', grid: b.grid, ents: b.ents, width: b.width,
      start: { x: 3, y: 9 }, goal: 200, time: 300 };
  }

  // ------------------------------------------------------------ 2
  function caverns() {
    const b = builder(220);
    b.row(0, 0, 219, '=');                       // ceiling
    b.ground(0, 30).ground(36, 70).ground(80, 118).ground(124, 160).ground(170, 219);

    b.pattern(10, 6, 'BBPBB');
    b.gears(11, 13, 4);
    b.beetle(18).beetle(24);
    b.put(26, 9, '^').put(27, 9, '^');
    b.platform(30, 34, 8);                        // first gap
    b.gears(31, 34, 6);
    b.fill(40, 5, 46, 5, 'B').put(43, 5, 'C');
    b.fill(40, 1, 46, 3, '=').row(4, 41, 45, 'o');
    b.beetle(48).boing(54).beetle(58);
    b.stairs(62, 3, 1).put(64, 6, 'o');
    b.platform(70, 78, 7);
    b.gears(73, 77, 4);
    b.put(84, 9, 'K');
    b.pattern(88, 6, 'CBCBC');
    b.pattern(90, 3, 'P');
    b.row(9, 96, 100, '^');
    b.fill(95, 7, 95, 9, '=').fill(101, 7, 101, 9, '=');
    b.gears(96, 100, 5);
    b.beetle(104).beetle(106).boing(112);
    b.platform(117, 123, 8);
    b.fill(128, 6, 131, 6, '=').gears(128, 131, 5);
    b.fill(136, 4, 139, 4, '=').gears(136, 139, 3);
    b.beetle(142).boing(150).beetle(155);
    b.platform(159, 169, 7);
    b.gears(162, 167, 5);
    b.pattern(176, 6, 'BBBCBBB');
    b.beetle(180).beetle(184).boing(190);
    b.stairs(194, 5, 1);
    b.fill(199, 5, 200, 9, '=');
    b.row(1, 205, 219, '.');                      // opening above the beacon
    b.row(0, 205, 219, '.');
    return { name: 'Gearbox Caverns', theme: 'cave', grid: b.grid, ents: b.ents, width: b.width,
      start: { x: 3, y: 9 }, goal: 208, time: 300 };
  }

  // ------------------------------------------------------------ 3
  function rooftops() {
    const b = builder(230);
    // rooftops: separate blocks of ground at different heights
    b.ground(0, 18);
    b.fill(23, 8, 34, 11, '#');
    b.fill(39, 7, 48, 11, '#');
    b.fill(54, 9, 70, 11, '#');
    b.fill(75, 6, 82, 11, '#');
    b.ground(88, 110);
    b.fill(116, 8, 124, 11, '#');
    b.fill(130, 7, 140, 11, '#');
    b.fill(146, 9, 160, 11, '#');
    b.fill(166, 8, 176, 11, '#');
    b.ground(182, 229);

    b.pattern(8, 5, 'BPB');
    b.gears(19, 22, 6);
    b.beetle(28, 7);
    b.gears(35, 38, 5);
    b.boing(44, 6);
    b.platform(49, 53, 6);
    b.beetle(60, 8).beetle(64, 8);
    b.pattern(58, 5, 'BCBCB');
    b.gears(71, 74, 4);
    b.boing(79, 5);
    b.gears(83, 87, 4);
    b.put(92, 9, 'K');
    b.pattern(96, 6, 'BBBB').pattern(100, 3, 'CPC');
    b.beetle(102).boing(106);
    b.platform(110, 116, 6);
    b.gears(111, 115, 4);
    b.beetle(120, 7);
    b.put(126, 3, 'o').put(127, 3, 'o').put(128, 3, 'o');
    b.boing(134, 6).boing(138, 6);
    b.platform(140, 146, 5);
    b.row(8, 150, 152, '^');
    b.beetle(156, 8);
    b.gears(161, 165, 5);
    b.beetle(170, 7).boing(174, 7);
    b.platform(176, 182, 6);
    b.pattern(188, 6, 'BCBPB');
    b.beetle(192).beetle(194).boing(198);
    b.stairs(202, 6, 1);
    b.fill(208, 4, 208, 9, '=');
    b.gears(204, 207, 2);
    return { name: 'Sunset Rooftops', theme: 'dusk', grid: b.grid, ents: b.ents, width: b.width,
      start: { x: 3, y: 9 }, goal: 218, time: 320 };
  }

  SR.ROWS = ROWS;
  SR.levels = [meadow, caverns, rooftops];
})();
