/** Shared artwork coordinates; independent of either game runtime. */
export const TOP_FLOOR = 8;
export const LOBBY_EXIT_X = 46, LOBBY_LIFT_X = 408, FLOOR_LIFT_X = 54, DD_X = 340, CABIN_X = 200;
export interface RoomView {
  scene: 'street' | 'lobby' | 'floor' | 'cabin';
  floor: number;
  ride: { from: number; to: number; t: number; dur: number } | null;
}

/** Buttons on the lift panel, in the layout of the real one: the top floor alone, then pairs. */
export const PANEL_BUTTONS: Array<{ n: number; x: number; y: number }> = [
  { n: 8, x: 388, y: 92 },
  { n: 6, x: 388, y: 122 }, { n: 7, x: 430, y: 122 },
  { n: 4, x: 388, y: 152 }, { n: 5, x: 430, y: 152 },
  { n: 2, x: 388, y: 182 }, { n: 3, x: 430, y: 182 },
  { n: 0, x: 388, y: 212 }, { n: 1, x: 430, y: 212 },
];
export const BUTTON_R = 12;
export function panelHit(x: number, y: number): number | null {
  const hit = PANEL_BUTTONS.find(b => Math.hypot(b.x - x, b.y - y) <= BUTTON_R + 2);
  return hit ? hit.n : null;
}
