// Export only the files a static host needs. No dependencies or game rebuild.
import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const output = new URL('dist/CRICKET-CHAMPION/', root);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const name of ['index.html', 'style.css', 'src', 'vendor', '.nojekyll']) {
  await cp(new URL(name, root), new URL(name, output), { recursive: true });
}
console.log('Static Pages site: ' + fileURLToPath(output));
