# Ringstorp Run on Phaser

The whole game runs in Phaser 4 (`/`, entry `index.html` → `src/play/main.ts`). Phaser owns the loop, scenes, keyboard and pointer input, audio, the camera and all of the interface. The game rules are unchanged: `SideGame` (`src/side/game.ts` and the level modules) is still the plain, Phaser-free simulation that its unit tests exercise.

The original DOM version is kept at `/legacy.html` (entry `src/side/main.ts`) with its own browser spec, and the corridor pilot at `/phaser.html`. Neither is needed by the game any more; see "Removing the old entries" below.

## How it fits together

```
index.html ─ src/play/main.ts        fonts + brand logos load first, then Phaser.Game (WebGL, 1440×810, FIT)
  Session (src/play/session.ts)      one SideGame + the UI-only state (title page, phone receipt, mute) and the
                                     single command bus: dispatch(UiAction). Pure, unit-tested without Phaser.
  BootScene → WorldScene + UIScene   run side by side; SideGame.mode is the state machine, not scene swaps
```

- **`WorldScene`** owns the cadence: `Controls.poll()` → `SideGame.update(dt)` → sound cues → `WorldView.update()`. It also turns a click on the lift's floor buttons into `floor-N`.
- **`UIScene`** builds the pure models (`src/play/ui/models/*`: panel, HUD, prompt, phone, controls, world HUD) once per frame, hands them to the widgets, and mirrors them into the hidden DOM.
- **Widgets** (`src/play/ui/`): `Chrome` (top and bottom bars), `HudCards`, `WorldHud` (toast, GO, POLIS, boss bar, route strip), `PromptBar`, `PanelHost` (title, briefings, pause, results), `PhoneDrawer`. The kit (`ui/kit/`) has `Button`, `Chip`, `KeyChip` and vector drawing helpers, so no symbol depends on a font having it.
- **Accessibility**: `src/play/a11y/mirror.ts` keeps a visually hidden copy of the interface in real DOM (`#a11y`). Screen readers get headings, live regions and buttons, and its buttons are the only elements that hold DOM focus (Tab, Enter and Space work). The canvas draws a focus ring on the control the DOM has focused.
- **Input**: `input/keymap.ts` is a pure port of the original key handling (tested as a table); `input/controls.ts` feeds it from Phaser's keyboard. Phaser 4 re-runs its key queue on every DOM key event within a frame, so each handled key is marked consumed (`event.stopPropagation()`); without that, one Escape toggles pause twice on a slow frame.
- **Audio**: the original oscillator synth (`audio/cues.ts` is the data, `audio/sfx.ts` plays it) on Phaser's AudioContext, muted through `game.sound.mute`. The mute preference keeps its original key, `ringstorp-muted`.

## The smooth look

`src/side/pixel.ts` is the one place the art is drawn through (`rect`, `disc`, `ellipse`, `seg`, `poly`, `text`). It has two modes, chosen once per page:

- **pixel** (default): the original crisp pixel art. The legacy page and the pilot use this and are unchanged.
- **smooth**: the same calls in the same 480×270 logical coordinates, drawn as anti-aliased vector shapes onto a context scaled up by `beginArt(c, S)`. `src/play/main.ts` switches it on.

`SideRenderer` takes a scale and draws the whole world onto one `480·S × 270·S` canvas, which `CanvasWorldView` shows as a Phaser texture (S is 3 by default; `?scale=2|3|4`). Things that could not be swapped mechanically have smooth versions: the ground (`ground-smooth.ts`), sky, clouds and distant layer, hedges, chain-link, tree canopies, window glints, fighters (`fighter-smooth.ts`, same skeleton as the pixel puppets so reach and hitboxes match), and the night sky. Street chunks are baked with a 2 px overlap so filtering never shows a seam, and `Backdrop.evict` frees chunks behind the camera (a smooth chunk is about 2.5 MB).

`?look=pixel` shows the original art through the same pipeline, which is handy for comparing.

## Brand artwork

ICA on the Kurir Livs plate, Statoil (drop and price pylon) and Bildeve on the dealership come from the supplied images. `scripts/prepare-logos.mjs <folder>` turns them into the small transparent PNGs in `src/play/assets/logos/` (it needs Chrome, through Playwright). `src/play/art/logos.ts` loads them before anything is baked; without them the art code falls back to its own lettering.

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

**Art lab**: `/?artlab=1&stage=shop|homes|gods|road|yard|back|marcus|both&x=<camera>&mode=smooth|pixel&cast=0` bakes real stage chunks and shows them with sample fighters through the same camera as the game (`at=<role>` centres on a landmark such as `kurir`, `statoil`, `bildeve`). `window.__artlab.parity(i)` compares a smooth chunk's outline with the pixel version, and `.seam(i)` compares the overlap of neighbouring chunks.

Tests: `tests/browser.spec.ts` drives the game with the real keyboard and mouse and reads the interface from the hidden DOM (`#a11y-*`). `tests/play-*.test.ts`, `tests/architecture.test.ts` cover the pure modules and keep `src/side` (the simulation) and the pure `src/play` modules free of Phaser.

## Removing the old entries

Nothing in the game needs these any more, so they can be deleted together when the old versions are no longer wanted:

- Legacy page: `legacy.html`, `src/side/main.ts`, `src/side/phone.ts`, `src/side/phone.css`, `tests/legacy.spec.ts`.
- Corridor pilot: `phaser.html`, `src/phaser/`, `tests/phaser.spec.ts`, `tests/phaser.test.ts`, `tests/fixtures/corridor/`, `scripts/{bake-pilot-audio,capture-corridor-reference,report-pilot-comparison}.mjs`, `docs/phaser-pilot.md`, `docs/phaser-art-direction.md`, and the entries in `vite.config.ts` and `playwright.config.ts`.

`src/side/render.ts`, the art files and the simulation stay: the Phaser build uses them.
