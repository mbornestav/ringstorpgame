import type { RideDefinition } from './types';

// Every `*.ride.ts` file in this folder is a ride; the first by id is the one the chooser starts.
const files = import.meta.glob<{ default: RideDefinition }>('./*.ride.ts', { eager: true });
export const RIDES: readonly RideDefinition[] = Object.values(files).map(m => m.default).sort((a, b) => a.id.localeCompare(b.id));
export const rideById = (id: string): RideDefinition | undefined => RIDES.find(r => r.id === id);
export const FIRST_RIDE: RideDefinition = rideById('till-forskolan') ?? RIDES[0];
export type { RideDefinition } from './types';
