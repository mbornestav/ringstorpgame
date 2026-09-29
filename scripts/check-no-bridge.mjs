// The dev bridge (window.__ringstorp) and the art lab exist only for tests and screenshots. Fail the build if either
// ended up in the production output.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const walk = dir => readdirSync(dir).flatMap(name => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? walk(path) : [path];
});
const leaks = walk('dist')
  .filter(file => /\.(js|html|css)$/.test(file))
  .filter(file => /__ringstorp|__artlab/.test(readFileSync(file, 'utf8')));
if (leaks.length) {
  console.error(`Dev-only test hooks found in the production build:\n  ${leaks.join('\n  ')}`);
  process.exit(1);
}
console.log('No dev-only test hooks in dist.');
