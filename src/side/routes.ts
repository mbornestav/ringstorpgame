import { fromMetres } from '../map';
import { ROUTES as ORIGINAL } from '../world';
import type { Vec2 } from '../geometry';

/** Two independent, in-street decisions. A run can take neither, either, or both detours. */
export type Route = 'direct' | 'marcus' | 'kurir' | 'marcus-kurir';
export type JunctionId = 'romares' | 'kurir';
export const viaMarcus = (route: Route) => route === 'marcus' || route === 'marcus-kurir';
export const viaKurir = (route: Route) => route === 'kurir' || route === 'marcus-kurir';
export const ROUTE_NAMES: Record<Route, string> = {
  direct: 'Johan Banérs gata', marcus: 'Via Marcus A', kurir: 'Via Kurir Livs', 'marcus-kurir': 'Marcus A → Kurir Livs',
};
export const KURIR_BUILDING_ID = 95562951;
/** The junction just before the home approach, west of the roundabout. */
export const KURIR_FORK = fromMetres(140, 131);
/** A stop on the forecourt; the exact shop door is interpreted from the user's arrow. */
export const KURIR_STOP = fromMetres(265, 161);

// Existing OSM footways: north of the roundabout, down the shopping forecourt,
// then back along the southern footway to the Ringstorpsvägen home approach.
const shoppingLoop = [
  [163, 147], [170, 177], [201, 171], [213, 178], [254, 178], [265, 161],
  [288, 124], [301, 117], [269, 98], [254, 89], [235, 92], [206, 139],
  [194, 129], [169, 113], [168, 92],
].map(([e, n]) => fromMetres(e, n));

function withShop(path: Vec2[]): Vec2[] {
  const fork = path.findIndex(p => Math.hypot(p.x - KURIR_FORK.x, p.y - KURIR_FORK.y) < 0.01);
  if (fork < 0) throw new Error('Kurir Livs junction is missing from the route');
  return [...path.slice(0, fork + 1), ...shoppingLoop, path[path.length - 1]];
}

export const ROUTES: Record<Route, Vec2[]> = {
  direct: ORIGINAL.direct, marcus: ORIGINAL.marcus,
  kurir: withShop(ORIGINAL.direct), 'marcus-kurir': withShop(ORIGINAL.marcus),
};

export function turnRoute(route: Route, junction: JunctionId): Route {
  if (junction === 'romares') return viaKurir(route) ? 'marcus-kurir' : 'marcus';
  return viaMarcus(route) ? 'marcus-kurir' : 'kurir';
}
