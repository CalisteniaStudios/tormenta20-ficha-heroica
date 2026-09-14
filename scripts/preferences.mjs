export const DEFAULT_PERSONAL_APPEARANCE = Object.freeze({
  theme: "crimson",
  customColor: "#75111b"
});

export const DEFAULT_CAMPAIGN_IDENTITY = Object.freeze({
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

export const LEGACY_APPEARANCE_DEFAULTS = Object.freeze({
  campaign: "Jornada Heroica:",
  groupName: "Nome do Grupo",
  ...DEFAULT_PERSONAL_APPEARANCE
});

export const THEME_PRESETS = Object.freeze({
  crimson: { label: "Tormenta", color: "#75111b" },
  purple: { label: "Arcana", color: "#5f2a85" },
  blue: { label: "Mana", color: "#245a91" },
  emerald: { label: "Adamante", color: "#23634f" },
  amber: { label: "Tibares", color: "#8a5518" },
  custom: { label: "Cor personalizada", color: "#75111b" }
});

export function normalizeHex(value, fallback = DEFAULT_PERSONAL_APPEARANCE.customColor) {
  const color = String(value ?? "").trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : fallback;
}

export function normalizePersonalAppearance(value = {}) {
  const theme = Object.hasOwn(THEME_PRESETS, value.theme)
    ? value.theme
    : DEFAULT_PERSONAL_APPEARANCE.theme;
  return {
    theme,
    customColor: normalizeHex(value.customColor)
  };
}

export function normalizeCampaignIdentity(value = {}) {
  const clamp = (number, minimum, maximum, fallback) => {
    const parsed = Number(number);
    return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
  };
  return {
    logo: String(value.logo ?? "").trim(),
    logoScale: clamp(value.logoScale, 0.5, 3, DEFAULT_CAMPAIGN_IDENTITY.logoScale),
    logoPositionX: clamp(value.logoPositionX, -100, 100, DEFAULT_CAMPAIGN_IDENTITY.logoPositionX),
    logoPositionY: clamp(value.logoPositionY, -40, 40, DEFAULT_CAMPAIGN_IDENTITY.logoPositionY),
    title: String(value.title ?? "").trim(),
    groupName: String(value.groupName ?? "").trim(),
    showTitle: value.showTitle !== false,
    showGroupName: value.showGroupName !== false,
    configured: Boolean(value.configured)
  };
}

function mixHex(first, second, amount) {
  const parse = (hex) => [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
  const a = parse(normalizeHex(first));
  const b = parse(normalizeHex(second));
  const mixed = a.map((channel, index) => Math.round(channel + (b[index] - channel) * amount));
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

export function buildPalette(appearance) {
  const normalized = normalizePersonalAppearance(appearance);
  const preset = THEME_PRESETS[normalized.theme];
  const primary = normalizeHex(
    normalized.theme === "custom" ? normalized.customColor : preset.color
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
