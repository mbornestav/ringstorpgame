import type { LevelDefinition } from './types';

// A short practice street that shows most of what a level file can do. It is not on the title screen (`menu` is off):
// play it with `?level=sample`. Copy _template.level.ts to start a level of your own.

const level: LevelDefinition = {
  id: 'sample',
  mode: 'brawl',
  title: { sv: 'Övningsgatan', en: 'Practice Street' },
  subtitle: { sv: 'En kort bana att öva på', en: 'A short street to practise on' },
  menu: false,
  intro: { sv: 'Hämta paketet vid kiosken', en: 'Pick up the parcel at the kiosk' },
  objectives: {
    parcel: { sv: 'Hämta paketet · kiosken', en: 'Pick up the parcel · the kiosk' },
    crew: { sv: 'Gänget spärrar gatan · slå dig förbi', en: 'A crew blocks the street · fight your way past' },
    shop: { sv: 'Fyll på hälsan · affären på Testvägen', en: 'Top up your health · the shop on Testvägen' },
    home: { sv: 'Gå hem · Övningsgatan 55B', en: 'Go home · Övningsgatan 55B' },
  },
  street: {
    length: 4400,
    start: { x: 160 },
    parcel: { x: 700 },
    home: 3980,
    homeCrew: ['runner', 'bruiser'],
    crews: [
      { x: 1450, members: [{ kind: 'runner' }, { kind: 'runner', lane: 'near' }] },
      { x: 3000, members: [{ kind: 'bruiser', lane: 'middle' }, { kind: 'runner', dx: 40, lane: 'far' }] },
    ],
    names: [{ from: 0, to: 1900, value: 'Övningsgatan' }, { from: 1900, to: 4400, value: 'Testvägen' }],
    surfaces: [{ from: 0, to: 1880, value: 'road' }, { from: 1880, to: 2820, value: 'paved' }, { from: 2820, to: 4400, value: 'road' }],
    fronts: [
      { from: 40, to: 520, value: 'picket' },
      { from: 900, to: 1760, value: 'hedge' },
      { from: 1880, to: 2820, value: 'forecourt' },
      { from: 2900, to: 3500, value: 'hedge' },
    ],
    buildings: [
      { kind: 'house', from: 40, to: 300 },
      { kind: 'red-cottage', from: 320, to: 520 },
      { kind: 'kiosk', from: 620, to: 780 },
      { kind: 'brick-block', from: 900, to: 1450 },
      { kind: 'garages', from: 1480, to: 1760, row: 0 },
      { kind: 'shop', from: 1900, to: 2788 },
      { kind: 'yellow-house', from: 2900, to: 3160 },
      { kind: 'brick-villa', from: 3190, to: 3480 },
      { kind: 'church', from: 1200, to: 1700, row: 1 },
    ],
    scatter: [{ from: 60, to: 1850, avoid: [[600, 800]] }, { from: 2850, to: 3600 }],
    props: [
      { kind: 'sign', x: 120, label: 'ÖVNINGSGATAN' },
      { kind: 'busstop', x: 860, label: 'Övningsgatan' },
      { kind: 'bin', x: 1300 }, { kind: 'bench', x: 2860 }, { kind: 'postbox', x: 3560 },
      { kind: 'sign', x: 4050, label: 'HEM 55B', variant: 2 },
    ],
    lampsEvery: 430,
  },
};

export default level;
