import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync(new URL("../styles/tormenta20-ficha-heroica.css", import.meta.url), "utf8");
const journal = fs.readFileSync(new URL("../templates/vendor/tormenta20-1.5.015/journal.hbs", import.meta.url), "utf8");
const characterSheet = fs.readFileSync(new URL("../templates/character-sheet.hbs", import.meta.url), "utf8");
const favorites = fs.readFileSync(new URL("../templates/vendor/tormenta20-1.5.015/lists/list-favorites.hbs", import.meta.url), "utf8");
const script = fs.readFileSync(new URL("../scripts/tormenta20-ficha-heroica.mjs", import.meta.url), "utf8");
const manifest = JSON.parse(fs.readFileSync(new URL("../module.json", import.meta.url), "utf8"));

assert.match(css, /nav\.sheet-tabs\s*\{[^}]*justify-content:\s*center;/s, "the category bar is centered");
assert.match(css, /nav\.sheet-tabs\s*\{[^}]*flex-wrap:\s*nowrap;/s, "category buttons remain on one row");
assert.match(css, /nav\.sheet-tabs \.item\s*\{[^}]*flex:\s*0 1 160px;/s, "category buttons form a centered group");
assert.equal((journal.match(/class="t20ga-journal-expand"/g) ?? []).length, 6, "every character journal card has an expand button");
assert.match(css, /article\.is-expanded\s*\{[^}]*position:\s*absolute !important;[^}]*inset:\s*0 !important;/s, "expanded journal cards occupy the panel");
assert.match(css, /article\.is-expanded > \*:not\(\.section-titles\)\s*\{[^}]*flex:\s*1 1 0 !important;[^}]*height:\s*auto !important;/s, "expanded journal editor roots grow with the card");
assert.match(css, /article\.is-expanded \.editor-container\s*\{[^}]*display:\s*flex !important;[^}]*flex-direction:\s*column !important;/s, "Foundry editor containers can use the expanded height");
assert.match(css, /\.t20ga-hero-art\s*\{[^}]*width:\s*var\(--t20ga-art-fit-width, 100%\);[^}]*height:\s*var\(--t20ga-art-fit-height, 100%\);[^}]*object-fit:\s*contain;/s, "avatar and token art use calculated frame-filling dimensions");
assert.match(characterSheet, /class="t20ga-hero-art-backdrop"/, "the hero frame has a full-bleed backdrop");
assert.match(css, /\.t20ga-hero-art-backdrop\s*\{[^}]*object-fit:\s*cover;[^}]*filter:\s*blur\(12px\)[^;]*brightness\(0\.52\);/s, "the backdrop fills the frame without cropping the foreground art");
assert.match(script, /DEFAULT_ART_POSITION = Object\.freeze\(\{ x: 0, y: 0, scale: 1 \}\)/, "art adjustment keeps the original scale and position controls");
assert.match(script, /const coverScale = Math\.max\(stageWidth \/ imageWidth, stageHeight \/ imageHeight\);/, "the default 1x scale automatically fills the frame");
assert.match(script, /--t20ga-art-fit-width/, "the calculated cover size is applied without pre-cropping the image element");
assert.match(script, /name="scale" min="0\.25" max="1\.8"/, "the slider can zoom out enough to reveal wide artwork");
assert.doesNotMatch(script, /name="fit"/, "the art dialog does not expose a cropping mode");
assert.match(css, /\.t20ga-dialog-art\s*\{[^}]*object-fit:\s*contain;/s, "the adjustment preview always shows the complete image");
assert.match(script, /class="t20ga-dialog-art-backdrop"/, "the adjustment preview shows the same filled-frame treatment");
assert.match(script, /if \(heroArtBackdrop\) heroArtBackdrop\.src = src;/, "the backdrop follows avatar and token changes");
assert.match(css, /#context-menu \.context-item[^}]*color:\s*#fff7e4 !important;/s, "context menu labels remain readable on the dark menu");
assert.doesNotMatch(characterSheet, /t20ga-party-rail/, "the unused lower gallery is absent from the sheet");
assert.doesNotMatch(script, /partyGallery|galleryCollapsed|PARTY_ART/, "gallery settings and behavior are removed");
assert.match(script, /"t20ga\.list-favorites":/, "the isolated favorites template is registered");
assert.match(script, /favorites\.poderes\?\.length/, "favorite powers make the card visible");
assert.match(script, /Number\(favorites\.qtdMagias\) > 0/, "favorite spells make the card visible");
assert.match(characterSheet, /class="t20ga-card t20ga-favorites-card"/, "the first tab includes a favorites card");
assert.match(characterSheet, /\{\{> "t20ga\.list-favorites"\}\}/, "the first tab renders the isolated favorites partial");
assert.match(favorites, /actor\.favoritos\.poderes/, "favorite powers are rendered");
assert.match(favorites, /actor\.favoritos\.qtdMagias/, "favorite spells are rendered");
assert.match(script, /journalExpandButtons\.on\("click"/, "journal expand buttons are interactive");
assert.match(script, /\.\.\.\(baseOptions\.scrollY \?\? \[\]\)/, "the heroic sheet retains the system scroll containers");
assert.match(script, /"\.skills-list"/, "skill list scroll is preserved across actor updates");
assert.match(script, /"\.t20ga-dashboard-side"/, "dashboard side panel scroll is preserved across actor updates");
assert.match(script, /"\.t20ga-sheet-body > \.tab"/, "active tab scroll is preserved across actor updates");
assert.equal(manifest.version, "1.6.13", "manifest version is updated");
assert.equal(manifest.compatibility.verified, "14.365", "Foundry 14 compatibility is declared");
assert.equal(manifest.relationships.systems[0].compatibility.verified, "1.6.1", "Tormenta20 1.6.1 compatibility is declared");
assert.equal(
  manifest.manifest,
  "https://github.com/CalisteniaStudios/tormenta20-ficha-heroica/releases/latest/download/module.json",
  "manifest updates avoid the raw GitHub endpoint"
);

console.log("Ficha Heroica UI regression checks passed");
