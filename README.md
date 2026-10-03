# Sprocket's Run

A small, original side-scrolling platformer that runs in any modern browser.
Guide Sprocket, a little tin robot, through three levels: collect gears,
stomp beetles, open crates, grab batteries and reach the radio beacon at the
end of each level before time runs out.

The website and the game are plain HTML, CSS and JavaScript. There is no
build step, no framework and nothing to install. Fonts are bundled, so it
also works offline.

## Play it

**Quickest:** unzip the folder and double-click `index.html`.

**With a local server** (recommended if your browser blocks local files):

```bash
cd sprockets-run
python3 -m http.server 8000
# then open http://localhost:8000
```

Any static host works too (GitHub Pages, Netlify, Cloudflare Pages, a
shared web host): upload the whole folder as it is.

## Controls

| Action        | Keyboard                         | Gamepad        |
|---------------|----------------------------------|----------------|
| Move          | Arrow keys or A / D              | D-pad or stick |
| Jump          | Space, Up, W or Z (hold = higher)| A              |
| Run           | Hold Shift or X                  | X or B         |
| Start / pause | Enter or P                       | Start          |
| Sound on/off  | M                                |                |

On phones and tablets, on-screen buttons appear under the game.

## Rules

- Land on top of an enemy to stomp it. Stomping several in a row without
  touching the ground gives more points (100, 200, 400 ...).
- Bump crates from below. Gear crates give a gear; battery crates release a
  battery that slides along the ground.
- A battery charges Sprocket: he glows, can smash brick blocks and survives
  one hit. Getting hit while charged only removes the charge.
- Touching an enemy from the side, landing on spikes, falling into a pit or
  running out of time costs a life.
- Lamp posts are checkpoints. After losing a life you restart from the last
  lamp you lit.
- Every 50 gears gives an extra life. Time left at the beacon becomes points.
- Your best score is saved in your browser.

## Files

```
sprockets-run/
├── index.html            The website: hero, game screen, how to play, the world, about
├── css/
│   └── style.css         Site styles and bundled font declarations
├── js/
│   ├── sprites.js        Pixel-art sprites, defined as text grids
│   ├── levels.js         The three levels, built with small helper calls
│   ├── audio.js          Sound effects and music, synthesized with Web Audio
│   ├── input.js          Keyboard, touch and gamepad input
│   ├── game.js           Game engine: physics, enemies, camera, rendering, states
│   └── site.js           Connects the game to the page (buttons, cards, full screen)
├── assets/
│   ├── favicon.svg       Site icon
│   └── fonts/            Press Start 2P and Rubik (SIL Open Font License)
├── manifest.webmanifest  Lets the site be added to a phone home screen
├── README.md
└── LICENSE
```

Scripts are plain `<script>` files (not ES modules) on purpose, so the game
runs when opened directly from disk.

## Make your own levels

Open `js/levels.js`. Each level is a function that creates a builder, places
tiles and enemies, and returns the level. Levels are 12 tiles tall; rows 10
and 11 are the normal ground, and enemies are placed on the row they stand on
(9 for normal ground).

Tile letters:

| Letter | Tile                                   |
|--------|----------------------------------------|
| `#`    | ground                                 |
| `B`    | brick (breaks when Sprocket is charged)|
| `C`    | gear crate                             |
| `P`    | battery crate                          |
| `U`    | used crate                             |
| `=`    | metal block                            |
| `^`    | spikes                                 |
| `o`    | gear                                   |
| `K`    | checkpoint lamp                        |

Builder helpers:

```js
b.ground(x0, x1)            // ground from column x0 to x1
b.pattern(x, y, 'BCBPB')    // a row of tiles starting at column x, row y
b.fill(x0, y0, x1, y1, '=') // a filled rectangle
b.stairs(x, height, 1)      // stairs going up (1) or down (-1)
b.gears(x0, x1, y)          // a line of gears
b.beetle(x)  b.boing(x)     // enemies (optional second argument: row)
b.platform(x0, x1, y)       // a platform moving between two columns
```

Each level also sets `start` (column and row), `goal` (the beacon column),
`time` and `theme` (`meadow`, `cave` or `dusk`). To add a fourth level, write
a new function and add it to the `SR.levels` list at the bottom of the file.

## Tuning

The main physics numbers are at the top of `updatePlayer()` in `js/game.js`:
walking and running speed, acceleration, jump strength and the two gravity
values (lower while jump is held, which is what makes held jumps higher).

## Credits

- Game design, code, pixel art, sound effects and music: original work made
  for this project.
- Fonts: [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P)
  by CodeMan38 and [Rubik](https://fonts.google.com/specimen/Rubik) by the
  Rubik Project Authors, both under the SIL Open Font License 1.1 (license
  texts in `assets/fonts/`).

## License

The game code and art are released under the MIT License (see `LICENSE`).
The bundled fonts keep their own OFL license.
