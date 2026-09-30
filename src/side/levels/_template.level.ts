import type { LevelDefinition } from './types';

// TEMPLATE: copy this file to `<your-id>.level.ts` in this folder, change the id and fill it in. Files whose name starts
// with an underscore are not loaded, so this one never shows up in the game. The full guide is docs/level-book.md.
//
// Positions are pixels from the left end of the street: 12 pixels is one metre, one screen is 480 pixels wide.
// Lanes (how far across the street someone stands) are 'far', 'middle', 'near', or a number from 182 to 242.

const level: LevelDefinition = {
  id: 'my-street',                       // lowercase letters, digits, dashes; play it with ?level=my-street
  mode: 'brawl',                         // Level 1's rules: fetch the parcel, beat the crews, get home
  title: { sv: 'Min gata', en: 'My Street' },
  subtitle: { sv: 'En ny bana', en: 'A new level' },
  menu: false,                           // true lists it on the title screen, after the built-in levels
  order: 10,                             // position among listed levels (lower first)
  night: false,                          // true: dark sky, lamps light up
  intro: { sv: 'Hämta paketet vid kiosken', en: 'Pick up the parcel at the kiosk' },
  objectives: {
    parcel: { sv: 'Hämta paketet · kiosken', en: 'Pick up the parcel · the kiosk' },
    crew: { sv: 'Slå dig förbi gänget', en: 'Fight your way past the crew' },     // optional
    shop: { sv: 'Fyll på hälsan i affären', en: 'Top up your health at the shop' }, // optional, only with a shop
    home: { sv: 'Gå hem', en: 'Go home' },
  },
  street: {
    length: 3600,                        // at least 960 (two screens)
    start: { x: 160 },                   // at least one screen before the end
    parcel: { x: 640 },                  // ahead of the start
    home: 3200,                          // home's door; the terrace spans about 260 px each side of it
    homeCrew: ['runner', 'bruiser'],     // waits at home; beating it ends the run
    crews: [                             // optional; each holds the screen until beaten
      { x: 1400, members: [{ kind: 'runner' }, { kind: 'runner', lane: 'near' }] },
    ],
    names: [{ from: 0, to: 3600, value: 'Min gata' }],               // must cover the whole street, left to right
    surfaces: [{ from: 0, to: 3600, value: 'road' }],                 // road | major | path | paved | yard
    fronts: [{ from: 40, to: 900, value: 'hedge' }],                  // hedge | picket | plank | wall | rendered-wall | open | forecourt | chainlink
    buildings: [                                                       // kinds: see src/side/levels/catalogue.ts
      { kind: 'house', from: 40, to: 300 },
      { kind: 'kiosk', from: 560, to: 720 },
      { kind: 'brick-block', from: 900, to: 1450 },
      { kind: 'yellow-house', from: 1600, to: 1880, wall: '#e8d27a' },
    ],
    scatter: [{ from: 60, to: 2800, avoid: [[540, 740]] }],           // trees and bushes, spread out
    props: [                                                           // lamp | sign | busstop | bench | bin | postbox | crossing | shelter | floodlight
      { kind: 'sign', x: 120, label: 'MIN GATA' },
      { kind: 'bin', x: 1300 },
    ],
    lampsEvery: 430,                                                   // lamp posts along both pavements
  },
};

export default level;
