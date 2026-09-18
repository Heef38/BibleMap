# Design notes

## Layout

Three panes: search and navigation (left), the visualization (center), the reader (right). Below 900px the panes become tabs. The reader's position is mirrored into the URL as `?p=John.3.16`, so every view is a link.

## Type

Interface text is Inter; scripture is Source Serif 4. Text sizes for scripture are user-settable.

## Color

Interface tokens live in `src/index.css` as CSS custom properties; light is the default and dark is a selected palette, not an inversion. Chart colors follow the validated data-viz palette: eight categorical slots assigned in fixed order (a ninth group falls back to gray), a single blue sequential ramp for density, and text always in text tokens rather than series colors.

| Use | Token |
|---|---|
| Person references | `--series-1` (blue) |
| Verse search results | `--series-2` (orange) |
| Place references | `--series-3` (aqua) |
| Event references | `--series-4` (yellow) |
| Topic references | `--series-7` (violet) |
| Study groups | `--series-1` to `--series-8` in order |
| Words of Jesus (reader) | `--wj` |
| Density (canon strip) | `--seq-lo` to `--seq-hi` |

## The canon strip

Sixty-six books drawn to the length of their text, in two rows (Old and New Testament). A book's fill is the share of its verses in the current set; individual verses are drawn as ticks when the set is small enough to see them. Clicking a book expands its chapters; clicking a chapter opens it in the reader.

## The theme map

A zoomable sunburst. The inner ring is the study's groups, the outer ring its references, sized by weight. Words of Jesus are drawn solid; other references in a lighter tint of their group. Clicking a group zooms into it; clicking a reference opens it in the reader. The legend and the reference table beside it carry every value, so nothing depends on hover or color alone.

## The connection map

A radial "dandelion": the focus at the center, straight branches at even angles, one dot per connection spaced along each branch (offset alternately when a branch is dense), branch labels at the tips. Dots are sized by weight and drawn solid for the words of Jesus. Zooming into a dot rebuilds the map around it; a breadcrumb trail and the center circle lead back. Automatic branches (cross references, people, places) are drawn in muted gray so authored connections stay primary.

## The Bible layout

A squarified treemap (d3.treemap) of the 66 books by verse count, nested testament, division, book. Only two hues are used, one per testament; divisions are separated by layout and labels rather than by color, which keeps the chart within the categorical palette rules.
