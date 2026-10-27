# Coffee with VCs

A map of the cafés in Bengaluru and Mumbai where VCs and angels have met founders. Every café
links to the public post that puts an investor there: a tweet by or about them, or a cited
article. Idea from [meetvc.cafe](https://meetvc.cafe).

Static site: Vite + TypeScript + Tailwind CSS + MapLibre on OpenFreeMap vector tiles. No backend,
no API keys.

## Run it

```bash
npm install
npm run dev        # http://127.0.0.1:5190
npm run build      # tsc --noEmit + vite build -> dist/
npm run preview    # serve dist/ on http://127.0.0.1:4190
```

## Routes

| Hash | Shows |
| --- | --- |
| `#/bengaluru`, `#/mumbai` | the city's cafés, grouped by neighbourhood, beside the map |
| `#/<city>/<café-slug>` | that café's page: who was seen there and the posts that say so |

## Data

`src/data/bengaluru.json` and `src/data/mumbai.json`. Each café has `vcs` (named investors, each
with one `proof`) and `scene` (evidence the café is a startup meeting spot without a named
investor). An investor's `crowd` (`big`, `first`, `angel`, `cohort`) sets the café's zone; see
`src/data/zones.ts`.

Rules for adding a café: the post must be public, must name the café, and is quoted verbatim.
No post, no pin.

```bash
npm test                          # schema, bounds and zone-rule checks
node tools/verify-receipts.mjs    # re-fetches every tweet and article and checks the quotes still match
node tools/fetch-avatars.mjs      # pulls X profile photos for investors whose receipt is their own tweet
node tools/smoke.mjs              # drives the main flows in Chrome against the preview server
node tools/shot.mjs --url http://127.0.0.1:4190/#/mumbai --out shots/mumbai.png
```

## Design

Tokens (colours, fonts, shadows) live in the `@theme` block of `src/styles.css`; everything else
is Tailwind utilities in the markup. Shared class strings are in `src/ui/classes.ts`. Café logos
are in `public/logos/`, investor photos in `public/avatars/`.

## Config

`src/config.ts`: set `repo` to a GitHub `owner/repo` to turn on the "Suggest a café" and removal
links (they open `.github/ISSUE_TEMPLATE/receipt.yml`), and `maker` to sign the footer credit.
