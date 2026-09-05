function versionParts(version) {
  return String(version ?? "0")
    .split(/[.+-]/)
    .map((part) => Number.parseInt(part, 10))
    .map((part) => Number.isFinite(part) ? part : 0);
}

export function versionAtLeast(current, minimum) {
  const left = versionParts(current);
  const right = versionParts(minimum);
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference > 0;
  }
  return true;
}

export function selectTormenta20Templates(legacyTemplates, { systemVersion, modulePath } = {}) {
  const selected = { ...legacyTemplates };
  if (!versionAtLeast(systemVersion, "1.6.0")) return selected;

  const root = `${modulePath}/templates/vendor/tormenta20-1.6.1`;
  selected["t20ga.active-effects"] = `${root}/partials/active-effects.hbs`;
  selected["t20ga.list-skills"] = `${root}/lists/list-skills.hbs`;
  return selected;
}
