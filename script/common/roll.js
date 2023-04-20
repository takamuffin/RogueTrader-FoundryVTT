/**
 * Roll a generic roll, and post the result to chat.
 * @param {object} rollData
 */
export async function commonRoll(rollData) {
  await _computeTarget(rollData);
  await _rollTarget(rollData);
  await _sendToChat(rollData);
}

/**
 * Roll a combat roll, and post the result to chat.
 * @param {object} rollData
 */
export async function combatRoll(rollData) {
  if (rollData.weaponTraits.skipAttackRoll) {
    rollData.result = 5; // Attacks that skip the hit roll always hit body; 05 reversed 50 = body
    await _rollDamage(rollData);
    // Without a To Hit Roll we need a substitute otherwise foundry can't render the message
    rollData.rollObject = rollData.damages[0].damageRoll;
  } else {
    await _computeTarget(rollData);
    await _rollTarget(rollData);
    if (rollData.isJammed) {
      if (rollData.isOverheated) {
        await _rollDamage(rollData);
      }
    }
    else if (rollData.isSuccess) {
      await _rollDamage(rollData);
    }
  }
  await _sendToChat(rollData);
}

export async function shipCombatRoll(rollData) {
  // if (rollData.weaponTraits.skipAttackRoll) {
  //   rollData.result = 5; // Attacks that skip the hit roll always hit body; 05 reversed 50 = body
  //   await _rollShipDamage(rollData);
  //   // Without a To Hit Roll we need a substitute otherwise foundry can't render the message
  //   rollData.rollObject = rollData.damages[0].damageRoll;
  // } else {
    await _computeShipTarget(rollData);
    rollData.shotResults = [];
    rollData.numberOfHits = 0;
    for (let i = 0; i < rollData.strength; i++) {
      await _rollShipTargetDamage(rollData);
    }
  // }
  await _sendShipToChat(rollData);
}

/**
 * Post an "empty clip, need to reload" message to chat.
 * @param {object} rollData
 */
export async function reportEmptyClip(rollData) {
  await _emptyClipToChat(rollData);
}

/**
 * Compute the target value, including all +/-modifiers, for a roll.
 * @param {object} rollData
 */
async function _computeTarget(rollData) {
  const range = (rollData.range) ? rollData.range : "0";
  let attackType = 0;
  if (typeof rollData.attackType !== "undefined" && rollData.attackType != null) {
    _computeRateOfFire(rollData);
    attackType = rollData.attackType.modifier;
  }
  let psyModifier = 0;
  if (typeof rollData.psy !== "undefined" && typeof rollData.psy.useModifier !== "undefined" && rollData.psy.useModifier) {
    // Set Current Psyrating to the allowed maximum if it is bigger
    if (rollData.psy.value > rollData.psy.max) {
      rollData.psy.value = rollData.psy.max;
    }
    psyModifier = (rollData.psy.rating - rollData.psy.value) * 10;
    rollData.psy.push = psyModifier < 0;
    if (rollData.psy.push && rollData.psy.warpConduit) {
      let ratingBonus = new Roll("1d5").evaluate({ async: false }).total;
      rollData.psy.value += ratingBonus;
    }
  }
  let aim = rollData.aim?.val ? rollData.aim.val : 0;
  const formula = `0 + ${rollData.modifier} + ${aim} + ${range} + ${attackType} + ${psyModifier}`;
  let r = new Roll(formula, {});
  r.evaluate({ async: false });
  if (r.total > 60) {
    rollData.target = rollData.baseTarget + 60;
  } else if (r.total < -60) {
    rollData.target = rollData.baseTarget + -60;
  } else {
    rollData.target = rollData.baseTarget + r.total;
  }
  rollData.rollObject = r;
}

async function _computeShipTarget(rollData) {
  const range = (rollData.range) ? rollData.range : "0";
  let attackType = 0;
  const formula = `0 + ${rollData.modifier} + + ${range}`;
  let r = new Roll(formula, {});
  r.evaluate({ async: false });
  if (r.total > 60) {
    rollData.target = rollData.baseTarget + 60;
  } else if (r.total < -60) {
    rollData.target = rollData.baseTarget + -60;
  } else {
    rollData.target = rollData.baseTarget + r.total;
  }
  rollData.rollObject = r;
}

/**
 * Roll a d100 against a target, and apply the result to the rollData.
 * @param {object} rollData
 */
async function _rollTarget(rollData) {
  let r = new Roll("1d100", {});
  r.evaluate({ async: false });
  rollData.result = r.total;
  rollData.rollObject = r;
  rollData.isJammed = rollData.result >= rollData.jamTarget;
  rollData.isSuccess = rollData.result <= rollData.target;
  rollData.isOverheated = false;
  if (rollData.isJammed) {
    if (rollData.overheats) {
      rollData.isOverheated = true;
    }
  }
  else if (rollData.isSuccess) {
    rollData.dof = 0;
    rollData.dos = 1 + _getDegree(rollData.target, rollData.result);
  } else {
    rollData.dos = 0;
    rollData.dof = 1 + _getDegree(rollData.result, rollData.target);
  }
  if (typeof rollData.psy !== "undefined") _computePsychicPhenomena(rollData);
}

async function _rollShipTargetDamage(rollData) {
  let r = new Roll("1d100", {});
  r.evaluate({ async: false });
  let rollResult = new Object();
  rollResult.result = r.total;
  rollResult.rollObject = r;
  rollResult.isSuccess = rollResult.result <= rollData.target;
  if (rollResult.isSuccess) {
    rollResult.dof = 0;
    rollResult.dos = 1 + _getDegree(rollData.target, rollResult.result);
  } else {
    rollResult.dos = 0;
    rollResult.dof = 1 + _getDegree(rollResult.result, rollData.target);
  }
  if (rollResult.isSuccess) {
    let formula = "0";
    if (rollData.damageFormula) {
      formula = rollData.damageFormula;

      formula = `${formula}+${rollData.damageBonus}`;
    }
    rollResult.hit = await _computeShipDamage(formula, rollResult.dos);
    rollResult.location = _getShipLocation(rollResult.result, rollData.attackedShipType.name, rollData.sideOfAttack.name);
    rollData.numberOfHits++;
  }
  rollData.shotResults.push(rollResult);
}

/**
 * Handle rolling and collecting parts of a combat damage roll.
 * @param {object} rollData
 */
async function _rollDamage(rollData) {
  let formula = "0";
  rollData.damages = [];
  if (rollData.damageFormula) {
    formula = rollData.damageFormula;

    if (rollData.weaponTraits.tearing) {
      formula = _appendTearing(formula);
    }
    if (rollData.weaponTraits.proven) {
      formula = _appendNumberedDiceModifier(formula, "min", rollData.weaponTraits.proven);
    }
    if (rollData.weaponTraits.primitive) {
      formula = _appendNumberedDiceModifier(formula, "max", rollData.weaponTraits.primitive);
    }

    formula = `${formula}+${rollData.damageBonus}`;
    if (rollData.weaponTraits.unstable) {
      formula = _appendUnstable(formula);
    }
    formula = _replaceSymbols(formula, rollData);
  }
  let penetration = _rollPenetration(rollData);
  let firstHit = await _computeDamage(formula, penetration, rollData.dos, rollData.aim?.val, rollData.weaponTraits);
  if (firstHit.total !== 0) {
    const firstLocation = _getLocation(rollData.result);
    firstHit.location = firstLocation;
    rollData.damages.push(firstHit);

    let potentialHits = rollData.dos;
    let stormMod = (rollData.weaponTraits.storm ? 2: 1);
    // if (rollData.weaponTraits.twinLinked) {
    //   stormMod = 2;
    // }
    if (((rollData.attackType.hitMargin > 0) || (rollData.twinLinkedAdditionalHitMargin > 0)) && !rollData.isOverheated) {
      let maxAdditionalHit = Math.floor(((potentialHits * stormMod) - 1) / rollData.attackType.hitMargin);
      if (typeof rollData.maxAdditionalHit !== "undefined" && maxAdditionalHit > rollData.maxAdditionalHit) {
        maxAdditionalHit = rollData.maxAdditionalHit;
      }
      if (rollData.twinLinkedAdditionalHitMargin != 0) {
        let twinLinkedAdditionalHit = Math.floor(potentialHits / rollData.twinLinkedAdditionalHitMargin);
        if (twinLinkedAdditionalHit > rollData.maxTwinLinkedHit) {
          twinLinkedAdditionalHit = rollData.maxTwinLinkedHit;
        }
        if (twinLinkedAdditionalHit > 0) {
          maxAdditionalHit += twinLinkedAdditionalHit;
        }
      }
      rollData.numberOfHit = maxAdditionalHit + 1;
      for (let i = 0; i < maxAdditionalHit; i++) {
        let additionalHit = await _computeDamage(formula, penetration, rollData.dos, rollData.aim?.val, rollData.weaponTraits);
        additionalHit.location = _getAdditionalLocation(firstLocation, i);
        rollData.damages.push(additionalHit);
      }
    } else {
      rollData.numberOfHit = 1;
    }
    // let minDamage = rollData.damages.reduce(
    //   (min, damage) => min.minDice < damage.minDice ? min : damage, rollData.damages[0]
    // );
    // if (minDamage.minDice < rollData.dos) {
    //   minDamage.total += (rollData.dos - minDamage.minDice);
    // }
  }
}

async function _rollShipDamage(rollData) {
  let formula = "0";
  if (rollData.damageFormula) {
    formula = rollData.damageFormula;

    formula = `${formula}+${rollData.damageBonus}`;
    formula = _replaceSymbols(formula, rollData);
  }
  let hit = await _computeShipDamage(formula, rollData.dos);
  hit.location = _getShipLocation(rollData.result, rollData.attackedShipType, rollData.sideOfAttack);
}

/**
 * Roll and compute damage.
 * @param {number} penetration
 * @param {object} rollData
 * @returns {object}
 */
async function _computeDamage(damageFormula, penetration, dos, aimMode, weaponTraits) {
  let r = new Roll(damageFormula);
  r.evaluate({ async: false });
  let damage = {
    total: r.total,
    righteousFury: 0,
    dices: [],
    penetration: penetration,
    dos: dos,
    formula: damageFormula,
    replaced: false,
    damageRender: await r.render()
  };

  if (weaponTraits.accurate && (aimMode != "0")) {
    let aimDmg = 0;
    if (aimMode == "10"){
      aimDmg = (dos - 1) * 1; //-1 because each degree after the first counts
    } else {
      aimDmg = (dos - 1) * 2; //-1 because each degree after the first counts
    }
       let ar = new Roll(`${aimDmg}`);
       ar.evaluate({ async: false });
       damage.accurateRender = await ar.render();
    // }
  }

  // Without a To Hit we a roll to associate the chat message with
  if (weaponTraits.skipAttackRoll) {
    damage.damageRoll = r;
  }

  r.terms.forEach(term => {
    if (typeof term === "object" && term !== null) {
      let rfFace = weaponTraits.rfFace ? weaponTraits.rfFace : term.faces; // Without the Vengeful weapon trait rfFace is undefined
      term.results?.forEach(async result => {
        let dieResult = result.count ? result.count : result.result; // Result.count = actual value if modified by term
        if (result.active && dieResult >= rfFace) damage.righteousFury = _rollRighteousFury();
        if (result.active && dieResult < dos) damage.dices.push(dieResult);
        if (result.active && (typeof damage.minDice === "undefined" || dieResult < damage.minDice)) damage.minDice = dieResult;
      });
    }
  });
  return damage;
}

async function _computeShipDamage(damageFormula, dos) {
  let r = new Roll(damageFormula);
  r.evaluate({ async: false });
  let damage = {
    total: r.total,
    righteousFury: 0,
    dices: [],
    dos: dos,
    formula: damageFormula,
    replaced: false,
    damageRender: await r.render()
  };

  // Without a To Hit we a roll to associate the chat message with
  // if (weaponTraits.skipAttackRoll) {
  //   damage.damageRoll = r;
  // }

  // r.terms.forEach(term => {
  //   if (typeof term === "object" && term !== null) {
  //     let rfFace = weaponTraits.rfFace ? weaponTraits.rfFace : term.faces; // Without the Vengeful weapon trait rfFace is undefined
  //     term.results?.forEach(async result => {
  //       let dieResult = result.count ? result.count : result.result; // Result.count = actual value if modified by term
  //       if (result.active && dieResult >= rfFace) damage.righteousFury = _rollRighteousFury();
  //       if (result.active && dieResult < dos) damage.dices.push(dieResult);
  //       if (result.active && (typeof damage.minDice === "undefined" || dieResult < damage.minDice)) damage.minDice = dieResult;
  //     });
  //   }
  // });
  return damage;
}

/**
 * Evaluate final penetration, by leveraging the dice roll API.
 * @param {object} rollData
 * @returns {number}
 */
function _rollPenetration(rollData) {
  let penetration = (rollData.penetrationFormula) ? _replaceSymbols(rollData.penetrationFormula, rollData) : "0";
  let multiplier = 1;

  if (penetration.includes("(")) // Legacy Support
  {
    if (rollData.dos >= 3) {
      let rsValue = penetration.match(/\(\d+\)/gi); // Get Razorsharp Value
      penetration = penetration.replace(/\d+.*\(\d+\)/gi, rsValue); // Replace construct BaseValue(RazorsharpValue) with the extracted data
    }

  } else if (rollData.weaponTraits.razorSharp) {
    if (rollData.dos >= 3) {
      multiplier = 2;
    }
  }
  let r = new Roll(penetration.toString());
  r.evaluate({ async: false });
  return r.total * multiplier;
}

/**
 * Roll a Righteous Fury dice, and return the value.
 * @returns {number}
 */
function _rollRighteousFury() {
  let r = new Roll("1d5");
  r.evaluate({ async: false });
  return r.total;
}

/**
 * Check for psychic phenomena (i.e, the user rolled two matching numbers, etc.), and add the result to the rollData.
 * @param {object} rollData
 */
function _computePsychicPhenomena(rollData) {
  rollData.psy.hasPhenomena = rollData.psy.push ? !_isDouble(rollData.result) : _isDouble(rollData.result);
}

/**
 * Check if a number (d100 roll) has two matching digits.
 * @param {number} number
 * @returns {boolean}
 */
function _isDouble(number) {
  if (number === 100) {
    return true;
  } else {
    const digit = number % 10;
    return number - digit === digit * 10;
  }
}

/**
 * Get the hit location from a WS/BS roll.
 * @param {number} result
 * @returns {string}
 */
function _getLocation(result) {
  const toReverse = result < 10 ? `0${result}` : result.toString();
  const locationTarget = parseInt(toReverse.split("").reverse().join(""));
  if (locationTarget <= 10) {
    return "ARMOUR.HEAD";
  } else if (locationTarget <= 20) {
    return "ARMOUR.RIGHT_ARM";
  } else if (locationTarget <= 30) {
    return "ARMOUR.LEFT_ARM";
  } else if (locationTarget <= 70) {
    return "ARMOUR.BODY";
  } else if (locationTarget <= 85) {
    return "ARMOUR.RIGHT_LEG";
  } else if (locationTarget <= 100) {
    return "ARMOUR.LEFT_LEG";
  } else {
    return "ARMOUR.BODY";
  }
}

function _getShipLocation(result, attackedShip, sideOfAttack) {
  const toReverse = result < 10 ? `0${result}` : result.toString();
  const locationTarget = parseInt(toReverse.split("").reverse().join(""));
  if (attackedShip == "big") {
    if (sideOfAttack == "prow") {
      if (locationTarget <= 5) {
        return "HIT_SYSTEMS.BRIDGE";
      } else if (locationTarget <= 45) {
        return "HIT_SYSTEMS.PROW";
      } else if (locationTarget <= 60) {
        return "HIT_SYSTEMS.PORT";
      } else if (locationTarget <= 75) {
        return "HIT_SYSTEMS.STARBOARD";
      } else return "HIT_SYSTEMS.MAIN";
    }
    if (sideOfAttack == "port") {
      if (locationTarget <= 5) {
        return "HIT_SYSTEMS.BRIDGE";
      } else if (locationTarget <= 15) {
        return "HIT_SYSTEMS.PROW";
      } else if (locationTarget <= 30) {
        return "HIT_SYSTEMS.AFT";
      } else if (locationTarget <= 60) {
        return "HIT_SYSTEMS.PORT";
      } else return "HIT_SYSTEMS.MAIN";
    }
    if (sideOfAttack == "starboard") {
      if (locationTarget <= 5) {
        return "HIT_SYSTEMS.BRIDGE";
      } else if (locationTarget <= 15) {
        return "HIT_SYSTEMS.PROW";
      } else if (locationTarget <= 30) {
        return "HIT_SYSTEMS.AFT";
      } else if (locationTarget <= 60) {
        return "HIT_SYSTEMS.STARBOARD";
      } else return "HIT_SYSTEMS.MAIN";
    }
    if (sideOfAttack == "aft") {
      if (locationTarget <= 5) {
        return "HIT_SYSTEMS.BRIDGE";
      } else if (locationTarget <= 45) {
        return "HIT_SYSTEMS.AFT";
      } else if (locationTarget <= 60) {
        return "HIT_SYSTEMS.PORT";
      } else if (locationTarget <= 75) {
        return "HIT_SYSTEMS.STARBOARD";
      } else return "HIT_SYSTEMS.MAIN";
    }
  }
  else {
    if (sideOfAttack == "prow") {
      if (locationTarget <= 5) {
        return "HIT_SYSTEMS.BRIDGE";
      } else if (locationTarget <= 60) {
        return "HIT_SYSTEMS.PROW";
      } else return "HIT_SYSTEMS.MAIN";
    }
    if (sideOfAttack == "port") {
      if (locationTarget <= 5) {
        return "HIT_SYSTEMS.BRIDGE";
      } else if (locationTarget <= 30) {
        return "HIT_SYSTEMS.PORT";
      } else if (locationTarget <= 50) {
        return "HIT_SYSTEMS.AFT";
      } else return "HIT_SYSTEMS.MAIN";
    }
    if (sideOfAttack == "starboard") {
      if (locationTarget <= 5) {
        return "HIT_SYSTEMS.BRIDGE";
      } else if (locationTarget <= 30) {
        return "HIT_SYSTEMS.STARBOARD";
      } else if (locationTarget <= 50) {
        return "HIT_SYSTEMS.AFT";
      } else return "HIT_SYSTEMS.MAIN";
    }
    if (sideOfAttack == "aft") {
      if (locationTarget <= 5) {
        return "HIT_SYSTEMS.BRIDGE";
      } else if (locationTarget <= 60) {
        return "HIT_SYSTEMS.AFT";
      } else return "HIT_SYSTEMS.MAIN";
    }
  }
}

/**
 * Calculate modifiers/etc. from RoF type, and add them to the rollData.
 * @param {object} rollData
 */
function _computeRateOfFire(rollData) {
  rollData.maxAdditionalHit = 0;
  rollData.maxTwinLinkedHit = 0;
  let stormMod = rollData.weaponTraits.storm ? 2:1;
  // let stormMod = 1;
  // if (rollData.weaponTraits.storm || rollData.weaponTraits.twinLinked) {
  //   stormMod = 2;
  // }

  switch (rollData.attackType.name) {
    case "standard":
      rollData.attackType.modifier = 10;
      rollData.attackType.hitMargin = rollData.weaponTraits.storm ? 1: 0;
      rollData.maxAdditionalHit = rollData.weaponTraits.storm ? 1: 0;
      rollData.twinLinkedAdditionalHitMargin = rollData.weaponTraits.twinLinked ? 2:0;
      rollData.maxTwinLinkedHit = rollData.weaponTraits.twinLinked ? 1:0;
      break;

    case "bolt":
    case "blast":
      rollData.attackType.modifier = 0;
      rollData.attackType.hitMargin = 0;
      break;

    case "swift":
    case "semi_auto":
    case "barrage":
      rollData.attackType.modifier = 0;
      rollData.attackType.hitMargin = 2;
      rollData.maxAdditionalHit = (rollData.rateOfFire.burst * stormMod) - 1;
      rollData.twinLinkedAdditionalHitMargin = rollData.weaponTraits.twinLinked ? 3:0;
      rollData.maxTwinLinkedHit = rollData.rateOfFire.burst;
      break;

    case "lightning":
    case "full_auto":
      rollData.attackType.modifier = -10;
      rollData.attackType.hitMargin = 1;
      rollData.maxAdditionalHit = (rollData.rateOfFire.full * stormMod) - 1;
      rollData.twinLinkedAdditionalHitMargin = rollData.weaponTraits.twinLinked ? 2:0;
      rollData.maxTwinLinkedHit = rollData.rateOfFire.full;
      break;

    case "storm":
      rollData.attackType.modifier = 0;
      rollData.attackType.hitMargin = 1;
      rollData.maxAdditionalHit = rollData.rateOfFire.full - 1;
      break;

    case "called_shot":
      rollData.attackType.modifier = -20;
      rollData.attackType.hitMargin = 0;
      break;

    case "charge":
      rollData.attackType.modifier = 20;
      rollData.attackType.hitMargin = 0;
      break;

    case "allOut":
      rollData.attackType.modifier = 30;
      rollData.attackType.hitMargin = 0;
      break;

    default:
      rollData.attackType.modifier = 0;
      rollData.attackType.hitMargin = 0;
      break;
  }
}

const additionalHit = {
  head: ["ARMOUR.HEAD", "ARMOUR.RIGHT_ARM", "ARMOUR.BODY", "ARMOUR.LEFT_ARM", "ARMOUR.BODY"],
  rightArm: ["ARMOUR.RIGHT_ARM", "ARMOUR.RIGHT_ARM", "ARMOUR.HEAD", "ARMOUR.BODY", "ARMOUR.RIGHT_ARM"],
  leftArm: ["ARMOUR.LEFT_ARM", "ARMOUR.LEFT_ARM", "ARMOUR.HEAD", "ARMOUR.BODY", "ARMOUR.LEFT_ARM"],
  body: ["ARMOUR.BODY", "ARMOUR.RIGHT_ARM", "ARMOUR.HEAD", "ARMOUR.LEFT_ARM", "ARMOUR.BODY"],
  rightLeg: ["ARMOUR.RIGHT_LEG", "ARMOUR.BODY", "ARMOUR.RIGHT_ARM", "ARMOUR.HEAD", "ARMOUR.BODY"],
  leftLeg: ["ARMOUR.LEFT_LEG", "ARMOUR.BODY", "ARMOUR.LEFT_ARM", "ARMOUR.HEAD", "ARMOUR.BODY"]
};

/**
 * Get successive hit locations for an attack which scored multiple hits.
 * @param {string} firstLocation
 * @param {number} numberOfHit
 * @returns {string}
 */
function _getAdditionalLocation(firstLocation, numberOfHit) {
  if (firstLocation === "ARMOUR.HEAD") {
    return _getLocationByIt(additionalHit.head, numberOfHit);
  } else if (firstLocation === "ARMOUR.RIGHT_ARM") {
    return _getLocationByIt(additionalHit.rightArm, numberOfHit);
  } else if (firstLocation === "ARMOUR.LEFT_ARM") {
    return _getLocationByIt(additionalHit.leftArm, numberOfHit);
  } else if (firstLocation === "ARMOUR.BODY") {
    return _getLocationByIt(additionalHit.body, numberOfHit);
  } else if (firstLocation === "ARMOUR.RIGHT_LEG") {
    return _getLocationByIt(additionalHit.rightLeg, numberOfHit);
  } else if (firstLocation === "ARMOUR.LEFT_LEG") {
    return _getLocationByIt(additionalHit.leftLeg, numberOfHit);
  } else {
    return _getLocationByIt(additionalHit.body, numberOfHit);
  }
}

/**
 * Lookup hit location from array.
 * @param {Array} part
 * @param {number} numberOfHit
 * @returns {string}
 */
function _getLocationByIt(part, numberOfHit) {
  const index = numberOfHit > (part.length - 1) ? part.length - 1 : numberOfHit;
  return part[index];
}


/**
 * Get degrees of success/failure from a target and a roll.
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
function _getDegree(a, b) {
  return Math.floor(a / 10) - Math.floor(b / 10);
}
/**
 * Replaces all Symbols in the given Formula with their Respective Values
 * The Symbols consist of Attribute Boni and Psyrating
 * @param {*} formula
 * @param {*} rollData
 * @returns {string}
 */
function _replaceSymbols(formula, rollData) {
  if (rollData.psy) {
    formula = formula.replaceAll(/PR/gi, rollData.psy.value);
  }
  for (let boni of rollData.attributeBoni) {
    formula = formula.replaceAll(boni.regex, boni.value);
  }
  return formula;
}

/**
 * Add a special weapon modifier value to a roll formula.
 * @param {string} formula
 * @param {string} modifier
 * @param {number} value
 * @returns {string}
 */
function _appendNumberedDiceModifier(formula, modifier, value) {
  let diceRegex = /\d+d\d+/;
  if (!formula.includes(modifier)) {
    let match = formula.match(diceRegex);
    if (match) {
      let dice = match[0];
      dice += `${modifier}${value}`;
      formula = formula.replace(diceRegex, dice);
    }
  }
  return formula;
}

/**
 * Add the "tearing" special weapon modifier to a roll formula.
 * @param {string} formula
 * @returns {string}
 */
function _appendTearing(formula) {
  let diceRegex = /\d+d\d+/;
  if (!formula.match(/dl|kh/gi, formula)) { // Already has drop lowest or keep highest
    let match = formula.match(/\d+/g, formula);
    let numDice = parseInt(match[0]) + 1;
    let faces = parseInt(match[1]);
    let diceTerm = `${numDice}d${faces}dl`;
    formula = formula.replace(diceRegex, diceTerm);
  }
  return formula;
}

function _appendUnstable(formula) {
  let r = new Roll("d10");
  r.evaluate({ async: false });
  if (r.total == 1) {
    formula = "(" + formula + ")/2";
  } else if (r.total == 10) {
    formula = "(" + formula + ")*2";
  }
  return formula;
}

/**
 * Post a roll to chat.
 * @param {object} rollData
 */
async function _sendToChat(rollData) {
  let speaker = ChatMessage.getSpeaker();
  let chatData = {
    user: game.user.id,
    type: CONST.CHAT_MESSAGE_TYPES.ROLL,
    rollMode: game.settings.get("core", "rollMode"),
    speaker: speaker,
    flags: {
      "rogue-trader.rollData": rollData
    }
  };

  if(speaker.token) {
    rollData.tokenId = speaker.token;
  }

  if (rollData.rollObject) {
    rollData.render = await rollData.rollObject.render();
    chatData.roll = rollData.rollObject;
  }

  const html = await renderTemplate("systems/rogue-trader/template/chat/roll.html", rollData);
  chatData.content = html;

  if (["gmroll", "blindroll"].includes(chatData.rollMode)) {
    chatData.whisper = ChatMessage.getWhisperRecipients("GM");
  } else if (chatData.rollMode === "selfroll") {
    chatData.whisper = [game.user];
  }

  ChatMessage.create(chatData);
}

async function _sendShipToChat(rollData) {
  let speaker = ChatMessage.getSpeaker();
  let chatData = {
    user: game.user.id,
    type: CONST.CHAT_MESSAGE_TYPES.ROLL,
    rollMode: game.settings.get("core", "rollMode"),
    speaker: speaker,
    flags: {
      "rogue-trader.rollData": rollData
    }
  };

  if(speaker.token) {
    rollData.tokenId = speaker.token;
  }

  // if (rollData.rollObject) {
  //   rollData.render = await rollData.rollObject.render();
  //   chatData.roll = rollData.rollObject;
  // }

  const html = await renderTemplate("systems/rogue-trader/template/chat/ship-roll.html", rollData);
  chatData.content = html;

  if (["gmroll", "blindroll"].includes(chatData.rollMode)) {
    chatData.whisper = ChatMessage.getWhisperRecipients("GM");
  } else if (chatData.rollMode === "selfroll") {
    chatData.whisper = [game.user];
  }

  ChatMessage.create(chatData);
}

/**
 * Post a "you need to reload" message to chat.
 * @param {object} rollData
 */
async function _emptyClipToChat(rollData) {
  let chatData = {
    user: game.user.id,
    content: `
          <div class="rogue-trader chat roll">
              <div class="background border">
                  <p><strong>Reload! Out of Ammo!</strong></p>
              </div>
          </div>
        `
  };
  ChatMessage.create(chatData);
}