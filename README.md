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
| Esc | Pause or resume |
| M | Toggle sound |
| Enter | Start (direct route), continue from Marcus A, or replay |

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
