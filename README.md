# Sprocket's Run

A small, original side-scrolling platformer that runs in any modern browser.
Guide Sprocket, a little tin robot, through **5 worlds and 50 levels**: collect
gears, stomp beetles, dodge spikers and bats, open crates for six different
power-ups and reach the radio beacon at the end of each level before time
runs out.

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
| Fire (Spark)  | C or F                           | Y              |
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
- Your best score and the furthest world you reached are saved in your browser.
- Finishing the last level of a world unlocks the next one, gives +2000 and an
  extra life. On the title screen, press left or right to pick a world you
  have unlocked.

## Worlds

| World | Name             | Theme                                            |
|-------|------------------|--------------------------------------------------|
| 1     | Meadow Works     | Green hills, beetles and boings                  |
| 2     | Gearbox Caverns  | Low ceilings, bats                               |
| 3     | Sunset Rooftops  | Stepped rooftops, spikers                        |
| 4     | Frostbyte Peaks  | Ice: Sprocket slides, so brake early             |
| 5     | Core Reactor     | Everything at once, longest levels               |

Each world has ten levels (1-1 to 5-10). Every fifth and tenth level is
longer and has three checkpoints.

## Power-ups

Crates with a picture hold a power-up. Hit them from below.

| Power-up    | Effect                                                              |
|-------------|---------------------------------------------------------------------|
| Battery     | Charged: smash bricks and survive one hit                           |
| Spark       | Press C to shoot bolts that stop enemies and break bricks           |
| Spring boots| Higher jumps and one extra jump in mid-air                          |
| Overdrive star | 10 seconds of speed, nothing can hurt you, enemies fall on touch |
| Gear magnet | Pulls nearby gears in for 20 seconds                                |
| Clock       | Adds 60 seconds to the timer                                        |

A hit removes the battery first, then the Spark and the boots together.
Star and magnet run out on their own. Carry your battery, Spark and boots
into the next level.

## Enemies

- **Shell beetle:** walks, turns at edges. Stomp it.
- **Boing:** hops. Stomp it from above.
- **Bat:** flies in a wave. Stomp it or shoot it.
- **Spiker:** walks like a beetle but has spikes on top. Never stomp it. Shoot
  it or use the star.

## Files

```
sprockets-run/
├── index.html            The website: hero, game screen, how to play, the world, about
├── css/
│   └── style.css         Site styles and bundled font declarations
├── js/
│   ├── sprites.js        Pixel-art sprites, defined as text grids
│   ├── levels.js         Builder helpers and the three hand-built levels (1-1, 2-1, 3-1)
│   ├── worlds.js         The 5 worlds and the seeded level generator for the other 47 levels
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

`js/worlds.js` lists the five worlds and builds 47 of the 50 levels from
hand-designed pieces (gaps, hills, spike rows, floating blocks, moving
platforms) with a fixed seed, so every level is always the same. Change a
level's `seed`, `width` or difficulty there to get a new layout, or replace its
entry with your own function.

To write a level by hand, open `js/levels.js`. Each level is a function that creates a builder, places
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
| `F`    | Spark crate                            |
| `J`    | spring boots crate                     |
| `S`    | star crate                             |
| `M`    | magnet crate                           |
| `T`    | clock crate                            |
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
b.bat(x, row)  b.spiker(x)  // flying bat, spiked walker
b.platform(x0, x1, y)       // a platform moving between two columns
```

Each level also sets `start` (column and row), `goal` (the beacon column),
`time` and `theme` (`meadow`, `cave`, `dusk`, `snow` or `core`). To use a level
you wrote, put its function in the `levels` list of a world in `worlds.js`.

## Tuning

The main physics numbers are at the top of `updatePlayer()` in `js/game.js`:
walking and running speed, acceleration, jump strength and the two gravity
values (lower while jump is held, which is what makes held jumps higher).

## Developer helpers

Open the browser console:

```js
SR.game.startAt(23)   // jump straight to world 3-4 (index = (world-1)*10 + level-1)
SR.god = true         // enemies and spikes cannot hurt you (pits still can)
SR.noEnemies = true   // load levels without enemies, then restart a level
```

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
