import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const output = resolve('dist');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const file of ['index.html', 'style.css', 'app.js', 'config.js']) {
  await cp(resolve(file), resolve(output, file));
}
console.log('Built static GitHub Pages site in dist/.');

