import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_CAMPAIGN_IDENTITY,
  DEFAULT_PERSONAL_APPEARANCE,
  buildPalette,
  normalizeCampaignIdentity,
  normalizePersonalAppearance
} from "../scripts/preferences.mjs";

test("mantém a identidade da campanha vazia até o mestre configurá-la", () => {
  assert.deepEqual(normalizeCampaignIdentity(), DEFAULT_CAMPAIGN_IDENTITY);
  assert.equal(normalizeCampaignIdentity({ title: "   " }).title, "");
});

test("preserva as opções de exibição e normaliza textos compartilhados", () => {
  assert.deepEqual(normalizeCampaignIdentity({
    logo: "  worlds/minha-mesa/logo.webp  ",
    logoScale: 2.25,
    logoPositionX: -18,
    logoPositionY: 9,
    title: "  A Coroa Partida  ",
    groupName: "  Companhia Rubra  ",
    showTitle: false,
    showGroupName: true,
    configured: true
  }), {
    logo: "worlds/minha-mesa/logo.webp",
    logoScale: 2.25,
    logoPositionX: -18,
    logoPositionY: 9,
    title: "A Coroa Partida",
    groupName: "Companhia Rubra",
    showTitle: false,
    showGroupName: true,
    configured: true
  });
});

test("limita escala e posição da logo a um enquadramento seguro", () => {
  assert.deepEqual(normalizeCampaignIdentity({
    logoScale: 99,
    logoPositionX: -999,
    logoPositionY: "valor inválido"
  }), {
    ...DEFAULT_CAMPAIGN_IDENTITY,
    logoScale: 3,
    logoPositionX: -100
  });
});

test("limita o tema pessoal a valores conhecidos e cores hexadecimais", () => {
  assert.deepEqual(normalizePersonalAppearance({ theme: "desconhecido", customColor: "red" }), DEFAULT_PERSONAL_APPEARANCE);
  assert.deepEqual(normalizePersonalAppearance({ theme: "custom", customColor: "#ABCDEF" }), {
    theme: "custom",
    customColor: "#abcdef"
  });
  assert.equal(buildPalette({ theme: "custom", customColor: "#336699" }).primary, "#336699");
});
