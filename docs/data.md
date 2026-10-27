# Data

Each city's cafés live in `src/data/<city>.json`, and the city itself (name, headline, camera,
bounds, neighbourhood notes) in `src/data/cities.ts`. The types are in `src/domain/types.ts`.

## What counts as a receipt

A café goes on the map only with at least one public post that names it.

- **The post is public.** It must be a tweet anyone can open, or an article, podcast page or blog
  post.
- **It names the café,** or unambiguously the specific branch. "A café in Koramangala" does not count.
- **It is quoted word for word,** with the date and a link to the original. No paraphrase.
- **The investor is real.** That means a partner, principal or associate at a fund, an angel, or an
  accelerator partner, recorded with their fund.

No post, no pin. A post shows someone was there once, not that they will be there tomorrow, and
the site says so.

## A café

```jsonc
{
  "slug": "araku-indiranagar",          // unique per city, kebab-case; never "list" (that's a route)
  "name": "ARAKU Coffee",
  "logo": "logos/araku.png",            // optional, under public/
  "branch": "12th Main Road",
  "area": "Indiranagar",                // must have a note in the city's `areas`
  "address": "968, 12th Main Road, HAL 2nd Stage, Indiranagar, Bengaluru 560008",
  "lat": 12.969914,
  "lon": 77.639208,                     // must sit inside the city's bounds
  "maps_url": "https://www.google.com/maps/search/?api=1&query=…",
  "note": "Rahul Chowdhri named it a casual-meeting spot, May 2026; …",   // 20 words at most
  "vcs": [ /* investors seen here */ ],
  "scene": [ /* posts about meetings here that name no investor */ ]
}
```

An investor:

```jsonc
{
  "name": "Rahul Chowdhri",
  "fund": "Stellaris",
  "handle": "rchowdhri",                // X handle, or null
  "crowd": "first",                     // big | first | angel | cohort
  "avatar": "avatars/rchowdhri.jpg",    // optional, added by tools/fetch-avatars.mjs
  "proof": {
    "kind": "own",                      // own: they posted it; spotted: someone else names them; other: an article
    "author": "Rahul Chowdhri",
    "authorHandle": "rchowdhri",
    "text": "Which is a nice breakfast place in indiranagar where you can have a casual meeting …",
    "date": "May 6, 2026",
    "url": "https://x.com/rchowdhri/status/2051859445840560603"
  }
}
```

A scene item has `kind` (`tweet` or `article`), `author`, `authorHandle`, `text`, `date` and `url`.

## Zones

`crowd` says what kind of cheque the investor writes:

| Crowd    | Label              | Examples                              |
| -------- | ------------------ | ------------------------------------- |
| `big`    | Multi-stage funds  | Lightspeed, Accel, Sequoia, a16z      |
| `first`  | Seed funds         | Stellaris, Inuka, Floodgate           |
| `angel`  | Angels & operators | angels, solo GPs, founders who invest |
| `cohort` | Accelerators       | YC, Techstars, GSF                    |

A café's zone is the crowd most of its investors belong to, and ties go to the bigger cheque. A
café with no named investor is a "Founder hangout". A neighbourhood is coloured by the zone most of
its cafés fall in. See `src/domain/zones.ts` and `src/domain/areas.ts`.

## Adding a café

1. Find the receipt (see [Finding cafés](#finding-cafés)) and check it against its source.
2. Add the café to `src/data/<city>.json`. If its neighbourhood is new, add a one-line, sourced note
   to that city's `areas` in `src/data/cities.ts`.
3. Run `node tools/fetch-avatars.mjs` to pull X profile photos for new investors.
4. For a logo, save the café's own mark as a square PNG in `public/logos/` and point `logo` at it.
   Check it by eye: a wrong logo is worse than the fallback letter.
5. Run `npm test`, which checks bounds, notes, URLs, slugs and area notes. Then run
   `node tools/verify-receipts.mjs` to re-fetch every receipt.

## Adding a city

1. Add its id to `CityId` in `src/domain/types.ts`.
2. Add the city to `CITIES` and `CITY_ORDER` in `src/data/cities.ts`, with name, headline, starting
   camera, bounds and a note per neighbourhood.
3. Create `src/data/<city>.json` with `{ "cafes": [...] }` and import it in `cities.ts`.
4. Add the city to the issue form's dropdown in `.github/ISSUE_TEMPLATE/receipt.yml`.

The city switch, routes, tests and preview tags pick the new city up from `CITY_ORDER`.

## Finding cafés

`tools/discover.mjs` searches X and Reddit for posts that put an investor at a café. It goes
through [Treg](https://treg.to), a pay-per-call gateway to data providers.

```bash
node tools/discover.mjs --city bengaluru [--source x,reddit] [--max-usd 0.10] [--threads 8]
```

- It needs `TREG_TOKEN`, and also `TREG_ORG` for a personal sign-in token. Set them in the
  environment or in `.env.local`, which git ignores.
- It builds searches from the city's cafés, its known investors and phrases like "coffee with a VC",
  "pitched at" and "spotted at". It runs them on X (`treg.x.search.posts`, about $0.0006 a call) and
  in the city's subreddits (`crawl4ai.reddit.search.posts`, about $0.0009 a call). Then it reads
  the comments of the most promising threads.
- It keeps posts that mention both a café and an investor, and drops ones already on the map and
  funding news (raises, rounds, losses, amounts in ₹ or $).
  The rest go to `research/candidates-<city>.json` (git-ignored), with the total spend reported.
- A city run costs about $0.04, and `--max-usd` caps it.

Candidates are leads, not receipts. Each one is checked by hand before it is added.

## Verifying

- **Tweets.** X's public embed endpoint
  (`https://cdn.syndication.twimg.com/tweet-result?id=<id>&token=a`) returns the live text. The
  quote must still match it.
- **Articles.** The page must load and show the quoted sentence.
- `node tools/verify-receipts.mjs` re-checks every receipt in every city. Run it before a release:
  posts get deleted.

## Removals

Anyone listed can ask to be removed through the issue form (`.github/ISSUE_TEMPLATE/receipt.yml`).
Set `repo` in `src/config.ts` to show the link on the site. Removal requests are honoured without
question.
