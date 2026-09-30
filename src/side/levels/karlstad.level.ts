import type { BuildingDef, CrewDef, LevelDefinition, PropDef } from './types';

// A deliberately extended arcade route, inspired by Karlstad photos, not a surveyed map.
// Reference links and the cabin reference are documented in docs/karlstad.md.
const buildings: BuildingDef[] = [
  { kind: 'karlstad-townhall', from: 40, to: 640 },
  { kind: 'karlstad-cathedral', from: 1740, to: 2100, row: 1 },
  { kind: 'karlstad-cafe', from: 5350, to: 5770, door: 5600 },
  { kind: 'karlstad-bridge', from: 8140, to: 10400 },
  { kind: 'karlstad-cafe', from: 12600, to: 13000, door: 12800 },
  { kind: 'karlstad-sandgrund', from: 15700, to: 16440 },
  { kind: 'karlstad-cafe', from: 17900, to: 18300, door: 18100 },
  { kind: 'karlstad-coffee', from: 24900, to: 25680 },
  { kind: 'karlstad-cafe', from: 27700, to: 28120, door: 27900 },
  { kind: 'karlstad-park', from: 31700, to: 32200 },
  { kind: 'karlstad-cafe', from: 36500, to: 36900, door: 36700 },
];

const palette = ['#e5c784', '#d9aaa1', '#c6d0be', '#d8cbb6', '#ba745a', '#ecd8aa'];
for (const [from, to] of [[720, 7900], [10900, 14400], [14600, 15500], [16800, 18600], [23800, 29500], [34500, 40400]]) {
  let n = 0;
  for (let x = from; x + 300 < to; x += 390 + n % 3 * 55, n++) {
    const end = x + 280 + n % 3 * 34;
    if (buildings.some(b => !b.row && b.from - 70 < end && b.to + 70 > x)) continue;
    buildings.push({ kind: 'karlstad-cityhouse', from: x, to: end, wall: palette[n % palette.length], floors: 2 + n % 2 });
  }
}
for (let x = 29900; x < 33700; x += 740) {
  if (x < 32300 && x + 230 > 31600) continue;
  buildings.push({ kind: 'red-cottage', from: x, to: x + 230, row: 1 });
}

const fightLocations = [1400, 3300, 4850, 7100, 9450, 11500, 14100, 17000, 20300, 22400, 24300, 26400, 28900, 30700, 33500, 35400, 38200, 40100];
const crews: CrewDef[] = fightLocations.map((x, i) => ({
  x,
  members: [
    { kind: i > 3 && i % 3 !== 0 ? 'bruiser' : 'runner', lane: 'middle' },
    { kind: 'runner', dx: 60, lane: 'far' },
    ...(i > 7 && i % 2 === 0 ? [{ kind: 'runner' as const, dx: 104, lane: 'near' as const }] : []),
  ],
  backup: i > 2 && i % 3 === 1 ? ['runner'] : [],
}));

const props: PropDef[] = [
  { kind: 'sign', x: 250, label: 'STORA TORGET' },
  { kind: 'sign', x: 7900, label: 'ÖSTRA BRON', variant: 3 },
  { kind: 'sign', x: 14700, label: 'SANDGRUND', variant: 3 },
  { kind: 'sign', x: 19400, label: 'KLARÄLVEN', variant: 3 },
  { kind: 'sign', x: 23700, label: 'INRE HAMN', variant: 3 },
  { kind: 'sign', x: 29700, label: 'STADSTRÄDGÅRDEN', variant: 3 },
  { kind: 'sign', x: 38900, label: 'BUSSTATIONEN', variant: 2 },
  { kind: 'busstop', x: 41580, label: 'Liljedal' },
];
for (let x = 850; x < 41200; x += 1160) {
  props.push({ kind: 'bench', x }, { kind: 'bin', x: x + 55 });
  if (x % 3 === 1) props.push({ kind: 'busstop', x: x + 180, label: 'Karlstad' });
}

const level: LevelDefinition = {
  id: 'karlstad', mode: 'brawl', menu: true, order: 4,
  title: { sv: 'Nivå 4 · Karlstadrundan', en: 'Level 4 · Karlstad Run' },
  subtitle: { sv: 'Långtur · 19 gäng · bussen till Liljedal', en: 'Long route · 19 crews · bus to Liljedal' },
  intro: { sv: 'Karlstad! Hämta paketet på Stora torget. Bussen hem till Liljedal väntar.', en: 'Karlstad! Pick up the parcel at Stora torget. Your bus home to Liljedal is waiting.' },
  completion: { sv: 'Framme vid stugan i Liljedal! Paketet är med och den långa Karlstadrundan är avklarad.', en: 'Home at the cabin in Liljedal! The parcel is safe and the long Karlstad run is complete.' },
  credit: { sv: 'KARLSTAD · BILDINSPIRERAD ARKADBANA', en: 'KARLSTAD · PHOTO-INSPIRED ARCADE ROUTE' },
  busHome: 'liljedal',
  objectives: {
    parcel: { sv: 'Hämta paketet · Stora torget', en: 'Pick up the parcel · Stora torget' },
    crew: { sv: 'Slå dig förbi gänget · bussen väntar', en: 'Fight past the crew · your bus is waiting' },
    home: { sv: 'Ta paketet till bussen · hem till Liljedal', en: 'Take the parcel to the bus · home to Liljedal' },
  },
  street: {
    length: 42000, start: { x: 140 }, parcel: { x: 340, lane: 'far' }, home: 41580,
    finish: { kind: 'karlstad-busstop', from: 41300, to: 41920, door: 41580 },
    homeCrew: ['bruiser', 'runner', 'boss'], crews,
    restStops: [
      { x: 5600, name: { sv: 'Fikapaus på Kungsgatan', en: 'Kungsgatan coffee break' } },
      { x: 12800, name: { sv: 'Fikapaus i Haga', en: 'Haga coffee break' } },
      { x: 18100, name: { sv: 'Fikapaus vid Sandgrund', en: 'Sandgrund coffee break' } },
      { x: 27900, name: { sv: 'Fikapaus i Inre hamn', en: 'Inner harbour coffee break' } },
      { x: 36700, name: { sv: 'Sista fikapausen', en: 'One last coffee break' } },
    ],
    names: [
      { from: 0, to: 4200, value: 'Stora torget' }, { from: 4200, to: 7900, value: 'Kungsgatan' },
      { from: 7900, to: 10600, value: 'Östra bron' }, { from: 10600, to: 14400, value: 'Haga' },
      { from: 14400, to: 18800, value: 'Sandgrund' }, { from: 18800, to: 23600, value: 'Klarälvsstranden' },
      { from: 23600, to: 29500, value: 'Inre hamn' }, { from: 29500, to: 34300, value: 'Stadsträdgården' },
      { from: 34300, to: 38700, value: 'Karlstads gator' }, { from: 38700, to: 42000, value: 'Busstationen' },
    ],
    surfaces: [
      { from: 0, to: 4200, value: 'paved' }, { from: 4200, to: 7900, value: 'road' },
      { from: 7900, to: 10600, value: 'paved' }, { from: 10600, to: 14400, value: 'road' },
      { from: 14400, to: 23600, value: 'path' }, { from: 23600, to: 29500, value: 'paved' },
      { from: 29500, to: 34300, value: 'path' }, { from: 34300, to: 42000, value: 'road' },
    ],
    waters: [{ from: 7900, to: 10600, value: 'river' }, { from: 18800, to: 23600, value: 'river' }, { from: 23600, to: 29500, value: 'harbour' }],
    fronts: [{ from: 10600, to: 12500, value: 'open' }, { from: 29500, to: 31300, value: 'picket' }, { from: 32700, to: 34300, value: 'hedge' }],
    buildings, props, lampsEvery: 540,
    scatter: [
      { from: 14500, to: 18800, seed: 12, gap: [180, 330], avoid: [[15580, 16550], [17780, 18400]] },
      { from: 19100, to: 23400, seed: 24, gap: [260, 420], bushes: 0.12 },
      { from: 29600, to: 34400, seed: 32, gap: [90, 175], avoid: [[31580, 32330]] },
    ],
  },
};

export default level;
