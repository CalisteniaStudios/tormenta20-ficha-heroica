export const SHEET_STYLES = Object.freeze({ legend: "Lenda", grimoire: "Grimório", saga: "Saga" });

/** Reparent the original, already-bound controls. No actor fields or actions are duplicated. */
export function arrangeSheetStyle(root, layout) {
  if (!Object.hasOwn(SHEET_STYLES, layout)) return;
  const shell = root.querySelector(".t20ga-shell");
  if (!shell || shell.classList.contains("t20ga-style-shell")) return;
  const hero = shell.querySelector(".t20ga-hero-panel");
  const main = shell.querySelector(".t20ga-main");
  const header = main?.querySelector(".t20ga-character-header");
  const vitals = main?.querySelector(".t20ga-vitals");
  const brand = hero?.querySelector(".t20ga-brand");
  if (!hero || !main || !header || !vitals || !brand) return;

  shell.classList.add("t20ga-style-shell");
  shell.dataset.style = layout;
  const dossier = root.ownerDocument.createElement("section");
  dossier.className = "t20ga-style-dossier";
  dossier.setAttribute("aria-label", "Identidade e atributos da personagem");
  if (layout === "saga") hero.insertBefore(header, hero.querySelector(".t20ga-hero-caption"));
  else dossier.append(header);
  if (layout === "grimoire") dossier.append(hero);
  dossier.append(vitals);
  if (layout === "saga") main.prepend(dossier);
  else shell.prepend(dossier);

  const title = root.ownerDocument.createElement("span");
  title.className = "t20ga-style-name";
  title.textContent = "Calistenia Studios";
  brand.append(title);
  if (layout !== "saga") main.prepend(brand);
  const config = brand.querySelector(".t20ga-brand-config");
  config?.setAttribute("title", "Personalizar aparência da ficha");

  if (layout === "saga") arrangeSaga(root, main, vitals);
  if (layout === "grimoire") arrangeGrimoire(root, dossier, main, hero, header, vitals);
  if (layout === "legend") arrangeLegend(root, shell, dossier, main, hero, header, vitals);

  for (const key of ["pv", "pm"]) {
    const resource = shell.querySelector(key === "pv" ? ".health" : ".mana");
    const current = shell.querySelector(`[name="system.attributes.${key}.value"]`);
    const maximum = shell.querySelector(`[name="system.attributes.${key}.max"]`);
    const updateBar = () => {
      const max = Number(maximum?.value);
      const pct = max > 0 ? Math.max(0, Math.min(100, Number(current?.value) / max * 100)) : 0;
      resource?.style.setProperty("--t20ga-resource-percent", `${pct}%`);
    };
    updateBar();
    current?.addEventListener("input", updateBar);
    maximum?.addEventListener("input", updateBar);
  }
}

function arrangeLegend(root, shell, dossier, main, hero, header, vitals) {
  const doc = root.ownerDocument;
  const make = (tag, className, text) => {
    const el = doc.createElement(tag);
    el.className = className;
    if (text) el.textContent = text;
    return el;
  };
  const art = hero.querySelector(".t20ga-hero-art");
  if (art) {
    const portrait = make("img", "t20ga-legend-miniature");
    portrait.alt = "";
    portrait.setAttribute("aria-hidden", "true");
    const sync = () => { portrait.src = art.getAttribute("src"); };
    sync();
    art.addEventListener("load", sync);
    header.prepend(portrait);
  }
  const nav = main.querySelector("nav.sheet-tabs");
  if (nav) shell.append(nav);
  const skills = main.querySelector(".t20ga-skills-card");
  if (skills) dossier.append(skills);
  for (const [key, name] of Object.entries({ for: "fist-raised", des: "feather-alt", con: "heart", int: "book-open", sab: "eye", car: "crown" })) {
    const icon = make("i", `fas fa-${name} t20ga-legend-ability-icon`);
    icon.setAttribute("aria-hidden", "true");
    vitals.querySelector(`.ability[data-item-id="${key}"]`)?.prepend(icon);
  }
  for (const [key, label, iconName] of [["health", "PV", "heart"], ["mana", "PM", "tint"], ["defense", "Defesa", "shield-alt"]]) {
    const resource = vitals.querySelector(`.${key}`);
    const title = resource?.querySelector(".box-title");
    if (!title) continue;
    title.setAttribute("aria-label", title.textContent.trim());
    title.textContent = label;
    const icon = make("i", `fas fa-${iconName} t20ga-legend-resource-icon`);
    icon.setAttribute("aria-hidden", "true");
    resource.append(icon);
  }
  vitals.querySelector(".t20ga-abilities")?.prepend(make("h3", "t20ga-legend-heading", "Atributos"));

  // Only decorative shortcuts are new. All editable fields and bound item controls stay intact.
  const overview = make("div", "t20ga-legend-overview");
  for (const [kind, selector, label, limit, tab] of [
    ["weapons", ".tab.inventory .inventory-list > .item-list:first-child .item:not(.item-header)", "Armas", 3, "inventory"],
    ["equipment", ".tab.inventory .inventory-list > .item-list:nth-child(2) .item:not(.item-header)", "Equipamento", 10, "inventory"],
    ["spells", ".tab.spells .item:not(.item-header)", "Magias", 2, "spells"]
  ]) {
    const rows = [...main.querySelectorAll(selector)].filter(row => row.querySelector(".item-name.rollable"));
    if (!rows.length) continue;
    const section = make("section", `t20ga-legend-shortcuts t20ga-legend-${kind}`);
    const heading = make("div", "t20ga-legend-section-title");
    heading.append(make("h3", "t20ga-legend-heading", label));
    const all = make("button", "t20ga-legend-see-all", "Ver todos");
    all.type = "button";
    all.setAttribute("aria-label", `Ver ${label.toLocaleLowerCase("pt-BR")}`);
    all.addEventListener("click", () => nav?.querySelector(`[data-tab="${tab}"]`)?.click());
    heading.append(all);
    section.append(heading);
    const items = make("div", "t20ga-legend-items");
    for (const row of rows.slice(0, limit)) {
      const original = row.querySelector(".item-name.rollable");
      const button = make("button", "t20ga-legend-shortcut");
      button.type = "button";
      const art = make("span", "t20ga-legend-item-art");
      art.style.backgroundImage = row.querySelector(".item-image")?.style.backgroundImage || "none";
      art.setAttribute("aria-hidden", "true");
      const name = original.querySelector("label")?.textContent.trim() || original.textContent.trim();
      const text = make("span", "t20ga-legend-item-text");
      text.append(make("strong", "t20ga-legend-item-name", name));
      const detail = row.querySelector(kind === "weapons" ? ".item-rolls" : ".item-activation")?.textContent.trim();
      if (detail) text.append(make("small", "t20ga-legend-item-detail", detail));
      button.append(art, text);
      button.title = name;
      button.setAttribute("aria-label", `Usar ${name}`);
      if (kind === "weapons") {
        const dice = make("i", "fas fa-dice-d20");
        dice.setAttribute("aria-hidden", "true");
        button.append(dice);
      }
      button.addEventListener("click", () => original.click());
      items.append(button);
    }
    section.append(items);
    overview.append(section);
  }
  const favorites = prepareFavorites(root, main);
  overview.insertBefore(favorites, overview.querySelector(".t20ga-legend-spells"));
  main.querySelector(".t20ga-dashboard")?.prepend(overview);
}

function arrangeGrimoire(root, dossier, main, hero, header, vitals) {
  const doc = root.ownerDocument;
  const make = (tag, className, text) => {
    const el = doc.createElement(tag);
    el.className = className;
    if (text) el.textContent = text;
    return el;
  };
  const top = make("div", "t20ga-book-identity");
  for (const page of [dossier, main]) {
    const ornament = make("span", "t20ga-book-ornament");
    ornament.setAttribute("aria-hidden", "true");
    for (const name of ["leaf", "seedling", "leaf"]) ornament.append(make("i", `fas fa-${name}`));
    page.append(ornament);
  }
  const details = make("div", "t20ga-book-details");
  details.append(header, vitals.querySelector(".t20ga-resources"));
  top.append(hero, details);
  dossier.prepend(make("h2", "t20ga-book-heading", "Dossiê de aventureiro"), top);
  const title = make("h2", "t20ga-book-heading t20ga-book-main-heading", "Equipamento & talentos");
  main.querySelector(".t20ga-brand")?.after(title);
  const traits = main.querySelector(".t20ga-traits-card");
  if (traits) {
    traits.classList.add("t20ga-book-journey");
    traits.querySelector(".t20ga-section-ribbon").textContent = "Jornada";
    dossier.append(traits);
  }
  for (const [key, name] of Object.entries({ for: "fist-raised", des: "feather-alt", con: "heart", int: "book-open", sab: "eye", car: "crown" })) {
    const icon = make("i", `fas fa-${name} t20ga-book-ability-icon`);
    icon.setAttribute("aria-hidden", "true");
    vitals.querySelector(`.ability[data-item-id="${key}"]`)?.prepend(icon);
  }

  // Overview shortcuts forward to the existing bound controls; the editable lists stay in their tabs.
  const overview = make("div", "t20ga-book-overview");
  for (const [kind, selector, label, limit] of [
    ["weapons", ".tab.inventory .inventory-list > .item-list:first-child .item:not(.item-header)", "Armas", 3]
  ]) {
    const rows = [...main.querySelectorAll(selector)].filter(row => row.querySelector(".item-name.rollable"));
    if (!rows.length) continue;
    const section = make("section", `t20ga-book-shortcuts t20ga-book-${kind}`);
    section.setAttribute("aria-label", `${label} em destaque`);
    section.append(make("h3", "t20ga-book-section-heading", label));
    for (const row of rows.slice(0, limit)) {
      const original = row.querySelector(".item-name.rollable");
      const button = make("button", "t20ga-book-shortcut");
      button.type = "button";
      const art = make("span", "t20ga-book-item-art");
      art.style.backgroundImage = row.querySelector(".item-image")?.style.backgroundImage || "none";
      art.setAttribute("aria-hidden", "true");
      const name = original.querySelector("label")?.textContent.trim() || original.textContent.trim();
      button.append(art, make("strong", "t20ga-book-item-name", name));
      if (kind === "weapons") button.append(make("span", "t20ga-book-item-roll", row.querySelector(".item-rolls")?.textContent.trim()));
      const dice = make("i", "fas fa-dice-d20");
      dice.setAttribute("aria-hidden", "true");
      button.append(dice);
      button.setAttribute("aria-label", `Usar ${name}`);
      button.addEventListener("click", () => original.click());
      section.append(button);
    }
    overview.append(section);
  }
  overview.append(prepareFavorites(root, main));
  main.querySelector(".t20ga-dashboard")?.prepend(overview);
}

function arrangeSaga(root, main, vitals) {
  const doc = root.ownerDocument;
  const icon = (parent, name) => {
    if (!parent) return;
    const el = doc.createElement("i");
    el.className = `fas fa-${name} t20ga-saga-icon`;
    el.setAttribute("aria-hidden", "true");
    parent.prepend(el);
  };
  const nav = main.querySelector("nav.sheet-tabs");
  if (nav) main.prepend(nav);
  for (const [key, name] of Object.entries({ for: "fist-raised", des: "feather-alt", con: "heart", int: "book-open", sab: "eye", car: "crown" })) {
    icon(vitals.querySelector(`.ability[data-item-id="${key}"]`), name);
  }
  icon(vitals.querySelector(".health .box-title"), "heart");
  icon(vitals.querySelector(".mana .box-title"), "star");
  icon(vitals.querySelector(".defense .box-title"), "shield-alt");

  main.querySelector(".t20ga-dashboard-side")?.prepend(prepareFavorites(root, main));
}

/** Use the system's favorite list and its bound actions, including all favorite item types. */
function prepareFavorites(root, main) {
  let card = main.querySelector(".t20ga-favorites-card");
  if (!card) {
    const doc = root.ownerDocument;
    card = doc.createElement("section");
    card.className = "t20ga-card t20ga-favorites-card";
    const title = doc.createElement("div");
    title.className = "t20ga-section-ribbon";
    title.textContent = "Favoritos";
    const hint = doc.createElement("p");
    hint.className = "t20ga-favorites-empty";
    hint.textContent = "Marque itens, poderes ou magias como favoritos na ficha para vê-los aqui.";
    card.append(title, hint);
  }
  card.classList.add("t20ga-style-favorites");
  card.setAttribute("aria-label", "Favoritos");
  return card;
}
