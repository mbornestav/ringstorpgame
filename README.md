# Ringstorp Run

A self-contained, desktop browser isometric arcade game on the real streets between Pålsjö and Ringstorp in Helsingborg. The streets, building footprints, forest and parks come from OpenStreetMap. The pixel art is original. No map service, account or server is needed to play.

## The mission

A valuable package is waiting at **Pålsjö kiosk** (Johan Banérs gata 35). Pick it up and carry it home to **Ringstorpsvägen 55B**. Choose your route on the title screen, and press R to switch during the run:

- **Direct**: north on Romares väg, then along Johan Banérs gata to the Ringstorpsvägen roundabout. It's shorter, but a bigger crew hangs around there.
- **Via Marcus A**: further up Romares väg, along Långåkersgatan past **Marcus A** (Långåkersgatan 4), and back down Almgatan. It's longer, but Marcus A patches you up to full health and becomes a checkpoint. If you're knocked out after visiting, you can continue from there for a score penalty.

A final crew waits on Ringstorpsvägen; shake it off and reach the door. The in-world markers match the route plan: a **?** over the package, googly eyes over Marcus A, and a star over Home. Your best score is saved in this browser.

## Run

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. `npm run build` creates a static production build in `dist/`.

## Controls

| Key | Action |
| --- | --- |
| WASD or arrows | Move |
| J | Punch; time repeated presses for a three-hit combo |
| K | Dodge with brief invulnerability |
| R | Switch between the direct route and the route via Marcus A |
| Q / E or the ↶ / ↷ buttons | Rotate the map left / right in 45° steps, through all 360° |
| Drag the map left / right | Rotate the view (mouse or touch) |
| 0 or RESET | Return to the original view |
| Esc | Pause or resume |
| M | Toggle sound |
| Enter | Start (direct route), continue from Marcus A, or replay |

Movement follows the screen at every angle. Rotation preserves the mission, collisions and world positions, and works with Q/E while paused too.

## Building references

The three supplied Google Street View screenshots guide the landmark models:

- **Home, Ringstorpsvägen 55B:** a two-storey terrace with yellow brick upstairs, white horizontal cladding below, white window frames, a low tiled roof and chimney. The adjacent terrace units use the same palette and roof profile.
- **Marcus A, Långåkersgatan 4:** yellow brick, a grey basement, dark shutters, dark vertical timber in the gables, a steep grey roof and a tall chimney.
- **Pålsjö kiosk:** pale walls, a broad closed service shutter, blue fascia, red lettering, side glazing and a low dark gable roof with pale overhanging edges. Its approach is paved.

`src/buildings.ts` stores these profiles separately from the renderer. Building walls and roofs follow the actual OSM polygons, including recesses and extensions. Roof ridges, windows and chimneys stay attached to the same world sides during rotation.

These are pixel-art interpretations of the visible photographs, not surveyed replicas. Exact dimensions, hidden facades and unpictured buildings remain approximations; the other buildings use generic materials. The screenshots were supplied by the user; a live Google Maps inspection was unavailable in this session.

## Map data

`src/map-data.json` is generated from OpenStreetMap by `scripts/build-map.mjs`, and is © OpenStreetMap contributors under the ODbL 1.0. The script uses 2 m world units and rotates the map so the camera looks east-north-east across Pålsjö skog towards Ringstorp. To refresh the data:

```sh
node scripts/build-map.mjs
```

## Checks

```sh
npm test
npm run build
npm run test:browser
```

The browser smoke test uses an installed Google Chrome. Keep `npm run dev` running in another terminal while it runs.
