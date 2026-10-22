# Decisions

Why Bible-Map is the way it is, newest first. Add a line when something is decided, with the reason.

## 2026-10-22

- **No separate kids' version.** One site serves every level instead, with a level each person picks (see the roadmap). That keeps Bible-Map a general-audience site with no child accounts, and nothing has to be built twice.
- **A version history on the site.** `CHANGELOG.md` is the record and the site shows it at `/versions`; a test keeps it in step with `package.json`. Versions 0.1 to 0.4 were rebuilt from the commit history, dated by the day each went live.
- **Write down what we do.** `CHANGELOG.md` for what changed, `docs/roadmap.md` for what comes next, this file for why, `docs/design.md` for how it looks, and the README for how it works.
- **The About page says why Bible-Map exists**: for believers at every stage, and for anyone who doesn't believe, so they can see what we see.

## 2026-10-20

- **A redesign has begun, and Heath leads it**, starting from screenshots of the current screens.

## 2026-10-15

- **www.bible-map.com is the main address.** bible-map.com and the old vercel.app address forward to it, carrying readers' settings along, and only the main address is offered to search engines.
- **Visits are counted with Vercel Web Analytics**: built into the host, no cookies.

## 2026-09-21

- **Writings replace notes.** Answers to questions about the Bible, with every passage linked and checked when the site is built.
- **The name Bible-Map**, with the BIBLE-MAP logo, and the metadata search engines need to list every page.
- **Every map follows one rule**: hovering shows what anything is and what a click will do, and a click goes straight there, with no popup menus.
- **The Bible sits in the center**, search on the left and maps on the right, and studies get their own page.

## 2026-09-19

- **Only Heath approves trusted authors**, for now.
- **The long-term vision lives in the "BibleMap: Future Features" doc**: reading stays free with no account, accounts are only for taking part (13 and up), and an AI review checks every post before it appears.
- **New studies and features are announced in What's new**, and its Coming soon tab promises no dates.

## 2026-09-18

- **A static site whose data is compiled when it is built**, made with React and TypeScript (Vite, D3, Zustand, Tailwind). Every view is a URL.
- **Public-domain translations only**: the Berean Standard Bible by default, plus the KJV, WEB, ASV and YLT, so every translation can be shown in full for free.
- **Open data only**, credited on the Credits page: Theographic, OpenBible.info cross references, BibleData, and Nave's and Torrey's topical Bibles.
- **Studies are hand-written YAML** that the build checks; a reference that doesn't resolve stops the build.
- **Hosted on Vercel**, with a public feedback board that needs no account.
