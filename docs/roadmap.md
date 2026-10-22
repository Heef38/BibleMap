# Roadmap

Where Bible-Map goes next, in order, with no dates. Bible-Map is for anyone at any level: someone opening the Bible for the first time, a lifelong reader, a pastor, a scholar, or someone who doesn't believe and wants to see what the fuss is about. The community features (accounts, conversations on verses, groups) are recorded in the "BibleMap: Future Features" doc and come after everything here.

## Rules every plan keeps

- **Free.** No paywalls, ads or paid tiers. It runs on Vercel's free Hobby plan (non-commercial, donations allowed) and pays for no service while people use it.
- **Legal.** Only public-domain or openly licensed text, data and art, each credited on the Credits page. No copyrighted translations (NIV, ESV, NLT and the like), so every translation can be shown in full.
- **For every age, aimed at none.** Kids can use it beside their parents like any Bible, but there is no children's section, no child accounts, and none of the things US law treats as signs of a site aimed at children (cartoon mascots, prize games). Accounts, when they come, are for 13 and up.
- **Private.** Settings and progress stay in the browser. Visits are counted with Vercel's analytics, which uses no cookies. Nothing personal is collected unless someone makes an account.
- **Checked.** Every reference resolves when the site is built, quotes match the translation they cite, and studies say where a grouping is a judgment call.
- **Nothing locked.** A level changes where you start and how much shows at once. It never hides anything; the rest is one tap away.

## Levels

On a first visit, the welcome card on the chapter view asks how well the visitor knows the Bible, with four answers. It is a card on the page, not a pop-up, so nothing blocks reading (Google also discourages pop-ups that cover a page on phones). Settings has the same four choices, so changing your mind takes one tap, and skipping the question means Growing, which is the site as it is today.

The level is about how much detail someone wants, not how strong their faith is: someone exploring Christianity with a degree in ancient languages can pick Theologian.

| | Beginner | Growing | Deep | Theologian |
|---|---|---|---|---|
| Who | New to the Bible, or exploring faith | Reads it and wants to understand more | Studies it closely, leads or teaches | Wants the original languages and every data point |
| Start page | Start here: what the Bible is, where to begin reading, the big story | This chapter's map and the studies | The same, with timelines | The same, with word studies |
| Reading | Basic English or BSB, a Listen button, headings | BSB, the strongest cross references | Translations side by side, every cross reference | Literal translations (YLT), Hebrew and Greek words |
| Names and words | Plain meanings, and a glossary of Bible words | Meanings | Meanings with Hebrew and Greek forms | Forms, Strong's numbers, every occurrence |
| Studies | Trails first, simple maps and lists | Studies on the map | Every chart: arcs, patterns, timelines, compare | Every chart, with counts and data notes |
| Themes open at | The big story | Stories | Verses and books | Words |

Later, with accounts, the level is saved with the account, so the same start page and progress follow a person to any device. What progress shows follows the level: a beginner sees trails and chapters read, a theologian also sees the words they've studied.

## Next, in order

1. **Levels.** The question on the welcome card, the choice in Settings, and level-aware defaults on the pages that exist now. A Start here card for beginners (what the Bible is, where to begin reading, studies to start with). Hebrew and Greek name forms folded away for Beginner and Growing and shown up front for Deep and Theologian. The verse map's cross references trimmed to the strongest few for Beginner, with "show all".
2. **Easier reading for everyone.**
    - A Listen button that reads any passage aloud with the browser's own voices: free, on the device, nothing sent anywhere.
    - The Bible in Basic English (public domain, a 1,000-word vocabulary) as a sixth translation, from eBible.org like the WEB.
    - A glossary of about 150 Bible words in plain language (covenant, Messiah, Pharisee, grace), written for Bible-Map, with Easton's 1897 dictionary, already in the data, for depth.
3. **Trails.** Guided walks through Scripture, one stop at a time, in YAML like the studies and checked by the same build:
    - The stops: read (with something to look for), see it on the map, ask (common questions with answers written ahead and checked), notice (your own note, kept in the browser), check yourself (a few questions), a memory verse, something to practice this week, and something to talk over with someone.
    - One trail serves every level: stops marked deep show for Deep and Theologian and sit behind "Go deeper" for everyone else.
    - Four series: characters, names of God, the fruit of the Spirit, and the growth ladder of 2 Peter 1:5-7 (faith, virtue, knowledge, self-control, perseverance, godliness, brotherly kindness, love).
    - Four pilots, one per series: The LORD Is My Shepherd, Joseph from the pit to the palace (with a journey map), David and Mephibosheth (kindness), and Daniel (self-control).
    - Growth, not points: trails mark what was learned and practiced, never score anyone's character, and keep no streaks.
    - The prepared answers can be drafted with Claude for a few dollars, once, or written by hand; either way they are read and checked before they ship.
4. **Themes at five zoom levels.** For a theme like love: the words (ahavah, chesed, agape), the verses that say it, the stories that show it, the books about it, and how it runs through the whole Bible. The first two come from the data; the other three are written. The level sets where a theme opens. Start with about 25 themes.
5. **Pictures on verses.** Public-domain art (Doré, Schnorr von Carolsfeld, Tissot, and the Providence Lithograph Bible cards of 1896-1913) and Sweet Publishing's illustrations (CC BY-SA), each tied to its passage and credited.
6. **Progress that stays private.** Trails finished, verses learned, and the chapters read colored on the canon strip, kept in the browser, with a link that moves them to another device.
7. **Then the community features** in the Future Features doc: accounts (13 and up), conversations on verses, groups, and an AI review of every post.

## Not doing

- A separate kids' version or child accounts (decided 2026-10-22).
- NFTs, or anything with a resale value.
- Streaks, leaderboards, or scores for anyone's character.
- A live AI chat, while it would cost money for every question; prepared answers instead.
- Copyrighted translations.
