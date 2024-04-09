export class DarkHeresyItem extends Item {
    async sendToChat() {
        const item = new CONFIG.Item.documentClass(this.data._source);
        const html = await renderTemplate("systems/rogue-trader/template/chat/item.html", {item, data: item.system});
        const chatData = {
            user: game.user.id,
            rollMode: game.settings.get("core", "rollMode"),
            content: html
        };
        if (["gmroll", "blindroll"].includes(chatData.rollMode)) {
            chatData.whisper = ChatMessage.getWhisperRecipients("GM");
        } else if (chatData.rollMode === "selfroll") {
            chatData.whisper = [game.user];
        }
        ChatMessage.create(chatData);
    }


    // TODO convert to config file
    get Clip() {
        return `${this.clip.value}/${this.clip.max}`;
    }

    get Quantity() {
        return `${this.quantity.value}/${this.quantity.max}`;
    }

    get RateOfFire() {
        let rof = this.rateOfFire;
        let single = rof.single > 0 ? "S" : "-";
        let burst = rof.burst > 0 ? `${rof.burst}` : "-";
        let full = rof.full > 0 ? `${rof.full}` : "-";
        return `${single}/${burst}/${full}`;
    }

    get ShipWeaponRange() {
        return this.shipWeaponRange;
    }

    get SystemStatus() {
        let concSystem = this.system;
        let ss = "";
        if (concSystem.onFire == true) {
            if (ss == "") {
                ss += "On Fire";
            } else ss += ", On Fire";
        }
        if (concSystem.unPowered == true) {
            if (ss == "") {
                ss += "Unpowered";
            } else ss += ", Unpowered";
        }
        if (concSystem.depressurised == true) {
            if (ss == "") {
                ss += "Depressurised";
            } else ss += ", Depressurised";
        }
        if (concSystem.damaged == true) {
            if (ss == "") {
                ss += "Damaged";
            } else ss += ", Damaged";
        }
        if (concSystem.destroyed == true) {
            if (ss == "") {
                ss += "Destroyed";
            } else ss += ", Destroyed";
        }
        return ss;
    }

    get DamageTypeShort() {
        switch (this.damageType) {
            case "energy":
                return game.i18n.localize("DAMAGE_TYPE.ENERGY_SHORT");
            case "impact":
                return game.i18n.localize("DAMAGE_TYPE.IMPACT_SHORT");
            case "rending":
                return game.i18n.localize("DAMAGE_TYPE.RENDING_SHORT");
            case "explosive":
                return game.i18n.localize("DAMAGE_TYPE.EXPLOSIVE_SHORT");
            default:
                return game.i18n.localize("DAMAGE_TYPE.IMPACT_SHORT");
        }
    }

    get DamageType() {
        switch (this.damageType) {
            case "energy":
                return game.i18n.localize("DAMAGE_TYPE.ENERGY");
            case "impact":
                return game.i18n.localize("DAMAGE_TYPE.IMPACT");
            case "rending":
                return game.i18n.localize("DAMAGE_TYPE.RENDING");
            case "explosive":
                return game.i18n.localize("DAMAGE_TYPE.EXPLOSIVE");
            default:
                return game.i18n.localize("DAMAGE_TYPE.IMPACT");
        }
    }

    get ShipWeaponClass() {

        switch (this.shipWeaponClass) {
            case "macro":
                return game.i18n.localize("SHIP_WEAPON.MACRO");
            case "lance":
                return game.i18n.localize("SHIP_WEAPON.LANCE");
            case "torpedoes":
                return game.i18n.localize("SHIP_WEAPON.TORPEDOES");
            case "attack":
                return game.i18n.localize("SHIP_WEAPON.ATTACK");
            case "nova":
                return game.i18n.localize("SHIP_WEAPON.NOVA");
            case "special":
                return game.i18n.localize("SHIP_WEAPON.SPECIAL");
            default:
                return game.i18n.localize("SHIP_WEAPON.MACRO");
        }
    }

    get WeaponClass() {

        switch (this.class) {
            case "melee":
                return game.i18n.localize("WEAPON.MELEE");
            case "thrown":
                return game.i18n.localize("WEAPON.THROWN");
            case "launched":
                return game.i18n.localize("WEAPON.LAUNCHED");
            case "placed":
                return game.i18n.localize("WEAPON.PLACED");
            case "pistol":
                return game.i18n.localize("WEAPON.PISTOL");
            case "basic":
                return game.i18n.localize("WEAPON.BASIC");
            case "heavy":
                return game.i18n.localize("WEAPON.HEAVY");
            case "vehicle":
                return game.i18n.localize("WEAPON.VEHICLE");
            default:
                return game.i18n.localize("WEAPON.MELEE");
        }
    }

    get WeaponType() {

        switch (this.subtype) {
            case "las":
                return game.i18n.localize("WEAPON.LAS");
            case "solidprojectile":
                return game.i18n.localize("WEAPON.SOLIDPROJECTILE");
            case "bolt":
                return game.i18n.localize("WEAPON.BOLT");
            case "melta":
                return game.i18n.localize("WEAPON.MELTA");
            case "plasma":
                return game.i18n.localize("WEAPON.PLASMA");
            case "flame":
                return game.i18n.localize("WEAPON.FLAME");
            case "lowtech":
                return game.i18n.localize("WEAPON.LOWTECH");
            case "launcher":
                return game.i18n.localize("WEAPON.LAUNCHER");
            case "explosive":
                return game.i18n.localize("WEAPON.EXPLOSIVE");
            case "exotic":
                return game.i18n.localize("WEAPON.EXOTIC");
            case "chain":
                return game.i18n.localize("WEAPON.CHAIN");
            case "power":
                return game.i18n.localize("WEAPON.POWER");
            case "shock":
                return game.i18n.localize("WEAPON.SHOCK");
            case "force":
                return game.i18n.localize("WEAPON.FORCE");
            default:
                return "";
        }
    }

    get Craftsmanship() {
        switch (this.craftsmanship) {
            case "poor":
                return game.i18n.localize("CRAFTSMANSHIP.POOR");
            case "common":
                return game.i18n.localize("CRAFTSMANSHIP.COMMON");
            case "good":
                return game.i18n.localize("CRAFTSMANSHIP.GOOD");
            case "best":
                return game.i18n.localize("CRAFTSMANSHIP.BEST");
            default:
                return game.i18n.localize("CRAFTSMANSHIP.COMMON");
        }
    }

    get Availability() {
        switch (this.availability) {
            case "ubiquitous":
                return game.i18n.localize("AVAILABILITY.UBIQUITOUS");
            case "abundant":
                return game.i18n.localize("AVAILABILITY.ABUNDANT");
            case "plentiful":
                return game.i18n.localize("AVAILABILITY.PLENTIFUL");
            case "common":
                return game.i18n.localize("AVAILABILITY.COMMON");
            case "average":
                return game.i18n.localize("AVAILABILITY.AVERAGE");
            case "scarce":
                return game.i18n.localize("AVAILABILITY.SCARCE");
            case "rare":
                return game.i18n.localize("AVAILABILITY.RARE");
            case "very-rare":
                return game.i18n.localize("AVAILABILITY.VERY_RARE");
            case "extremely-rare":
                return game.i18n.localize("AVAILABILITY.EXTREMELY_RARE");
            case "near-unique":
                return game.i18n.localize("AVAILABILITY.NEAR_UNIQUE");
            case "Unique":
                return game.i18n.localize("AVAILABILITY.UNIQUE");
            default:
                return game.i18n.localize("AVAILABILITY.COMMON");
        }
    }

    get ArmourType() {
        switch (this.subtype) {
            case "basic":
                return game.i18n.localize("ARMOUR_TYPE.BASIC");
            case "flak":
                return game.i18n.localize("ARMOUR_TYPE.FLAK");
            case "mesh":
                return game.i18n.localize("ARMOUR_TYPE.MESH");
            case "carapace":
                return game.i18n.localize("ARMOUR_TYPE.CARAPACE");
            case "power":
                return game.i18n.localize("ARMOUR_TYPE.POWER");
            default:
                return game.i18n.localize("ARMOUR_TYPE.COMMON");
        }
    }

    get Part() {
        let part = this.part;
        let parts = [];
        if (part.head > 0) parts.push(`${game.i18n.localize("ARMOUR.HEAD")} (${part.head})`);
        if (part.leftArm > 0) parts.push(`${game.i18n.localize("ARMOUR.LEFT_ARM")} (${part.leftArm})`);
        if (part.rightArm > 0) parts.push(`${game.i18n.localize("ARMOUR.RIGHT_ARM")} (${part.rightArm})`);
        if (part.body > 0) parts.push(`${game.i18n.localize("ARMOUR.BODY")} (${part.body})`);
        if (part.leftLeg > 0) parts.push(`${game.i18n.localize("ARMOUR.LEFT_LEG")} (${part.leftLeg})`);
        if (part.rightLeg > 0) parts.push(`${game.i18n.localize("ARMOUR.RIGHT_LEG")} (${part.rightLeg})`);
        return parts.join(" / ");
    }

    get PartLocation() {
        switch (this.part) {
            case "head":
                return game.i18n.localize("ARMOUR.HEAD");
            case "leftArm":
                return game.i18n.localize("ARMOUR.LEFT_ARM");
            case "rightArm":
                return game.i18n.localize("ARMOUR.RIGHT_ARM");
            case "body":
                return game.i18n.localize("ARMOUR.BODY");
            case "leftLeg":
                return game.i18n.localize("ARMOUR.LEFT_LEG");
            case "rightLeg":
                return game.i18n.localize("ARMOUR.RIGHT_LEG");
            default:
                return game.i18n.localize("ARMOUR.BODY");
        }
    }

    get PsychicPowerZone() {
        switch (this.damage.zone) {
            case "bolt":
                return game.i18n.localize("PSYCHIC_POWER.BOLT");
            case "barrage":
                return game.i18n.localize("PSYCHIC_POWER.BARRAGE");
            case "storm":
                return game.i18n.localize("PSYCHIC_POWER.STORM");
            default:
                return game.i18n.localize("PSYCHIC_POWER.BOLT");
        }
    }

    get isInstalled() {
        return this.installed
            ? game.i18n.localize("Yes")
            : game.i18n.localize("No");
    }

    get isMentalDisorder() {
        return this.type === "mentalDisorder";
    }

    get isMalignancy() {
        return this.type === "malignancy";
    }

    get isMutation() {
        return this.type === "mutation";
    }

    get isTalent() {
        return this.type === "talent";
    }

    get isTrait() {
        return this.type === "trait";
    }

    get isSystemAbility() {
        return this.type === "systemAbility";
    }

    get isShipSystem() {
        return this.type === "shipSystem";
    }

    get isAptitude() {
        return this.type === "aptitude";
    }

    get isSpecialAbility() {
        return this.type === "specialAbility";
    }

    get isPsychicPower() {
        return this.type === "psychicPower";
    }

    get isCriticalInjury() {
        return this.type === "criticalInjury";
    }

    get isWeapon() {
        return this.type === "weapon";
    }

    get isShipWeapon() {
        return this.type === "shipWeapon";
    }

    get isArmour() {
        return this.type === "armour";
    }

    get isSystem() {
        return this.type === "shipSystem";
    }

    get isGear() {
        return this.type === "gear";
    }

    get isDrug() {
        return this.type === "drug";
    }

    get isTool() {
        return this.type === "tool";
    }

    get isCybernetic() {
        return this.type === "cybernetic";
    }

    get isWeaponModification() {
        return this.type === "weaponModification";
    }

    get isAmmunition() {
        return this.type === "ammunition";
    }

    get isForceField() {
        return this.type === "forceField";
    }

    get isAbilities() {
        return this.isTalent || this.isTrait || this.isSystemAbility || this.isShipSystem || this.isSpecialAbility;
    }

    get isAdditive() {
        return this.system.isAdditive;
    }

    get craftsmanship() {
        return this.system.craftsmanship;
    }

    get description() {
        return this.system.description;
    }

    get availability() {
        return this.system.availability;
    }

    get weight() {
        return this.system.weight;
    }

    get quantity() {
        return this.system.quantity;
    }

    get effect() {
        return this.system.effect;
    }

    get weapon() {
        return this.system.weapon;
    }

    get shipWeapon() {
        return this.system.shipWeapon;
    }

    get shipSystem() {
        return this.system.shipSystem;
    }

    get source() {
        return this.system.source;
    }

    get subtype() {
        return this.system.type;
    }

    get part() {
        return this.system.part;
    }

    get maxAgility() {
        return this.system.maxAgility;
    }

    get installed() {
        return this.system.installed;
    }

    set onFire(onFire) {
        this.system.onFire = onFire;
    }

    set unPowered(unPowered) {
        this.system.unPowered = unPowered;
    }

    set depressurised(depressurised) {
        this.system.depressurised = depressurised;
    }

    set damaged(damaged) {
        this.system.damaged = damaged;
    }

    set destroyed(destroyed) {
        this.system.destroyed = destroyed;
    }

    get onFire() {
        return this.system.onFire;
    }

    get unPowered() {
        return this.system.unPowered;
    }

    get depressurised() {
        return this.system.depressurised;
    }

    get damaged() {
        return this.system.damaged;
    }

    get destroyed() {
        return this.system.destroyed;
    }

    get isOnFire() {
        return this.system.onFire === true;
    }

    get isUnPowered() {
        return this.system.unPowered === true;
    }

    get isDepressurised() {
        return this.system.depressurised === true;
    }

    get isDamaged() {
        return this.system.damaged === true;
    }

    get isDestroyed() {
        return this.system.destroyed === true;
    }

    get shortDescription() {
        return this.system.shortDescription;
    }

    get protectionRating() {
        return this.system.protectionRating;
    }

    get overloadChance() {
        return this.system.overloadChance;
    }

    get cost() {
        return this.system.cost;
    }

    get prerequisite() {
        return this.system.prerequisite;
    }

    get action() {
        return this.system.action;
    }

    get focusPower() {
        return this.system.focusPower;
    }

    get range() {
        return this.system.range;
    }

    get shipWeaponRange() {
        return this.system.shipWeaponRange;
    }

    get sustained() {
        return this.system.sustained;
    }

    get psychicType() {
        return this.system.subtype;
    }

    get damage() {
        return this.system.damage;
    }

    get shipWeaponDamage() {
        return this.system.shipWeaponDamage;
    }

    get shipWeaponSize() {
        return this.system.shipWeaponSize;
    }

    get shipWeaponEnergy() {
        return this.system.shipWeaponEnergy;
    }

    get shipWeaponStrength() {
        return this.system.shipWeaponStrength;
    }

    get shipWeaponArc() {
        return this.system.shipWeaponArc;
    }

    get shipWeaponAttack() {
        return this.system.shipWeaponAttack;
    }

    get benefit() {
        return this.system.benefit;
    }

    get prerequisites() {
        return this.system.prerequisites;
    }

    get aptitudes() {
        return this.system.aptitudes;
    }

    get tier() {
        return this.system.tier;
    }

    get class() {
        return this.system.class;
    }

    get shipWeaponClass() {
        return this.system.shipWeaponClass;
    }

    get rateOfFire() {
        return this.system.rateOfFire;
    }

    get quantity() {
        return this.system.quantity;
    }

    get damageType() {
        return this.system.damageType
            || this.system?.damage?.type
            || this.system.effect?.damage?.type
            || this.system.type;
    }

    get penetration() {
        return this.system.penetration;
    }

    get clip() {
        return this.system.clip;
    }

    get reload() {
        return this.system.reload;
    }

    get initiative() {
        return this.system.initiative;
    }

    get special() {
        return this.system.special;
    }

    get attack() {
        return this.system.attack;
    }

    get upgrades() {
        return this.system.upgrades;
    }

}