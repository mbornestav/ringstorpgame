# The Level Book

How to make a new Ringstorp Run level, or a new Carl-Otto ride, as a data file. You describe the street and what's on it. The game supplies the rules, the art and the interface.

## What you can make without code

| You want | Write | Rules it plays by |
|---|---|---|
| A new street level: fetch a parcel, fight the crews on the way, get home | a `*.level.ts` file in `src/side/levels/` | Level 1's: fights, the parcel, health at a shop, the home crew |
| A new bike ride for Carl-Otto | a `*.ride.ts` file in `src/play/family/rides/` | the apple ride's |

Anything that isn't a new arrangement of existing pieces still needs code. See [What still needs code](#what-still-needs-code).

## Quick start

1. Copy `src/side/levels/_template.level.ts` to `src/side/levels/<your-id>.level.ts`. Files starting with `_` are ignored, so the template itself never appears in the game.
2. Change `id` to the same `<your-id>` (lowercase letters, digits and dashes) and fill in the rest.
3. Run `npm run dev` and open `http://127.0.0.1:5173/?level=<your-id>`.
4. Run `npm test`. The validator checks every level file and names each problem in a sentence, for example `my-street: street.buildings[3]: overlaps street.buildings[2] in the same row`.
5. When it's ready, set `menu: true` to list it on the title screen after the three built-in levels, sorted by `order`.

A complete working example is `src/side/levels/sample.level.ts` ("Övningsgatan"). Play it with `?level=sample`.

## How positions work

- **Along the street**: every `x`, `from` and `to` is in pixels from the street's left end. 12 pixels is one metre, and one screen is 480 pixels wide.
- **Across the street** (lanes): the pavement runs from 176 (far side, by the buildings) to 248 (near kerb). A lane is `'far'`, `'middle'`, `'near'` or a number from 182 to 242.
- **Row 0 and row 1**: buildings stand at the pavement (row 0, the default) or further back behind the gardens (row 1). Row 1 is drawn smaller and hazier, and may overlap row 0.

## The level file

```ts
const level: LevelDefinition = {
  id, mode: 'brawl', title, subtitle?, menu?, order?, night?, intro?, objectives, street,
};
export default level;
```

| Field | What it does |
|---|---|
| `id` | Unique, lowercase. Used in the URL (`?level=<id>`). |
| `mode` | `'brawl'`, Level 1's rules. It is the only mode a level file can use today. |
| `title`, `subtitle` | Shown on the title-screen button and in the top bar. |
| `menu`, `order` | `menu: true` lists the level on the title screen; lower `order` comes first. |
| `night` | Dark sky; lamps and floodlights light up the street. |
| `intro` | The first message on screen. |
| `objectives.parcel`, `.home` | The objective line before the parcel, and on the way home (both required). |
| `objectives.crew`, `.shop` | Optional lines during a fight and while a shop is ahead. Without `shop`, the shop stop still works but isn't announced. |

**Texts** are either a key from `src/side/i18n.ts` or the level's own words in both languages: `{ sv: 'Min gata', en: 'My Street' }`. The validator refuses a text that is missing one of the two languages.

### `street`

| Field | What it does |
|---|---|
| `length` | Street length. At least 960 (two screens). |
| `start` | `{ x, lane? }`: where the courier starts, at least one screen before the end. |
| `parcel` | `{ x, lane? }`: the parcel, ahead of the start. |
| `home` | The x of home's door. The terrace (with 55B) is built around it and spans about 260 px on each side. Keep row-0 buildings out of that span. Leave at least 120 px of street after home. |
| `homeCrew` | Who waits at home, e.g. `['runner', 'bruiser']`. Beating them ends the run. |
| `crews` | Fights on the way: `{ x, members: [{ kind, dx?, lane? }], backup? }`. Each crew holds the screen until it's beaten. They only come for you once you have the parcel, so place them past it, and at least half a screen before home. `backup` defaults to one runner per bruiser, plus one for a group. |
| `names` | Street names from left to right, covering the whole street. The top bar shows the one you're on. |
| `surfaces` | `road` (default), `major`, `path`, `paved` or `yard`. Must cover the whole street if given. |
| `fronts` | What stands between the pavement and the buildings: `hedge`, `picket`, `plank`, `wall`, `rendered-wall`, `open`, `forecourt` or `chainlink`. Gaps are fine. |
| `buildings` | `{ kind, from, to, row?, door?, address?, wall?, roof?, floors? }`, with `kind` from the catalogue below. `wall` and `roof` (`#rrggbb`) and `floors` override the look of the plain kinds. |
| `trees` | Single trees or bushes: `{ x, bush?, height?, variant?, row? }`. |
| `scatter` | Trees and bushes spread along a stretch: `{ from, to, seed?, gap?: [min, max], bushes?: 0–1, avoid?: [[from, to], …] }`. They keep clear of doors by themselves. |
| `props` | `{ kind, x, near?, label?, variant? }`. Kinds: `lamp`, `sign` (with a `label`; `variant` 2 is yellow, 3 is green), `busstop`, `bench`, `bin`, `postbox`, `crossing`, `shelter`, `floodlight`. `near: true` puts it on the near pavement, in front of the action. |
| `lampsEvery` | Lamp posts along both pavements every so many pixels (at least 120). |
| `lights` | Extra pools of light for night levels. Lamps and floodlights light themselves. |

### Building catalogue

All kinds are in `src/side/levels/catalogue.ts`, each drawn with art the game already has.

| Kind | What it is |
|---|---|
| `house` | Rendered two-storey house with a tiled gable roof. |
| `red-cottage` | Falu-red wooden cottage. |
| `yellow-house` | Yellow wooden house, two floors. |
| `brick-villa` | Low yellow-brick villa. |
| `apartments` | Three-storey brick apartment building, flat roof. |
| `church` | White church. |
| `kiosk` | A small street kiosk, like Pålsjö kiosk. |
| `brick-block` | Four-storey red-brick block, as on Kurirgatan. |
| `brick-tower` | Seven-storey brick tower with three entrances (Kurirgatan 28). |
| `garages` | A row of garage doors. |
| `shed` | Red timber shed. |
| `school` | Long, low brick school. |
| `shop` | The Kurir Livs / ICA shopping block. Its entrance refills your health once (press E). At most one per level; it looks right about 888 px wide. |
| `petrol-station` | Statoil station: canopy, pumps and the shop. |
| `car-dealer` | The Bildeve Volvo dealership. |
| `warehouse` | Industrial warehouse. |
| `containers` | Stacked shipping containers. |
| `yard-gate` | The gate of a truck yard. |

### Enemies

`runner` (quick, light), `bruiser` (slow, hits hard, calls backup) and `boss` (the big one, with a health bar).

## Previewing

- `?level=<id>` plays the level from the start.
- `?artlab=1&level=<id>&x=<pixels>` shows a screen of the street at that point, with sample characters (`&cast=0` hides them). This is quick for checking buildings and props.
- `?look=smooth` shows the high-resolution vector art, `?look=pixel` the original pixel art, and `?crt=off` turns off the CRT finish.
- The development bridge (`window.__ringstorp` in the browser console) can move you along: `__ringstorp.sim.player.x = 2400`.

## Carl-Otto's rides

A ride file in `src/play/family/rides/` looks like `till-forskolan.ride.ts`:

| Field | What it does |
|---|---|
| `id`, `title` | Unique id; the title in both languages. |
| `length`, `speed` | Ride length in pixels of the 960 × 540 world, and pixels per second (3600 at 82 is about 45 seconds). |
| `apples.firstAfter` | Seconds before the first apple. |
| `apples.every` | `[min, max]` seconds between apples. |
| `apples.aimed` | Share of apples aimed at Carl-Otto (0–1). |
| `apples.clearEnd` | Apple-free pixels at the end. |
| `scenery.trees` | Apple trees `from`, `every`, `until`. |
| `scenery.destination` | `'preschool'`. |

Play a ride with `?game=carl-otto&ride=<id>`. The chooser starts `till-forskolan`. Listing more rides there needs a small change to `src/play/family/hub-scene.ts`.

## What still needs code

- **Level 2 (the Gods run) and Level 3 (the Kapell job) style levels.** Their rules depend on their own street, the tower's floors, the lift, the patrols and the truck yard, so a level file can only use Level 1's rules.
- **New building kinds, props or characters.** Art is drawn in code (`src/side/backdrop.ts`, `level2-art.ts`, `level3-art.ts`, `fighter-smooth.ts`). Once a kind exists, add it to the catalogue and every level can use it.
- **New rules**: new pick-ups, timed events, dialogue triggered by position, choices at junctions.
- **Briefings**: level files start straight away, without a briefing panel like D.D's calls.
- **Other ride destinations** than the preschool.
