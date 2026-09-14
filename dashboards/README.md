# Investments — Interactive Dashboards

Self-contained HTML builds of the React dashboards used in the MSc Finance
"Investments" module. Served by GitHub Pages, linked from Moodle.

Live index: **https://KroeTiA.github.io/Investments/dashboards/**

---

## How it works

`src/*.jsx` holds the React source. `build_dashboards.py` bundles each one —
React, the charting library and the component — into a single `<slug>.html`
in this folder, then regenerates `index.html` from `manifest.yaml`.

One file per dashboard, no sibling assets. That single file is what Pages
serves, and it is also what you upload to Moodle directly if Pages is ever
unavailable. No second build path to maintain.

---

## One-time setup

**Local:**

```bash
cd dashboards
npm install
```

**GitHub Pages:** repository → Settings → Pages → Source: *Deploy from a
branch*, branch `main`, folder `/ (root)`. The whole repo is then served, and
this folder lives at `/Investments/dashboards/`. First deploy takes 1–2
minutes; later pushes are live in well under a minute.

---

## Adding a dashboard

1. Drop the component in `src/<slug>.jsx` with a `export default function`.
2. Add an entry to `manifest.yaml` (slug, src, lecture, title, blurb).
3. `python3 build_dashboards.py`
4. Commit `src/<slug>.jsx`, `manifest.yaml`, `<slug>.html`, `index.html`.

Build one dashboard only: `python3 build_dashboards.py <slug>`.
The index is always rebuilt from the full manifest, so a partial build never
drops entries from the landing page.

---

## Linking from Moodle

Add a **URL** activity per lecture section:

- URL: `https://KroeTiA.github.io/Investments/dashboards/<slug>.html`
- Appearance → Display: **New window** (not *Embed* — the Boost content
  column is too narrow for a two-panel chart layout)

Link the index page once at the top of the course page so students have one
address for everything: `.../dashboards/`.

---

## Two things that will bite you

**The generated entry file must stay inside this folder.** `build_dashboards.py`
writes `._entry.jsx` here and deletes it afterwards. If it is moved to a temp
directory outside the project, esbuild resolves `react` separately for the
entry and for the component, the bundle ships two React copies, and every hook
call throws `Cannot read properties of null (reading 'useState')` — at runtime
only. The build reports success and the page is blank white.

**That failure mode is why `smoke_test.js` runs after every build.** It loads
the finished page in jsdom and fails the build if React mounted nothing.
Charts themselves are not verified — `ResponsiveContainer` measures zero width
in jsdom, so SVG element counts are meaningless there. Open the page in a real
browser once before the lecture.

---

## What does not belong in this repo

`itembank.yaml`, solution notebooks and anything else that reveals assessment
content. The repo is public; Pages makes it more visible, not less.
