import { expect, type Locator, type Page } from '@playwright/test';
import type { UiAction } from '../../src/play/actions';
import type { SideGame } from '../../src/side/game';
import type { BikeRun } from '../../src/play/family/bike-run';
import type { HideRun } from '../../src/play/family/hide-run';
import type { MovieRun } from '../../src/play/family/movie-run';
import type { CraftRun } from '../../src/play/family/craft-run';
import type { PancakeRun } from '../../src/play/family/pancake-run';
import type { GoodnightRun } from '../../src/play/family/goodnight-run';
import type { MorningRun } from '../../src/play/family/morning-run';
import type { HomecomingRun } from '../../src/play/family/homecoming-run';

// The dev build exposes `window.__ringstorp` (see src/play/testing/bridge.ts); `sim` is the running SideGame.
export interface Bridge {
  ready: Promise<void>;
  game: { canvas: HTMLCanvasElement };
  sim: SideGame;
  bike(): BikeRun;
  hide(): HideRun;
  movie(): MovieRun;
  craft(): CraftRun;
  pancake(): PancakeRun;
  goodnight(): GoodnightRun;
  morning(): MorningRun;
  homecoming(): HomecomingRun;
  house(): { selected: string; head: [number, number]; done: string[] };
  click(action: UiAction): boolean;
  available(action: UiAction): boolean;
  freeze(): void;
  thaw(): void;
  step(dt?: number, n?: number): void;
  bounds(id: string): { x: number; y: number; width: number; height: number } | null;
  ui(): {
    panel: { kind: string; title: string; body: string; actions: Array<{ id: string; label: string }> } | null;
    hud: { visible: boolean; life: { kind: string; label: string; hearts?: { filled: number; max: number }; ammo?: { rounds: { filled: number; max: number } } | null }; objective: { text: string }; score: { time: string; value: string } };
    prompt: { title: string; button: { enabled: boolean } } | null;
    phone: { visible: boolean; lcd: { status: string } };
    world: { toast: { text: string } | null };
  };
  music(): { track: string | null; position: number; muted: boolean };
  audio(): { recent: string[]; muted: boolean; mute: boolean };
  state(): { mode: string; level: number; x: number; y: number; z: number; hp: number; camera: number; elapsed: number; hasPackage: boolean; titleView: string; muted: boolean };
}
declare global { interface Window { __ringstorp: Bridge } }

/** Loads the game and waits for its scenes. Startup loads fonts and artwork first, so the bridge appears a moment after the page. */
export async function open(page: Page, query = '', lang?: 'en' | 'sv'): Promise<void> {
  await page.addInitScript(l => { if (l || !localStorage.getItem('ringstorp-lang')) localStorage.setItem('ringstorp-lang', l ?? 'en'); }, lang);
  const params = new URLSearchParams(query);
  params.set('game', 'ringstorp');
  await page.goto(`/?${params}`);
  await page.waitForFunction(() => window.__ringstorp, null, { timeout: 30_000 });
  await page.evaluate(() => window.__ringstorp.ready);
}

export const state = (page: Page) => page.evaluate(() => window.__ringstorp.state());
export const ui = (page: Page) => page.evaluate(() => window.__ringstorp.ui());
export const click = (page: Page, action: UiAction) => page.evaluate(a => window.__ringstorp.click(a), action);

/** Runs `fn` in the page with the running SideGame. */
export function world<T>(page: Page, fn: (g: SideGame) => T): Promise<T> {
  return page.evaluate(`(${fn.toString()})(window.__ringstorp.sim)`) as Promise<T>;
}

/** Waits until a canvas control is showing and has stopped moving (panels fade and slide in), then returns where it is. */
export async function settledBounds(page: Page, id: string): Promise<{ x: number; y: number; width: number; height: number }> {
  let last = '';
  for (let i = 0; i < 100; i++) {
    const b = await page.evaluate(c => window.__ringstorp.bounds(c), id);
    const now = JSON.stringify(b);
    if (b && now === last) return b;
    last = now;
    await page.waitForTimeout(60);
  }
  throw new Error(`No control "${id}" is showing`);
}

/** Presses a canvas control with a real mouse click at its centre. */
export async function press(page: Page, id: string): Promise<void> {
  const b = await settledBounds(page, id);
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
}

/** Activates a control of the hidden DOM mirror. Its buttons are not real hit targets, so this clicks without a pointer. */
export const activate = (button: Locator) => button.dispatchEvent('click');

/** The game canvas. */
export const canvas = (page: Page) => page.locator('#game canvas');

/** Fails the test if the page reports an error. Call in `beforeEach`; check in `afterEach`. */
export function watchErrors(page: Page): () => void {
  const seen: string[] = [];
  page.on('pageerror', e => seen.push(e.message));
  page.on('console', m => { if (m.type() === 'error') seen.push(`${m.text()} ${m.location().url}`); });
  return () => expect(seen).toEqual([]);
}

/** Skip the fights in between, to exercise the real keyboard and UI at each landmark. */
export async function approach(page: Page, spot: 'romares' | 'kurir' | 'marcus' | 'langakers' | 'shop' | 'home'): Promise<void> {
  await page.evaluate(spot => {
    const g = window.__ringstorp.sim;
    for (const e of g.stage.encounters) if (!e.home) g.encounters.set(e.id, 'cleared');
    for (const e of g.enemies) { e.hp = 0; e.gone = true; }
    g.hasPackage = true;
    const x = spot === 'marcus' ? g.stage.marcusX! : spot === 'langakers' ? g.stage.marcusX! + 560 : spot === 'shop' ? g.stage.shopX! : spot === 'home' ? g.stage.homeX - 120 : g.stage.junctions.find(j => j.id === spot)!.x;
    g.camera = Math.max(0, Math.min(g.stage.length - 480, x - 192));
    g.player.x = x;
    g.player.y = spot === 'marcus' || spot === 'shop' ? 180 : 214;
    g.messageTimer = 0;
  }, spot);
}
