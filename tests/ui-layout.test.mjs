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
assert.match(css, /article\.is-expanded > \*:not\(\.section-titles\)\s*\{[^}]*flex:\s*1 1 0 !important;[^}]*height:\s*auto !important;/s, "expanded journal editor roots grow with the card");
assert.match(css, /article\.is-expanded \.editor-container\s*\{[^}]*display:\s*flex !important;[^}]*flex-direction:\s*column !important;/s, "Foundry editor containers can use the expanded height");
assert.match(css, /\.t20ga-hero-art\s*\{[^}]*width:\s*100%;[^}]*height:\s*100%;[^}]*object-fit:\s*var\(--t20ga-art-fit, contain\);[^}]*object-position:\s*center center;/s, "avatar and token art show completely unless fill mode is selected");
assert.match(css, /\.t20ga-hero-frame\.is-party-art \.t20ga-hero-art\s*\{[^}]*object-fit:\s*contain;/s, "gallery previews keep their full-body presentation");
assert.match(script, /DEFAULT_ART_POSITION = Object\.freeze\(\{ x: 0, y: 0, scale: 1, fit: "contain" \}\)/, "full-image fitting is the default");
assert.match(script, /name="fit"/, "the art dialog lets users choose the fitting mode");
assert.match(css, /\.t20ga-dialog-art\s*\{[^}]*object-fit:\s*var\(--dialog-art-fit, contain\);/s, "the adjustment preview matches the selected fitting mode");
assert.match(css, /#context-menu \.context-item[^}]*color:\s*#fff7e4 !important;/s, "context menu labels remain readable on the dark menu");
assert.match(script, /syncArtMode\(src, mode, button\)/, "avatar and token modes do not inherit gallery preview fitting");
assert.match(script, /journalExpandButtons\.on\("click"/, "journal expand buttons are interactive");
assert.equal(manifest.version, "1.6.6", "manifest version is updated");

console.log("Ficha Heroica UI regression checks passed");
