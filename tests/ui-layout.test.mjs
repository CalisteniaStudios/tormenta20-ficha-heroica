import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync(new URL("../styles/tormenta20-ficha-heroica.css", import.meta.url), "utf8");
const journal = fs.readFileSync(new URL("../templates/vendor/tormenta20-1.5.015/journal.hbs", import.meta.url), "utf8");
const script = fs.readFileSync(new URL("../scripts/tormenta20-ficha-heroica.mjs", import.meta.url), "utf8");
const manifest = JSON.parse(fs.readFileSync(new URL("../module.json", import.meta.url), "utf8"));

assert.match(css, /nav\.sheet-tabs\s*\{[^}]*justify-content:\s*center;/s, "the category bar is centered");
assert.match(css, /nav\.sheet-tabs\s*\{[^}]*flex-wrap:\s*nowrap;/s, "category buttons remain on one row");
assert.match(css, /nav\.sheet-tabs \.item\s*\{[^}]*flex:\s*0 1 160px;/s, "category buttons form a centered group");
assert.equal((journal.match(/class="t20ga-journal-expand"/g) ?? []).length, 6, "every character journal card has an expand button");
assert.match(css, /article\.is-expanded\s*\{[^}]*position:\s*absolute !important;[^}]*inset:\s*0 !important;/s, "expanded journal cards occupy the panel");
assert.match(script, /journalExpandButtons\.on\("click"/, "journal expand buttons are interactive");
assert.equal(manifest.version, "1.6.4", "manifest version is updated");

console.log("Ficha Heroica UI regression checks passed");
