/** Shared artwork coordinates; independent of either game runtime. */
export const TOP_FLOOR = 8;
export const LOBBY_EXIT_X = 46, LOBBY_LIFT_X = 408, FLOOR_LIFT_X = 54, DD_X = 340, CABIN_X = 200;
export interface RoomView {
  scene: 'street' | 'lobby' | 'floor' | 'cabin';
  floor: number;
  ride: { from: number; to: number; t: number; dur: number } | null;
}
