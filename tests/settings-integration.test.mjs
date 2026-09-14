import test from "node:test";
import assert from "node:assert/strict";

test("registra identidade mundial e aparência pessoal persistente", async () => {
  const hooks = {};
  const settings = new Map();
  const definitions = new Map();
  const menus = new Map();
  const flags = new Map();

  globalThis.Hooks = { once: (name, callback) => { hooks[name] = callback; } };
  globalThis.FormApplication = class {
    static get defaultOptions() { return {}; }
    getData() { return {}; }
    activateListeners() {}
  };
  globalThis.tormenta20 = {
    applications: {
      ActorSheetT20CharacterTabbed: class {
        static get defaultOptions() { return { classes: [], scrollY: [] }; }
      }
    }
  };
  globalThis.ui = {
    windows: {},
    notifications: { info() {}, warn() {} }
  };
  globalThis.foundry = {
    utils: {
      deepClone: structuredClone,
      mergeObject: (base, update) => ({ ...base, ...update })
    },
    applications: {
      handlebars: { loadTemplates: async () => {} }
    },
    documents: {
      collections: { Actors: { registerSheet() {} } }
    }
  };
  globalThis.game = {
    system: { version: "1.6.1" },
    settings: {
      register: (namespace, key, definition) => {
        definitions.set(key, definition);
        if (!settings.has(key)) settings.set(key, structuredClone(definition.default));
      },
      registerMenu: (_namespace, key, definition) => menus.set(key, definition),
      get: (_namespace, key) => settings.get(key),
      set: async (_namespace, key, value) => {
        settings.set(key, structuredClone(value));
        definitions.get(key)?.onChange?.(value);
        return value;
      }
    },
    user: {
      isGM: true,
      getFlag: (_namespace, key) => flags.get(key),
      setFlag: async (_namespace, key, value) => {
        flags.set(key, structuredClone(value));
        return value;
      }
    }
  };

  await import(`../scripts/tormenta20-ficha-heroica.mjs?settings-test=${Date.now()}`);
  hooks.init();
  await hooks.ready();

  assert.equal(definitions.get("campaignIdentity").scope, "world");
  assert.equal(menus.get("campaignIdentityMenu").restricted, true);
  assert.deepEqual(settings.get("campaignIdentity"), {
    logo: "",
    logoScale: 1,
    logoPositionX: 0,
    logoPositionY: 0,
    title: "",
    groupName: "",
    showTitle: true,
    showGroupName: true,
    configured: false
  });
  assert.deepEqual(flags.get("personalAppearanceByActor"), {
    schema: 1,
    default: {
      theme: "crimson",
      customColor: "#75111b",
      layout: "tabs",
      frame: "heroic",
      background: "parchment",
      backgroundImage: ""
    },
    actors: {}
  });

  const IdentityConfig = menus.get("campaignIdentityMenu").type;
  await new IdentityConfig()._updateObject(null, {
    logo: "worlds/test/logo.svg",
    logoScale: "1.75",
    logoPositionX: "12",
    logoPositionY: "-6",
    title: "A Coroa Partida",
    groupName: "Companhia Rubra",
    showTitle: true,
    showGroupName: false
  });
  assert.deepEqual(settings.get("campaignIdentity"), {
    logo: "worlds/test/logo.svg",
    logoScale: 1.75,
    logoPositionX: 12,
    logoPositionY: -6,
    title: "A Coroa Partida",
    groupName: "Companhia Rubra",
    showTitle: true,
    showGroupName: false,
    configured: true
  });
});
