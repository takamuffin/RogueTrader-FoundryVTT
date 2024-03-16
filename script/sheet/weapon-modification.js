import { DarkHeresyItemSheet } from "./item.js";

export class WeaponModificationSheet extends DarkHeresyItemSheet {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["rogue-trader", "sheet", "weapon-modification"],
      template: "systems/rogue-trader/template/sheet/weapon-modification.html",
      width: 500,
      height: 610,
      resizable: false,
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-body",
          initial: "stats"
        }
      ]
    });
  }

  _getHeaderButtons() {
    let buttons = super._getHeaderButtons();
    buttons = [].concat(buttons);
    return buttons;
  }

  activateListeners(html) {
    super.activateListeners(html);
  }
}
