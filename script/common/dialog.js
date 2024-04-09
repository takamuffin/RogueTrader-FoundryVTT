import { commonRoll, combatRoll, shipCombatRoll, shipTurretRoll, reportEmptyClip, unitCombatRoll } from "./roll.js";

/**
 * Show a generic roll dialog.
 * @param {object} rollData
 */
export async function prepareCommonRoll(rollData) {
  const html = await renderTemplate("systems/rogue-trader/template/dialog/common-roll.html", rollData);
  let dialog = new Dialog({
    title: game.i18n.localize(rollData.name),
    content: html,
    buttons: {
      roll: {
        icon: '<i class="fas fa-check"></i>',
        label: game.i18n.localize("BUTTON.ROLL"),
        callback: async html => {
          rollData.name = game.i18n.localize(rollData.name);
          rollData.baseTarget = parseInt(html.find("#target")[0].value, 10);
          rollData.rolledWith = html.find("[name=characteristic] :selected").text();
          rollData.modifier = html.find("#modifier")[0].value;
          rollData.isCombatTest = false;
          await commonRoll(rollData);
        }
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: game.i18n.localize("BUTTON.CANCEL"),
        callback: () => {}
      }

    },
    default: "roll",
    close: () => {},
    render: html => {
      const sel = html.find("select[name=characteristic");
      const target = html.find("#target");
      sel.change(ev => {
        target.val(sel.val());
      });
    }
  }, {
    width: 200
  });
  dialog.render(true);
}

/**
 * Show a combat roll dialog.
 * @param {object} rollData
 * @param {DarkHeresyActor} actorRef
 */
export async function prepareCombatRoll(rollData, actorRef) {
    const html = await renderTemplate("systems/rogue-trader/template/dialog/combat-roll.html", rollData);
    let dialog = new Dialog({
        title: rollData.name,
        content: html,
        buttons: {
            roll: {
                icon: '<i class="fas fa-check"></i>',
                label: game.i18n.localize("BUTTON.ROLL"),
                callback: async (html) => {
                    rollData.name = game.i18n.localize(rollData.name);
                    rollData.baseTarget = parseInt(html.find("#target")[0]?.value, 10);
                    rollData.modifier = html.find("#modifier")[0]?.value;
                    const range = html.find("#range")[0];
                    if (typeof range !== "undefined" && range !== null) {
                        rollData.range = range.value;
                        rollData.rangeText = range.options[range.selectedIndex].text;
                    }
                    const attackType = html.find("#attackType")[0];
                    rollData.attackType = {
                      name : attackType?.value,
                      text : attackType?.options[attackType.selectedIndex].text,
                      modifier : 0
                    };
                    const aim = html.find("#aim")[0]
                    rollData.aim = {
                      val : aim?.value,
                      isAiming : aim?.value !== "0",
                      text : aim?.options[aim.selectedIndex].text
                    };
                    if (rollData.weaponTraits.inaccurate) {
                        rollData.aim.val=0;
                    } else if (rollData.weaponTraits.accurate && rollData.aim.isAiming) {
                        rollData.aim.val=`${rollData.aim.val}+10`;
                    }
                    rollData.damageFormula = html.find("#damageFormula")[0].value.replace(" ", "");
                    rollData.damageType = html.find("#damageType")[0].value;
                    rollData.damageBonus = parseInt(html.find("#damageBonus")[0].value, 10);
                    rollData.penetrationFormula = html.find("#penetration")[0].value;
                    rollData.isCombatTest = true;
                    if (rollData.weaponTraits.skipAttackRoll) {rollData.attackType.name = "standard";}
                    if (rollData.isRange && rollData.clip.max > 0) {
                        const weapon = game.actors.get(rollData.ownerId)?.items?.get(rollData.itemId);
                        if(weapon) {
                            switch(rollData.attackType.name) {
                                case 'standard':
                                case 'called_shot': {
                                    if (rollData.weaponTraits.storm || rollData.weaponTraits.twinLinked) {
                                        if (rollData.clip.value < 2) {
                                            return reportEmptyClip(rollData);
                                        } else {
                                            rollData.clip.value -= 2;
                                            await weapon.update({"system.clip.value" : rollData.clip.value})
                                        }
                                    } else {
                                        if (rollData.clip.value < 1) {
                                            return reportEmptyClip(rollData);
                                        } else {
                                            rollData.clip.value -= 1;
                                            await weapon.update({"system.clip.value": rollData.clip.value})
                                        }
                                    }
                                    break;
                                }
                                case 'semi_auto': {
                                    if (rollData.weaponTraits.storm || rollData.weaponTraits.twinLinked) {
                                        if (rollData.clip.value < rollData.rateOfFire.burst * 2) {
                                            return reportEmptyClip(rollData);
                                        } else {
                                            rollData.clip.value -= rollData.rateOfFire.burst * 2;
                                            await weapon.update({"system.clip.value": rollData.clip.value})
                                        }

                                    } else {
                                        if (rollData.clip.value < rollData.rateOfFire.burst) {
                                            return reportEmptyClip(rollData);
                                        } else {
                                            rollData.clip.value -= rollData.rateOfFire.burst;
                                            await weapon.update({"system.clip.value": rollData.clip.value})
                                        }
                                    }
                                    break;
                                }
                                case 'full_auto': {
                                    if (rollData.weaponTraits.storm || rollData.weaponTraits.twinLinked) {
                                        if (rollData.clip.value < rollData.rateOfFire.full * 2) {
                                            return reportEmptyClip(rollData);
                                        } else {
                                            rollData.clip.value -= rollData.rateOfFire.full * 2;
                                            await weapon.update({"system.clip.value": rollData.clip.value})
                                        }

                                    } else {
                                        if (rollData.clip.value < rollData.rateOfFire.full) {
                                            return reportEmptyClip(rollData);
                                        } else {
                                            rollData.clip.value -= rollData.rateOfFire.full;
                                            await weapon.update({"system.clip.value": rollData.clip.value})
                                        }
                                    }
                                    break;
                                }
                            }
                        }
                    }
                    let jamTarget = 96;
                    if (rollData.weaponTraits.reliable) {
                        jamTarget = 100;
                    }
                    if (rollData.weaponTraits.unreliable) {
                        jamTarget = 91;
                    }
                    if (rollData.weaponTraits.overheats) {
                        jamTarget = 91;
                        rollData.overheats = true;
                    }
                    rollData.jamTarget = jamTarget;
                    await combatRoll(rollData);
                },
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: game.i18n.localize("BUTTON.CANCEL"),
                callback: () => {},
            },
        },
        default: "roll",
        close: () => {},
    }, {width: 200});
    dialog.render(true);
}

/**
 * Show a ship combat roll dialog.
 * @param {object} rollData
 * @param {DarkHeresyActor} actorRef
 */
export async function prepareShipCombatRoll(rollData, actorRef) {
    const html = await renderTemplate("systems/rogue-trader/template/dialog/ship-combat-roll.html", rollData);
    let dialog = new Dialog({
        title: rollData.name,
        content: html,
        buttons: {
            roll: {
                icon: '<i class="fas fa-check"></i>',
                label: game.i18n.localize("BUTTON.ROLL"),
                callback: async (html) => {
                    rollData.name = game.i18n.localize(rollData.name);
                    rollData.baseTarget = parseInt(html.find("#target")[0]?.value, 10);
                    rollData.modifier = html.find("#modifier")[0]?.value;
                    rollData.strength = parseInt(html.find("#strength")[0]?.value, 10);
                    const range = html.find("#range")[0];
                    if (typeof range !== "undefined" && range !== null) {
                        rollData.range = range.value;
                        rollData.rangeText = range.options[range.selectedIndex].text;
                    }
                    const attackedShipType = html.find("#attackedShipType")[0];
                    rollData.attackedShipType = {
                        name : attackedShipType?.value,
                        text : attackedShipType?.options[attackedShipType.selectedIndex].text
                    };
                    const sideOfAttack = html.find("#sideOfAttack")[0];
                    rollData.sideOfAttack = {
                        name : sideOfAttack?.value,
                        text : sideOfAttack?.options[sideOfAttack.selectedIndex].text
                    };
                    rollData.damageFormula = html.find("#damageFormula")[0].value.replace(" ", "");
                    rollData.damageBonus = parseInt(html.find("#damageBonus")[0].value, 10);
                    rollData.isCombatTest = true;
                    await shipCombatRoll(rollData);
                },
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: game.i18n.localize("BUTTON.CANCEL"),
                callback: () => {},
            },
        },
        default: "roll",
        close: () => {},
    }, {width: 200});
    dialog.render(true);
}

/**
 * Show a ship turret roll dialog.
 * @param {object} rollData
 * @param {DarkHeresyActor} actorRef
 */
export async function prepareShipTurretsRoll(rollData, actorRef) {
    const html = await renderTemplate("systems/rogue-trader/template/dialog/ship-turret-roll.html", rollData);
    let dialog = new Dialog({
        title: rollData.name,
        content: html,
        buttons: {
            roll: {
                icon: '<i class="fas fa-check"></i>',
                label: game.i18n.localize("BUTTON.ROLL"),
                callback: async (html) => {
                    rollData.name = game.i18n.localize(rollData.name);
                    rollData.baseTarget = parseInt(html.find("#target")[0]?.value, 10);
                    rollData.modifier = parseInt(html.find("#modifier")[0]?.value, 10);
                    rollData.turretNumber = parseInt(html.find("#turretNumber")[0]?.value, 10);
                    rollData.isCombatTest = true;
                    await shipTurretRoll(rollData);
                },
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: game.i18n.localize("BUTTON.CANCEL"),
                callback: () => {},
            },
        },
        default: "roll",
        close: () => {},
    }, {width: 200});
    dialog.render(true);
}

/**
 * Show a unit combat roll dialog.
 * @param {object} rollData
 * @param {DarkHeresyActor} actorRef
 */
export async function prepareUnitCombatRoll(rollData, actorRef) {
    const html = await renderTemplate("systems/rogue-trader/template/dialog/unit-combat-roll.html", rollData);
    let dialog = new Dialog({
        title: rollData.name,
        content: html,
        buttons: {
            roll: {
                icon: '<i class="fas fa-check"></i>',
                label: game.i18n.localize("BUTTON.ROLL"),
                callback: async (html) => {
                    rollData.name = game.i18n.localize(rollData.name);
                    rollData.baseTarget = parseInt(html.find("#target")[0]?.value, 10);
                    rollData.modifier = html.find("#modifier")[0]?.value;
                    const range = html.find("#range")[0];
                    if (typeof range !== "undefined" && range !== null) {
                        rollData.range = range.value;
                        rollData.rangeText = range.options[range.selectedIndex].text;
                    }
                    const attackType = html.find("#attackType")[0];
                    rollData.attackType = {
                        name : attackType?.value,
                        text : attackType?.options[attackType.selectedIndex].text,
                        modifier : 0
                    };
                    rollData.damageFormula = html.find("#damageFormula")[0].value.replace(" ", "");
                    rollData.damageType = html.find("#damageType")[0].value;
                    rollData.damageBonus = parseInt(html.find("#damageBonus")[0].value, 10);
                    rollData.penetrationFormula = html.find("#penetration")[0].value;
                    rollData.isCombatTest = true;
                    if (rollData.weaponTraits.skipAttackRoll) {rollData.attackType.name = "standard";}
                    await unitCombatRoll(rollData);
                },
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: game.i18n.localize("BUTTON.CANCEL"),
                callback: () => {},
            },
        },
        default: "roll",
        close: () => {},
    }, {width: 200});
    dialog.render(true);
}

/**
 * Show a psychic power roll dialog.
 * @param {object} rollData
 */
export async function preparePsychicPowerRoll(rollData) {
  const html = await renderTemplate("systems/rogue-trader/template/dialog/psychic-power-roll.html", rollData);
  let dialog = new Dialog({
    title: rollData.name,
    content: html,
    buttons: {
      roll: {
        icon: '<i class="fas fa-check"></i>',
        label: game.i18n.localize("BUTTON.ROLL"),
        callback: async html => {
          rollData.name = game.i18n.localize(rollData.name);
          rollData.baseTarget = parseInt(html.find("#target")[0].value, 10);
          rollData.modifier = html.find("#modifier")[0].value;
          rollData.psy.value = parseInt(html.find("#psy")[0].value, 10);
          rollData.psy.warpConduit = html.find("#warpConduit")[0].checked;
          rollData.damageFormula = html.find("#damageFormula")[0].value;
          rollData.damageType = html.find("#damageType")[0].value;
          rollData.damageBonus = parseInt(html.find("#damageBonus")[0].value, 10);
          rollData.penetrationFormula = html.find("#penetration")[0].value;
          rollData.rateOfFire = { burst: rollData.psy.value, full: rollData.psy.value };
          const attackType = html.find("#attackType")[0];
          rollData.attackType.name = attackType.value;
          rollData.attackType.text = attackType.options[attackType.selectedIndex].text;
          rollData.psy.useModifier = true;
          rollData.isCombatTest = true;
          rollData.isJammed = 999;
          await combatRoll(rollData);
        }
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: game.i18n.localize("BUTTON.CANCEL"),
        callback: () => {}
      }
    },
    default: "roll",
    close: () => {}
  }, {width: 200});
  dialog.render(true);
}
