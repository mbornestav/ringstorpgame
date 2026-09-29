// The one import point for the presentation models: pure functions from game state to plain data that a renderer draws.
export { modelKey, type Meter, type UiContext } from './models/base';
export { controlsModel, footerModel, mastheadModel, type ControlHint, type FooterModel, type MastheadModel } from './models/chrome';
export { hudModel, type AmmoModel, type HudModel, type HudStep, type LifeCard } from './models/hud';
export { panelModel, type PanelAction, type PanelKind, type PanelModel } from './models/panel';
export { phoneModel, type PhoneModel } from './models/phone';
export { promptModel, type PromptModel } from './models/prompt';
export { worldHudModel, type RouteMarker, type RouteStrip, type WorldHudModel } from './models/world-hud';
