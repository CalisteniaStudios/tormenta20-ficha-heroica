import test from "node:test";
import assert from "node:assert/strict";

test("registra identidade mundial e aparência pessoal persistente", async () => {
  const hooks = {};
  const settings = new Map();
  const definitions = new Map();
  const menus = new Map();
  const flags = new Map();
  let HeroicSheet;
  let systemContextCalls = 0;
  let sheetCloseCalls = 0;

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
        _onItemToggleContext() { systemContextCalls++; }
        async close(options) { sheetCloseCalls++; return options; }
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
      collections: { Actors: { registerSheet(_system, sheet) { HeroicSheet = sheet; } } }
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

  // Opening a Heroic menu must retain the system's menu preparation and actions.
  const sheet = new HeroicSheet();
  const entries = [{ name: "Editar", callback() {} }];
  const ownTarget = {};
  let menuCloseCalls = 0;
  ui.context = {
    target: ownTarget,
    menuItems: entries,
    _setFixedPosition() {},
    async close(options) {
      assert.deepEqual(options, { animate: false });
      menuCloseCalls++;
    }
  };
  sheet._onItemToggleContext(ownTarget);
  assert.equal(systemContextCalls, 1);
  assert.equal(ui.context.menuItems, entries);
  sheet.element = [{ contains: target => target === ownTarget }];
  assert.deepEqual(await sheet.close({ force: true }), { force: true });
  assert.equal(menuCloseCalls, 1, "closing the sheet removes its detached menu");
  ui.context.target = {};
  await sheet.close();
  assert.equal(menuCloseCalls, 1, "closing the sheet does not close another app's menu");
  assert.equal(sheetCloseCalls, 2);
  delete ui.context;

  // Preview belongs to this user/actor, survives rerender and never writes actor data.
  let dialog;
  globalThis.Dialog = class {
    constructor(data) { dialog = data; }
    render() { return this; }
  };
  const values = { theme: "custom", customColor: "#008080", layout: "classic", frame: "arcane", background: "night", backgroundImage: "" };
  const listeners = new Map();
  const dialogHtml = { find(selector) {
    const key = selector.match(/name="([^\"]+)"/)?.[1];
    return {
      val(value) { if (arguments.length) values[key] = value; return values[key]; },
      on(event, callback) { listeners.set(`${selector}:${event}`, callback); return this; },
      text() { return this; }, toggleClass() { return this; }, each() { return this; }
    };
  } };
  const visual = { dataset: {}, style: { setProperty() {}, removeProperty() {} } };
  sheet.actor = { uuid: "Actor.style-test", img: "portrait.webp" };
  sheet.element = [visual];
  let renders = 0;
  sheet.render = () => { renders++; return sheet; };
  flags.get("personalAppearanceByActor").actors["Actor.style-test"] = structuredClone(values);
  const beforePreview = structuredClone(flags.get("personalAppearanceByActor"));
  sheet._openAppearanceDialog(sheet.element);
  assert.match(dialog.content, /Lenda/);
  assert.match(dialog.content, /Grimório/);
  assert.match(dialog.content, /Saga/);
  dialog.render(dialogHtml);
  values.layout = "legend";
  listeners.get('input, select:input change')();
  assert.equal(sheet._getAppearance().layout, "legend");
  assert.equal(visual.dataset.t20gaLayout, "legend");
  assert.equal(renders, 1);
  assert.deepEqual(flags.get("personalAppearanceByActor"), beforePreview);
  dialog.close();
  assert.equal(sheet._getAppearance().layout, "classic");
  assert.equal(visual.dataset.t20gaLayout, "classic");
  assert.equal(renders, 2);

  sheet._openAppearanceDialog(sheet.element);
  values.layout = "saga";
  dialog.render(dialogHtml);
  const saving = dialog.buttons.save.callback(dialogHtml);
  dialog.close(); // Legacy Foundry closes immediately without awaiting async callbacks.
  assert.equal(sheet._getAppearance().layout, "saga");
  await saving;
  assert.equal(sheet._getAppearance().layout, "saga");
  assert.equal(sheet._t20gaPreviewAppearance, undefined);
  assert.equal(flags.get("personalAppearanceByActor").actors["Actor.style-test"].layout, "saga");
  assert.deepEqual(flags.get("personalAppearanceByActor").default, beforePreview.default);
  flags.get("personalAppearanceByActor").actors = {};
  delete globalThis.Dialog;

  assert.equal(definitions.get("campaignIdentity").scope, "world");
  assert.equal(menus.get("campaignIdentityMenu").restricted, true);
  assert.deepEqual(settings.get("campaignIdentity"), {
    logo: "",
    logoScale: 1,
    logoPositionX: 0,
    logoPositionY: 0,
    logoPushPortrait: false,
    portraitWidth: 25,
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
    logoPushPortrait: true,
    portraitWidth: "36",
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
    logoPushPortrait: true,
    portraitWidth: 36,
    title: "A Coroa Partida",
    groupName: "Companhia Rubra",
    showTitle: true,
    showGroupName: false,
    configured: true
  });
});
