import Phaser from 'phaser';
import { getLang, setLang } from '../../side/i18n';
import { sessionOf } from '../scenes/shared';
import { drawRide, drawRunPreview } from './art';
import { FamilySurface } from './surface';
import { familyText as t } from './text';
import { isRetro } from '../../side/pixel';

export class HubScene extends FamilySurface {
  private section: 'all' | 'carl' = 'all';

  constructor() { super('Hub'); }

  create(): void {
    this.section = 'all';
    for (const key of ['family-bike-preview', 'family-run-preview']) {
      if (this.textures.exists(key)) continue;
      // Retro: small previews, magnified as pixel art (two screen pixels per preview pixel).
      const k = isRetro() ? 0.33 : 1;
      const texture = this.textures.createCanvas(key, Math.round(960 * k), Math.round(375 * k))!;
      const c = texture.context; c.save(); c.scale(k, k); c.translate(0, -125);
      if (key === 'family-run-preview') drawRunPreview(c);
      else drawRide(c, { distance: 900, x: 430, y: 459, apples: [], invulnerable: 0, elapsed: 0.35 });
      c.restore(); texture.refresh();
    }
    this.setup();
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.section === 'carl') { e.stopPropagation(); this.section = 'all'; this.rebuild(); }
    };
    this.input.keyboard?.on('keydown', down);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard?.off('keydown', down));
  }

  protected build(): void {
    document.title = this.section === 'all' ? t('collection') : t('carl');
    document.documentElement.lang = getLang();
    this.rect(0, 0, 1440, 810, 0xf5f1df);
    this.rect(0, 0, 1440, 10, 0x365c49);
    this.label(t('collection'), 84, 43, 21, '#5d735c', undefined, true);
    this.button('family-lang', getLang() === 'sv' ? 'English' : 'Svenska', 1205, 30, 151, () => setLang(getLang() === 'sv' ? 'en' : 'sv'), true);
    const title = this.section === 'all' ? t('choose') : t('carl');
    this.label(title, 80, 101, 66, '#25473f', undefined, true);
    this.label(this.section === 'all' ? t('intro') : t('carlDescription'), 84, 184, 23, '#687462');
    this.mirror('h1', title); this.mirror('p', this.section === 'all' ? t('intro') : t('carlDescription'));
    if (this.section === 'all') {
      this.card(84, 'family-run-preview', t('runTag'), t('ringstorp'), t('runDescription'), t('runAction'), 'choose-ringstorp', () => {
        const session = sessionOf(this);
        session.section = 'ringstorp'; session.dispatch('menu'); session.game.toTitle(); session.titleView = 'main';
        this.scene.start('World'); this.scene.launch('UI');
      });
      this.card(740, 'family-bike-preview', t('carlTag'), t('carl'), t('carlDescription'), t('carlAction'), 'choose-carl', () => {
        this.section = 'carl'; this.rebuild(); this.root.querySelector<HTMLButtonElement>('[data-family="start-bike"]')?.focus();
      });
    } else {
      this.panel(84, 254, 1272, 417, 0xe9e9da, 24);
      const image = this.add.image(84, 278, 'family-bike-preview').setOrigin(0).setDisplaySize(650, 254);
      this.layer.add(image);
      this.label(t('bikeHint'), 115, 560, 23, '#547054', 580);
      this.label(t('first'), 784, 279, 20, '#8e5c34', undefined, true);
      this.label(t('bikeTitle'), 784, 309, 52, '#25473f', undefined, true);
      this.label(t('bikeDescription'), 784, 381, 23, '#546653', 525);
      this.button('start-bike', t('start'), 784, 573, 244, () => this.scene.start('Bike'));
      this.button('all-games', t('back'), 84, 701, 196, () => { this.section = 'all'; this.rebuild(); });
      this.mirror('h2', t('bikeTitle')); this.mirror('p', t('bikeDescription')); this.mirror('p', t('bikeHint'));
    }
    this.label(t('footer'), this.section === 'all' ? 84 : 820, 770, 16, '#78806b', undefined, true);
  }

  private card(x: number, texture: string, tag: string, title: string, description: string, action: string, id: string, onPress: () => void): void {
    this.panel(x, 252, 616, 483, 0xe9e9da, 24);
    this.layer.add(this.add.image(x, 268, texture).setOrigin(0).setDisplaySize(616, 241));
    this.label(tag, x + 28, 525, 18, '#6d775d', undefined, true);
    this.label(title, x + 28, 552, 43, '#25473f', undefined, true);
    this.label(description, x + 28, 609, 20, '#5d6b56', 557);
    this.button(id, action, x + 28, 672, 240, onPress);
    this.mirror('h2', title); this.mirror('p', description);
  }
}
