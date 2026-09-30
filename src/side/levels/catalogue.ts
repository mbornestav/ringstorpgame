import type { BuildingAppearance } from '../../buildings';
import type { BuildingStyle } from '../../world';
import type { CityLandmark, Facade } from '../stage';

// Building kinds a level can use, each backed by art that already exists. Plain kinds are drawn by the general facade
// painter from their look; the landmark kinds bring their own hand-drawn art (and, for the shop, the health stop).

export interface BuildingSpec {
  landmark?: CityLandmark;
  style: BuildingStyle;
  look: BuildingAppearance;
  role?: Facade['role'];
  /** Metres from the street to the wall; nearer buildings are drawn over farther ones. */
  dist: number;
  /** One line for the Level Book's catalogue. */
  about: string;
}

const look = (wall: string, roof: string, material: BuildingAppearance['material'], roofShape: BuildingAppearance['roofShape'], floors: number, model: BuildingAppearance['model'] = 'generic'): BuildingAppearance =>
  ({ wall, roof, material, roofShape, eaves: roofShape === 'flat' ? 20 : 22, rise: roofShape === 'flat' ? 0 : 12, floors, model });

export const BUILDINGS = {
  'karlstad-busstop': { style: 'block', landmark: 'busstop', look: look('#bbcabd', '#415a60', 'plaster', 'flat', 1), dist: 6, about: 'Bus shelter and the departure point for the ride to Liljedal.' },
  'karlstad-townhall': { style: 'block', landmark: 'townhall', look: look('#e6c774', '#555e60', 'plaster', 'hipped', 3), dist: 8, about: 'Yellow civic facade with a central clock and the peace monument.' },
  'karlstad-bridge': { style: 'block', landmark: 'stonebridge', look: look('#979187', '#68685f', 'plaster', 'flat', 1), dist: 20, about: 'Twelve stone arches of Östra bron across the Klarälven.' },
  'karlstad-sandgrund': { style: 'block', landmark: 'sandgrund', look: look('#f0ede2', '#747d7b', 'plaster', 'flat', 1), dist: 7, about: 'White modernist gallery with orange Sandgrund lettering.' },
  'karlstad-cathedral': { style: 'church', landmark: 'cathedral', look: look('#ebe4c8', '#536960', 'plaster', 'gabled', 3), dist: 14, about: 'Pale cathedral tower, clock and dark copper spire.' },
  'karlstad-cityhouse': { style: 'block', landmark: 'cityhouse', look: look('#d6b58b', '#5a6160', 'plaster', 'hipped', 3), dist: 6, about: 'Pastel city facade with cornices, tall windows and shopfronts.' },
  'karlstad-coffee': { style: 'block', landmark: 'coffee', look: look('#8d4b3f', '#6c6262', 'brick', 'flat', 4), dist: 12, about: 'Brick coffee warehouse with a purple roasting-house sign.' },
  'karlstad-cafe': { style: 'block', landmark: 'cafe', look: look('#e9d4a6', '#5b6760', 'plaster', 'gabled', 1), dist: 4, about: 'Small cafe with a striped awning and outdoor seating.' },
  'karlstad-park': { style: 'block', landmark: 'park', look: look('#a54336', '#5c5949', 'wood', 'gabled', 1), dist: 6, about: 'Red timber park pavilion and Mariebergsskogen entrance.' },
  // Plain buildings.
  'house': { style: 'house', look: look('#e0d8c7', '#a25f43', 'plaster', 'gabled', 2), dist: 8, about: 'Rendered two-storey house with a tiled gable roof.' },
  'red-cottage': { style: 'house', look: look('#a3372f', '#3e3a38', 'wood', 'gabled', 1), dist: 8, about: 'Falu-red wooden cottage.' },
  'yellow-house': { style: 'house', look: look('#e2c77a', '#6f4a3a', 'wood', 'gabled', 2), dist: 8, about: 'Yellow wooden house, two floors.' },
  'brick-villa': { style: 'house', look: look('#c2a36a', '#56534c', 'brick', 'gabled', 1), dist: 9, about: 'Low yellow-brick villa.' },
  'apartments': { style: 'apartment', look: look('#d2b981', '#696968', 'brick', 'flat', 3), dist: 10, about: 'Three-storey brick apartment building, flat roof.' },
  'church': { style: 'church', look: look('#ecebe2', '#5f6a6a', 'plaster', 'gabled', 2), dist: 12, about: 'White church.' },
  'kiosk': { style: 'kiosk', look: look('#e1e0d3', '#3e4847', 'wood', 'gabled', 1, 'kiosk'), dist: 4, about: 'A small street kiosk, like Pålsjö kiosk.' },
  // Landmarks with their own art.
  'brick-block': { style: 'apartment', role: 'block', look: look('#a04c3b', '#4b3c37', 'brick', 'hipped', 4), dist: 14, about: 'Four-storey red-brick block, as on Kurirgatan.' },
  'brick-tower': { style: 'apartment', role: 'gods', look: look('#a64f3b', '#5f5a58', 'brick', 'flat', 7), dist: 14, about: 'Seven-storey brick tower with three entrances (Kurirgatan 28).' },
  'garages': { style: 'garage', role: 'garages', look: look('#d6d1c4', '#5b6062', 'brick', 'flat', 1), dist: 12, about: 'A row of garage doors.' },
  'shed': { style: 'garage', role: 'shed', look: look('#a3372f', '#d9d5c8', 'brick', 'flat', 1), dist: 12, about: 'Red timber shed.' },
  'school': { style: 'block', role: 'school', look: look('#c9a45c', '#54463f', 'brick', 'hipped', 1), dist: 10, about: 'Long, low brick school.' },
  'shop': { style: 'block', role: 'kurir', look: { ...look('#bfa16b', '#575f65', 'plaster', 'flat', 2), eaves: 30 }, dist: 2, about: 'The Kurir Livs / ICA shopping block. Its entrance refills your health once (press E).' },
  'petrol-station': { style: 'block', role: 'statoil', look: look('#b4b7ae', '#5b6062', 'brick', 'flat', 1), dist: 14, about: 'Statoil station: canopy, pumps and the shop.' },
  'car-dealer': { style: 'block', role: 'bildeve', look: look('#b4b7ae', '#5b6062', 'brick', 'flat', 1), dist: 14, about: 'The Bildeve Volvo dealership.' },
  'warehouse': { style: 'block', role: 'warehouse', look: look('#b4b7ae', '#5b6062', 'brick', 'flat', 1), dist: 14, about: 'Industrial warehouse.' },
  'containers': { style: 'block', role: 'containers', look: look('#b4b7ae', '#5b6062', 'brick', 'flat', 1), dist: 12, about: 'Stacked shipping containers.' },
  'yard-gate': { style: 'block', role: 'yardgate', look: look('#b4b7ae', '#5b6062', 'brick', 'flat', 1), dist: 14, about: 'The gate of a truck yard.' },
} satisfies Record<string, BuildingSpec>;

export type BuildingKind = keyof typeof BUILDINGS;
export const BUILDING_KINDS = Object.keys(BUILDINGS) as BuildingKind[];
