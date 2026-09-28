// Screen layout shared by the side-scrolling stage, game and renderer.

export const WIDTH = 480;
export const HEIGHT = 270;

/** Stage pixels per metre walked along the route. */
export const PX_PER_M = 12;
/** Pixels per metre for heights on the facades across the street. */
export const FACADE_PX_PER_M = 11;

/** Where the front gardens meet the far pavement. */
export const FRONTAGE_Y = 165;
/** The far kerb, between the pavement and the carriageway. */
export const KERB_Y = 188;
/** The near kerb; below it is the near pavement, behind the camera. */
export const NEAR_KERB_Y = 252;

/** Feet stay between these lines: the far pavement down to the near kerb. */
export const BAND_TOP = 176;
export const BAND_BOTTOM = 248;
