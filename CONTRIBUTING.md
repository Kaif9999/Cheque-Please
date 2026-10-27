# Contributing

## Suggest a café or ask to be removed

Open an issue with the **Receipt** form. For an addition, include a public tweet or article that
names both the investor and the café. Read [what counts as a receipt](docs/data.md#what-counts-as-a-receipt)
first.

## Working on the code

```bash
npm install
npm run dev          # http://127.0.0.1:5190
```

Before you push:

```bash
npm run check        # typecheck, lint, formatting, unit tests
npm run build && npm run preview   # in one terminal
npm run smoke        # in another: the browser flows against the preview server
```

CI runs the same on every push to `main` and on pull requests.

Read [docs/architecture.md](docs/architecture.md) before larger changes. In short:

- Keep `domain/` free of the DOM and the map, and point dependencies inward.
- Build markup with the `html` tag, never string concatenation into `innerHTML`.
- Style with Tailwind utilities, and add a token to `@theme` before reaching for a raw colour.
- Add or update a test with every behaviour change. Views can be tested in happy-dom
  (`tests/ui/views.test.ts`).

## Commits

One small step per commit. The subject is a conventional-commit line in the imperative, around
50 characters, for example `fix(map): move to the new city even on short screens`. Add a body only
when the reason isn't obvious from the diff.

## Data changes

Follow [docs/data.md](docs/data.md). Every receipt is quoted verbatim, dated and linked, and
`node tools/verify-receipts.mjs` must pass.
