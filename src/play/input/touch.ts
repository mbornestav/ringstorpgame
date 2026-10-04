// Whether the game is being played with fingers (an iPad, a phone) rather than a keyboard and mouse: then the games show
// on-screen controls and leave out keyboard hints. `?touch=1` or `?touch=0` decides it by hand (tests, a tablet with a
// keyboard attached).

let decided: boolean | null = null;

export function isTouch(): boolean {
  if (decided !== null) return decided;
  const asked = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('touch');
  if (asked === '1' || asked === '0') return decided = asked === '1';
  if (typeof matchMedia !== 'function') return decided = false;
  // A tablet's main pointer is coarse and cannot hover; a laptop with a touch screen still has a fine pointer that can.
  return decided = matchMedia('(hover: none) and (pointer: coarse)').matches;
}
