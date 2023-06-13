export default class DarkHeresyUtil {

    static createCommonAttackRollData(actor, item) {
        return {
            name: item.name,
            attributeBoni: actor.attributeBoni,
            ownerId: actor.id,
            itemId: item.id,
            damageBonus: 0,
            damageType: item.damageType,
        };
    }

    static createCommonShipAttackRollData(actor, item) {
        return {
            name: item.name,
            ownerId: actor.id,
            itemId: item.id,
            damageBonus: 0,
        };
    }

    static createCommonUnitAttackRollData(actor, item) {
        return {
            name: item.name,
            ownerId: actor.id,
            itemId: item.id,
            damageBonus: 0,
            damageType: item.damageType,
        };
    }

    static createWeaponRollData(actor, weapon) {
        let characteristic = this.getWeaponCharacteristic(actor, weapon);
        let rateOfFire;
        if (weapon.class === "melee") {
            rateOfFire = {burst: characteristic.bonus, full: characteristic.bonus};
        } else {
            rateOfFire = {burst: weapon.rateOfFire.burst, full: weapon.rateOfFire.full};
        }
        let isMelee = weapon.class === "melee";

        let rollData = this.createCommonAttackRollData(actor, weapon);
        rollData.baseTarget= characteristic.total + weapon.attack,
            rollData.modifier= 0,
            rollData.isMelee= isMelee;
        rollData.isRange= !isMelee;
        rollData.clip= weapon.clip;
        rollData.rateOfFire= rateOfFire;
        rollData.weaponTraits= this.extractWeaponTraits(weapon.special);
        let attributeMod = (isMelee && !weapon.damage.match(/SB/gi) ? "+SB" : "");
        rollData.damageFormula= weapon.damage + attributeMod + (rollData.weaponTraits.force ? "+PR": "");
        rollData.penetrationFormula = weapon.penetration + (rollData.weaponTraits.force ? "+PR" : "");
        // rollData.weaponTraits= this.extractWeaponTraits(weapon.special);
        rollData.special= weapon.special;
        rollData.psy= { value: actor.psy.rating, display: false};
        return rollData;
    }

    static createShipWeaponRollData(actor, weapon) {
        let characteristic = this.getShipWeaponCharacteristic(actor);

        let rollData = this.createCommonShipAttackRollData(actor, weapon);
        rollData.baseTarget = parseInt(characteristic, 10) + weapon.shipWeaponAttack,
            rollData.modifier = 0;
        rollData.strength = parseInt(weapon.shipWeaponStrength, 10);
        rollData.damageFormula = weapon.shipWeaponDamage;
        rollData.special = weapon.special;
        return rollData;
    }

    static createUnitWeaponRollData(actor, weapon) {
        let characteristic = this.getUnitWeaponCharacteristic(actor, weapon);
        let enemyStats = this.getEnemyStats(actor);
        let rateOfFire;
        if (weapon.class === "melee") {
            rateOfFire = {burst: characteristic.bonus, full: characteristic.bonus};
        } else {
            rateOfFire = {burst: weapon.rateOfFire.burst, full: weapon.rateOfFire.full};
        }
        let isMelee = weapon.class === "melee";

        let rollData = this.createCommonUnitAttackRollData(actor, weapon);
        rollData.baseTarget= characteristic.total + weapon.attack,
            rollData.modifier= 0,
            rollData.isMelee= isMelee;
        rollData.weaponClass = weapon.class;
        rollData.enemyStats = enemyStats;
        rollData.isRange= !isMelee;
        rollData.quantity= weapon.quantity.value;
        rollData.rateOfFire= rateOfFire;
        rollData.weaponTraits= this.extractWeaponTraits(weapon.special);
        rollData.damageFormula= weapon.damage;
        rollData.penetrationFormula = weapon.penetration;
        rollData.special= weapon.special;
        rollData.numberOfHits = 0;
        rollData.crits = 0;
        rollData.damageDealt = 0;
        rollData.brutals = 0;
        return rollData;
    }

    static createPsychicRollData(actor, power) {
        let focusPowerTarget = this.getFocusPowerTarget(actor, power);

        let rollData = this.createCommonAttackRollData(actor, power);
        rollData.baseTarget= focusPowerTarget.total;
        rollData.modifier= power.focusPower.difficulty;
        rollData.damageFormula= power.damage.formula;
        rollData.penetrationFormula= power.damage.penetration;
        rollData.attackType= { name: power.damage.zone, text: "" };
        rollData.weaponTraits= this.extractWeaponTraits(power.damage.special);
        rollData.special= power.damage.special;
        rollData.psy = {
            value: actor.psy.rating,
            rating: actor.psy.rating,
            max: this.getMaxPsyRating(actor),
            warpConduit: false,
            display: true
        };
        return rollData;
    }

    static extractWeaponTraits(traits) {
        // These weapon traits never go above 9 or below 2
        return {
            accurate: this.hasNamedTrait(/Accurate/gi, traits),
            rfFace: this.extractNumberedTrait(/Vengeful.*\(\d\)/gi, traits), // The alternativ die face Righteous Fury is triggered on
            proven: this.extractNumberedTrait(/Proven.*\(\d\)/gi, traits),
            primitive: this.extractNumberedTrait(/Primitive.*\(\d\)/gi, traits),
            razorSharp: this.hasNamedTrait(/Razor *Sharp/gi, traits),
            skipAttackRoll: this.hasNamedTrait(/Spray/gi, traits),
            tearing: this.hasNamedTrait(/Tearing/gi, traits),
            reliable: this.hasNamedTrait(/Reliable/gi, traits),
            unreliable: this.hasNamedTrait(/Unreliable/gi, traits),
            unstable: this.hasNamedTrait(/Unstable/gi, traits),
            overheats: this.hasNamedTrait(/Overheats/gi, traits),
            storm: this.hasNamedTrait(/Storm/gi, traits),
            force: this.hasNamedTrait(/Force/gi, traits),
            inaccurate: this.hasNamedTrait(/Inaccurate/gi, traits),
            twinLinked: this.hasNamedTrait(/Twin-Linked/gi, traits),
            torrent: this.extractNumberedTrait(/Torrent.*\(\d\)/gi, traits),
            ordnance: this.extractNumberedTrait(/Ordnance.*\(\d\)/gi, traits),
            scatter: this.hasNamedTrait(/Scatter/gi, traits),
        };
    }

    static getMaxPsyRating(actor) {
        let base = actor.psy.rating;
        switch (actor.psy.class) {
            case "bound":
                return base + 2;
            case "unbound":
                return base + 4;
            case "daemonic":
                return base + 3;
        }
    }

    static extractNumberedTrait(regex, traits) {
        let rfMatch = traits.match(regex);
        if (rfMatch) {
            regex = /\d+/gi;
            return parseInt(rfMatch[0].match(regex)[0]);
        }
        return undefined;
    }

    static hasNamedTrait(regex, traits) {
        let rfMatch = traits.match(regex);
        if (rfMatch) {
            return true;
        } else {
            return false;
        }
    }

    static getWeaponCharacteristic(actor, weapon) {
        if (weapon.class === "melee") {
            return actor.characteristics.weaponSkill;
        } else {
            return actor.characteristics.ballisticSkill;
        }
    }

    static getShipWeaponCharacteristic(actor) {
        return actor.bio.shipCrewRate;
    }

    static getUnitWeaponCharacteristic(actor, weapon) {
        if (weapon.class === "melee") {
            let characteristics = new Object();
            characteristics.total = actor.bio.unitMeleeAttack;
            characteristics.bonus = Number((characteristics.total / 10).toFixed(0));
            return characteristics;
        } else {
            let characteristics = new Object();
            characteristics.total = actor.bio.unitRangedAttack;
            characteristics.bonus = Number((characteristics.total / 10).toFixed(0));
            return characteristics;
        }
    }

    static getEnemyStats(actor) {
        let enemyStats = new Object();
        enemyStats.armor = actor.bio.enemyArmor;
        enemyStats.toughness = actor.bio.enemyToughness;
        enemyStats.wounds = actor.bio.enemyWounds;
        enemyStats.auxChance = actor.bio.enemyAuxChance;
        enemyStats.auxArmor = actor.bio.enemyAuxArmor;
        enemyStats.auxToughness = actor.bio.enemyAuxToughness;
        enemyStats.auxWounds = actor.bio.enemyAuxWounds;
        enemyStats.meleeDefence = actor.bio.enemyMeleeDefence;
        enemyStats.rangedDefence = actor.bio.enemyRangedDefence;
        return enemyStats;
    }

    static getFocusPowerTarget(actor, psychicPower) {
        const normalizeName = psychicPower.focusPower.test.toLowerCase();
        if (actor.characteristics.hasOwnProperty(normalizeName)) {
            return actor.characteristics[normalizeName];
        } else if (actor.skills.hasOwnProperty(normalizeName)) {
            return actor.skills[normalizeName];
        } else {
            return actor.characteristics.willpower;
        }
    }

}

