#!/usr/bin/env python3
"""
build_dashboards.py — turn the JSX dashboards in src/ into self-contained HTML
pages that GitHub Pages can serve and Moodle can link to.

Each output page inlines React, the charting library and the component itself.
No CDN for code, no sibling assets, nothing to serve alongside it. The only
runtime network call is the Google webfont some dashboards import, which
degrades to a system font if blocked. The same file therefore also works as a
plain Moodle file resource if Pages is ever unavailable.

Usage
-----
    npm install                       # once, installs esbuild + React + recharts
    python3 build_dashboards.py       # build everything listed in manifest.yaml
    python3 build_dashboards.py historical_returns   # build one slug only

Output
------
    <slug>.html   one per dashboard, in this folder
    index.html    landing page, regenerated from manifest.yaml
"""

from __future__ import annotations

import html
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent
MANIFEST = ROOT / "manifest.yaml"
ESBUILD = ROOT / "node_modules" / ".bin" / "esbuild"

YELLOW = "#FFD500"
NAVY = "#1B3A5C"
FONT = "'Segoe UI', system-ui, -apple-system, sans-serif"


# --------------------------------------------------------------------------
# bundling
# --------------------------------------------------------------------------

def bundle(src: Path) -> str:
    """Compile one .jsx component into a single minified IIFE bundle.

    The generated entry file MUST live inside this folder. If it sits in a
    temp directory elsewhere, esbuild resolves "react" for the entry and
    "react" for the component from different places, the bundle ends up with
    two React copies, and every hook call fails at runtime with
    "Cannot read properties of null (reading 'useState')".
    """
    rel = src.relative_to(ROOT).as_posix()
    entry_js = (
        'import React from "react";\n'
        'import { createRoot } from "react-dom/client";\n'
        f'import App from "./{rel}";\n'
        'const el = document.getElementById("root");\n'
        'createRoot(el).render(React.createElement(App));\n'
    )
    entry = ROOT / "._entry.jsx"
    out = Path(tempfile.gettempdir()) / f"{src.stem}.bundle.js"
    try:
        entry.write_text(entry_js, encoding="utf-8")
        cmd = [
            str(ESBUILD), str(entry),
            "--bundle", "--minify",
            "--format=iife",
            "--jsx=automatic",
            "--loader:.jsx=jsx",
            "--target=es2019",
            f"--outfile={out}",
            '--define:process.env.NODE_ENV="production"',
        ]
        res = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
        if res.returncode != 0:
            sys.stderr.write(res.stderr)
            raise SystemExit(f"esbuild failed for {src.name}")
        return out.read_text(encoding="utf-8")
    finally:
        entry.unlink(missing_ok=True)
        out.unlink(missing_ok=True)


def smoke(page: Path) -> None:
    """Load the built page in jsdom and fail loudly if nothing renders."""
    if not (ROOT / "node_modules" / "jsdom").exists():
        print("     skip  smoke test (jsdom not installed)")
        return
    res = subprocess.run(
        ["node", str(ROOT / "smoke_test.js"), str(page)],
        cwd=ROOT, capture_output=True, text=True,
    )
    print(res.stdout.rstrip() or res.stderr.rstrip())
    if res.returncode != 0:
        raise SystemExit("Smoke test failed — do not deploy this page.")


def inline_safe(js: str) -> str:
    """Prevent a literal </script> inside the bundle from closing the tag."""
    return js.replace("</script", "<\\/script").replace("<!--", "<\\!--")


# --------------------------------------------------------------------------
# page templates
# --------------------------------------------------------------------------

PAGE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} — {course}</title>
<style>
  * {{ box-sizing: border-box; }}
  html, body {{ margin: 0; padding: 0; background: #f4f4f5; font-family: {font}; }}
  .topbar {{
    background: {navy}; color: #fff; border-bottom: 3px solid {yellow};
    padding: 10px 20px; display: flex; align-items: baseline;
    gap: 14px; flex-wrap: wrap; font-size: 13px;
  }}
  .topbar .course {{ font-weight: 700; letter-spacing: .3px; }}
  .topbar .lecture {{ color: {yellow}; font-weight: 600; }}
  .topbar a {{ color: #fff; text-decoration: none; opacity: .75; margin-left: auto; }}
  .topbar a:hover {{ opacity: 1; text-decoration: underline; }}
  #root {{ padding: 0 0 40px; }}
  .noscript {{ padding: 40px; font-size: 14px; color: {navy}; }}
</style>
</head>
<body>
<div class="topbar">
  <span class="course">{course}</span>
  <span class="lecture">{lecture}</span>
  <a href="./index.html">All dashboards ↗</a>
</div>
<div id="root"></div>
<noscript><p class="noscript">This dashboard needs JavaScript enabled.</p></noscript>
<script>{bundle}</script>
</body>
</html>
"""

INDEX = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dashboards — {course}</title>
<style>
  * {{ box-sizing: border-box; }}
  html, body {{ margin: 0; padding: 0; background: #f4f4f5; font-family: {font}; color: {navy}; }}
  .wrap {{ max-width: 820px; margin: 0 auto; padding: 0 20px 60px; }}
  header {{ background: {navy}; color: #fff; border-bottom: 3px solid {yellow}; padding: 26px 0 22px; margin-bottom: 28px; }}
  header .wrap {{ padding-bottom: 0; }}
  header h1 {{ margin: 0 0 4px; font-size: 22px; letter-spacing: .3px; }}
  header p {{ margin: 0; font-size: 13px; opacity: .8; }}
  .intro {{ font-size: 14px; line-height: 1.6; margin: 0 0 26px; color: #3f3f46; }}
  .card {{
    display: block; background: #fff; border: 1px solid #e4e4e7; border-left: 4px solid {yellow};
    border-radius: 4px; padding: 16px 18px; margin-bottom: 12px;
    text-decoration: none; color: inherit; transition: box-shadow .15s, transform .15s;
  }}
  .card:hover {{ box-shadow: 0 3px 14px rgba(0,0,0,.10); transform: translateY(-1px); }}
  .card .lecture {{ font-size: 11px; font-weight: 700; letter-spacing: .8px; color: #a16207; }}
  .card h2 {{ margin: 3px 0 6px; font-size: 16px; }}
  .card p {{ margin: 0; font-size: 13px; line-height: 1.55; color: #52525b; }}
  footer {{ margin-top: 34px; padding-top: 14px; border-top: 1px solid #e4e4e7; font-size: 11px; color: #a1a1aa; }}
</style>
</head>
<body>
<header><div class="wrap">
  <h1>{course} — Interactive Dashboards</h1>
  <p>{institution}</p>
</div></header>
<div class="wrap">
  <p class="intro">Each dashboard is a self-contained page. Nothing to install, nothing to log in to —
  open it on a laptop, tablet or phone. They are teaching tools, not assessment: explore freely.</p>
{cards}
  <footer>Built from <code>manifest.yaml</code> by <code>build_dashboards.py</code>. Last build: {stamp}.</footer>
</div>
</body>
</html>
"""

CARD = """  <a class="card" href="{slug}.html">
    <div class="lecture">{lecture}</div>
    <h2>{title}</h2>
    <p>{blurb}</p>
  </a>
"""


# --------------------------------------------------------------------------
# driver
# --------------------------------------------------------------------------

def main() -> None:
    if not ESBUILD.exists():
        raise SystemExit("esbuild not found — run `npm install` in this folder first.")

    cfg = yaml.safe_load(MANIFEST.read_text(encoding="utf-8"))
    entries = cfg["dashboards"]
    only = sys.argv[1:] 
    if only:
        entries = [e for e in entries if e["slug"] in only]
        if not entries:
            raise SystemExit(f"No dashboard in manifest.yaml matches {only}")

    for e in entries:
        src = ROOT / e["src"]
        if not src.exists():
            raise SystemExit(f"Missing source: {src}")
        js = bundle(src)
        page = PAGE.format(
            title=html.escape(e["title"]),
            course=html.escape(cfg["course"]),
            lecture=html.escape(e.get("lecture", "")),
            bundle=inline_safe(js),
            font=FONT, navy=NAVY, yellow=YELLOW,
        )
        out = ROOT / f"{e['slug']}.html"
        out.write_text(page, encoding="utf-8")
        print(f"  built  {out.name:<34} {len(page)/1024:7.0f} KB")
        smoke(out)

    # index always lists every dashboard in the manifest, not just the rebuilt ones
    from datetime import date
    cards = "".join(
        CARD.format(
            slug=d["slug"],
            lecture=html.escape(d.get("lecture", "")),
            title=html.escape(d["title"]),
            blurb=html.escape(d.get("blurb", "").strip()),
        )
        for d in cfg["dashboards"]
    )
    idx = ROOT / "index.html"
    idx.write_text(
        INDEX.format(
            course=html.escape(cfg["course"]),
            institution=html.escape(cfg["institution"]),
            cards=cards, stamp=date.today().isoformat(),
            font=FONT, navy=NAVY, yellow=YELLOW,
        ),
        encoding="utf-8",
    )
    print(f"  built  {idx.name:<34} {idx.stat().st_size/1024:7.0f} KB")
    print(f"\n  → {cfg['base_url']}")


if __name__ == "__main__":
    main()
