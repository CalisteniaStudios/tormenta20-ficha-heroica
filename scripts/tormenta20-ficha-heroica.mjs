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
const PERSISTENT_SETTING_KEYS = Object.freeze([
  "galleryCollapsed",
  "partyGallery",
  "artPositions",
  "appearance"
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

const PARTY_ART = Object.freeze([
  {
    id: "slot-1",
    label: "",
    src: "",
    accent: "#a6b84a"
  },
  {
    id: "slot-2",
    label: "",
    src: "",
    accent: "#d39a45"
  },
  {
    id: "slot-3",
    label: "",
    src: "",
    accent: "#bd6d93"
  },
  {
    id: "slot-4",
    label: "",
    src: "",
    accent: "#db4f9c"
  },
  {
    id: "slot-5",
    label: "",
    src: "",
    accent: "#6951c8"
  },
  {
    id: "slot-6",
    label: "",
    src: "",
    accent: "#91a83b"
  }
]);

const DEFAULT_ART_POSITION = Object.freeze({ x: 0, y: 0, scale: 1 });
const DEFAULT_APPEARANCE = Object.freeze({
  campaign: "Jornada Heroica:",
  groupName: "Nome do Grupo",
  theme: "crimson",
  customColor: "#75111b"
});
const THEME_PRESETS = Object.freeze({
  crimson: { label: "Tormenta", color: "#75111b" },
  purple: { label: "Arcana", color: "#5f2a85" },
  blue: { label: "Mana", color: "#245a91" },
  emerald: { label: "Adamante", color: "#23634f" },
  amber: { label: "Tibares", color: "#8a5518" },
  custom: { label: "Cor personalizada", color: "#75111b" }
});

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

function normalizeHex(value, fallback = "#75111b") {
  const color = String(value ?? "").trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : fallback;
}

function mixHex(first, second, amount) {
  const parse = (hex) => [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
  const a = parse(normalizeHex(first));
  const b = parse(normalizeHex(second));
  const mixed = a.map((channel, index) => Math.round(channel + (b[index] - channel) * amount));
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function buildPalette(appearance) {
  const preset = THEME_PRESETS[appearance.theme] ?? THEME_PRESETS.crimson;
  const primary = normalizeHex(
    appearance.theme === "custom" ? appearance.customColor : preset.color,
    THEME_PRESETS.crimson.color
  );
  return {
    primary,
    bright: mixHex(primary, "#ffffff", 0.2),
    highlight: mixHex(primary, "#ffffff", 0.38),
    dark: mixHex(primary, "#000000", 0.34),
    deep: mixHex(primary, "#000000", 0.64),
    surface: mixHex(primary, "#ffffff", 0.06)
  };
}

Hooks.once("init", () => {
  const loadTemplates = globalThis.foundry?.applications?.handlebars?.loadTemplates
    ?? globalThis.loadTemplates;
  if (typeof loadTemplates !== "function") {
    console.error(`${MODULE_ID} | O carregador de templates do Foundry não foi encontrado.`);
    return;
  }

  vendoredTemplatesReady = loadTemplates(VENDORED_TEMPLATES)
    .then(() => {
      console.log(`${MODULE_ID} | Templates oficiais Tormenta20 ${VENDORED_T20_VERSION} carregados com nomes isolados.`);
    })
    .catch((error) => {
      console.error(`${MODULE_ID} | Não foi possível carregar os templates isolados da ficha.`, error);
      throw error;
    });

  game.settings.register(MODULE_ID, "galleryCollapsed", {
    name: "Minimizar galeria de tokens",
    scope: "client",
    config: false,
    type: Boolean,
    default: false
  });

  game.settings.register(MODULE_ID, "partyGallery", {
    name: "Personagens da galeria",
    scope: "client",
    config: false,
    type: Object,
    default: {}
  });

  game.settings.register(MODULE_ID, "artPositions", {
    name: "Posições das artes",
    scope: "client",
    config: false,
    type: Object,
    default: {}
  });

  game.settings.register(MODULE_ID, "appearance", {
    name: "Aparência da ficha",
    scope: "client",
    config: false,
    type: Object,
    default: DEFAULT_APPEARANCE
  });

  const BaseSheet = ORIGINAL_SYSTEM_SHEET
    ?? globalThis.tormenta20?.applications?.ActorSheetT20CharacterTabbed;

  if (!BaseSheet) {
    console.error(`${MODULE_ID} | A ficha de personagem do sistema Tormenta20 não foi encontrada.`);
    return;
  }

  class ActorSheetT20FichaHeroica extends BaseSheet {
    static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
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
        resizable: true
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
      const galleryOverrides = this._getGalleryOverrides();
      const appearance = {
        ...DEFAULT_APPEARANCE,
        ...(game.settings.get(MODULE_ID, "appearance") ?? {})
      };
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

      sheetData.t20ga = {
        campaign: appearance.campaign,
        groupName: appearance.groupName,
        unlinkedToken: this._isUnlinkedTokenSheet(),
        appearance,
        logo: `${MODULE_PATH}/assets/branding/tormenta20-logo.webp`,
        eye: `${MODULE_PATH}/assets/branding/olho-tormenta.png`,
        avatarArt: this.actor.img,
        tokenArt,
        party: PARTY_ART.map((member) => ({ ...member, ...(galleryOverrides[member.id] ?? {}) })),
        galleryCollapsed: game.settings.get(MODULE_ID, "galleryCollapsed")
      };
      return sheetData;
    }

    _getAppearance() {
      return {
        ...DEFAULT_APPEARANCE,
        ...(game.settings.get(MODULE_ID, "appearance") ?? {})
      };
    }

    _galleryActorKey() {
      return this.actor?.uuid ?? this.actor?.id ?? "unknown-actor";
    }

    _getGalleryOverrides() {
      const stored = game.settings.get(MODULE_ID, "partyGallery") ?? {};
      if (stored.schema !== 2) return {};
      return foundry.utils.deepClone(stored.actors?.[this._galleryActorKey()] ?? {});
    }

    async _saveGalleryOverrides(overrides) {
      const stored = game.settings.get(MODULE_ID, "partyGallery") ?? {};
      const actors = stored.schema === 2 ? foundry.utils.deepClone(stored.actors ?? {}) : {};
      actors[this._galleryActorKey()] = overrides;
      await savePersistentSetting("partyGallery", { schema: 2, actors });
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
      html.find?.(".t20ga-brand-caption").text(appearance.campaign);
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
      const content = `
        <form class="t20ga-theme-form">
          <p class="t20ga-dialog-help">Altere o nome da campanha, o nome do grupo e escolha a identidade de cores da ficha.</p>
          <label class="t20ga-theme-title">
            <span>Texto abaixo da logo</span>
            <input type="text" name="campaign" maxlength="80" value="${escapeHtml(original.campaign)}">
          </label>
          <label class="t20ga-theme-title">
            <span>Nome do grupo</span>
            <input type="text" name="groupName" maxlength="80" value="${escapeHtml(original.groupName)}">
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
          <p class="t20ga-theme-note">A cor escolhida é aplicada à barra de abas, painéis, faixas, botões e molduras da ficha.</p>
          <button class="t20ga-theme-reset" type="button"><i class="fa-solid fa-rotate-left"></i> Restaurar tema original</button>
        </form>`;

      const readAppearance = (dialogHtml) => ({
        campaign: String(dialogHtml.find('[name="campaign"]').val() ?? "").trim()
          || DEFAULT_APPEARANCE.campaign,
        groupName: String(dialogHtml.find('[name="groupName"]').val() ?? "").trim()
          || DEFAULT_APPEARANCE.groupName,
        theme: String(dialogHtml.find('[name="theme"]').val() ?? DEFAULT_APPEARANCE.theme),
        customColor: normalizeHex(dialogHtml.find('[name="customColor"]').val())
      });

      const updatePreview = (dialogHtml) => {
        const appearance = readAppearance(dialogHtml);
        const palette = buildPalette(appearance);
        dialogHtml.find(".t20ga-custom-color-field").toggleClass("is-active", appearance.theme === "custom");
        const colors = [palette.deep, palette.dark, palette.primary, palette.bright];
        dialogHtml.find(".t20ga-theme-preview span").each((index, element) => {
          element.style.background = colors[index];
        });
        this._applyAppearance(html, appearance);
      };

      new DialogClass(
        {
          title: "Personalizar campanha e tema",
          content,
          buttons: {
            save: {
              icon: '<i class="fa-solid fa-palette"></i>',
              label: "Aplicar tema",
              callback: async (dialogHtml) => {
                saved = true;
                const appearance = readAppearance(dialogHtml);
                await savePersistentSetting("appearance", appearance);
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
            dialogHtml.find(".t20ga-theme-reset").on("click", () => {
              dialogHtml.find('[name="campaign"]').val(DEFAULT_APPEARANCE.campaign);
              dialogHtml.find('[name="groupName"]').val(DEFAULT_APPEARANCE.groupName);
              dialogHtml.find('[name="theme"]').val(DEFAULT_APPEARANCE.theme);
              dialogHtml.find('[name="customColor"]').val(DEFAULT_APPEARANCE.customColor);
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
      heroArt.style.setProperty("--t20ga-art-scale", clamp(position.scale, 0.6, 1.8));
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
            <input type="range" name="scale" min="0.6" max="1.8" step="0.01" value="${original.scale}">
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
        scale: clamp(html.find('[name="scale"]').val(), 0.6, 1.8),
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

    _openGalleryDialog() {
      const DialogClass = globalThis.Dialog;
      if (!DialogClass) {
        ui.notifications.warn("A configuração da galeria não está disponível nesta versão do Foundry.");
        return;
      }

      const overrides = this._getGalleryOverrides();
      const members = PARTY_ART.map((member) => ({ ...member, ...(overrides[member.id] ?? {}) }));
      const rows = members.map((member) => `
        <div class="t20ga-gallery-row" data-member-id="${escapeHtml(member.id)}">
          <div class="t20ga-gallery-preview">
            ${member.src ? `<img src="${escapeHtml(member.src)}" alt="">` : '<i class="fa-solid fa-image" aria-hidden="true"></i>'}
          </div>
          <div class="t20ga-gallery-fields">
            <label>Nome <input data-field="label" type="text" value="${escapeHtml(member.label)}"></label>
            <label>Imagem
              <span class="t20ga-gallery-path">
                <input data-field="src" type="text" value="${escapeHtml(member.src)}">
                <button type="button" data-action="browse" title="Escolher imagem"><i class="fa-solid fa-folder-open"></i></button>
              </span>
            </label>
          </div>
          <label class="t20ga-gallery-color">Cor <input data-field="accent" type="color" value="${escapeHtml(member.accent)}"></label>
        </div>`).join("");

      const content = `
        <form class="t20ga-gallery-form">
          <p class="t20ga-dialog-help">Configure as seis artes da galeria. Ao clicar em uma arte configurada, ela será aplicada ao token da personagem aberta.</p>
          <div class="t20ga-gallery-list">${rows}</div>
          <button class="t20ga-gallery-reset" type="button"><i class="fa-solid fa-rotate-left"></i> Limpar galeria</button>
        </form>`;

      new DialogClass(
        {
          title: "Personalizar galeria de tokens",
          content,
          buttons: {
            save: {
              icon: '<i class="fa-solid fa-floppy-disk"></i>',
              label: "Salvar",
              callback: async (html) => {
                const next = {};
                html.find(".t20ga-gallery-row").each((_, row) => {
                  const element = $(row);
                  next[element.data("memberId")] = {
                    label: String(element.find('[data-field="label"]').val() ?? "").trim(),
                    src: String(element.find('[data-field="src"]').val() ?? "").trim(),
                    accent: String(element.find('[data-field="accent"]').val() ?? "#d1a243")
                  };
                });
                await this._saveGalleryOverrides(next);
                this.render(false);
              }
            },
            cancel: {
              icon: '<i class="fa-solid fa-xmark"></i>',
              label: "Cancelar"
            }
          },
          default: "save",
          render: (html) => {
            html.find('[data-action="browse"]').on("click", (event) => {
              const row = $(event.currentTarget).closest(".t20ga-gallery-row");
              const input = row.find('[data-field="src"]');
              const PickerClass = globalThis.foundry?.applications?.apps?.FilePicker?.implementation
                ?? globalThis.FilePicker;
              if (!PickerClass) {
                ui.notifications.warn("O seletor de arquivos não está disponível.");
                return;
              }
              const updatePreview = (path) => {
                const preview = row.find(".t20ga-gallery-preview");
                preview.empty();
                if (path) preview.append($(`<img src="${escapeHtml(path)}" alt="">`));
                else preview.append('<i class="fa-solid fa-image" aria-hidden="true"></i>');
              };
              const callback = (path) => {
                input.val(path);
                updatePreview(path);
              };
              const picker = new PickerClass({
                type: "image",
                current: input.val(),
                callback
              });
              if (typeof picker.browse === "function") picker.browse();
              else picker.render({ force: true });
            });

            html.find('[data-field="src"]').on("change", (event) => {
              const row = $(event.currentTarget).closest(".t20ga-gallery-row");
              const path = String(event.currentTarget.value ?? "").trim();
              const preview = row.find(".t20ga-gallery-preview");
              preview.empty();
              if (path) preview.append($(`<img src="${escapeHtml(path)}" alt="">`));
              else preview.append('<i class="fa-solid fa-image" aria-hidden="true"></i>');
            });

            html.find(".t20ga-gallery-reset").on("click", () => {
              html.find(".t20ga-gallery-row").each((_, row) => {
                const element = $(row);
                const original = PARTY_ART.find((member) => member.id === element.data("memberId"));
                if (!original) return;
                element.find('[data-field="label"]').val("");
                element.find('[data-field="src"]').val("");
                element.find('[data-field="accent"]').val(original.accent);
                element.find(".t20ga-gallery-preview").html('<i class="fa-solid fa-image" aria-hidden="true"></i>');
              });
            });
          }
        },
        { classes: ["t20ga-gallery-config-dialog"], width: 720, height: 680 }
      ).render(true);
    }

    activateListeners(html) {
      super.activateListeners(html);

      this._applyAppearance(html, this._getAppearance());

      const heroArt = html.find(".t20ga-hero-art")[0];
      const heroArtBackdrop = html.find(".t20ga-hero-art-backdrop")[0];
      const heroFrame = html.find(".t20ga-hero-frame");
      const previewLabel = html.find(".t20ga-preview-label")[0];
      const previewNotice = html.find(".t20ga-preview-notice")[0];
      const partyButtons = html.find(".t20ga-party-member");
      const partyRail = html.find(".t20ga-party-rail");
      const partyToggle = html.find(".t20ga-party-toggle");
      const partyConfig = html.find(".t20ga-party-config");
      const artSwitch = html.find(".t20ga-art-switch");
      const brandConfig = html.find(".t20ga-brand-config");
      const journalTab = html.find(".tab.journal");
      const journalExpandButtons = journalTab.find(".t20ga-journal-expand");
      const avatarArt = String(artSwitch.attr("data-avatar") ?? this.actor.img);
      const rawTokenArt = String(artSwitch.attr("data-token") ?? avatarArt);
      const tokenArt = rawTokenArt.includes("*") ? avatarArt : rawTokenArt;
      const artSources = { avatar: avatarArt, token: tokenArt };

      const syncArtMode = (src, mode, button) => {
        const isPartyArt = mode === null
          && Boolean(button)
          && partyButtons.toArray().some((partyButton) => partyButton === button && partyButton.dataset.art === src);
        heroFrame.toggleClass("is-party-art", isPartyArt);
      };

      const syncSwitch = (mode) => {
        const isToken = mode === "token";
        artSwitch
          .toggleClass("is-token", isToken)
          .attr("aria-checked", String(isToken))
          .attr("data-mode", mode)
          .attr("title", isToken ? "Mostrando arte do token" : "Mostrando avatar da personagem");
      };

      const showArt = (src, label, button = null, mode = null) => {
        if (!heroArt) return;
        heroArt.src = src;
        heroArt.alt = label;
        if (heroArtBackdrop) heroArtBackdrop.src = src;
        this._t20gaCurrentArt = src;
        syncArtMode(src, mode, button);
        this._applyArtPosition(heroArt, src);
        if (previewLabel) previewLabel.textContent = label;
        if (previewNotice) previewNotice.hidden = mode !== null;
        partyButtons.removeClass("is-active").attr("aria-pressed", "false");
        if (button) $(button).addClass("is-active").attr("aria-pressed", "true");
        if (mode) {
          this._t20gaArtMode = mode;
          syncSwitch(mode);
        }
      };

      const initialMode = this._t20gaArtMode === "token" ? "token" : "avatar";
      showArt(
        artSources[initialMode],
        this.actor.name,
        null,
        initialMode
      );

      partyButtons.on("click", async (event) => {
        const button = event.currentTarget;
        const src = String(button.dataset.art ?? "").trim();
        if (!src) {
          ui.notifications.info("Configure esta arte pela engrenagem da galeria antes de usá-la.");
          return;
        }
        try {
          await this._updateCharacterArt("token", src);
          showArt(src, button.dataset.label || "Imagem do token", button);
          ui.notifications.info("Imagem do token atualizada.");
        } catch (error) {
          console.error(`${MODULE_ID} | Não foi possível aplicar a arte da galeria ao token.`, error);
          ui.notifications.error("Não foi possível atualizar a imagem do token.");
        }
      });

      artSwitch.on("click", () => {
        const nextMode = this._t20gaArtMode === "token" ? "avatar" : "token";
        showArt(
          artSources[nextMode],
          this.actor.name,
          null,
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
          showArt(path, this.actor.name, null, mode);
        });
      };

      html.find(".t20ga-hero-art").on("click", openArtFilePicker);
      html.find(".t20ga-art-adjust").on("click", openPositionDialog);

      brandConfig.on("click", () => this._openAppearanceDialog(html));

      partyConfig.on("click", () => this._openGalleryDialog());

      partyToggle.on("click", async (event) => {
        const collapsed = !partyRail.hasClass("is-collapsed");
        const button = $(event.currentTarget);

        partyRail.toggleClass("is-collapsed", collapsed);
        button.attr("aria-expanded", String(!collapsed));
        button.attr(
          "title",
          collapsed ? "Expandir galeria de tokens" : "Minimizar galeria de tokens"
        );
        button.find("i")
          .toggleClass("fa-chevron-up", collapsed)
          .toggleClass("fa-chevron-down", !collapsed);

        await savePersistentSetting("galleryCollapsed", collapsed);
      });

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
    ActorSheet: ActorSheetT20FichaHeroica,
    partyArt: PARTY_ART
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

Hooks.once("ready", restorePersistentSettings);
