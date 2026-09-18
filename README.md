# BibleMap

Visualize the connections of the Bible: people, places, themes, and the story that runs through them.

BibleMap is a static web app. A search pane on the left finds people, places, topics, events and verses; the center shows a visualization; the right pane is a read-along Bible in several public-domain translations. Every view is a URL.

## Running it

```bash
pnpm install
pnpm data:fetch     # downloads the raw sources into data/raw (about 200 MB, one time)
pnpm data:build     # compiles them into public/data (about 12 seconds)
pnpm dev            # http://localhost:5173
```

`pnpm build` produces a deployable `dist/` for any static host (Cloudflare Pages, Netlify, GitHub Pages). The app uses client-side routing, so the host must serve `index.html` for unknown paths.

`pnpm test` runs the reference-parser and USFM-parser tests. `pnpm typecheck` runs TypeScript.

## Where things live

| Path | What it is |
|---|---|
| `data/studies/*.yaml` | Hand-authored studies (theme maps). Edit these, then run `pnpm data:build`. |
| `data/raw/` | Downloaded sources, not committed. |
| `scripts/build-data.ts` | Compiles every source into `public/data/`. Deterministic. |
| `scripts/lib/usfm.ts` | USFM parser (verse text, words of Jesus, headings). |
| `src/lib/canon.ts` | The 66 books, every spelling of their names, and the 31,102-verse grid. |
| `src/lib/refs.ts` | Reference parser: `John 3:16`, `Matt 13:24-30, 36-43`, `Gen.1.1-Gen.2.3`. |
| `src/components/viz/` | Visualizations: the canon strip and the theme-map sunburst. |
| `src/pages/` | One page per kind of thing: person, place, topic, event, study, search. |
| `public/data/` | Compiled data the app fetches. Committed so the site deploys without a data build. |

## Writing a study

A study is a YAML file with an id, a title and one or more views. Each view groups references:

```yaml
id: kingdom-of-heaven
title: The Kingdom of Heaven
views:
  - title: By theme
    groups:
      - title: Parables of the kingdom
        note: What the kingdom is like.
        refs:
          - ref: Matt 13:24-30, 36-43
            note: The weeds among the wheat
          - Matt 13:31-32
  - title: By book
    auto: book          # derived views: book, testament, jesus
```

Weights are computed: a reference that contains the words of Jesus (red-letter markup in the Berean Standard Bible) counts 3, everything else 1. Add `weight:` to a reference or a group to override. Keep a view to eight groups or fewer so every group gets its own color.

## Data sources

All sources are open. See the in-app credits page for the full list; the main ones are the Berean Standard Bible (public domain), Theographic Bible Metadata (CC BY-SA 4.0), OpenBible.info cross references (CC BY), and the audited Nave's and Torrey's topical indexes (public domain sources). Dates follow traditional chronology and are approximate.
