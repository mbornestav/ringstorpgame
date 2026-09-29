/** Everything the player can ask the UI to do. The same ids were `data-action` values in the DOM panels. */
export type UiAction =
  | 'start' | 'restart' | 'start-2' | 'answer' | 'start-3' | 'answer-3' | 'back' | 'menu'
  | 'resume' | 'continue' | 'pause' | 'interact' | 'sound' | 'lang'
  | 'phone' | 'phone-call' | 'phone-away' | 'phone-cancel'
  | `floor-${number}`;

/** The title screen shows the main menu or, once a mission is chosen, D.D's call for it. */
export type TitleView = 'main' | 'gods' | 'heist';

/** Where a dispatch came from. A pointer press releases held keys first; a key press does not. */
export type ActionSource = 'key' | 'pointer';

export const floorAction = (n: number): UiAction => `floor-${n}`;
export function floorOf(action: UiAction): number | null {
  const m = /^floor-(\d+)$/.exec(action);
  return m ? Number(m[1]) : null;
}
