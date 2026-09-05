import test from "node:test";
import assert from "node:assert/strict";

import { selectTormenta20Templates, versionAtLeast } from "../scripts/compatibility.mjs";

test("compara versões do Tormenta20 sem confundir segmentos numéricos", () => {
  assert.equal(versionAtLeast("1.5.015", "1.6.0"), false);
  assert.equal(versionAtLeast("1.6.0", "1.6.0"), true);
  assert.equal(versionAtLeast("1.6.1", "1.6.0"), true);
});

test("mantém os templates antigos na 1.5.015 e usa os compatíveis na 1.6.1", () => {
  const legacy = {
    "t20ga.active-effects": "legacy/effects.hbs",
    "t20ga.list-skills": "legacy/skills.hbs",
    "t20ga.resources": "legacy/resources.hbs"
  };
  assert.deepEqual(selectTormenta20Templates(legacy, {
    systemVersion: "1.5.015",
    modulePath: "modules/ficha"
  }), legacy);

  const modern = selectTormenta20Templates(legacy, {
    systemVersion: "1.6.1",
    modulePath: "modules/ficha"
  });
  assert.equal(modern["t20ga.active-effects"], "modules/ficha/templates/vendor/tormenta20-1.6.1/partials/active-effects.hbs");
  assert.equal(modern["t20ga.list-skills"], "modules/ficha/templates/vendor/tormenta20-1.6.1/lists/list-skills.hbs");
  assert.equal(modern["t20ga.resources"], legacy["t20ga.resources"]);
});
