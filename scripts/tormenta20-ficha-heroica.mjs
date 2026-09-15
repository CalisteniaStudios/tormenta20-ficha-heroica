import { selectTormenta20Templates } from "./compatibility.mjs";
import {
  BACKGROUND_PRESETS,
  DEFAULT_CAMPAIGN_IDENTITY,
  DEFAULT_PERSONAL_APPEARANCE,
  FRAME_PRESETS,
  LAYOUT_PRESETS,
  LEGACY_APPEARANCE_DEFAULTS,
  THEME_PRESETS,
  buildPalette,
  normalizeCampaignIdentity,
  normalizeHex,
  normalizePersonalAppearance
} from "./preferences.mjs";

const MODULE_ID = "tormenta20-ficha-heroica";
const MODULE_PATH = `modules/${MODULE_ID}`;
const VENDORED_T20_VERSION = "1.5.015";
const VENDORED_TEMPLATE_ROOT = `${MODULE_PATH}/templates/vendor/tormenta20-${VENDORED_T20_VERSION}`;
// Capture the system sheet before other modules can replace the global registration.
const ORIGINAL_SYSTEM_SHEET = globalThis.tormenta20?.applications?.ActorSheetT20CharacterTabbed;
let vendoredTemplatesReady = Promise.resolve();
const VENDORED_TEMPLATES = Object.freeze({
  "t20ga.abilities": `${VENDORED_TEMPLATE_ROOT}/abilities.hbs`,
  "t20ga.active-effects": `${VENDORED_TEMPLATE_ROOT}/partials/active-effects.hbs`,
  "t20ga.actor-item-controls": `${VENDORED_TEMPLATE_ROOT}/lists/actor-item-controls.hbs`,
  "t20ga.currency": `${VENDORED_TEMPLATE_ROOT}/currency.hbs`,
  "t20ga.defense": `${VENDORED_TEMPLATE_ROOT}/defense.hbs`,
  "t20ga.encumbrance": `${VENDORED_TEMPLATE_ROOT}/encumbrance.hbs`,
  "t20ga.journal": `${VENDORED_TEMPLATE_ROOT}/journal.hbs`,
  "t20ga.list-consumable": `${VENDORED_TEMPLATE_ROOT}/lists/list-consumable.hbs`,
  "t20ga.list-equipment": `${VENDORED_TEMPLATE_ROOT}/lists/list-equipment.hbs`,
  "t20ga.list-favorites": `${VENDORED_TEMPLATE_ROOT}/lists/list-favorites.hbs`,
  "t20ga.list-header-element": `${VENDORED_TEMPLATE_ROOT}/lists/list-header-element.hbs`,
  "t20ga.list-inventory": `${VENDORED_TEMPLATE_ROOT}/lists/list-inventory.hbs`,
  "t20ga.list-loot": `${VENDORED_TEMPLATE_ROOT}/lists/list-loot.hbs`,
  "t20ga.list-powers-tabbed": `${VENDORED_TEMPLATE_ROOT}/lists/list-powers-tabbed.hbs`,
  "t20ga.list-skills": `${VENDORED_TEMPLATE_ROOT}/lists/list-skills.hbs`,
  "t20ga.list-spells": `${VENDORED_TEMPLATE_ROOT}/lists/list-spells.hbs`,
  "t20ga.list-weapon": `${VENDORED_TEMPLATE_ROOT}/lists/list-weapon.hbs`,
  "t20ga.modifiers": `${VENDORED_TEMPLATE_ROOT}/modifiers.hbs`,
  "t20ga.nav-bar": `${VENDORED_TEMPLATE_ROOT}/partials/nav-bar.hbs`,
  "t20ga.resources": `${VENDORED_TEMPLATE_ROOT}/resources.hbs`,
  "t20ga.sheet-header-summary": `${VENDORED_TEMPLATE_ROOT}/headers/sheet-header-summary.hbs`,
  "t20ga.traits": `${VENDORED_TEMPLATE_ROOT}/traits.hbs`
});
const PREFERENCES_FLAG = "persistentPreferences";
const PERSONAL_APPEARANCE_FLAG = "personalAppearanceByActor";
const APPEARANCE_MIGRATION_FLAG = "appearanceV2Migrated";
const PERSISTENT_SETTING_KEYS = Object.freeze([
  "artPositions"
]);

function clonePreference(value) {
  if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value);
  return structuredClone(value);
}

async function savePersistentSetting(key, value) {
  await game.settings.set(MODULE_ID, key, value);
  if (typeof game.user?.setFlag !== "function") return;

  try {
    const previous = game.user.getFlag?.(MODULE_ID, PREFERENCES_FLAG) ?? {};
    const next = {
      schema: 1,
      updatedAt: Date.now(),
      values: {
        ...(previous.values ?? {}),
        [key]: clonePreference(value)
      }
    };
    await game.user.setFlag(MODULE_ID, PREFERENCES_FLAG, next);
  } catch (error) {
    console.warn(`${MODULE_ID} | Não foi possível atualizar a cópia de segurança das preferências.`, error);
  }
}

async function restorePersistentSettings() {
  if (typeof game.user?.getFlag !== "function" || typeof game.user?.setFlag !== "function") return;

  try {
    const backup = game.user.getFlag(MODULE_ID, PREFERENCES_FLAG);
    if (backup?.schema === 1 && backup.values) {
      for (const key of PERSISTENT_SETTING_KEYS) {
        if (Object.hasOwn(backup.values, key)) {
          await game.settings.set(MODULE_ID, key, clonePreference(backup.values[key]));
        }
      }
      return;
    }

    const values = {};
    for (const key of PERSISTENT_SETTING_KEYS) {
      values[key] = clonePreference(game.settings.get(MODULE_ID, key));
    }
    await game.user.setFlag(MODULE_ID, PREFERENCES_FLAG, {
      schema: 1,
      updatedAt: Date.now(),
      values
    });
  } catch (error) {
    console.warn(`${MODULE_ID} | Não foi possível restaurar as preferências persistentes.`, error);
  }
}

const DEFAULT_ART_POSITION = Object.freeze({ x: 0, y: 0, scale: 1 });

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function actorAppearanceKey(actor) {
  return String(actor?.id ?? actor?.uuid ?? "default");
}

function getCampaignIdentity() {
  return normalizeCampaignIdentity(
    game.settings.get(MODULE_ID, "campaignIdentity") ?? DEFAULT_CAMPAIGN_IDENTITY
  );
}

function getCampaignLogoReservedHeight({ scale, y, logoPushPortrait }) {
  if (!logoPushPortrait) return 64;
  return Math.ceil((64 * clamp(scale, 0.5, 3)) + (Math.abs(clamp(y, -40, 40)) * 2));
}

function previewCampaignLogoLayout({ scale, x, y, logoPushPortrait, portraitWidth }) {
  const normalizedScale = clamp(scale, 0.5, 3);
  const normalizedX = clamp(x, -60, 60);
  const normalizedY = clamp(y, -40, 40);
  const normalizedPortraitWidth = clamp(portraitWidth, 20, 45);
  const reservedHeight = getCampaignLogoReservedHeight({
    scale: normalizedScale,
    y: normalizedY,
    logoPushPortrait
  });

  for (const application of Object.values(ui.windows ?? {})) {
    if (!application?.options?.classes?.includes?.("t20ga-window")) continue;
    const root = application.element?.[0] ?? application.element;
    const shell = root?.querySelector?.(".t20ga-shell");
    shell?.style.setProperty("--t20ga-hero-panel-width", `${normalizedPortraitWidth}%`);
    const frames = root?.querySelectorAll?.(".t20ga-campaign-logo-frame") ?? [];
    for (const frame of frames) {
      frame.style.setProperty("--t20ga-campaign-logo-scale", normalizedScale);
      frame.style.setProperty("--t20ga-campaign-logo-x", `${normalizedX}px`);
      frame.style.setProperty("--t20ga-campaign-logo-y", `${normalizedY}px`);
      frame.style.setProperty("--t20ga-campaign-logo-reserved-height", `${reservedHeight}px`);
    }
  }
}

function getPersonalAppearance(actor) {
  const stored = game.user?.getFlag?.(MODULE_ID, PERSONAL_APPEARANCE_FLAG) ?? {};
  const value = stored.actors?.[actorAppearanceKey(actor)] ?? stored.default;
  return normalizePersonalAppearance(value ?? DEFAULT_PERSONAL_APPEARANCE);
}

async function savePersonalAppearance(actor, appearance) {
  if (typeof game.user?.setFlag !== "function") return;
  const stored = game.user.getFlag?.(MODULE_ID, PERSONAL_APPEARANCE_FLAG) ?? {};
  const next = {
    schema: 1,
    default: normalizePersonalAppearance(stored.default ?? DEFAULT_PERSONAL_APPEARANCE),
    actors: {
      ...(stored.actors ?? {}),
      [actorAppearanceKey(actor)]: normalizePersonalAppearance(appearance)
    }
  };
  await game.user.setFlag(MODULE_ID, PERSONAL_APPEARANCE_FLAG, next);
}

function rerenderHeroicSheets() {
  for (const application of Object.values(globalThis.ui?.windows ?? {})) {
    if (application?.options?.classes?.includes?.("t20ga-window")) application.render(false);
  }
}

async function migrateLegacyAppearance() {
  if (typeof game.user?.getFlag !== "function" || typeof game.user?.setFlag !== "function") return;
  if (game.user.getFlag(MODULE_ID, APPEARANCE_MIGRATION_FLAG)) return;

  const legacy = {
    ...LEGACY_APPEARANCE_DEFAULTS,
    ...(game.settings.get(MODULE_ID, "appearance") ?? {})
  };
  const personalStored = game.user.getFlag(MODULE_ID, PERSONAL_APPEARANCE_FLAG);
  if (!personalStored?.schema) {
    await game.user.setFlag(MODULE_ID, PERSONAL_APPEARANCE_FLAG, {
      schema: 1,
      default: normalizePersonalAppearance(legacy),
      actors: {}
    });
  }

  if (game.user.isGM) {
    const identity = getCampaignIdentity();
    if (!identity.configured) {
      const legacyTitle = String(legacy.campaign ?? "").trim() === LEGACY_APPEARANCE_DEFAULTS.campaign
        ? ""
        : String(legacy.campaign ?? "").trim();
      const legacyGroupName = String(legacy.groupName ?? "").trim() === LEGACY_APPEARANCE_DEFAULTS.groupName
        ? ""
        : String(legacy.groupName ?? "").trim();
      if (legacyTitle || legacyGroupName) {
        await game.settings.set(MODULE_ID, "campaignIdentity", normalizeCampaignIdentity({
          ...identity,
          title: legacyTitle,
          groupName: legacyGroupName,
          configured: true
        }));
      }
    }
  }

  await game.user.setFlag(MODULE_ID, APPEARANCE_MIGRATION_FLAG, true);
}

class CampaignIdentityConfig extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "t20ga-campaign-identity-config",
      classes: ["t20ga-campaign-config-dialog"],
      title: "Identidade da campanha",
      template: `${MODULE_PATH}/templates/campaign-identity-config.hbs`,
      width: 560,
      closeOnSubmit: true
    });
  }

  async getData(options = {}) {
    this._savedIdentity = getCampaignIdentity();
    this._identitySubmitted = false;
    return {
      ...(await super.getData(options)),
      identity: this._savedIdentity
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    const logoInput = html.find('[name="logo"]');

    const readLogoLayout = () => ({
      scale: clamp(html.find('[name="logoScale"]').val(), 0.5, 3),
      x: clamp(html.find('[name="logoPositionX"]').val(), -60, 60),
      y: clamp(html.find('[name="logoPositionY"]').val(), -40, 40),
      logoPushPortrait: html.find('[name="logoPushPortrait"]').is(":checked"),
      portraitWidth: clamp(html.find('[name="portraitWidth"]').val(), 20, 45)
    });

    const updatePreview = () => {
      const logo = String(logoInput.val() ?? "").trim();
      const layout = readLogoLayout();
      const preview = html.find(".t20ga-campaign-logo-preview");
      preview.toggleClass("has-logo", Boolean(logo));
      preview.css("--t20ga-campaign-logo-preview-width", `${(layout.scale / 3) * 100}%`);
      preview.css("padding-left", `${12 + Math.max(layout.x, 0)}px`);
      preview.css("padding-right", `${12 + Math.max(-layout.x, 0)}px`);
      preview.css("padding-top", `${12 + Math.max(layout.y, 0)}px`);
      preview.css("padding-bottom", `${12 + Math.max(-layout.y, 0)}px`);
      if (logo) {
        preview.html("");
        $("<img>", { src: logo, alt: "Prévia da logo da campanha" }).appendTo(preview);
      } else {
        preview.html("<span><strong>Logo da campanha</strong><small>Edição nas configurações</small></span>");
      }
      html.find('[data-output="logoScale"]').text(`${layout.scale.toFixed(2)}×`);
      html.find('[data-output="logoPositionX"]').text(`${layout.x}px`);
      html.find('[data-output="logoPositionY"]').text(`${layout.y}px`);
      html.find('[data-output="portraitWidth"]').text(`${layout.portraitWidth}%`);
      previewCampaignLogoLayout(layout);
    };

    html.find('[data-action="browse-logo"]').on("click", () => {
      const callback = (path) => {
        logoInput.val(path);
        updatePreview();
      };
      const current = String(logoInput.val() ?? "");
      const ModernFilePicker = globalThis.foundry?.applications?.apps?.FilePicker?.implementation;
      if (ModernFilePicker) {
        new ModernFilePicker({ type: "image", current, callback }).render({ force: true });
        return;
      }
      const LegacyFilePicker = globalThis.FilePicker;
      if (LegacyFilePicker) {
        const picker = new LegacyFilePicker({ type: "image", current, callback });
        if (typeof picker.browse === "function") picker.browse();
        else picker.render(true);
      }
    });

    html.find('[data-action="remove-logo"]').on("click", () => {
      logoInput.val("");
      updatePreview();
    });
    html.find('[data-action="reset-logo-transform"]').on("click", () => {
      html.find('[name="logoScale"]').val(DEFAULT_CAMPAIGN_IDENTITY.logoScale);
      html.find('[name="logoPositionX"]').val(DEFAULT_CAMPAIGN_IDENTITY.logoPositionX);
      html.find('[name="logoPositionY"]').val(DEFAULT_CAMPAIGN_IDENTITY.logoPositionY);
      html.find('[name="logoPushPortrait"]').prop("checked", DEFAULT_CAMPAIGN_IDENTITY.logoPushPortrait);
      html.find('[name="portraitWidth"]').val(DEFAULT_CAMPAIGN_IDENTITY.portraitWidth);
      updatePreview();
    });
    html.find('[name="logo"], [name="logoScale"], [name="logoPositionX"], [name="logoPositionY"], [name="logoPushPortrait"], [name="portraitWidth"]')
      .on("input change", updatePreview);
    updatePreview();
  }

  async _updateObject(_event, formData) {
    if (!game.user.isGM) {
      ui.notifications.warn("Somente o mestre pode alterar a identidade da campanha.");
      return;
    }
    const identity = normalizeCampaignIdentity({
      logo: formData.logo,
      logoScale: formData.logoScale,
      logoPositionX: formData.logoPositionX,
      logoPositionY: formData.logoPositionY,
      logoPushPortrait: Boolean(formData.logoPushPortrait),
      portraitWidth: formData.portraitWidth,
      title: formData.title,
      groupName: formData.groupName,
      showTitle: Boolean(formData.showTitle),
      showGroupName: Boolean(formData.showGroupName),
      configured: true
    });
    await game.settings.set(MODULE_ID, "campaignIdentity", identity);
    this._identitySubmitted = true;
    ui.notifications.info("A identidade da campanha foi salva para este mundo.");
  }

  async close(options = {}) {
    if (!this._identitySubmitted && this._savedIdentity) {
      previewCampaignLogoLayout({
        scale: this._savedIdentity.logoScale,
        x: this._savedIdentity.logoPositionX,
        y: this._savedIdentity.logoPositionY,
        logoPushPortrait: this._savedIdentity.logoPushPortrait,
        portraitWidth: this._savedIdentity.portraitWidth
      });
    }
    return super.close(options);
  }
}


Hooks.once("init", () => {
  const loadTemplates = globalThis.foundry?.applications?.handlebars?.loadTemplates
    ?? globalThis.loadTemplates;
  if (typeof loadTemplates !== "function") {
    console.error(`${MODULE_ID} | O carregador de templates do Foundry não foi encontrado.`);
    return;
  }

  const selectedTemplates = selectTormenta20Templates(VENDORED_TEMPLATES, {
    systemVersion: game.system.version,
    modulePath: MODULE_PATH
  });

  vendoredTemplatesReady = loadTemplates(selectedTemplates)
    .then(() => {
      const templateVersion = selectedTemplates["t20ga.active-effects"].includes("1.6.1")
        ? "1.6.1"
        : VENDORED_T20_VERSION;
      console.log(`${MODULE_ID} | Templates compatíveis com Tormenta20 ${templateVersion} carregados com nomes isolados.`);
    })
    .catch((error) => {
      console.error(`${MODULE_ID} | Não foi possível carregar os templates isolados da ficha.`, error);
      throw error;
    });

  game.settings.register(MODULE_ID, "artPositions", {
    name: "Posições das artes",
    scope: "client",
    config: false,
    type: Object,
    default: {}
  });

  game.settings.register(MODULE_ID, "appearance", {
    name: "Aparência antiga da ficha",
    scope: "client",
    config: false,
    type: Object,
    default: LEGACY_APPEARANCE_DEFAULTS
  });

  game.settings.register(MODULE_ID, "campaignIdentity", {
    name: "Identidade da campanha",
    scope: "world",
    config: false,
    type: Object,
    default: DEFAULT_CAMPAIGN_IDENTITY,
    onChange: rerenderHeroicSheets
  });

  game.settings.registerMenu(MODULE_ID, "campaignIdentityMenu", {
    name: "Identidade da campanha",
    label: "Configurar identidade",
    hint: "Defina a logo, o título da campanha e o nome do grupo exibidos para todos neste mundo.",
    icon: "fa-solid fa-shield-halved",
    type: CampaignIdentityConfig,
    restricted: true
  });

  const BaseSheet = ORIGINAL_SYSTEM_SHEET
    ?? globalThis.tormenta20?.applications?.ActorSheetT20CharacterTabbed;

  if (!BaseSheet) {
    console.error(`${MODULE_ID} | A ficha de personagem do sistema Tormenta20 não foi encontrada.`);
    return;
  }

  class ActorSheetT20FichaHeroica extends BaseSheet {
    static get defaultOptions() {
      const baseOptions = super.defaultOptions;
      const scrollY = [
        ...(baseOptions.scrollY ?? []),
        ".skills-list",
        ".t20ga-dashboard-side",
        ".t20ga-sheet-body",
        ".t20ga-sheet-body > .tab"
      ];

      return foundry.utils.mergeObject(baseOptions, {
        classes: [
          "tormenta20",
          "sheet",
          "actor",
          "character",
          "tabbed",
          "t20ga-window"
        ],
        width: 1160,
        height: 820,
        resizable: true,
        scrollY: [...new Set(scrollY)]
      });
    }

    get template() {
      const limitedSetting = game.settings.get("tormenta20", "limitedSheet");
      const isLimited = !game.user.isGM && limitedSetting === "limited" && this.actor.limited;
      if (isLimited) return super.template;
      return `${MODULE_PATH}/templates/character-sheet.hbs`;
    }

    async getData(options = {}) {
      await vendoredTemplatesReady;
      const sheetData = await super.getData(options);
      const appearance = getPersonalAppearance(this.actor);
      const identity = getCampaignIdentity();
      let tokenDocument = this.token?.document ?? this.token ?? null;

      try {
        tokenDocument ??= this.actor.getActiveTokens?.(true, true)?.[0]?.document ?? null;
        tokenDocument ??= await this.actor.getTokenDocument?.();
      } catch (error) {
        console.warn(`${MODULE_ID} | Não foi possível obter o token ativo.`, error);
      }

      let tokenArt = tokenDocument?.texture?.src
        ?? this.actor.prototypeToken?.texture?.src
        ?? this.actor.img;

      if (String(tokenArt).includes("*") && typeof this.actor.getTokenImages === "function") {
        try {
          const tokenImages = await this.actor.getTokenImages();
          tokenArt = tokenImages?.[0] ?? this.actor.img;
        } catch (error) {
          console.warn(`${MODULE_ID} | Não foi possível resolver a imagem aleatória do token.`, error);
        }
      }

      const favorites = sheetData.actor?.favoritos ?? {};
      const hasFavorites = Boolean(
        favorites.armas?.length
        || favorites.itens?.length
        || favorites.poderes?.length
        || Number(favorites.qtdMagias) > 0
      );

      sheetData.t20ga = {
        campaignLogo: identity.logo,
        campaignLogoAlt: identity.title || "Logo da campanha",
        campaignLogoScale: identity.logoScale,
        campaignLogoPositionX: identity.logoPositionX,
        campaignLogoPositionY: identity.logoPositionY,
        campaignLogoReservedHeight: getCampaignLogoReservedHeight(identity),
        portraitWidth: identity.portraitWidth,
        campaignTitle: identity.showTitle ? identity.title : "",
        groupName: identity.showGroupName ? identity.groupName : "",
        unlinkedToken: this._isUnlinkedTokenSheet(),
        appearance,
        avatarArt: this.actor.img,
        tokenArt,
        hasFavorites,
        classicLayout: appearance.layout === "classic"
      };
      return sheetData;
    }

    _getAppearance() {
      return getPersonalAppearance(this.actor);
    }

    _isUnlinkedTokenSheet() {
      const sheetToken = this.token?.document
        ?? this.token
        ?? this.actor?.token?.document
        ?? this.actor?.token;
      const tokenContext = Boolean(this.token || this.actor?.isToken || this.actor?.token);
      const actorLink = sheetToken?.actorLink
        ?? sheetToken?.data?.actorLink
        ?? this.actor?.prototypeToken?.actorLink;
      return tokenContext && actorLink === false;
    }

    _applyAppearance(html, appearance) {
      const palette = buildPalette(appearance);
      const windowElement = html.closest?.(".t20ga-window")?.[0]
        ?? html[0]?.closest?.(".t20ga-window")
        ?? html[0];
      if (!windowElement) return;

      const variables = {
        "--t20ga-crimson": palette.primary,
        "--t20ga-red": palette.bright,
        "--t20ga-red-bright": palette.highlight,
        "--t20ga-theme-primary": palette.primary,
        "--t20ga-theme-surface": palette.surface,
        "--t20ga-theme-dark": palette.dark,
        "--t20ga-theme-deep": palette.deep
      };
      for (const [property, value] of Object.entries(variables)) {
        windowElement.style.setProperty(property, value);
      }
      windowElement.dataset.t20gaTheme = appearance.theme;
      windowElement.dataset.t20gaLayout = appearance.layout;
      windowElement.dataset.t20gaFrame = appearance.frame;
      windowElement.dataset.t20gaBackground = appearance.background;
      if (appearance.backgroundImage) {
        windowElement.style.setProperty(
          "--t20ga-custom-background",
          `url(${JSON.stringify(appearance.backgroundImage)})`
        );
      } else {
        windowElement.style.removeProperty("--t20ga-custom-background");
      }
    }

    _openAppearanceDialog(html) {
      const DialogClass = globalThis.Dialog;
      if (!DialogClass) {
        ui.notifications.warn("A configuração visual não está disponível nesta versão do Foundry.");
        return;
      }

      const original = this._getAppearance();
      let saved = false;
      const options = Object.entries(THEME_PRESETS)
        .map(([id, theme]) => `<option value="${id}"${original.theme === id ? " selected" : ""}>${escapeHtml(theme.label)}</option>`)
        .join("");
      const frameOptions = Object.entries(FRAME_PRESETS)
        .map(([id, frame]) => `<option value="${id}"${original.frame === id ? " selected" : ""}>${escapeHtml(frame.label)}</option>`)
        .join("");
      const layoutOptions = Object.entries(LAYOUT_PRESETS)
        .map(([id, layout]) => `<option value="${id}"${original.layout === id ? " selected" : ""}>${escapeHtml(layout.label)}</option>`)
        .join("");
      const backgroundOptions = Object.entries(BACKGROUND_PRESETS)
        .map(([id, background]) => `<option value="${id}"${original.background === id ? " selected" : ""}>${escapeHtml(background.label)}</option>`)
        .join("");
      const content = `
        <form class="t20ga-theme-form">
          <p class="t20ga-dialog-help">Escolha uma aparência pessoal para esta personagem. Esta mudança só será exibida para você.</p>
          <label class="t20ga-layout-field">
            <span>Organização da ficha</span>
            <select name="layout">${layoutOptions}</select>
          </label>
          <div class="t20ga-theme-grid">
            <label>
              <span>Tema</span>
              <select name="theme">${options}</select>
            </label>
            <label class="t20ga-custom-color-field">
              <span>Cor personalizada</span>
              <input type="color" name="customColor" value="${normalizeHex(original.customColor)}">
            </label>
          </div>
          <div class="t20ga-theme-preview" aria-hidden="true">
            <span></span><span></span><span></span><span></span>
          </div>
          <div class="t20ga-appearance-options">
            <label>
              <span>Estilo das molduras</span>
              <select name="frame">${frameOptions}</select>
            </label>
            <label>
              <span>Fundo da ficha</span>
              <select name="background">${backgroundOptions}</select>
            </label>
          </div>
          <label class="t20ga-custom-background-field">
            <span>Imagem de fundo personalizada</span>
            <div class="t20ga-background-file-row">
              <input type="text" name="backgroundImage" value="${escapeHtml(original.backgroundImage)}" placeholder="Escolha uma imagem do Foundry">
              <button class="t20ga-background-file-picker" type="button" title="Escolher imagem"><i class="fa-solid fa-folder-open"></i></button>
              <button class="t20ga-background-file-clear" type="button" title="Remover imagem"><i class="fa-solid fa-xmark"></i></button>
            </div>
          </label>
          <div class="t20ga-style-preview" data-frame="${original.frame}" data-background="${original.background}" aria-hidden="true">
            <span>Prévia da moldura e do fundo</span>
          </div>
          <p class="t20ga-theme-note">A aparência fica salva somente para você e para esta personagem.</p>
          <button class="t20ga-theme-reset" type="button"><i class="fa-solid fa-rotate-left"></i> Restaurar aparência original</button>
        </form>`;

      const readAppearance = (dialogHtml) => ({
        theme: String(dialogHtml.find('[name="theme"]').val() ?? DEFAULT_PERSONAL_APPEARANCE.theme),
        customColor: normalizeHex(dialogHtml.find('[name="customColor"]').val()),
        layout: String(dialogHtml.find('[name="layout"]').val() ?? DEFAULT_PERSONAL_APPEARANCE.layout),
        frame: String(dialogHtml.find('[name="frame"]').val() ?? DEFAULT_PERSONAL_APPEARANCE.frame),
        background: String(dialogHtml.find('[name="background"]').val() ?? DEFAULT_PERSONAL_APPEARANCE.background),
        backgroundImage: String(dialogHtml.find('[name="backgroundImage"]').val() ?? "").trim()
      });

      const updatePreview = (dialogHtml) => {
        const appearance = readAppearance(dialogHtml);
        const palette = buildPalette(appearance);
        dialogHtml.find(".t20ga-custom-color-field").toggleClass("is-active", appearance.theme === "custom");
        dialogHtml.find(".t20ga-custom-background-field").toggleClass("is-active", appearance.background === "custom");
        const colors = [palette.deep, palette.dark, palette.primary, palette.bright];
        dialogHtml.find(".t20ga-theme-preview span").each((index, element) => {
          element.style.background = colors[index];
        });
        const stylePreview = dialogHtml.find(".t20ga-style-preview")[0];
        if (stylePreview) {
          stylePreview.dataset.frame = appearance.frame;
          stylePreview.dataset.background = appearance.background;
          stylePreview.style.setProperty("--t20ga-theme-primary", palette.primary);
          stylePreview.style.setProperty("--t20ga-theme-surface", palette.surface);
          stylePreview.style.setProperty("--t20ga-theme-deep", palette.deep);
          if (appearance.backgroundImage) {
            stylePreview.style.setProperty(
              "--t20ga-preview-background",
              `url(${JSON.stringify(appearance.backgroundImage)})`
            );
          } else {
            stylePreview.style.removeProperty("--t20ga-preview-background");
          }
        }
        this._applyAppearance(html, appearance);
      };

      new DialogClass(
        {
          title: "Personalizar aparência",
          content,
          buttons: {
            save: {
              icon: '<i class="fa-solid fa-palette"></i>',
              label: "Salvar aparência",
              callback: async (dialogHtml) => {
                saved = true;
                const appearance = normalizePersonalAppearance(readAppearance(dialogHtml));
                await savePersonalAppearance(this.actor, appearance);
                this._applyAppearance(html, appearance);
                this.render(false);
              }
            },
            cancel: {
              icon: '<i class="fa-solid fa-xmark"></i>',
              label: "Cancelar"
            }
          },
          default: "save",
          render: (dialogHtml) => {
            dialogHtml.find('input, select').on("input change", () => updatePreview(dialogHtml));
            dialogHtml.find(".t20ga-background-file-picker").on("click", () => {
              const input = dialogHtml.find('[name="backgroundImage"]');
              const callback = (path) => {
                input.val(path);
                dialogHtml.find('[name="background"]').val("custom");
                updatePreview(dialogHtml);
              };
              const current = String(input.val() ?? "");
              const ModernFilePicker = globalThis.foundry?.applications?.apps?.FilePicker?.implementation;
              if (ModernFilePicker) {
                new ModernFilePicker({ type: "image", current, callback }).render({ force: true });
                return;
              }
              const LegacyFilePicker = globalThis.FilePicker;
              if (LegacyFilePicker) {
                const picker = new LegacyFilePicker({ type: "image", current, callback });
                if (typeof picker.browse === "function") picker.browse();
                else picker.render(true);
                return;
              }
              ui.notifications.warn("O seletor de imagens não está disponível nesta versão do Foundry.");
            });
            dialogHtml.find(".t20ga-background-file-clear").on("click", () => {
              dialogHtml.find('[name="backgroundImage"]').val("");
              dialogHtml.find('[name="background"]').val(DEFAULT_PERSONAL_APPEARANCE.background);
              updatePreview(dialogHtml);
            });
            dialogHtml.find(".t20ga-theme-reset").on("click", () => {
              dialogHtml.find('[name="theme"]').val(DEFAULT_PERSONAL_APPEARANCE.theme);
              dialogHtml.find('[name="customColor"]').val(DEFAULT_PERSONAL_APPEARANCE.customColor);
              dialogHtml.find('[name="layout"]').val(DEFAULT_PERSONAL_APPEARANCE.layout);
              dialogHtml.find('[name="frame"]').val(DEFAULT_PERSONAL_APPEARANCE.frame);
              dialogHtml.find('[name="background"]').val(DEFAULT_PERSONAL_APPEARANCE.background);
              dialogHtml.find('[name="backgroundImage"]').val(DEFAULT_PERSONAL_APPEARANCE.backgroundImage);
              updatePreview(dialogHtml);
            });
            updatePreview(dialogHtml);
          },
          close: () => {
            if (!saved) this._applyAppearance(html, original);
          }
        },
        { classes: ["t20ga-theme-config-dialog"], width: 560 }
      ).render(true);
    }

    _artPositionKey(src) {
      return `${this.actor.uuid ?? this.actor.id}:${encodeURIComponent(String(src ?? ""))}`;
    }

    _getArtPosition(src) {
      const positions = game.settings.get(MODULE_ID, "artPositions") ?? {};
      const saved = positions[this._artPositionKey(src)] ?? {};
      return {
        x: saved.x ?? DEFAULT_ART_POSITION.x,
        y: saved.y ?? DEFAULT_ART_POSITION.y,
        scale: saved.scale ?? DEFAULT_ART_POSITION.scale
      };
    }

    async _saveArtPosition(src, position) {
      const positions = foundry.utils.deepClone(
        game.settings.get(MODULE_ID, "artPositions") ?? {}
      );
      positions[this._artPositionKey(src)] = position;
      await savePersistentSetting("artPositions", positions);
    }

    _applyArtPosition(heroArt, src, override = null) {
      if (!heroArt) return;
      const position = override ?? this._getArtPosition(src);
      heroArt.style.setProperty("--t20ga-art-x", `${clamp(position.x, -45, 45)}%`);
      heroArt.style.setProperty("--t20ga-art-y", `${clamp(position.y, -30, 30)}%`);
      heroArt.style.setProperty("--t20ga-art-scale", clamp(position.scale, 0.25, 1.8));
    }

    _fitArtToStage(image, stage, widthVariable, heightVariable) {
      if (!image || !stage) return () => {};

      const fit = () => {
        const stageWidth = stage.clientWidth;
        const stageHeight = stage.clientHeight;
        const imageWidth = image.naturalWidth;
        const imageHeight = image.naturalHeight;
        if (!stageWidth || !stageHeight || !imageWidth || !imageHeight) return;

        const coverScale = Math.max(stageWidth / imageWidth, stageHeight / imageHeight);
        image.style.setProperty(widthVariable, `${Math.ceil(imageWidth * coverScale)}px`);
        image.style.setProperty(heightVariable, `${Math.ceil(imageHeight * coverScale)}px`);
      };

      if (image.complete && image.naturalWidth) fit();
      else image.addEventListener("load", fit, { once: true });
      return fit;
    }

    _fitHeroArt(heroArt, heroFrame) {
      if (!heroArt || !heroFrame) return;
      this._fitArtToStage(
        heroArt,
        heroFrame,
        "--t20ga-art-fit-width",
        "--t20ga-art-fit-height"
      )();
    }

    async _updateCharacterArt(mode, path) {
      if (!path) return;

      if (mode === "avatar") {
        await this.actor.update({ img: path });
        return;
      }

      await this.actor.update({ "prototypeToken.texture.src": path });

      const tokenDocuments = new Set();
      const sheetToken = this.token?.document ?? this.token;
      if (typeof sheetToken?.update === "function") tokenDocuments.add(sheetToken);

      for (const token of this.actor.getActiveTokens?.(true, true) ?? []) {
        const document = token?.document ?? token;
        if (typeof document?.update === "function") tokenDocuments.add(document);
      }

      const updates = [...tokenDocuments].map((document) => (
        document.update({ "texture.src": path })
      ));
      if (updates.length) await Promise.allSettled(updates);
    }

    _openArtFilePicker(mode, current, onSelected) {
      if (this.isEditable === false) {
        ui.notifications.warn("Você não tem permissão para alterar a imagem desta personagem.");
        return;
      }

      const callback = async (path) => {
        try {
          await this._updateCharacterArt(mode, path);
          onSelected(path);
          ui.notifications.info(mode === "token" ? "Imagem do token atualizada." : "Imagem do avatar atualizada.");
        } catch (error) {
          console.error(`${MODULE_ID} | Não foi possível atualizar a imagem da personagem.`, error);
          ui.notifications.error("Não foi possível atualizar a imagem selecionada.");
        }
      };

      const ModernFilePicker = globalThis.foundry?.applications?.apps?.FilePicker?.implementation;
      if (ModernFilePicker) {
        new ModernFilePicker({ type: "image", current, callback }).render({ force: true });
        return;
      }

      const LegacyFilePicker = globalThis.FilePicker;
      if (LegacyFilePicker) {
        const picker = new LegacyFilePicker({ type: "image", current, callback });
        if (typeof picker.browse === "function") picker.browse();
        else picker.render(true);
        return;
      }

      ui.notifications.warn("O seletor de imagens não está disponível nesta versão do Foundry.");
    }

    _openArtPositionDialog(src, label, heroArt) {
      const DialogClass = globalThis.Dialog;
      if (!DialogClass) {
        ui.notifications.warn("A janela de ajuste de arte não está disponível nesta versão do Foundry.");
        return;
      }

      const original = this._getArtPosition(src);
      let saved = false;
      const safeSrc = escapeHtml(src);
      const safeLabel = escapeHtml(label);
      const content = `
        <form class="t20ga-art-position-form">
          <p class="t20ga-dialog-help">Ajuste como <strong>${safeLabel}</strong> aparece na moldura lateral.</p>
          <div class="t20ga-dialog-art-stage">
            <img class="t20ga-dialog-art-backdrop" src="${safeSrc}" alt="" aria-hidden="true">
            <img class="t20ga-dialog-art" src="${safeSrc}" alt="${safeLabel}">
          </div>
          <label>
            <span>Escala <output data-output="scale">${Number(original.scale).toFixed(2)}×</output></span>
            <input type="range" name="scale" min="0.25" max="1.8" step="0.01" value="${original.scale}">
          </label>
          <label>
            <span>Posição horizontal <output data-output="x">${original.x}</output></span>
            <input type="range" name="x" min="-45" max="45" step="1" value="${original.x}">
          </label>
          <label>
            <span>Posição vertical <output data-output="y">${original.y}</output></span>
            <input type="range" name="y" min="-30" max="30" step="1" value="${original.y}">
          </label>
          <button class="t20ga-dialog-reset" type="button"><i class="fa-solid fa-rotate-left"></i> Redefinir</button>
        </form>`;

      const readPosition = (html) => ({
        scale: clamp(html.find('[name="scale"]').val(), 0.25, 1.8),
        x: clamp(html.find('[name="x"]').val(), -45, 45),
        y: clamp(html.find('[name="y"]').val(), -30, 30)
      });

      const updatePreview = (html) => {
        const position = readPosition(html);
        const preview = html.find(".t20ga-dialog-art");
        preview.css("--dialog-art-scale", position.scale);
        preview.css("--dialog-art-x", `${position.x}%`);
        preview.css("--dialog-art-y", `${position.y}%`);
        html.find('[data-output="scale"]').text(`${position.scale.toFixed(2)}×`);
        html.find('[data-output="x"]').text(position.x);
        html.find('[data-output="y"]').text(position.y);
        this._applyArtPosition(heroArt, src, position);
      };

      new DialogClass(
        {
          title: "Ajustar arte na moldura",
          content,
          buttons: {
            save: {
              icon: '<i class="fa-solid fa-floppy-disk"></i>',
              label: "Salvar",
              callback: async (html) => {
                saved = true;
                const position = readPosition(html);
                await this._saveArtPosition(src, position);
                this._applyArtPosition(heroArt, src, position);
              }
            },
            cancel: {
              icon: '<i class="fa-solid fa-xmark"></i>',
              label: "Cancelar"
            }
          },
          default: "save",
          render: (html) => {
            const preview = html.find(".t20ga-dialog-art")[0];
            const stage = html.find(".t20ga-dialog-art-stage")[0];
            this._fitArtToStage(
              preview,
              stage,
              "--dialog-art-fit-width",
              "--dialog-art-fit-height"
            );
            html.find('input[type="range"]').on("input change", () => updatePreview(html));
            html.find(".t20ga-dialog-reset").on("click", () => {
              html.find('[name="scale"]').val(DEFAULT_ART_POSITION.scale);
              html.find('[name="x"]').val(DEFAULT_ART_POSITION.x);
              html.find('[name="y"]').val(DEFAULT_ART_POSITION.y);
              updatePreview(html);
            });
            updatePreview(html);
          },
          close: () => {
            if (!saved) this._applyArtPosition(heroArt, src, original);
          }
        },
        { classes: ["t20ga-art-config-dialog"], width: 520 }
      ).render(true);
    }

    activateListeners(html) {
      super.activateListeners(html);

      this._applyAppearance(html, this._getAppearance());

      const heroArt = html.find(".t20ga-hero-art")[0];
      const heroArtBackdrop = html.find(".t20ga-hero-art-backdrop")[0];
      const heroFrame = html.find(".t20ga-hero-frame");
      const heroFrameElement = heroFrame[0];
      const previewLabel = html.find(".t20ga-preview-label")[0];
      const artSwitch = html.find(".t20ga-art-switch");
      const brandConfig = html.find(".t20ga-brand-config");
      const journalTab = html.find(".tab.journal");
      const journalExpandButtons = journalTab.find(".t20ga-journal-expand");
      const avatarArt = String(artSwitch.attr("data-avatar") ?? this.actor.img);
      const rawTokenArt = String(artSwitch.attr("data-token") ?? avatarArt);
      const tokenArt = rawTokenArt.includes("*") ? avatarArt : rawTokenArt;
      const artSources = { avatar: avatarArt, token: tokenArt };

      const syncSwitch = (mode) => {
        const isToken = mode === "token";
        artSwitch
          .toggleClass("is-token", isToken)
          .attr("aria-checked", String(isToken))
          .attr("data-mode", mode)
          .attr("title", isToken ? "Mostrando arte do token" : "Mostrando avatar da personagem");
      };

      const showArt = (src, label, mode) => {
        if (!heroArt) return;
        heroArt.src = src;
        heroArt.alt = label;
        if (heroArtBackdrop) heroArtBackdrop.src = src;
        this._t20gaCurrentArt = src;
        this._fitHeroArt(heroArt, heroFrameElement);
        this._applyArtPosition(heroArt, src);
        if (previewLabel) previewLabel.textContent = label;
        this._t20gaArtMode = mode;
        syncSwitch(mode);
      };

      const initialMode = this._t20gaArtMode === "token" ? "token" : "avatar";
      showArt(
        artSources[initialMode],
        this.actor.name,
        initialMode
      );

      this._t20gaArtResizeObserver?.disconnect?.();
      if (globalThis.ResizeObserver && heroFrameElement) {
        this._t20gaArtResizeObserver = new ResizeObserver(() => {
          this._fitHeroArt(heroArt, heroFrameElement);
        });
        this._t20gaArtResizeObserver.observe(heroFrameElement);
      }

      artSwitch.on("click", () => {
        const nextMode = this._t20gaArtMode === "token" ? "avatar" : "token";
        showArt(
          artSources[nextMode],
          this.actor.name,
          nextMode
        );
      });

      const openPositionDialog = (event) => {
        event.preventDefault();
        event.stopPropagation();
        this._openArtPositionDialog(
          this._t20gaCurrentArt ?? avatarArt,
          previewLabel?.textContent ?? this.actor.name,
          heroArt
        );
      };

      const openArtFilePicker = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const mode = this._t20gaArtMode === "token" ? "token" : "avatar";
        this._openArtFilePicker(mode, artSources[mode], (path) => {
          artSources[mode] = path;
          artSwitch.attr(mode === "token" ? "data-token" : "data-avatar", path);
          showArt(path, this.actor.name, mode);
        });
      };

      html.find(".t20ga-hero-art").on("click", openArtFilePicker);
      html.find(".t20ga-art-adjust").on("click", openPositionDialog);

      brandConfig.on("click", () => this._openAppearanceDialog(html));

      journalExpandButtons.on("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        const button = $(event.currentTarget);
        const article = button.closest("article");
        const shouldExpand = !article.hasClass("is-expanded");

        journalTab.find("article.is-expanded").removeClass("is-expanded");
        journalExpandButtons
          .attr("aria-expanded", "false")
          .attr("aria-label", "Expandir anotação")
          .attr("title", "Expandir anotação")
          .find("i")
          .removeClass("fa-compress")
          .addClass("fa-expand");

        journalTab.toggleClass("has-expanded", shouldExpand);
        if (!shouldExpand) return;

        article.addClass("is-expanded");
        button
          .attr("aria-expanded", "true")
          .attr("aria-label", "Recolher anotação")
          .attr("title", "Recolher anotação");
        button.find("i").removeClass("fa-expand").addClass("fa-compress");
      });
    }
  }

  globalThis.T20FichaHeroica = {
    ActorSheet: ActorSheetT20FichaHeroica
  };

  foundry.documents.collections.Actors.registerSheet(
    MODULE_ID,
    ActorSheetT20FichaHeroica,
    {
      types: ["character"],
      makeDefault: false,
      label: "Ficha Heroica"
    }
  );

  console.log(`${MODULE_ID} | Ficha Heroica registrada.`);
});

Hooks.once("ready", async () => {
  await restorePersistentSettings();
  await migrateLegacyAppearance();
  rerenderHeroicSheets();
});
