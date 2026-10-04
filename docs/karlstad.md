# Karlstadrundan → Liljedal

Choose **Nivå 4 · Karlstadrundan** in Ringstorp Run, or open `/?level=karlstad`.

The level uses the first game's courier, parcel, lane-based combat, screen-locking crews, D.D, traffic and police. Its street is 42,000 logical pixels long (3,500 game metres), with 18 street encounters and a final crew at the bus station. This is an extended arcade interpretation of Karlstad, not a surveyed route or a real bus timetable.

Pick up the parcel on Stora torget. Five cafés provide optional fika breaks: approach the far pavement and press **E** after clearing nearby enemies. Each stop restores health once and saves a checkpoint, including when health is already full. A knockout offers continuation from the most recent checkpoint, with the existing score penalty. Cleared crews and the parcel survive continuation.

**Taxi:** in Karlstad the phone works from the start. **Ring taxi · Busstationen** (or T while the phone is open) calls a yellow taxi. It pulls up beside the courier, he gets in with the parcel, and the ride runs along the whole street to the bus station; the crews on the way and the last crew at the stop are skipped. The fare is 100 kr, or whatever is in the wallet if that is less. He gets out beside the yellow bus, ready to board. D.D's line on the phone opens once he has met D.D, as on the first level. Implemented in `SideGame.callTaxi` (`src/side/game.ts`).

At the end, clear the final crew, approach the **yellow bus**, and press **E**. A short countryside journey ends at **Liljedal**, the red cabin in the user's reference photo. The result banner leaves the cabin visible. Pause freezes the journey; replay starts a fresh Karlstad run. English and Swedish text are included.

## Scenery references

Image searches supplied visual reference only. All shipped scenery is drawn in the game's existing canvas art pipeline; there are no copied photographs, hotlinked textures or runtime image requests.

- [Karlstad town square and town hall photo — Reisgraag](https://www.reisgraag.nl/vakantie-zweden/karlstad/): yellow town hall, clock, green ground-floor awnings and peace monument.
- [Karlstad / Sandgrund photo — ViaTioga](https://viatioga.nl/voorpret/bezienswaardigheden/zweden/varmland/karlstad/): long white modernist frontage, glazing, entrance frame and orange signage.
- [Östra bron — Visit Värmland](https://www.visitvarmland.com/karlstad/ostra-bron/): the stone bridge and its twelve arches.
- [Sandgrund Lars Lerin — Karlstad municipality](https://karlstad.se/visit-karlstad/se-och-gora/sandgrund-lars-lerin): local landmark context.
- The Liljedal cabin uses the photograph supplied in this conversation: red vertical cladding, shallow dark roof, chimney, white covered veranda, red railing, white trellis, bench and number 17. The photo itself is not stored in the repository.

The harbour, cafés, pastel city houses, cathedral silhouette and trees are simplified scenery composed around those references.

## Editing

- Route, landmarks, encounters and fika stops: `src/side/levels/karlstad.level.ts`.
- Landmark, water, yellow bus and cabin art: `src/side/karlstad-art.ts`.
- Reusable level-file fields: `street.restStops`, `street.waters`, `street.finish`, `completion`, `credit`. `busHome: 'liljedal'` selects this particular arrival sequence.
- New simulation and UI coverage: `tests/karlstad.test.ts` and `tests/karlstad.spec.ts`. Browser screenshots are written to `test-results/karlstad/` in retro and smooth modes.
