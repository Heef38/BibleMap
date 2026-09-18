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

`pnpm build` produces a deployable `dist/` for any static host. The app uses client-side routing; `public/_redirects` handles that on Netlify and Cloudflare Pages, and the build writes a `404.html` copy for GitHub Pages. To host under a sub-path (a GitHub Pages project site), build with `BASE_PATH=/repo-name/`. The workflow in `.github/workflows/deploy.yml` does this automatically on every push to `main` once Pages is enabled with "GitHub Actions" as the source.

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
| `src/components/viz/` | Visualizations: the canon strip, the theme-map sunburst, the zoomable timeline, and the arc diagram for connection studies. |
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

A *connection* study links each reference to a second passage and sorts the links into categories, which the app draws as arcs between the two Testaments:

```yaml
id: christ-in-the-old-testament
kind: connections
categories:
  direct: { title: Direct reference }
  type: { title: Type }
  shadow: { title: Shadow }
views:
  - title: By theme
    groups:
      - title: Signs in the wilderness
        refs:
          - ref: Num 21:4-9
            to: John 3:14-15
            category: type
            note: The bronze serpent lifted up
  - title: By kind
    auto: category
```

### Studies on the connection map

Every study can be shown as a **map**: the study at the center, one branch per group, a dot per reference. Click a dot to zoom into it; its branches become the topics it connects to (from `links`), plus automatic branches for cross references, people and places, so you can keep exploring outward. Click a line or a branch label for a popup with the group's theme. The `chart` field in a study picks the default chart (`map`, `arcs` or `sunburst`).

```yaml
- ref: Matt 13:1-9, 18-23
  label: The sower
  links:
    - to: Isa 55:10-11
      topic: The word that does not return empty
      category: background
```

Links declared on a passage in one view are shared by the same passage in every other view.

### Studies on a timeline

Every study also has a **Timeline** chart: one row per group (theme), each reference placed by the traditional year of its verses, so the story reads left to right and the themes top to bottom. Events from the timeline data that fall inside the study's passages appear in a muted row underneath. Set `chart: timeline` to open a study on it, and `timeline: { from, to, note }` to choose the years it opens on when the automatic choice is not right (the Exodus study opens on 1650 to 1415 BC and leaves the apostles' retellings a "fit all" away). Clicking a reference on the timeline or on the sunburst opens its overview: note, text, and every passage it links to, grouped by topic.

## Timelines

Every person page has a timeline: their lifespan when the text gives it, the lifespans of parents, spouses and children, the events they took part in, and a histogram of the verses that mention them by year of the story. The `/timeline` page shows all 450 dated events, with the longer periods (kingdoms, journeys, patriarchs' lifetimes) as bands. Years follow the traditional chronology in the Theographic data and are approximate.

## Comparing two people

`/compare?a=<person>&b=<person>` puts two people on one map: bridges between them for the verses they share, the people both know, the places both appear in and the events they share, with each person's own people, places and events fanning out on their side. Below it, a shared timeline and a canon strip in two colors. Every person page has a "Compare with…" button.

## Orientation pages

`/bible` draws the 66 books as blocks sized by length, grouped by testament and kind of writing, followed by a chord diagram of the cross references between the parts of the Bible (by kind of writing or by book), and each book page (`/book/Rom`) shows where the book sits, its traditional writer, its chapters, and an outline built from the section headings of the current translation.

## Keyboard

`/` focuses the search box, `[` hides or shows the search pane, `]` hides or shows the reading pane. Both panes also have edge handles.

## Name meanings

Every person and place page shows what the name means, with the Hebrew and Greek forms, transliteration and Strong's number where the BibleData labels have them, and Hitchcock's 1869 gloss as a second opinion. The meaning also appears in search results and on map dots.

## Data sources

All sources are open. See the in-app credits page for the full list; the main ones are the Berean Standard Bible (public domain), Theographic Bible Metadata (CC BY-SA 4.0), OpenBible.info cross references (CC BY), and the audited Nave's and Torrey's topical indexes (public domain sources). Dates follow traditional chronology and are approximate.
