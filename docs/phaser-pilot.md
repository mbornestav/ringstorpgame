# Kurirgatan 28D: Phaser 4 pilot

The first migration gate is **one existing corridor**, not a new game. `/` continues to run the original game. `/phaser.html` runs Phaser **4.2.1**, pinned in the lockfile. The build emits both HTML entries; deployment scripts do not need changes. This work does not deploy the site.

## Try the room

Run `npm run dev`, then visit `/phaser.html`. For the reference population (D.D and the caretaker), use `/phaser.html?seed=500000001`. Seed `500000000` has only D.D. Seeds must be integers in `[0, 1000000000)`; absent/invalid seeds produce a new random seed.

- Walk with A/D and W/S or arrow keys. Shift sneaks, Space/L jumps, K dodges.
- E or the contextual button talks or uses the lift. Dialogue does not stop walking.
- Escape pauses. Losing focus pauses and clears held/buffered input. Resume explicitly.
- D.D hands over cargo once. Talking again gives his existing follow-up line.
- Near the lift, E records an `ExitRequest` in the harness below the game. There is no lift scene in this pilot.
- **Re-enter** retains the seed, run time, mission flags and cargo but resets conversation counters and entry position. **Restart** resets the run using the same seed. Reloading discards run progress.
- Language and mute share the original preference keys/formats. Wallets and best scores are never read or written by the pilot.

## Runtime boundaries

| Module | Responsibility |
| --- | --- |
| `src/phaser/main.ts` | Phaser configuration, accessible HTML shell, preference controls and pilot boundary harness |
| `src/phaser/scenes.ts` / `BootScene` | Validate discovered content, preload portrait/audio, bake static textures, report failures |
| `AdventureScene` | Instantiate the selected environment, ground body, camera, display objects, input, fade tween, visit lifecycle |
| `UIScene` | Dialogue texture and portrait presentation above the world |
| `src/phaser/movement.ts` | Original jump/dodge/buffer rules and movement tuning; produces ground velocity, never integrates ground position |
| `src/phaser/session.ts` | Plain run state, deterministic inhabitants, interaction policy, dialogue and mission actions |
| `src/phaser/content/` | Automatically discovered `*.environment.ts` content bundles and reference validation |
| `src/phaser/art.ts` | Small character/shadow/ceiling texture adapters and static room/atmosphere baking |
| `src/phaser/preferences.ts` | Existing mute preference adapter (`yes`/`no`); shared i18n owns language preference |
| `src/phaser/testing.ts` | Development-only deterministic test bridge; excluded from production |

Phaser owns the only game loop, native keyboard input, scene lifecycle, display objects, texture cache, camera, zero-gravity Arcade world, transition tween and loaded sound playback. Neither `SideGame` nor `SideRenderer` is instantiated or imported by the pilot. Character drawing is a bounded pixel producer, not a whole-scene renderer. Each actor has a 128×96 character texture and a 32×8 shadow texture. The ceiling has a separate 480×20 texture; static scenery is baked once. Dialogue textures only refresh when their content or fade alpha changes.

Arcade uses `customUpdate: true` and `fixedStep: false`. Each scene update supplies exactly one native world update with the original 50 ms gameplay cap, then syncs bodies before painting. The player has a 2×2 ground body. World bounds account for its half-size, preserving centre limits x=18–462/y=176–248. There are **no solid scenery or NPC colliders** in this corridor. Depth sorting uses the feet's y coordinate (player y+0.1), independently of jump height. Jump height remains a small game-specific calculation with the original semi-implicit integration and horizontal takeoff momentum.

The Phaser registry references the same `RunState` held by the visit; it is not another state store. Mission flags and cargo survive visits, while actors and dialogue counters belong to a visit. Mission dispatch selects one matching rule before applying its actions, so changing `received` cannot also trigger the follow-up rule on the same press. Dialogue countdown and movement buffers use the same bounded gameplay delta and freeze on pause.

The concurrent UI scene never consumes adventure controls. The adventure consumes key events using Phaser's propagation API, preventing queued events from replaying across concurrent scenes. Shutdown unregisters scene-owned listeners, clears keys, removes actor/ceiling textures and releases bodies. Each visit owns four reusable sound instances and destroys them on shutdown, including sounds that could not play while audio was locked. Restart reuses the shared room and cached audio assets.

## Adding content later

**The current gate includes no second environment.** After acceptance, ordinary content using an existing artwork/population policy can be added without editing scene infrastructure:

1. Add a `src/phaser/content/<name>.environment.ts` file exporting a `ContentBundle` with `satisfies ContentBundle`. The existing [corridor definition](../src/phaser/content/corridor.environment.ts) is the executable example; discovery uses Vite `import.meta.glob`.
2. Use stable environment/actor/dialogue/event/exit IDs. Define entry spawn, 480×270 dimensions, centre bounds, artwork, fixed camera, actors, strict interaction ranges and exits. For a room without procedural inhabitants, omit `population` and define only static actors.
3. Give ordinary actors an existing appearance ID and a dialogue ID. Dialogue lines are localization keys from `src/side/i18n.ts`; add English and Swedish entries there for new writing. `cycle` repeats all lines; `last` repeats the final line. Duration and optional D.D portrait are explicit data.
4. Define mission rules as an event plus an optional boolean flag condition. The pilot vocabulary is `dialogue`, `flag`, `cargo`, `exit`, and an optional existing sound cue. Actors and exits name the event to dispatch. Add a domain action only when actual game content needs it.
5. Internal exits must reference a discovered environment and spawn. `boundary: true` means an intentionally external transition handled by a host, as with this pilot's unimplemented lift. Do not use it to silence a broken internal reference.
6. Run the validator/unit checks and add behaviour/visual cases for the content. Validation checks duplicate IDs, spawn/bounds, appearances, bilingual keys, dialogue/event/flag/action references and internal destinations before scene startup.

For example, a static actor entry can be `{ id: 'caretaker-east', appearance: 'caretaker', x: 220, y: 214, facing: -1, dialogue: 'caretaker', label: 'act2.talk' }`. Its dialogue definition can reuse the current caretaker keys. Unique actor IDs identify instances; appearance IDs select shared artwork.

The schema deliberately includes only the fixed corridor artwork/camera and neighbour policy needed now. New visual families, moving cameras and full Gods-run transitions belong to later accepted environments. This is not a second custom engine or an unbounded scripting language.

## Reference and verification

Before changing shared art, `scripts/capture-corridor-reference.mjs` captured the original entrypoint into `tests/fixtures/corridor/`. It uses independent legacy instances with a fixed seed and visual time, not the live page's running game. **Do not regenerate these fixtures to make a migration test pass.** Intentional reference updates should be separately reviewed.

The reference includes 13 native 480×270 frames: arrival, both walking directions, jump, sneak, dodge, neighbour dialogue, D.D's handoff in English/Swedish, actor overlap in both depth orders, pause and lift departure. It also records movement at 30/60/120 Hz and 25 ms steps. `scripts/bake-pilot-audio.mjs` reproducibly exports the original jump/dodge/doors/handoff oscillator envelopes to four bundled WAV files; runtime playback uses Phaser's sound manager.

Run these checks with Vite serving port 5173:

```sh
npm test
npm run test:browser -- --workers=1
npm run build
node scripts/report-pilot-comparison.mjs
```

The browser suite checks native Arcade coordinates against every captured movement frame; strict interaction edges; real keyboard/button activation; live localization; one-time handoff; exit/re-entry state; unchanged wallet/scores; mute compatibility; pause/focus clearing; held jump; bounds; repeated-visit body/texture/listener counts; and visible asset failures. Unit tests also compare seeded inhabitants with the original implementation and exercise mission/selection rules. Existing unit/browser suites remain included.

Browser comparisons write actual images and `comparison.json` under `test-results/phaser-native-resolution-p-8c40c-tches-the-original-corridor/`. The report script produces a standalone **`test-results/phaser-comparison.html`**, with before/after images and measurements. These generated results are ignored by Git; the original reference fixtures and report generator are tracked.

### Known presentation differences

- WebGL compositing of cached transparent atmosphere/shadow textures differs from the original opaque Canvas by at most a few 8-bit channel levels in the captured room/actor frames.
- CanvasTexture dialogue uses grayscale font antialiasing; the original opaque Canvas uses LCD/subpixel text antialiasing in Chrome on Windows. Font, size, words, wrapping, box and portrait geometry are preserved. The visual test permits bounded glyph differences only in the dialogue text rows, and still checks every pixel elsewhere. This remains an explicit pilot-review difference.
- The HTML shell retains the existing colours/type/button styles. The pilot harness sits outside the presentation; it shows the exit contract instead of loading another room. No wallet, payout, phone, street, patrol or lift gameplay is presented.

### Implementation verification (2026-09-29)

- 112 unit tests pass, including all existing suites.
- All 10 original-game browser tests and all 5 pilot browser tests pass in Chrome.
- TypeScript and the two-entry production build pass. The Phaser engine bundle triggers Vite's advisory large-chunk warning (about 390 kB gzip); the original entrypoint does not load that bundle.
- Production preview was exercised through the original start flow and the pilot's keyboard movement/D.D handoff, with no page errors. The development test bridge is absent in production.
- All 13 reference images pass the scoped comparison. Non-dialogue frames have maximum channel difference 3/255. The three dialogue frames have 0.713–0.978% of pixels exceeding 8 channel levels, all confined to text glyph rows; no scenery, actor, portrait or box-layout differences exceed that threshold.
- Audio files decode and the native mute API/preferences are exercised. Audible output was not verified in headless Chrome; its WebAudio context remained suspended in this environment.

## Migration gate

Review the corridor's feel, visual comparison and exit contract before authorizing the next environment. The old engine stays in place for all remaining content. Follow-on order remains cabin/lobby/corridors, Gods-run exterior, Level 1 routes and encounters, then the yard/companion/driving work. Shared domain and content extraction can continue incrementally; only the pure interior layout seam and a backwards-compatible language-listener unsubscribe were needed in legacy modules for this pilot.
