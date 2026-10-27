# Cheque, Please

A map of the cafés in Bengaluru and Mumbai where VCs and angels have met founders. Every pin is
backed by a public receipt: a tweet by or about the investor, or a cited article. Idea borrowed
from [meetvc.cafe](https://meetvc.cafe).

Static site: Vite + TypeScript + MapLibre on OpenFreeMap vector tiles. No backend, no API keys.

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
| `#/bengaluru`, `#/mumbai` | the city map (intro until you scroll, pinch or drag) |
| `#/<city>/<café-slug>` | the map with that café's bill open |
| `#/<city>/list` | the full tab — every café and investor, printable via "Save as PDF" |

## Data

`src/data/bengaluru.json` and `src/data/mumbai.json`. Each café has `vcs` (named investors, each
with one `proof`) and `scene` (evidence the café is a startup meeting spot without a named
investor). An investor's `crowd` (`big`, `first`, `angel`, `cohort`) sets the café's zone; see
`src/data/zones.ts`.

Rules for adding a café: the receipt must be public, must name the café, and is quoted verbatim.
No receipt, no pin.

```bash
npm test                          # schema, bounds and zone-rule checks
node tools/verify-receipts.mjs    # re-fetches every tweet and article and checks the quotes still match
node tools/fetch-avatars.mjs      # pulls X profile photos for investors whose receipt is their own tweet
node tools/smoke.mjs              # drives the main flows in Chrome against the preview server
node tools/shot.mjs --url http://127.0.0.1:4190/#/mumbai --out shots/mumbai.png
```

## Config

`src/config.ts`: set `repo` to a GitHub `owner/repo` to turn on the "Add a receipt" and removal
links (they open `.github/ISSUE_TEMPLATE/receipt.yml`), and `maker` to sign the footer credit.
