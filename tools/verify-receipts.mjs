/**
 * Re-checks every receipt in every city against its source: tweets through X's public embed
 * endpoint (the text must still match), Reddit posts and comments through Treg, articles by
 * fetching the page and looking for the quote.
 *
 *   node tools/verify-receipts.mjs [--city mumbai]
 *
 * A tweet or Reddit post that is gone or changed fails. An article page that loads but doesn't show
 * the quote is flagged for a look by hand, since some sites only render their text in the browser.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';

const ENTITIES = {
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': "'",
  '&#x27;': "'",
  '&rsquo;': "'",
  '&lsquo;': "'",
  '&ldquo;': '"',
  '&rdquo;': '"',
  '&nbsp;': ' ',
};

const norm = (s) =>
  s
    .normalize('NFKC')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/&(amp|quot|#39|#x27|rsquo|lsquo|ldquo|rdquo|nbsp);/g, (e) => ENTITIES[e])
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

function env(name) {
  if (process.env[name]) return process.env[name].trim();
  const file = new URL('../.env.local', import.meta.url);
  if (!existsSync(file)) return null;
  return new RegExp(`^${name}=(.+)$`, 'm').exec(readFileSync(file, 'utf8'))?.[1]?.trim() ?? null;
}

/**
 * Reddit refuses plain fetches, so its posts and comments are read through Treg (see tools/discover.mjs).
 * Returns the post's or comment's text, '' when Treg can't read it, or null without a token to ask with.
 * Reddit turns Treg away at times, and its second source then only goes one reply deep, so '' isn't proof.
 */
async function reddit(url) {
  const token = env('TREG_TOKEN');
  if (!token) return null;
  async function call(id, body, extra = {}) {
    const headers = { 'X-Treg-Token': token, 'content-type': 'application/json', ...extra };
    if (env('TREG_ORG')) headers['X-Treg-Org'] = env('TREG_ORG');
    const res = await fetch(`https://treg.to/call/${id}`, { method: 'POST', headers, body: JSON.stringify(body) });
    return res.ok ? res.json() : {};
  }
  // A comment's permalink is its post's URL plus the comment id.
  const [, thread, post, comment] = /^(.*\/comments\/(\w+)\/[^/?#]*\/?)(\w*)/.exec(url) ?? [];
  if (!post) return '';
  if (comment) {
    const json = await call('crawl4ai.reddit.post.comments', { url: thread, limit: 500 });
    return json.rows?.find((r) => r.id === comment)?.text ?? '';
  }
  // Pinned to one provider: the post object's shape differs between the ones Treg routes to.
  const json = await call(
    'treg.reddit.post.detail',
    { post_id: `t3_${post}` },
    { 'X-Treg-Route-Prefer': 'tikhub', 'X-Treg-Route-Waterfall': '0' },
  );
  const p = json.output?.post;
  return p ? [p.postTitle, p.content?.markdown].filter(Boolean).join('\n') : '';
}

const i = process.argv.indexOf('--city');
const dataDir = new URL('../src/data/', import.meta.url);
const cities =
  i > -1
    ? [process.argv[i + 1]]
    : readdirSync(dataDir)
        .filter((f) => f.endsWith('.json'))
        .map((f) => f.replace(/\.json$/, ''));

let failures = 0;
let flagged = 0;
let checked = 0;
for (const city of cities) {
  const { cafes } = JSON.parse(readFileSync(new URL(`${city}.json`, dataDir), 'utf8'));
  for (const cafe of cafes) {
    const items = [
      ...cafe.vcs.map((v) => ({ who: v.name, url: v.proof.url, text: v.proof.text, isTweet: v.proof.kind !== 'other' })),
      ...cafe.scene.map((s) => ({ who: s.author, url: s.url, text: s.text, isTweet: s.kind === 'tweet' })),
    ];
    for (const item of items) {
      checked++;
      let problem = null;
      let flag = null;
      try {
        if (item.isTweet) {
          const live = await tweet(item.url);
          if (live === null) problem = 'tweet not reachable';
          else if (!norm(live).includes(norm(item.text).slice(0, 60))) problem = `text differs: "${live.slice(0, 90)}…"`;
        } else if (/^https:\/\/(www\.|old\.)?reddit\.com\//.test(item.url)) {
          const live = await reddit(item.url);
          if (live === null) flag = 'Reddit needs TREG_TOKEN to check';
          else if (live === '') flag = "Treg couldn't read it; check it in a browser";
          else if (!norm(live).includes(norm(item.text).slice(0, 60))) problem = `text differs: "${live.slice(0, 90)}…"`;
        } else {
          const res = await fetch(item.url, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 cheque-please-verify' } });
          if (!res.ok) problem = `HTTP ${res.status}`;
          else if (!norm((await res.text()).replace(/<[^>]+>/g, ' ')).includes(norm(item.text).slice(0, 60))) {
            flag = 'quote not found in the page source; check it in a browser';
          }
        }
      } catch (e) {
        problem = e.message;
      }
      if (problem) {
        failures++;
        console.log(`✗ ${city}/${cafe.slug} · ${item.who}: ${problem}\n  ${item.url}`);
      } else if (flag) {
        flagged++;
        console.log(`? ${city}/${cafe.slug} · ${item.who}: ${flag}\n  ${item.url}`);
      }
    }
  }
}
console.log(`${checked - failures}/${checked} receipts verified${flagged ? `, ${flagged} to check by hand` : ''}`);
process.exit(failures ? 1 : 0);
