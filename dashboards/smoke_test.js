/**
 * smoke_test.js — load a built dashboard page in jsdom and report what mounted.
 *
 * Reason this exists: esbuild happily produces a bundle that throws on the
 * first hook call (two React copies, bad import, hook outside a component).
 * The build "succeeds" and the page is blank white. Catch that here.
 *
 * Usage:  node smoke_test.js historical_returns.html
 * Exit 0 = React mounted and produced text. Exit 1 = blank or threw.
 */

const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const file = process.argv[2];
if (!file) {
  console.error("usage: node smoke_test.js <page.html>");
  process.exit(2);
}

const html = fs.readFileSync(path.resolve(file), "utf8");
const errors = [];

const dom = new JSDOM(html, {
  runScripts: "dangerously",
  pretendToBeVisual: true,
  virtualConsole: new (require("jsdom").VirtualConsole)().on("jsdomError", (e) => {
    // jsdom reports unimplemented layout APIs constantly; only keep real ones
    if (!/Not implemented/.test(e.message)) errors.push(e.message.split("\n")[0]);
  }),
});

setTimeout(() => {
  const root = dom.window.document.getElementById("root");
  const chars = root ? (root.textContent || "").trim().length : 0;
  if (errors.length) {
    console.log(`     FAIL  ${path.basename(file)} — ${errors[0]}`);
    process.exit(1);
  }
  if (chars < 50) {
    console.log(`     FAIL  ${path.basename(file)} — mounted but rendered ${chars} characters (blank page)`);
    process.exit(1);
  }
  console.log(`     ok    ${path.basename(file)} — mounted, ${chars} characters rendered`);
  process.exit(0);
}, 2000);
