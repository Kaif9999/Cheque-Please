/**
 * Finds candidate receipts: public posts on X and Reddit that put an investor at a café.
 * Searches run through Treg (https://treg.to), one pay-per-call token for many data providers.
 * Nothing here touches the map; it writes a review file of candidates to check by hand.
 *
 *   node tools/discover.mjs --city bengaluru [--source x,reddit] [--max-usd 0.10] [--threads 8]
 *
 * Reads TREG_TOKEN (and TREG_ORG, for a personal sign-in token) from the environment or .env.local.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function env(name) {
  if (process.env[name]) return process.env[name].trim();
  const file = new URL('../.env.local', import.meta.url);
  if (!existsSync(file)) return null;
  return new RegExp(`^${name}=(.+)$`, 'm').exec(readFileSync(file, 'utf8'))?.[1]?.trim() ?? null;
}

const city = arg('city', 'bengaluru');
const sources = arg('source', 'x,reddit').split(',');
const maxUsd = Number(arg('max-usd', '0.10'));
const maxThreads = Number(arg('threads', '8'));
const TOKEN = env('TREG_TOKEN');
const ORG = env('TREG_ORG');
if (!TOKEN) {
  console.error('No TREG_TOKEN. Sign in at https://treg.to, then set TREG_TOKEN or put it in .env.local.');
  process.exit(1);
}

const data = JSON.parse(readFileSync(new URL(`../src/data/${city}.json`, import.meta.url), 'utf8'));
const known = new Set(data.cafes.flatMap((c) => [...c.vcs.map((v) => v.proof.url), ...c.scene.map((s) => s.url)]));

/** Names a city goes by, then the neighbourhoods where meetings cluster. */
const PLACES = {
  bengaluru: ['bangalore', 'bengaluru', 'blr', 'indiranagar', 'koramangala', 'hsr'],
  mumbai: ['mumbai', 'bombay', 'bandra', 'lower parel', 'bkc', 'kala ghoda'],
}[city];

/** Cafés people meet at, beyond the ones already on the map. */
const CAFES = [
  ...new Set([
    ...data.cafes.map((c) => c.name.toLowerCase()),
    'third wave',
    'blue tokai',
    'subko',
    'araku',
    'starbucks',
    'dyu',
    'matteo',
    'roastery coffee house',
    'corner house',
    'the pantry',
    'kala ghoda cafe',
    'prithvi cafe',
    'candies',
    'soho house',
    'kc roasters',
    'perch',
    'bombay coffee',
    'café coffee day',
    'ccd',
    'filter coffee',
  ]),
];

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const CAFE = new RegExp(`\\b(cafe|café|cafes|coffee|roaster[sy]?|${CAFES.map(escape).join('|')})\\b`, 'i');
const INVESTOR =
  /\b(vcs?|venture capital(ists?)?|investors?|angels?|pitch(ed|ing)?|term sheets?|cheques?|seed round|fundrais(e|ing)|limited partners?)\b/i;
const FOUNDER = /\b(founders?|startups?|start-ups?)\b/i;
/** Funding news about coffee chains matches "investors" and "coffee" but never puts an investor at a table. */
const FUNDING_NEWS =
  /\b(rais(e|es|ed|ing) (rs\.? ?|inr ?|usd ?)?[₹$]? ?\d|series [a-e] (round|funding)\b|funding round\b|net loss\b|valuation of\b)|[₹$] ?\d[\d,.]* ?(mn|m|million|bn|billion|cr|crores?)\b/i;

const places = PLACES.join(' OR ');
const X_QUERIES = [
  `("coffee with a VC" OR "coffee with an investor" OR "met a VC" OR "met an investor") (${places})`,
  `("pitched at" OR "pitch meeting" OR "investor meeting" OR "VC meeting") (cafe OR coffee) (${places})`,
  `("spotted" OR "bumped into" OR "sitting next to" OR "overheard") (VC OR VCs OR investor OR investors) (cafe OR coffee) (${places})`,
  `("office hours") (cafe OR coffee) (VC OR investor OR founders) (${places})`,
  `(VCs OR investors) ("hang out" OR "favourite cafe" OR "favorite cafe" OR "go-to cafe") (${places})`,
  ...CAFES.slice(0, 16).map((c) => `"${c}" (VC OR VCs OR investor OR investors OR pitch OR "term sheet") (${places})`),
  ...[...new Set(data.cafes.flatMap((c) => c.vcs.map((v) => v.handle)).filter(Boolean))].map(
    (h) => `from:${h} (coffee OR cafe OR "third wave" OR "blue tokai" OR starbucks OR subko OR araku)`,
  ),
];

const SUBREDDITS = { bengaluru: ['bangalore', 'IndianStartups', 'StartUpIndia'], mumbai: ['mumbai', 'IndianStartups', 'StartUpIndia'] }[
  city
];
const REDDIT_QUERIES = [
  'VC cafe',
  'investors coffee meeting',
  'where do VCs hang out',
  'cafe full of founders',
  'pitch meeting cafe',
  'startup crowd cafe',
];

let calls = 0;
let spentMicro = 0;
const budgetLeft = () => spentMicro / 1e6 < maxUsd;

async function call(id, body) {
  if (!budgetLeft()) return null;
  calls++;
  const headers = { 'X-Treg-Token': TOKEN, 'content-type': 'application/json', 'X-Treg-Route-Max-Cost': '0.02' };
  if (ORG) headers['X-Treg-Org'] = ORG;
  const res = await fetch(`https://treg.to/call/${id}`, { method: 'POST', headers, body: JSON.stringify(body) });
  spentMicro += Number(res.headers.get('x-treg-cost-micro') ?? 0);
  if (!res.ok) {
    console.warn(`  ${id} ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return null;
  }
  return res.json().catch(() => null);
}

const tweet = (p) => ({
  source: 'x',
  url: p.authorUsername && p.id ? `https://x.com/${p.authorUsername}/status/${p.id}` : p.url,
  author: p.authorName ?? null,
  handle: p.authorUsername ?? null,
  date: p.createdUtc ? new Date(p.createdUtc * 1000).toISOString().slice(0, 10) : null,
  text: p.text ?? '',
});

const redditPost = (r) => ({
  source: 'reddit',
  url: r.url ?? r.link,
  author: r.author ?? null,
  handle: null,
  date: r.created?.slice(0, 10) ?? null,
  text: [r.title, r.text].filter(Boolean).join('\n'),
  subreddit: r.subreddit ?? null,
});

const redditComment = (c, thread) => ({
  source: 'reddit',
  url: c.url,
  author: c.author ?? null,
  handle: null,
  date: c.created?.slice(0, 10) ?? null,
  text: c.text ?? '',
  thread: thread.url,
});

const found = new Map();
function keep(item, query) {
  if (!item.url || known.has(item.url) || found.has(item.url)) return;
  if (!CAFE.test(item.text) || !(INVESTOR.test(item.text) || FOUNDER.test(item.text)) || FUNDING_NEWS.test(item.text)) return;
  const cafes = CAFES.filter((c) => item.text.toLowerCase().includes(c));
  const score = cafes.length * 2 + (INVESTOR.test(item.text) ? 2 : 0) + (FOUNDER.test(item.text) ? 1 : 0);
  found.set(item.url, { ...item, cafes, query, score });
}

/** Runs `fn` over `items`, a few at a time; Reddit's slow fallback can take minutes per call. */
async function pool(items, fn, size = 4) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (queue.length) await fn(queue.shift());
    }),
  );
}

if (sources.includes('x')) {
  await pool(X_QUERIES, async (q) => {
    const json = await call('treg.x.search.posts', { q });
    for (const p of json?.output?.posts ?? []) keep(tweet(p), q);
  });
}

if (sources.includes('reddit')) {
  const threads = new Map();
  const searches = SUBREDDITS.flatMap((subreddit) => REDDIT_QUERIES.map((query) => ({ subreddit, query })));
  await pool(searches, async ({ subreddit, query }) => {
    const json = await call('crawl4ai.reddit.search.posts', { query, subreddit, limit: 50, t: 'all' });
    for (const r of json?.rows ?? []) {
      const post = redditPost(r);
      keep(post, `r/${subreddit}: ${query}`);
      // Threads that talk about cafés and investors are worth reading to the bottom.
      const hits = (CAFE.test(post.text) ? 1 : 0) + (INVESTOR.test(post.text) ? 1 : 0);
      if (hits && !threads.has(post.url)) threads.set(post.url, { post, hits, query: `r/${subreddit}: ${query}` });
    }
  });
  const worth = [...threads.values()].sort((a, b) => b.hits - a.hits).slice(0, maxThreads);
  await pool(worth, async ({ post, query }) => {
    const json = await call('crawl4ai.reddit.post.comments', { url: post.url, limit: 300 });
    for (const c of json?.rows ?? []) keep(redditComment(c, post), `${query} (comments)`);
  });
}

const candidates = [...found.values()].sort((a, b) => b.score - a.score);
mkdirSync(new URL('../research/', import.meta.url), { recursive: true });
writeFileSync(new URL(`../research/candidates-${city}.json`, import.meta.url), `${JSON.stringify(candidates, null, 2)}\n`);
console.log(
  `${candidates.length} candidates from ${calls} calls, $${(spentMicro / 1e6).toFixed(4)} spent -> research/candidates-${city}.json`,
);
for (const c of candidates.slice(0, 15)) {
  console.log(
    `  [${c.score}] ${c.source} ${c.date ?? ''} ${c.handle ? `@${c.handle}` : (c.author ?? '')}: ${c.text.replace(/\s+/g, ' ').slice(0, 140)}`,
  );
}
