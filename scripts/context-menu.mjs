// Keep the system's entries and callbacks, but position this sheet's menu in
// Foundry's native popover layer so card frames and scroll panels cannot clip it.
export function useSheetContextPopover(context) {
  if (typeof context?._setFixedPosition !== "function") return;

  context._setPosition = function (menu, target, options) {
    menu.classList.add("t20ga-context-menu");
    const style = target.ownerDocument.defaultView.getComputedStyle(target);
    for (const property of ["--t20ga-gold", "--t20ga-theme-surface"]) {
      menu.style.setProperty(property, style.getPropertyValue(property));
    }
    menu.style.fontFamily = style.fontFamily;
    this._setFixedPosition(menu, target, options);
  };
}
