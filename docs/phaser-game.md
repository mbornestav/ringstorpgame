# Ringstorp Run on Phaser

The whole game runs in Phaser 4 (`/`, entry `index.html` → `src/play/main.ts`). Phaser owns the loop, scenes, keyboard and pointer input, audio, the camera and all of the interface. The game rules are unchanged: `SideGame` (`src/side/game.ts` and the level modules) is still the plain, Phaser-free simulation that its unit tests exercise.

The original DOM version is kept at `/legacy.html` (entry `src/side/main.ts`) with its own browser spec, and the corridor pilot at `/phaser.html`. Neither is needed by the game any more; see "Removing the old entries" below.

## How it fits together

```
index.html ─ src/play/main.ts        fonts + brand logos load first, then Phaser.Game (WebGL, 1440×810, FIT)
  Session (src/play/session.ts)      one SideGame + the UI-only state (title page, phone receipt, mute) and the
                                     single command bus: dispatch(UiAction). Pure, unit-tested without Phaser.
  BootScene → HubScene               collection chooser: Ringstorp Run / Carl-Ottos spel
    Ringstorp → WorldScene + UIScene run side by side; SideGame.mode is the mission state machine
    Carl-Otto → BikeScene            separate bicycle simulation and illustrated world
              → HideScene            Kurragömma in the preschool yard (hide-run.ts + yard-art.ts)
              → HouseScene           Hemma: the map of the house (games/hemma.ts + house-art.ts, progress in house.ts)
                → MovieScene         Filmkväll in the living room (movie-run.ts + home-art.ts)
                → CraftScene         Pysselhörnan in the hall (craft-run.ts + craft-art.ts); the rooms extend room-scene.ts
                → PancakeScene       Pannkakor in the kitchen (pancake-run.ts + pancake-art.ts)
                → GoodnightScene     Godnatt in Carl-Otto's room (goodnight-run.ts + goodnight-art.ts)
                → MorningScene       God morgon in the big bedroom, then on to BikeScene (morning-run.ts + morning-art.ts)
                → HomecomingScene    Hemkomst by the front door (homecoming-run.ts + homecoming-art.ts; put-away.ts is shared with Godnatt)
                → DiningScene        Duka bordet in the dining room, then on to MovieScene (dining-run.ts + dining-art.ts)
                → BathScene          Tänder och tvål in the bathroom, then on to GoodnightScene (bath-run.ts + bath-art.ts; mirror-face.ts is shared with the toilet)
                → SillyScene         Fånig i spegeln in the little toilet; its photos hang on the walls like drawings (silly-run.ts + silly-art.ts)
```

- **`WorldScene`** owns the cadence: `Controls.poll()` → `SideGame.update(dt)` → sound cues → `WorldView.update()`. It also turns a click on the lift's floor buttons into `floor-N`.
- **`UIScene`** builds the pure models (`src/play/ui/models/*`: panel, HUD, prompt, phone, controls, world HUD) once per frame, hands them to the widgets, and mirrors them into the hidden DOM.
- **Widgets** (`src/play/ui/`): `Chrome` (top and bottom bars), `HudCards`, `WorldHud` (toast, GO, POLIS, boss bar, route strip), `PromptBar`, `PanelHost` (title, briefings, pause, results), `PhoneDrawer`. The kit (`ui/kit/`) has `Button`, `Chip`, `KeyChip` and vector drawing helpers, so no symbol depends on a font having it.
- **Accessibility**: `src/play/a11y/mirror.ts` keeps a visually hidden copy of the Ringstorp Run interface in real DOM (`#a11y`). The collection and bike scenes use `src/play/family/surface.ts` for the same canvas-button/DOM-proxy pattern. Screen readers get headings, live regions and buttons, and its buttons are the only elements that hold DOM focus (Tab, Enter and Space work). The canvas draws a focus ring on the control the DOM has focused.
- **Input**: `input/keymap.ts` is a pure port of the original key handling (tested as a table); `input/controls.ts` feeds it from Phaser's keyboard, and from the on-screen touch controls through `Controls.press`/`release`. Phaser 4 re-runs its key queue on every DOM key event within a frame, so each handled key is marked consumed (`event.stopPropagation()`); without that, one Escape toggles pause twice on a slow frame.
- **Touch screens (iPad)**: every game can be played with fingers only; `tests/ipad.spec.ts` plays each one as an iPad Pro in landscape with real touch events (taps, held thumbs and finger drags). `input/touch.ts` decides whether the device is a touch screen (`(hover: none) and (pointer: coarse)`; `?touch=1|0` overrides). Then Ringstorp Run shows `ui/touch-pad.ts` while playing (a floating thumb stick and round buttons built from the level's own key hints, plus a pause button) instead of the key strip, and Carl-Otto's games leave out their keyboard hints. Every family scene has a sound button, as a tablet has no M key. The page turns off double-tap zoom, rubber-band scrolling, long-press callouts and the tap flash, and can be added to the home screen to run full screen; the music unlocks again on the next touch after Safari interrupts it.
- **Audio**: the original oscillator synth (`audio/cues.ts` is the data, `audio/sfx.ts` plays it) on Phaser's AudioContext, muted through `game.sound.mute`. The mute preference keeps its original key, `ringstorp-muted`.
- **Music** (`audio/music.ts`, tracks in `audio/songs.ts`): chiptune played live on the same AudioContext, through Phaser's master mute, so the sound button (or M in Carl-Otto's games) silences it too. A track is written step by step: a 25% pulse lead, a 12.5% pulse arpeggio and a triangle bass generated from one chord per bar, and noise drums. Notes are scheduled 150 ms ahead on the audio clock; tracks crossfade; the music dips while paused. Tracks: `title` (title and results), `street`, `gods`, `heist` (levels 1–3; level files use `street`, or `heist` at night), `hub`, `bike`, `hide`, `movie`. `?music=off` silences it.

## The retro look

The game is shown as 480×270 pixel art by default, in art mode **retro**: the detailed smooth art below, drawn at one pixel per logical pixel and then finished as a 16-bit console picture. `src/play/look.ts` chooses the mode before any other module loads (the theme, HUD layout and game config read it); `?look=smooth` and `?look=pixel` show the other two modes.

- **Palette snap** (`src/play/world/retro-shader.ts`, palettes in `src/side/palettes.ts`, maths in `src/side/retro.ts`): a fragment shader samples the 480×270 world canvas per logical pixel, pushes each pixel by a 4×4 Bayer threshold and replaces it with the nearest palette colour (at most 64: day, night, interior and the bike ride each have one). The palettes were seeded from real frames by `scripts/extract-palette.mjs` and tuned by hand. Doing this on the CPU cost 6–9 ms a frame; the shader costs nothing measurable.
- **Sprite outlines**: `SideRenderer.outlined` draws the actors onto their own layer and stamps a dark silhouette of it one pixel in each direction before putting it back, so figures, cars and parcels read as outlined sprites. Carl-Otto and the apples get the same (`outlined` in `src/play/family/art.ts`).
- **Pixel interface**: Tiny5 for all text and numbers and Press Start 2P for the big titles (the © comes from Press Start 2P too), at sizes snapped to 24, 48 or 72 UI px by `fontPx` so one font pixel is one logical pixel. Windows and buttons are `retroBox` in `ui/kit/draw.ts`: a hard drop shadow, a dark outline, an inset coloured border and a top bevel. UI cameras round to whole pixels, and the game runs with `antialias: false`, so text and textures are sampled nearest-neighbour.
- **CRT finish** (`src/play/crt.ts`): a camera filter on every scene softens the picture sideways, adds a scanline on each logical row, a faint aperture-grille tint, a little bloom and (on the world cameras) a vignette. `?crt=off` turns it off.

## The smooth look

`src/side/pixel.ts` is the one place the art is drawn through (`rect`, `disc`, `ellipse`, `seg`, `poly`, `text`). It has two modes, chosen once per page:

- **pixel** (default): the original crisp pixel art. The legacy page and the pilot use this and are unchanged.
- **smooth**: the same calls in the same 480×270 logical coordinates, drawn as anti-aliased vector shapes onto a context scaled up by `beginArt(c, S)`. `src/play/main.ts` switches it on.

`SideRenderer` takes a scale and draws the whole world onto one `480·S × 270·S` canvas, which `CanvasWorldView` shows as a Phaser texture (S is 3 by default; `?scale=2|3|4`). Things that could not be swapped mechanically have smooth versions: the ground (`ground-smooth.ts`), sky, clouds and distant layer, hedges, chain-link, tree canopies, window glints, fighters (`fighter-smooth.ts`, same skeleton as the pixel puppets so reach and hitboxes match), and the night sky. Street chunks are baked with a 2 px overlap so filtering never shows a seam, and `Backdrop.evict` frees chunks behind the camera (a smooth chunk is about 2.5 MB).

Light comes from the afternoon sun at the upper right of the screen, and the smooth art modules keep to it:

- **Fighters** (`fighter-smooth.ts`): limbs are shaded tubes (core shadow, lit face towards the sun, a faint sky bounce), the torso has a light-aware cloth gradient, folds, belt and collar occlusion, a sunlit edge and the front arm's shadow across it; heads, hands and shoes are shaded the same way. The light is fixed in world space, so a fighter facing left is lit on the back.
- **Vehicles** (`vehicle-smooth.ts`): the cars and trucks as illustrated bodywork (sky-and-road paint reflection, glass streaks, chrome, alloy rims, a soft shadow). The static body is baked once per model, colour and direction onto two offscreen layers (under and over the heads in the windows); wheels, lamps, beacons and POLIS are drawn live.
- **Buildings** (`facade-light.ts`): each facade is baked through a scratch canvas and lit with `source-atop`, so only its own pixels change: sun across the elevation, a lighter roof crown, eave shadow, occlusion at the plinth, grain, a sunlit rim along the silhouette and a contact shadow on the ground. `windowAt` adds reveal shading and a sill shadow; street furniture has smooth versions in `backdrop.ts`.
- **Markers** (`package-art.ts`): the parcel, the pick-up badge, alerts over heads, Marcus A's eyes, the home star, junction signs and the step-up chevron.
- **Grade**: `SideRenderer.drawAtmosphere` blits one baked overlay (warm haze and sun, cool air low on the left, vignette) instead of filling gradients each frame.

`?look=pixel` shows the original art through the same pipeline, which is handy for comparing.

## Carl-Otto's ride

`src/play/family/art.ts` draws the bike ride, set in Höganäs (the sea on the horizon, Kullaberg with Kullens fyr, the town's church spire and works chimney), as a storybook illustration lit from the sun on the upper right. Everything static (sky, clouds, the three parallax hill strips, the gravel path, the foreground grass, the apple trees and their dappled shade, the house, the preschool, the apple and the light/vignette overlay) is baked once at 1.5× into sprites and tileable strips; a frame blits those and draws only the cyclist (two-bone IK legs on the pedals) and the apples live, about 0.3 ms of JS. The hub's two preview cards are drawn by the same module.

## Brand artwork

ICA on the Kurir Livs plate and Bildeve on the dealership come from the supplied images. `scripts/prepare-logos.mjs <folder>` turns them into the small transparent PNGs in `src/play/assets/logos/` (it needs Chrome, through Playwright). `src/play/art/logos.ts` loads them before anything is baked; without them the art code falls back to its own lettering. The Statoil mark (the ring-drop on the canopy and the square sign on the pylon) is drawn as paths from the supplied reference, in `src/side/statoil-mark.ts`, so it keeps its proportions at any size.

## Fonts

Barlow Condensed (signs, HUD, headings), IBM Plex Sans (menus, dialogue) and Share Tech Mono (the handset LCD), bundled through `@fontsource` and served from the site's own assets. `loadFonts()` must finish before baking, because baked text is measured once.

## Developing and testing

```sh
npm run dev            # http://127.0.0.1:5173/
npm test               # Vitest: rules, models, keymap, cues, module boundaries
npm run test:browser   # Playwright (starts the dev server if needed)
npm run build          # tsc, Vite build, and a check that no test hooks reached dist/
```

In development the page exposes `window.__ringstorp` (`src/play/testing/bridge.ts`): the running `SideGame` as `sim`, `click(action)`, `step(dt, n)` to advance a frozen game by hand, `bounds(id)` for a real mouse click on a canvas control, `ui()` for the current models, `audio()`, and `state()`. It is stripped from production builds, and `check-no-bridge.mjs` fails the build if it leaks.

URL options (development): `?start=1|2|3` skips the menus, `?seed=N` seeds the random generator, `?look=pixel`, `?scale=2|3|4`.

**Art lab**: `/?artlab=1&stage=shop|homes|gods|road|yard|back|marcus|both&x=<camera>&mode=retro|smooth|pixel&cast=0` bakes real stage chunks and shows them with sample fighters through the same camera as the game (`at=<role>` centres on a landmark such as `kurir`, `statoil`, `bildeve`). `window.__artlab.parity(i)` compares a smooth chunk's outline with the pixel version, and `.seam(i)` compares the overlap of neighbouring chunks.

Tests: `tests/browser.spec.ts` drives the game with the real keyboard and mouse and reads the interface from the hidden DOM (`#a11y-*`). `tests/play-*.test.ts`, `tests/architecture.test.ts` cover the pure modules and keep `src/side` (the simulation) and the pure `src/play` modules free of Phaser.

## Removing the old entries

Nothing in the game needs these any more, so they can be deleted together when the old versions are no longer wanted:

- Legacy page: `legacy.html`, `src/side/main.ts`, `src/side/phone.ts`, `src/side/phone.css`, `tests/legacy.spec.ts`.
- Corridor pilot: `phaser.html`, `src/phaser/`, `tests/phaser.spec.ts`, `tests/phaser.test.ts`, `tests/fixtures/corridor/`, `scripts/{bake-pilot-audio,capture-corridor-reference,report-pilot-comparison}.mjs`, `docs/phaser-pilot.md`, `docs/phaser-art-direction.md`, and the entries in `vite.config.ts` and `playwright.config.ts`.

`src/side/render.ts`, the art files and the simulation stay: the Phaser build uses them.
