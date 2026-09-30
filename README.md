# Spel från Ringstorp

The home screen is a Swedish game chooser with two sections. **Ringstorp Run** contains the three original missions described below. **Carl-Ottos spel** is set in Höganäs and starts with **Till förskolan**, a short bicycle ride for a little boy in a blue helmet. He pedals automatically; steer with **WASD / arrow keys** or the on-screen arrows to avoid falling apples. Rings mark where apples will fall. Three hearts, a pause button, retry and a clear final stretch lead to a low, solid-red preschool. The boy, white garages and garden fence are original vector interpretations of the supplied reference photos.

New visitors start in Swedish. The language choice is remembered. **Välj spel** returns from Ringstorp Run to the collection, and **Alla spel** returns from the bike ride. `?game=ringstorp` links directly to the original level chooser; `?game=carl-otto` opens the bike instructions.

The new Phaser scenes live in `src/play/family/`. `bike-run.ts` is the plain TypeScript simulation; `art.ts` draws the scenery and cyclist. Distance, speed and spawn timing are kept there for later tuning. `npm test` covers the ride rules and `npx playwright test tests/family.spec.ts` checks the chooser, keyboard/touch controls, pause, retry and arrival.

## Ringstorp Run

A self-contained, desktop browser side-scrolling arcade brawler on the real streets between Pålsjö and Ringstorp in Helsingborg. The route, the buildings along it, the street names, side streets, lamps, signs and bus stops come from OpenStreetMap. The artwork is original, drawn in code as smooth vector graphics. No map service, account or server is needed to play.

## The mission

A valuable package is waiting at **Pålsjö kiosk** (Johan Banérs gata 35). Pick it up and carry it home to **Ringstorpsvägen 55B**. Start playing, then choose your path at the signed junctions. **Keep walking to continue straight, or press E near a sign to take the turn.** The on-screen turn button works too. You can visit neither stop, either one, or both in the same run:

- **Direct**: along Johan Banérs gata to Ringstorpsvägen. It's shorter, but bigger crews hang around there.
- **Via Marcus A**: up Romares väg, along Långåkersgatan past **Marcus A** (Långåkersgatan 4), and back down Almgatan. It's longer, but stepping up to Marcus A's gate patches you up to full health and makes it a checkpoint. If you're knocked out after visiting, you can continue from there for a score penalty.
- **Via Kurir Livs**: a later turn near Ringstorpsvägen leads around the roundabout to the shopping forecourt on Kurirgatan. Walk up to the glass entrance under the **ICA Nära / Kurir Livs** sign and press **E** for a full health refill. Supplies can be collected once per run; arriving at full health doesn't use them up. Pass the rest of the shopping block and a new crew on the way back to the home approach.

Turns preserve your package, health, cleared crews, score and Marcus checkpoint. You must finish an active fight before turning. A new run starts with both choices open again.

Crews wait where they hang around on the map. When you reach one, the screen stops scrolling until you've shaken them off, and bigger crews call for backup. A final crew, led by a boss, waits outside the terrace on Ringstorpsvägen: beat them and step up to the door. The markers show a **?** over the package, googly eyes over Marcus A, a green **+** over Kurir Livs, and a star over Home. The strip along the bottom shows the junctions, stops and remaining crews. Your best score is saved in this browser.

## Level 2: the Gods run

Pick **LEVEL 2 · GODS RUN** on the title screen. D.D rings: he wants Marcus at **Kurirgatan 28D** to carry some "Gods" (contraband) home. There is no fighting in this level; it's about sneaking.

1. **Go in** through the door of 28D (E), cross the hall to **Superhissen** and press E. Choose a floor with **0-8** or by clicking a button on the lift panel (**BV** is the ground floor). Every floor works, and each has its own few random neighbours to talk to (E). D.D waits on the **8th floor**, where he hands you the Gods.
2. **Ride back down** and head out. Then carry the Gods home along Kurirgatan: past a row of garages, **four brick blocks**, **Kurir Livs** and the **school**, to **Ringstorpsvägen 55B**. Stand at the door and press E to hand them over.
3. **Patrols** watch the street. The yellow cone shows where an officer is looking; a **?** and a filling bar mean they're getting suspicious, and a **!** means a chase. They only care while the Gods are on your back. Hold **Shift** to sneak (slower, but you're much harder to see), or crouch behind a hedge, bin, garage door or bush by sneaking to a stop there: you're nearly invisible. Press **E** at cover to **stash** the Gods and again to collect them, though a searching officer who passes close to your stash will find it. Jumping or dodging (**K**) slips out of a grab.
4. **If you're caught**, the Gods are confiscated and you pay a **150 kr** fine, then you start over outside 28D with a new load.

Delivering pays **300 kr**, plus 100 kr more for each assignment you've done in a row (up to 800 kr), and there's one more patrol on the street each time, up to six. Pick **NEXT ASSIGNMENT** to go again. Your cash is saved in the browser and is shared with Level 1, where it pays for D.D's refills.

## Level 3: the Kapell Job (hardcore, as D.D)

Pick **LEVEL 3 · THE KAPELL JOB** on the title screen. You are **D.D**, and it's night. You pick up **Goran** on Kurirgatan in a **Ford Taunus** and drive out past **Statoil** and the **Bildeve Volvo** dealership to an industrial estate, where a truck park is full of trailers under **kapell** (tarpaulin). Cut them open, take the Gods, and drive back to Kurirgatan.

1. **Driving** (out and back): **D** is gas, **A** is brake, and **W / S** (or ↑ / ↓) change lane. Slower traffic shares both lanes, so overtake, and a bump costs speed and a point of car damage. **Four points wreck the car and fail the job.** The way out is quiet: there are no police.
2. **The yard**, on foot: **hold E** beside a trailer for three seconds to **cut the kapell**, then hold E again to take **crates** (you can carry two). Carry them to the Taunus and press **E** to load; press **E** at the car again to drive off. The boot holds eight. **Shift** sneaks and **K** dodges a grab.
3. **Police patrol the yard.** Their yellow cones show where they're looking; a **?** and a filling bar mean suspicion, and a **!** means a chase. **Trailers block their view**, so crouch behind one (sneak and stand still) to hide. **Cutting and taking crates is loud**: officers within about 150 px hear it even when they can't see you.
4. **Goran is your partner and lookout.** He follows you, cuts and hauls from another trailer once you've started, and **whistles and hides when police get close**. **If either of you is arrested, the whole job is over**: no checkpoints, and a 500 kr fine.
5. **The way back**: more crates means more money and a bigger chance of a chase (**30 % + 8 % per crate + 5 % per noisy cut**). Police cars come up behind you in waves; out-drive them and swap lanes to shake them off, but if they box you in at a crawl you're arrested. Each crate pays **120 kr** on arrival, less **40 kr** for each dent.

## Making new levels

New street levels (fetch the parcel, beat the crews, get home) and new Carl-Otto rides are data files, not code: see **[docs/level-book.md](docs/level-book.md)**. Copy `src/side/levels/_template.level.ts`, fill it in, and play it with `?level=<id>`; `npm test` checks it. `src/side/levels/sample.level.ts` is a complete example (`?level=sample`).

## Language

The chooser's language button and Ringstorp Run's **SV / EN** button switch between English and Swedish. The choice is saved in the browser. Ringstorp Run's text lives in `src/side/i18n.ts`; the collection and bike game use `src/play/family/text.ts`. Game state stores keys, so text is translated when it's shown. Signs painted into the scenery (Kurir Livs, ICA, POLIS, HEM 55B, HUNDFÖRBUD, FÖRSKOLAN) stay Swedish in both languages.

## Run

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. `npm run build` creates a static production build in `dist/`, and `npm test` and `npm run test:browser` run the unit and browser tests.

The game runs on Phaser 4. See [the architecture, dev tools and testing notes](docs/phaser-game.md). Two older entries are kept for now and are safe to remove together (the doc lists the files): the original DOM version at `/legacy.html`, and the single-corridor Phaser pilot at `/phaser.html` ([pilot notes](docs/phaser-pilot.md)).

## Deploy

From PowerShell, deploy the production build to the existing server with:

```powershell
.\deploy.ps1
```

The script uses `ssh/dproxy_key.pem` to deploy as `azureuser`, installs an atomic release under `/opt/ringstorp-run`, and serves it at [https://dproxy.okab.tech:1998/](https://dproxy.okab.tech:1998/) using the server's existing Let's Encrypt certificate. It requires `npm`, `ssh`, `scp`, and `tar` locally. Host, SSH user, key path, and port can be overridden with script parameters.

## Controls

| Key | Action |
| --- | --- |
| A / D or ← / → | Walk along the street |
| W / S or ↑ / ↓ | Step towards the far pavement or the near kerb |
| Space or L | Jump |
| J | Punch. Time repeated presses for a jab, a cross and a hook that knocks down. In the air, J is a flying kick |
| K | Dodge, with brief invulnerability |
| I | Fire D.D's handgun, once he has given it to you |
| F | Pull up / put away the Ericsson GH337; call D.D or buy ammunition |
| E | Wave down D.D's BMW as it passes, take the optional turn at a junction, or refill health at Kurir Livs' entrance |
| Esc | Pause or resume |
| M | Toggle sound |
| Enter | Start, continue from Marcus A, or replay |
| Shift | Levels 2 and 3: sneak |
| 0-8 | Level 2: choose a floor in the lift |
| D / A, W / S | Level 3: gas and brake, change lane while driving; hold E to cut and take crates in the yard |

Blows only land on someone in the same lane, so line up before you swing. A **!** means an attack is coming. Bruisers and the boss shrug off jabs while winding up, so dodge, jump clear, or finish the combo with the hook.

## D.D, the handgun and the police

Press **F**, or click the **GH337** button, to pull up your Ericsson GH337 at any point during a live run, including fights and before package pickup. Its handset follows the supplied reference: long antenna, round earpiece, green LCD, blue display surround and oval keys. Press **YES** to auto-dial **D.D**, with **042218626** visible throughout dialing, ringing and the call. Calls are free. D.D comes to your position in his BMW on roads, or on foot at the kiosk and on paths. He follows you around street corners. You can pocket the phone while he travels; the fight pauses while the handset is open. **NO**, **F** or **Esc** puts it away; **Cancel call / visit** cancels the request.

When he arrives, use **F** (or **E** nearby) to review his offer: **100 kr to refill to 8 rounds**, including the handgun if needed. Press YES or the purchase button to confirm; nothing is charged automatically. A full load or insufficient cash disables the purchase, and you can send him away without paying. You start with **200 kr** and earn **50 kr per cleared crew**. Your cash is shown beside the phone button and on the offer. Your wallet is saved in the browser between runs and is shared with Level 2.

Now and then, on an open stretch of road, D.D's blue 90s BMW also passes by. Wave it down with **E** while it's close and he pulls over. The first chance encounter still provides his free handgun with 8 rounds; subsequent refills cost the same 100 kr. If you miss him, he comes round again later. The prompt at the top of the screen tells you when he's in reach.

**I** fires along your lane at the nearest crew member in front of you. A hit does 2 damage and staggers anyone, even a bruiser or the boss mid-windup; runners go down. The courier won't shoot at the police: with an officer in the line of fire, he holds fire.

Gunfire brings the **police**. A few seconds after the first shot, a Swedish patrol car pulls up behind you with sirens and blue lights, and two officers in hi-vis vests give chase. Keep shooting and a second patrol joins them. Off the road they arrive on foot. Officers don't hurt you; they try to arrest you, and a **!** means one is reaching for you. If they catch you, you're **busted**: the gun is confiscated and you're fined 500 points. You can shove officers away or knock them over with a hook or kick, but they get back up, and hitting them keeps them after you. They give up about 20 seconds after your last offence, and you lose them if you turn off at a junction.

The courier and D.D are pixel-art impressions from photos the user supplied; the patrol car follows the blue-and-yellow Swedish police livery on a Volvo estate.

## How the street is built

`src/side/routes.ts` defines the two junctions and four route combinations. `src/side/stage.ts` unrolls each route into one long street, 12 pixels to the metre. Buildings within about 40 m of the route appear in their real order and at their real width, either across the pavement or in a hazier back row. On Johan Banérs gata, the backdrop uses the **left-hand side when travelling towards Ringstorpsvägen**. On Långåkersgatan, it uses the **even-numbered side containing Marcus A**, to the courier's right towards Almgatan. Side-street buildings and garden outbuildings stay in the back row. The terrace at Home is laid out along its row with the real stagger between units. Side streets open where the map's roads leave the route. Taking a turn changes the street ahead with a brief fade while retaining the run's progress.

## Building references

The three supplied Google Street View screenshots guide the landmark elevations:

- **Home, Ringstorpsvägen 55B:** a two-storey terrace with yellow brick upstairs, white horizontal cladding below, white window frames, a low tiled roof and chimney. The adjacent terrace units use the same palette and roof profile.
- **Marcus A, Långåkersgatan 4:** pale yellow brick, a grey basement, dark shutters and a tall chimney. The newer boxed aerial reference sets the side-scroller's street elevation: the broad, weathered reddish-brown roof slope, two wide window groups and an approach beside the house.
- **Pålsjö kiosk:** pale walls, a broad closed service shutter, blue fascia, red lettering, side glazing and a low dark gable roof with pale overhanging edges. Its approach is paved.

`src/buildings.ts` stores these landmark profiles separately from the renderers, and `src/side/backdrop.ts` draws them as front elevations.

The two additional oblique views of **Johan Banérs gata** supply individual elevations in `src/side/facade-references.ts`:

- **First image, 37–47 (odd numbers):** individual brick and plaster colours, hipped and gabled roofs, the balcony at 39, the dormer and bay window at 41, white corner detailing at 43, the pale facade at 45, and the yellow facade and bay at 47.
- **Second image, 53–63 (odd numbers):** white villas with broken-slope roofs, solar panels at 53, the hipped roofs of 57 and 59, the glazed extension at 59, and the paired dormers at 61. The partly visible orange house at 63 has a more approximate profile and can appear further back, up to 65 m away.

Window layouts, visible entrances, garden boundaries and driveways are set per house. These elevations apply when viewed from Johan Banérs gata; the Marcus detour does not reuse them for unseen sides. Number 49 and the other unpictured buildings still use generic profiles. Address matching was cross-checked against the map and the photographs in [Helsingborg's 2022 building survey](https://media.helsingborg.se/uploads/networks/1/2022/07/bevarandeprogram-ringstorp-hagaplan-antagandehandling-layout.pdf), particularly pages 59–62 and 71–73.

The additional **Långåkersgatan** photo identifies Marcus A in the red box and supplies five street elevations, matched to the existing footprints: **2, 4, 6, 8, then the corner house at Almgatan 3** in the courier's travel order (right to left in the photograph). They include the white dark-roofed gable, Marcus A's eaves-facing villa, the brick house with a small dormer, the white house with a grey roof and rooflight, and the long brick corner house. These profiles live in `src/side/facade-references.ts` and appear on both Marcus route variants. The checkpoint marker follows the side approach; no central street-facing door is added to Marcus A's two-window frontage. The far side of Långåkersgatan is omitted from this backdrop.

These are original interpretations of the supplied images, drawn in code, not surveyed replicas. Heights, obscured details and unpictured elevations remain approximations. Live Google Street View could not be viewed in this session; no Google imagery is bundled with the game.

The supplied aerial view and entrance photograph of **Kurir Livs** guide the shopping block: gold vertical panels, a flat roof with vents, a continuous band of upper windows, green fascia, glass shopfronts and a paved forecourt. The ICA entrance is near the left end, at the marked position, with a red-and-white sign, a pale shutter and flower racks. The long frontage continues past Direkten and Ringstorp Pizzeria. The detour uses the existing map's paths and building footprint (OSM way 95562951); its elevation and entrance placement are interpreted from the photographs. [ICA's shop page](https://www.ica.se/butiker/nara/helsingborg/ica-nara-kurir-livs-1004435/) confirms the address as Kurirgatan 1.

## The isometric edition

The original isometric version, with its rotating camera, is still in the repository but no longer loaded. Its entry point is `src/main.ts`, with `src/game.ts`, `src/render.ts`, `src/camera.ts` and `src/world.ts`. The side-scroller reuses its map data, mission points, crews, building profiles and scoring. To play it again, point the script tag in `index.html` at `/src/main.ts`. Its browser tests are in `tests/legacy/iso-browser.spec.ts`. The unit tests for its world and camera still run with `npm test`.

## Map data

`src/map-data.json` is generated from OpenStreetMap by `scripts/build-map.mjs`, and is © OpenStreetMap contributors under the ODbL 1.0. The script uses 2 m world units and rotates the map for the isometric camera. To refresh the data:

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
