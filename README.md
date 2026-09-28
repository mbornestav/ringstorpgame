# Ringstorp Run

A self-contained, desktop browser isometric arcade game set in a fictionalized route from Ringstorp to Tågaborg, Helsingborg. The world and pixel art are original and use the supplied Bing Maps view as a visual reference. No map service, account, or server is needed to play.

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
| Esc | Pause or resume |
| M | Toggle sound |
| Enter | Start or replay |

Clear each parcel's guards, walk over the parcel to collect it, defeat the final crew, and reach the Tågaborg drop-off. First aid kits restore two hearts. Your best victory score is saved in this browser.

## Checks

```sh
npm test
npm run build
npm run test:browser
```

The browser smoke test uses an installed Google Chrome. Keep `npm run dev` running in another terminal while it runs.
