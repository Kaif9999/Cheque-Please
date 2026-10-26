/**
 * Re-checks every receipt against its source: tweets through X's public embed
 * endpoint (text must still match), articles by fetching the page.
 *
 *   node tools/verify-receipts.mjs
 */
import { readFileSync } from 'node:fs';

const norm = (s) =>
  s
    .normalize('NFKC')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/&amp;/g, '&')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

async function tweet(url) {
  const id = /status\/(\d+)/.exec(url)?.[1];
  const res = await fetch(`https://cdn.syndication.twimg.com/tweet-result?id=${id}&token=a`);
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  return json?.text ?? null;
}

let failures = 0;
let checked = 0;
for (const city of ['bengaluru', 'mumbai']) {
  const { cafes } = JSON.parse(readFileSync(new URL(`../src/data/${city}.json`, import.meta.url), 'utf8'));
  for (const cafe of cafes) {
    const items = [
      ...cafe.vcs.map((v) => ({ who: v.name, url: v.proof.url, text: v.proof.text, isTweet: v.proof.kind !== 'other' })),
      ...cafe.scene.map((s) => ({ who: s.author, url: s.url, text: s.text, isTweet: s.kind === 'tweet' })),
    ];
    for (const item of items) {
      checked++;
      let problem = null;
      try {
        if (item.isTweet) {
          const live = await tweet(item.url);
          if (live === null) problem = 'tweet not reachable';
          else if (!norm(live).includes(norm(item.text).slice(0, 60))) problem = `text differs: "${live.slice(0, 90)}…"`;
        } else {
          const res = await fetch(item.url, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 cheque-please-verify' } });
          if (!res.ok) problem = `HTTP ${res.status}`;
        }
      } catch (e) {
        problem = e.message;
      }
      if (problem) {
        failures++;
        console.log(`✗ ${city}/${cafe.slug} · ${item.who}: ${problem}\n  ${item.url}`);
      }
    }
  }
}
console.log(`${checked - failures}/${checked} receipts verified`);
process.exit(failures ? 1 : 0);
