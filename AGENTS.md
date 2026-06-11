## Learned User Preferences

- Ask before committing unless the user explicitly says to commit and/or push.
- README should be a project overview for developers landing on the repo, not the full build plan.
- README should credit Claude Code for the design, link to the interactive 3D guide, and include the finished bench photo (`assets/workbench.png`).
- The full printable build plan belongs in `stud-anchored-workbench-build-guide.md`, not in README.
- In `buy-list.md`, list outstanding items first and show owned/bought items as ~~struck-through~~ below; no separate "on order" section—mark ordered items **Have** like other owned items.

## Learned Workspace Facts

- This repo (`dpappo/workbench`) documents a DIY stud-anchored garage workbench — documentation and an interactive guide, not an application or library.
- GitHub remote: https://github.com/dpappo/workbench; default branch is `main`; repo is public for GitHub Pages on the free tier.
- Interactive 3D build guide is `index.html`, live at https://dpappo.github.io/workbench/.
- GitHub Pages deploys via GitHub Actions (`.github/workflows/pages.yml`); `.nojekyll` is present to skip Jekyll processing.
- Key artifacts: `stud-anchored-workbench-build-guide.md` (written guide), `index.html` (3D guide), `buy-list.md` (Home Depot shopping checklist with homedepot.ca links), `assets/workbench.png` (finished bench photo).
- Frame joinery uses a Kreg 320 pocket-hole jig (36 guided joints — joists only); kicker tails toe-screw up into the cleat (no wall blocks); the bench is still stud-anchored to the wall with lag bolts.
