import { setLogo, type LogoName } from '../../side/logos';
import bildeve from '../assets/logos/bildeve.png';
import ica from '../assets/logos/ica.png';

// The Statoil mark is drawn as paths (src/side/statoil-mark.ts), so only these two are images.
const SOURCES: Record<LogoName, string> = { ica, bildeve };

/** Loads and decodes the brand images and registers them for the art code. A missing image only means the lettering is drawn instead. */
export async function loadLogos(): Promise<void> {
  await Promise.all((Object.entries(SOURCES) as Array<[LogoName, string]>).map(async ([name, url]) => {
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      setLogo(name, image);
    } catch { /* fall back to drawn lettering */ }
  }));
}
