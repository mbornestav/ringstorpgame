import Phaser from 'phaser';
import { getLang, setLang } from '../../side/i18n';
import { sessionOf } from '../scenes/shared';
import { drawRide, drawRunPreview } from './art';
import { drawYardPreview } from './yard-art';
import { drawHomePreview } from './home-art';
import { FamilySurface } from './surface';
import { familyText as t } from './text';
import { isRetro } from '../../side/pixel';
import { musicOf } from '../audio/music';

export class HubScene extends FamilySurface {
  private section: 'all' | 'carl' = 'all';

  constructor() { super('Hub'); }

  create(): void {
    this.section = 'all';
    for (const key of ['family-bike-preview', 'family-run-preview', 'family-hide-preview', 'family-home-preview']) {
      if (this.textures.exists(key)) continue;
      // Retro: small previews, magnified as pixel art (two screen pixels per preview pixel).
      const k = isRetro() ? 0.33 : 1;
      const texture = this.textures.createCanvas(key, Math.round(960 * k), Math.round(375 * k))!;
      const c = texture.context; c.save(); c.scale(k, k); c.translate(0, -125);
      if (key === 'family-run-preview') drawRunPreview(c);
      else if (key === 'family-hide-preview') drawYardPreview(c);
      else if (key === 'family-home-preview') drawHomePreview(c);
      else drawRide(c, { distance: 900, x: 430, y: 459, apples: [], invulnerable: 0, elapsed: 0.35 });
      c.restore(); texture.refresh();
    }
    this.setup();
    musicOf(this.game).play('hub');
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.section === 'carl') { e.stopPropagation(); this.section = 'all'; this.rebuild(); }
      if (e.key.toLowerCase() === 'm' && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) { e.stopPropagation(); this.toggleSound(); }
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
    this.button('family-sound', this.muted ? t('soundOff') : t('soundOn'), 1018, 30, 170, () => this.toggleSound(), true);
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
      // Carl-Otto's games side by side: the bike ride, hide-and-seek and movie night.
      const w = 408, gap = (1440 - 168 - w * 3) / 2;
      this.card(84, 'family-bike-preview', t('first'), t('bikeTitle'), t('bikeBlurb'), t('start'), 'start-bike', () => this.scene.start('Bike'), w);
      this.card(84 + w + gap, 'family-hide-preview', t('second'), t('hideTitle'), t('hideBlurb'), t('countStart'), 'start-hide', () => this.scene.start('Hide'), w);
      this.card(84 + (w + gap) * 2, 'family-home-preview', t('third'), t('movieTitle'), t('movieBlurb'), t('movieStart'), 'start-movie', () => this.scene.start('Movie'), w);
      this.button('all-games', t('back'), 84, 740, 196, () => { this.section = 'all'; this.rebuild(); });
    }
    this.label(t('footer'), this.section === 'all' ? 84 : 820, 770, 16, '#78806b', undefined, true);
  }

  /** A game's card: a preview, its name and a line about it, and the button that starts it. Narrower cards crop the preview. */
  private card(x: number, texture: string, tag: string, title: string, description: string, action: string, id: string, onPress: () => void, w = 616): void {
    this.panel(x, 252, w, 483, 0xe9e9da, 24);
    const image = this.add.image(x, 268, texture).setOrigin(0);
    const source = image.frame;
    if (w < 616) image.setCrop((source.width - source.width * w / 616) / 2, 0, source.width * w / 616, source.height).setX(x - (616 - w) / 2);
    image.setDisplaySize(616, 241);
    this.layer.add(image);
    this.label(tag, x + 28, 525, 18, '#6d775d', undefined, true);
    this.label(title, x + 28, 552, w < 616 ? 36 : 43, '#25473f', undefined, true);
    this.label(description, x + 28, 609, 20, '#5d6b56', w - 59);
    this.button(id, action, x + 28, 672, Math.min(240, w - 56), onPress);
    this.mirror('h2', title); this.mirror('p', description);
  }
}
