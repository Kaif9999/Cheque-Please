/**
 * Downloads X profile photos for investors with a handle, saves them to
 * public/avatars/<handle>.jpg and records the path in the city JSON.
 *
 *   node tools/fetch-avatars.mjs
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

const dir = new URL('../public/avatars/', import.meta.url);
mkdirSync(dir, { recursive: true });

for (const city of ['bengaluru', 'mumbai']) {
  const file = new URL(`../src/data/${city}.json`, import.meta.url);
  const data = JSON.parse(readFileSync(file, 'utf8'));
  for (const vc of data.cafes.flatMap((c) => c.vcs)) {
    if (!vc.handle) continue;
    const name = `${vc.handle.toLowerCase()}.jpg`;
    if (!existsSync(new URL(name, dir))) {
      const own = data.cafes
        .flatMap((c) => c.vcs)
        .find((v) => v.handle?.toLowerCase() === vc.handle.toLowerCase() && v.proof.kind === 'own');
      let img = null;
      if (own) {
        const id = /status\/(\d+)/.exec(own.proof.url)?.[1];
        const res = await fetch(`https://cdn.syndication.twimg.com/tweet-result?id=${id}&token=a`);
        img = res.ok ? (await res.json()).user?.profile_image_url_https?.replace('_normal.', '_200x200.') : null;
      } else {
        // Spotted investors have no tweet of their own to read the photo from.
        img = `https://unavatar.io/x/${vc.handle}?fallback=false`;
      }
      if (!img) continue;
      const pic = await fetch(img);
      if (!pic.ok) continue;
      writeFileSync(new URL(name, dir), Buffer.from(await pic.arrayBuffer()));
      console.log(`saved ${name}`);
    }
    vc.avatar = `avatars/${name}`;
  }
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}
