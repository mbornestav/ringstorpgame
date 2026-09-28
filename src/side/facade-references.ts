/** Street-facing elevations interpreted from the user-supplied street views.
 * Positions are fractions of the main facade; heights are artistic estimates in metres.
 * Keep each house explicit: new photographs can refine it without changing its neighbours.
 */
export interface FacadeOpening {
  x: number;
  bottom: number;
  w: number;
  h: number;
  panes?: number;
  cross?: boolean;
  bay?: boolean;
  shutters?: string;
  balcony?: 'iron' | 'white' | 'timber';
}

export interface FacadeReference {
  source: 'user-johan-1' | 'user-johan-2' | 'user-langakers';
  /** Only this street-facing elevation is pictured; other sides remain generic. */
  street: 'Johan Banérs gata' | 'Långåkersgatan';
  silhouette: 'gable' | 'eaves' | 'hip' | 'mansard-gable' | 'mansard-eaves';
  material: 'brick' | 'plaster';
  wall: string;
  roof: string;
  trim: string;
  plinth: string;
  wallHeight: number;
  roofHeight: number;
  basement: number;
  windows: FacadeOpening[];
  door?: { x: number; color: string; canopy?: boolean };
  dormers?: Array<{ x: number; w: number; h: number; color: string; arched?: boolean }>;
  chimney?: { x: number; color: string };
  skylights?: Array<{ x: number; w: number; h: number }>;
  quoins?: boolean;
  cornice?: boolean;
  /** A glimpse of the left roof pitch, as in the oblique reference views. */
  roofSide?: 'tiles' | 'solar' | 'dark-dormer';
  roofSideFraction?: number;
  wing?: { side: 'left' | 'right'; fraction: number; color: string; glazed?: boolean };
  front: 'hedge' | 'picket' | 'plank' | 'rendered-wall' | 'open';
  gate: number;
  drive?: 'left' | 'right';
}

const redTile = '#b65f42';
const white = '#eeece0';
const brick = '#a96b53';
const common = {
  street: 'Johan Banérs gata', roof: redTile, trim: white, plinth: '#8b8c87', basement: 0.65,
  wallHeight: 3, roofHeight: 4.1, front: 'hedge', gate: 0.5,
} as const;
const langakers = {
  street: 'Långåkersgatan', source: 'user-langakers', trim: '#e4e4da', plinth: '#80858a',
  basement: 0.65, wallHeight: 3, roofHeight: 4, front: 'open', gate: 0.5,
} as const;

export const FACADE_REFERENCES: Readonly<Record<string, FacadeReference>> = {
  'Johan Banérs gata 37': {
    ...common, source: 'user-johan-1', silhouette: 'hip', material: 'brick', wall: '#ae725b',
    roofHeight: 2.8, basement: 0.85, gate: 0.82, drive: 'right',
    windows: [{ x: 0.18, bottom: 0.9, w: 1.4, h: 1.4 }, { x: 0.47, bottom: 0.9, w: 2.1, h: 1.4, panes: 3 }, { x: 0.78, bottom: 0.9, w: 1.4, h: 1.4 }],
    dormers: [{ x: 0.5, w: 1.7, h: 0.8, color: '#bbb7ad', arched: true }],
    chimney: { x: 0.64, color: '#8a675b' },
  },
  'Johan Banérs gata 39': {
    ...common, source: 'user-johan-1', silhouette: 'gable', material: 'brick', wall: '#977164',
    basement: 0.9, roofSide: 'tiles', drive: 'right', gate: 0.9,
    windows: [{ x: 0.24, bottom: 0.85, w: 1.3, h: 1.35 }, { x: 0.76, bottom: 0.85, w: 1.3, h: 1.35 }, { x: 0.5, bottom: 3.35, w: 2, h: 1.7, panes: 3, balcony: 'iron' }],
    chimney: { x: 0.41, color: '#886155' }, front: 'hedge',
  },
  'Johan Banérs gata 41': {
    ...common, source: 'user-johan-1', silhouette: 'eaves', material: 'brick', wall: '#a35f47',
    roofHeight: 4.2, front: 'picket', gate: 0.62, drive: 'left',
    wing: { side: 'left', fraction: 0.27, color: '#c1b3a2' },
    windows: [{ x: 0.16, bottom: 0.9, w: 1.35, h: 1.35 }, { x: 0.5, bottom: 0.6, w: 2.4, h: 1.8, panes: 3, cross: true, bay: true }, { x: 0.85, bottom: 0.9, w: 1.35, h: 1.35 }],
    dormers: [{ x: 0.5, w: 2.1, h: 1.35, color: '#78564b' }],
    chimney: { x: 0.23, color: '#77685d' },
  },
  'Johan Banérs gata 43': {
    ...common, source: 'user-johan-1', silhouette: 'gable', material: 'brick', wall: '#b57c65',
    roofHeight: 4.5, roofSide: 'tiles', quoins: true, front: 'plank', gate: 0.73,
    windows: [{ x: 0.25, bottom: 0.85, w: 1.4, h: 1.45, cross: true }, { x: 0.5, bottom: 3.6, w: 1.5, h: 1.6, cross: true }],
    door: { x: 0.72, color: '#775143', canopy: true }, chimney: { x: 0.38, color: '#974f3c' },
  },
  'Johan Banérs gata 45': {
    ...common, source: 'user-johan-1', silhouette: 'gable', material: 'plaster', wall: '#e1e4d9',
    roofSide: 'dark-dormer', quoins: true, cornice: true, front: 'rendered-wall', gate: 0.14, drive: 'left',
    windows: [{ x: 0.23, bottom: 0.8, w: 1.25, h: 1.5 }, { x: 0.77, bottom: 0.8, w: 1.25, h: 1.5 }, { x: 0.5, bottom: 3.2, w: 1.5, h: 1.9, balcony: 'iron' }],
    chimney: { x: 0.43, color: '#8a8880' },
  },
  'Johan Banérs gata 47': {
    ...common, source: 'user-johan-1', silhouette: 'gable', material: 'plaster', wall: '#e6d9aa',
    roofSide: 'tiles', quoins: true, cornice: true, front: 'rendered-wall', gate: 0.85,
    windows: [{ x: 0.5, bottom: 0.65, w: 2.7, h: 1.9, panes: 3, cross: true, bay: true }, { x: 0.5, bottom: 3.4, w: 1.65, h: 1.8, balcony: 'timber' }],
    chimney: { x: 0.39, color: '#6d6c65' },
  },
  'Johan Banérs gata 53': {
    ...common, source: 'user-johan-2', silhouette: 'mansard-gable', material: 'plaster', wall: '#e4e5dc',
    wallHeight: 3.6, roofHeight: 4.7, roofSide: 'solar', cornice: true, front: 'rendered-wall', gate: 0.77, drive: 'right',
    windows: [{ x: 0.26, bottom: 0.8, w: 1.25, h: 1.5 }, { x: 0.73, bottom: 0.8, w: 1.25, h: 1.5 }, { x: 0.26, bottom: 3.95, w: 1.2, h: 1.5 }, { x: 0.73, bottom: 3.95, w: 1.2, h: 1.5 }, { x: 0.5, bottom: 6.5, w: 0.7, h: 0.65 }],
    chimney: { x: 0.44, color: '#b3b1a5' },
  },
  'Johan Banérs gata 55': {
    ...common, source: 'user-johan-2', silhouette: 'mansard-gable', material: 'plaster', wall: '#e9e7dc',
    wallHeight: 3.6, roofHeight: 4.7, roofSide: 'tiles', cornice: true, front: 'open', gate: 0.8, drive: 'right',
    windows: [{ x: 0.24, bottom: 0.9, w: 1.2, h: 1.55 }, { x: 0.74, bottom: 0.9, w: 1.2, h: 1.55 }, { x: 0.24, bottom: 4, w: 1.2, h: 1.55 }, { x: 0.74, bottom: 4, w: 1.2, h: 1.55 }, { x: 0.5, bottom: 6.6, w: 0.75, h: 0.7 }],
    chimney: { x: 0.38, color: '#a5a398' },
  },
  'Johan Banérs gata 57': {
    ...common, source: 'user-johan-2', silhouette: 'hip', material: 'brick', wall: '#93715b',
    roofHeight: 2.9, gate: 0.51, drive: 'left',
    windows: [{ x: 0.16, bottom: 0.85, w: 2, h: 1.45, panes: 3 }, { x: 0.84, bottom: 0.85, w: 2, h: 1.45, panes: 3 }, { x: 0.39, bottom: 1.1, w: 0.55, h: 1.05 }, { x: 0.64, bottom: 1.1, w: 0.55, h: 1.05 }],
    door: { x: 0.51, color: '#3f4946', canopy: true },
    dormers: [{ x: 0.52, w: 2.4, h: 1.1, color: '#d6c7b4' }], chimney: { x: 0.4, color: '#985441' },
  },
  'Johan Banérs gata 59': {
    ...common, source: 'user-johan-2', silhouette: 'hip', material: 'plaster', wall: '#e5e5db',
    roof: '#a9544a', roofHeight: 3.2, gate: 0.76,
    wing: { side: 'left', fraction: 0.3, color: '#e6e5d8', glazed: true },
    windows: [{ x: 0.23, bottom: 0.8, w: 1.6, h: 1.55 }, { x: 0.74, bottom: 0.8, w: 1.6, h: 1.55 }],
    dormers: [{ x: 0.5, w: 1.55, h: 0.8, color: white, arched: true }], chimney: { x: 0.7, color: '#a16252' },
  },
  'Johan Banérs gata 61': {
    ...common, source: 'user-johan-2', silhouette: 'mansard-eaves', material: 'brick', wall: '#95705d',
    roofHeight: 4.5, front: 'picket', gate: 0.5,
    windows: [{ x: 0.23, bottom: 0.85, w: 1.55, h: 1.6 }, { x: 0.77, bottom: 0.85, w: 1.55, h: 1.6 }],
    door: { x: 0.5, color: '#deded2', canopy: true },
    dormers: [{ x: 0.26, w: 1.4, h: 1.5, color: brick }, { x: 0.74, w: 1.4, h: 1.5, color: brick }],
    chimney: { x: 0.55, color: '#96634e' },
  },
  'Johan Banérs gata 63': {
    // Only part of this small orange house is visible at the right edge of image 2.
    ...common, source: 'user-johan-2', silhouette: 'gable', material: 'plaster', wall: '#c8885d',
    roof: '#505762', wallHeight: 2.7, roofHeight: 2.3, basement: 0.25, roofSide: 'tiles', gate: 0.8,
    windows: [{ x: 0.29, bottom: 0.9, w: 1.3, h: 1.25 }],
  },
  // The camera sees the even-numbered side of Långåkersgatan. The courier reaches
  // these houses from Romares väg: 2, 4, 6, 8, then the corner house at Almgatan 3.
  // The supplied photo looks in the opposite direction along that row; site features
  // such as driveways are placed in the courier's order. Rear elevations are unpictured.
  'Långåkersgatan 2': {
    ...langakers, silhouette: 'gable', material: 'plaster', wall: '#e2e3dc', roof: '#424b53',
    wallHeight: 3.5, roofHeight: 4.6, basement: 0.35, gate: 0.67, drive: 'right',
    roofSide: 'tiles', roofSideFraction: 0.28,
    windows: [{ x: 0.24, bottom: 0.9, w: 1.2, h: 1.25 }, { x: 0.5, bottom: 4.0, w: 1.0, h: 1.0 }],
    door: { x: 0.67, color: '#333e47', canopy: true },
    chimney: { x: 0.28, color: '#aeb2ae' },
  },
  'Långåkersgatan 4': {
    // Marcus A: the house inside the red box. The broad roof pitch faces the street;
    // the entrance is off to the side, rather than between the two window groups.
    ...langakers, silhouette: 'eaves', material: 'brick', wall: '#c6b58e', roof: '#75544c',
    roofHeight: 4.3, basement: 0.8, trim: '#c9ccbf', gate: 0.9, drive: 'right',
    windows: [
      { x: 0.23, bottom: 0.95, w: 2.1, h: 1.3, panes: 3, shutters: '#383f41' },
      { x: 0.76, bottom: 0.95, w: 2.1, h: 1.3, panes: 3, shutters: '#383f41' },
    ],
    chimney: { x: 0.53, color: '#9b766a' },
  },
  'Långåkersgatan 6': {
    ...langakers, silhouette: 'eaves', material: 'brick', wall: '#977363', roof: '#875a4c',
    roofHeight: 4.4, basement: 0.8, front: 'hedge', gate: 0.91, drive: 'right',
    windows: [{ x: 0.25, bottom: 0.85, w: 1.6, h: 1.6, cross: true }, { x: 0.77, bottom: 0.85, w: 1.6, h: 1.6, cross: true }],
    dormers: [{ x: 0.53, w: 1.35, h: 1.15, color: '#9d7160' }],
    chimney: { x: 0.51, color: '#a47767' },
  },
  'Långåkersgatan 8': {
    ...langakers, silhouette: 'eaves', material: 'plaster', wall: '#e3e6e0', roof: '#515c67',
    roofHeight: 4, gate: 0.5, drive: 'left',
    windows: [{ x: 0.2, bottom: 0.85, w: 1.2, h: 1.45 }, { x: 0.8, bottom: 0.85, w: 1.2, h: 1.45 }],
    door: { x: 0.5, color: '#35444a' },
    skylights: [{ x: 0.23, w: 0.65, h: 0.8 }],
    chimney: { x: 0.68, color: '#c9cbc5' },
  },
  'Almgatan 3': {
    // The long brick house at the left edge of the image, facing Långåkersgatan.
    ...langakers, silhouette: 'eaves', material: 'brick', wall: '#987566', roof: '#80574e',
    roofHeight: 3.4, basement: 0.45, gate: 0.27, front: 'rendered-wall',
    windows: [{ x: 0.18, bottom: 0.9, w: 0.8, h: 1.4 }, { x: 0.58, bottom: 0.9, w: 1.2, h: 1.4 }, { x: 0.83, bottom: 0.9, w: 1.2, h: 1.4 }],
    skylights: [{ x: 0.19, w: 1.05, h: 1.1 }],
  },
};
