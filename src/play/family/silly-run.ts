import { FACES, ITEMS, type ItemId, type Slot } from './games/toa';

// Fånig i spegeln's rules, without Phaser: things to wear (a crown, glasses, a clown nose, a moustache…), one at a time in
// each place on the face, and silly faces to pull; a photo puts the picture up on the walls of the house. There is nothing
// to win: the first photo counts as done.

export class SillyRun {
  worn: Record<Slot, ItemId | null> = { head: null, eyes: null, nose: null, lip: null };
  face = 0;
  photos = 0;
  /** Seconds since the last photo (the flash), −1 before the first. */
  flash = -1;
  events: string[] = [];

  /** Puts a thing on (in place of whatever was in its place), or takes it off if it is already on. */
  toggle(id: ItemId): void {
    const slot = ITEMS.find(i => i.id === id)!.slot;
    const on = this.worn[slot] !== id;
    this.worn[slot] = on ? id : null;
    this.events.push(`${on ? 'on' : 'off'}:${id}`);
  }

  nextFace(): void { this.face = (this.face + 1) % FACES.length; this.events.push(`face:${this.face}`); }

  clear(): void { this.worn = { head: null, eyes: null, nose: null, lip: null }; this.face = 0; this.events.push('clear'); }

  photo(): void { this.photos++; this.flash = 0; this.events.push(this.photos === 1 ? 'first' : 'photo'); }

  get wearing(): ItemId[] { return Object.values(this.worn).filter((x): x is ItemId => x !== null); }

  update(dt: number): void { if (this.flash >= 0 && Number.isFinite(dt) && dt > 0) this.flash += dt; }
}
