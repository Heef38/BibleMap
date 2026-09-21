# BibleMap

Visualize the connections of the Bible: people, places, themes, and the story that runs through them.

BibleMap is a static web app. The left pane finds people, places, topics, events and verses, with a notebook under it; the Bible sits in the center in several public-domain translations; the right pane shows the visualizations beside it. Every view is a URL.

## Running it

```bash
pnpm install
pnpm data:fetch     # downloads the raw sources into data/raw (about 200 MB, one time)
pnpm data:build     # compiles them into public/data (about 12 seconds)
pnpm dev            # http://localhost:5173
```

`pnpm build` produces the static site in `dist/`. `pnpm dev` also serves the feedback board's functions (`api/`), keeping posts in memory until you restart it.

`pnpm test` runs the reference-parser, USFM-parser and feedback-board tests. `pnpm typecheck` runs TypeScript.

## Deploying

The site runs on [Vercel](https://vercel.com): the static app, plus three small functions in `api/` for the feedback board, which store posts in Upstash Redis.

1. In Vercel, **Add New → Project** and import this GitHub repository. Vercel detects Vite; `vercel.json` adds the client-side routing and caching rules. Deploy.
2. In the project, open **Storage → Create Database → Upstash for Redis** (the free plan is plenty) and connect it to the project. That sets `KV_REST_API_URL` and `KV_REST_API_TOKEN`.
3. In **Settings → Environment Variables**, add `ADMIN_TOKEN`: a long random string, for example the output of `openssl rand -hex 24`. Keep it private; it is the only key to moderation.
4. Redeploy (**Deployments → ⋯ → Redeploy**) so the functions see the new variables.

After that, every push to `main` deploys to production and other branches get preview URLs. `.github/workflows/ci.yml` runs the tests and a build on every push.

To moderate, open `/feedback?admin` on the live site and enter the `ADMIN_TOKEN`. You can then see hidden posts, set a status (planned, in progress, done, not planned), reply publicly, hide, and delete. The key stays in that browser until you press Lock.

To use the real database while developing, run `vercel env pull .env.local` (Vercel CLI); `pnpm dev` picks it up. Without it, `pnpm dev` uses an in-memory store.

The About page, the owner's name on replies, and the Donate button are set in `src/config/site.ts`. The Donate buttons appear once `donateUrl` is filled in.

Any other static host still serves everything except the feedback board: `public/_redirects` covers Netlify and Cloudflare Pages, the build writes a `404.html` for GitHub Pages, and `BASE_PATH=/repo-name/` builds for a sub-path.

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
| `api/`, `server/feedback.js` | The feedback board's Vercel Functions and the logic behind them (plain JavaScript with JSDoc types). |
| `src/config/site.ts` | Owner name, About text, donation link. |
| `src/config/studies.ts` | The shelves on the Studies page. A study not on a shelf lands under "More studies". |

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

Every study can be shown as a **map**: the study at the center, one branch per group, a dot per reference. Click a dot to zoom into it; its branches become the topics it connects to (from `links`), plus automatic branches for cross references, people and places, so you can keep exploring outward. Every map follows one rule: hovering anything shows what it is and what a click will do, and a click goes straight there with no menu in between. A group's branch (its line or its label) zooms into the group, a dot zooms into its passage, and the center steps back. On the verse and chapter maps a dot follows its link (the Bible and the map move to it) and a branch spreads that part of the Bible out by book. The `chart` field in a study picks the default chart (`map`, `arcs` or `sunburst`).

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

### The triangle chart

A study can be drawn as a triangle (the Trinity study is): three corners, a center, a spoke from each corner to the center, and on each side a line each way. One facet places the passages; each of its values says where it sits:

```yaml
chart: triangle
triangle:
  facet: bond
  corners:
    - { id: father, title: "The Father", short: "Father" }
    - { id: son, title: "The Son", short: "Son" }
    - { id: spirit, title: "The Holy Spirit", short: "Spirit" }
  center: { title: "One God", short: "God" }
facets:
  bond:
    title: "Who relates to whom"
    values:
      one: { title: "God is one", at: center }          # around the center, in ink
      all: { title: "All three together", at: all }     # around the center, in all three colors
      son: { title: "The Son is God", at: son }         # on the Son's spoke
      f-s: { title: "The Father to the Son", from: father, to: son }   # on the side, the Father's line
```

A passage tagged with several values appears in each place. Hover anything to see it; click a passage to open it (with the Bible beside it), and a corner, a line or the center to list just those passages. The chips under the chart do the same, for touch screens and keyboards.

### Facets and the Patterns chart

A study can also sort the same passages several ways at once and count them. Declare `facets`, each with a fixed list of values, tag passages with them, and add `auto: facet` views:

```yaml
chart: patterns
facets:
  initiative:
    title: Who started it
    values:
      jesus: { title: Jesus went to them }
      brought: { title: Others brought them }
views:
  - title: By kind
    groups:
      - title: Healings
        refs:
          - ref: Mark 2:1-12
            facets: { initiative: brought, addressed: [declared, command] }
  - title: Who started it
    auto: facet
    facet: initiative
```

A passage can carry several values of one facet, or none (then it is left out of that count). The **Patterns** chart draws one small bar chart per facet, counting passages (one per event, not verses), filtered by the groups of the study's first view; click a bar to list its passages. The miracles study uses this to count who came to whom, what Jesus spoke to, and when he touched.

## Timelines

Every person page has a timeline: their lifespan when the text gives it, the lifespans of parents, spouses and children, the events they took part in, and a histogram of the verses that mention them by year of the story. The `/timeline` page shows all 450 dated events, with the longer periods (kingdoms, journeys, patriarchs' lifetimes) as bands. Years follow the traditional chronology in the Theographic data and are approximate.

## Comparing two people

`/compare?a=<person>&b=<person>` puts two people on one map: bridges between them for the verses they share, the people both know, the places both appear in and the events they share, with each person's own people, places and events fanning out on their side. Below it, a shared timeline and a canon strip in two colors. Every person page has a "Compare with…" button.

## Orientation pages

`/bible` draws the 66 books as blocks sized by length, grouped by testament and kind of writing, followed by a chord diagram of the cross references between the parts of the Bible (by kind of writing or by book), and each book page (`/book/Rom`) shows where the book sits, its traditional writer, its chapters, and an outline built from the section headings of the current translation.

## The panes

On a desktop: search and notes on the left, the Bible in the center, and the right pane beside it.

- The right pane shows the page you open (a study, a person, a place, the timeline). At rest it shows **This chapter** (`/`), which follows the reader: the chapter's outline, a connection map of the chapters its cross references land in (one branch per part of the Bible), its most connected verses, who and what it names, its events, the studies that pass through it, and its reach on the canon strip.
- Clicking a verse in the Bible opens its **verse map** over the right pane: the verse, the people and places in it, the studies it is in, a map of its cross references by part of the Bible (strongest nearest the center), and the full list. A dot's popup reads the passage or moves the map to it. The page underneath stays as it was; the bar's back arrow, the ✕, or a second click on the verse returns to it. Jumps the page itself makes (clicking a reference in a study) move the Bible but do not open a verse map.
- The bar between the Bible and the right pane drags to share the width (double-click resets it). The widen button in the right pane's bar spreads it over the Bible for wide charts; asking to read something brings the Bible back.
- Notes sit under the search pane: separate notes, each remembering where it was started ("Kingdom of Heaven · Matthew 13"), with the references written in them turned into links, and a button that writes the selected verse (or the chapter) into the note. They are kept in this browser only; the download button saves them all as one Markdown file. The bar above them resizes them, and the arrow folds them away.
- `/studies` shelves every study by theme, each card with a strip showing where its passages fall.

## Keyboard

`/` focuses the search box, `[` hides or shows the search pane, `]` hides or shows the right pane. Both also have edge handles on the Bible.

## Announcing what's new

When a study or feature ships, add an entry at the top of `src/config/updates.ts` (an id that never changes, the date, a title, a sentence, and an optional link). Readers see a dot on **What's new** in the header until they open it. A first-time visitor only gets the dot for entries from the last two weeks. For a new study, also add `added: "YYYY-MM-DD"` to its YAML: it is tagged **New** and listed first for 30 days.

## Phones

Below 900px the panes become tabs (Explore, Read, Map), in the order of the desktop panes; the notes sit under Explore. Tapping a verse lists its connections under the text, with a Map button that opens the verse map on the Map tab. The book button in the header docks the Bible under the page instead, so a study and the text it points to are on screen together; drag the bar between them (or focus it and use the arrow keys) to resize. Both choices are remembered.

## Back and Forward

Every jump in the reader (a reference, a cross reference, the book or chapter picker) is a step in the browser history, recorded in the URL as `?p=`, so Back returns to where you were reading. Turning a chapter updates the current step instead of adding one. Opening or closing a verse map is a step too, recorded as `?v=`, so Back closes the map you just opened (and Forward opens it again). The bar under the header (its left half goes back, its right half forward), the browser's own buttons, Alt+← and Alt+→, and a phone's back gesture all do the same; on a phone, Back also returns to the tab (Explore, Map, Read) you were on. Back stops at the first page of the visit rather than leaving the site.

## Name meanings

Every person and place page shows what the name means, with the Hebrew and Greek forms, transliteration and Strong's number where the BibleData labels have them, and Hitchcock's 1869 gloss as a second opinion. The meaning also appears in search results and on map dots.

## Data sources

All sources are open. See the in-app credits page for the full list; the main ones are the Berean Standard Bible (public domain), Theographic Bible Metadata (CC BY-SA 4.0), OpenBible.info cross references (CC BY), and the audited Nave's and Torrey's topical indexes (public domain sources). Dates follow traditional chronology and are approximate.
