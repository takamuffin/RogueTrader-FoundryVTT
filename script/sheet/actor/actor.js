import {prepareCommonRoll, prepareCombatRoll, prepareShipCombatRoll, prepareUnitCombatRoll, preparePsychicPowerRoll} from "../../common/dialog.js";
import DarkHeresyUtil from "../../common/util.js";

export class DarkHeresySheet extends ActorSheet {
    activateListeners(html) {
        super.activateListeners(html);
        html.find(".item-create").click(ev => this._onItemCreate(ev));
        html.find(".item-edit").click(ev => this._onItemEdit(ev));
        html.find(".item-delete").click(ev => this._onItemDelete(ev));
        html.find(".checkbox-click").click(ev => this._onCheckboxClick(ev));
        html.find("input").focusin(ev => this._onFocusIn(ev));
        html.find(".roll-characteristic").click(async ev => await this._prepareRollCharacteristic(ev));
        html.find(".roll-skill").click(async ev => await this._prepareRollSkill(ev));
        html.find(".roll-speciality").click(async ev => await this._prepareRollSpeciality(ev));
        html.find(".roll-insanity").click(async ev => await this._prepareRollInsanity(ev));
        html.find(".roll-corruption").click(async ev => await this._prepareRollCorruption(ev));
        html.find(".roll-weapon").click(async ev => await this._prepareRollWeapon(ev));
        html.find(".roll-ship-weapon").click(async ev => await this._prepareRollShipWeapon(ev));
        html.find(".roll-unit-weapon").click(async ev => await this._prepareRollUnitWeapon(ev));
        html.find(".roll-psychic-power").click(async ev => await this._prepareRollPsychicPower(ev));
    }

    /** @override */
    async getData() {
        const data = await super.getData();
        data.system = data.data.system;
        data.items = this.constructItemLists(data)

        data.enrichment = await this._enrichment();
        return data;
    }

    /**
    getData() {
        const data = super.getData();
        data.system = data.data.system;
        data.items = this.constructItemLists(data)
        return data;
    } */

    async _enrichment() {
        let enrichment = {};
        enrichment["system.bio.notes"] = await TextEditor.enrichHTML(this.actor.system.bio.notes, {async: true});
        return expandObject(enrichment);
    }

    /** @override */
    get template() {
        if (!game.user.isGM && this.actor.limited) {
            return "systems/rogue-trader/template/sheet/actor/limited-sheet.html";
        } else {
            return this.options.template;
        }
    }

    _getHeaderButtons() {
        let buttons = super._getHeaderButtons();
        if (this.actor.isOwner) {
            buttons = [
                {
                    label: game.i18n.localize("BUTTON.ROLL"),
                    class: "custom-roll",
                    icon: "fas fa-dice",
                    onclick: async ev => await this._prepareCustomRoll()
                }
            ].concat(buttons);
        }
        return buttons;
    }

    async _onDrop(event) {
        if (event.path || event.originalTarget || event.target) {
            let header;
            if (event.path) {
                header = event.path.at(2).dataset;
            }
            if (event.originalTarget) {
                header = event.originalTarget.parentElement.parentElement.dataset;
            }
            if (event.target) {
                header = event.target.parentElement.parentElement.dataset;
            }
            let itemData = TextEditor.getDragEventData(event);
            if (header.shiplocation && itemData.type == "Item" && this.actor.type == "spaceship") {
                let location = header.shiplocation;
                let itemID = TextEditor.getDragEventData(event).uuid.split(".")[3];
                let actorData = TextEditor.getDragEventData(event).uuid.split(".")[1];
                let lastActor;
                let item;
                if (itemData.uuid.split(".")[0] == "Compendium") {
                    // super._onDrop(event);
                    const data = TextEditor.getDragEventData(event);
                    const actor = this.actor;
                    const allowed = Hooks.call("dropActorSheetData", actor, this, data);
                    if (allowed === false) return;
                    const item = await Item.implementation.fromDropData(data);
                    const itemData = item.toObject();
                    itemData.system.location = location;
                    super._onDropItemCreate(itemData);
                    // const data = super.getData();
                    // item = data.items.get(itemData);
                } else {
                    lastActor = game.actors.get(actorData);
                    item = lastActor.items.get(itemID);
                    // }
                    if (lastActor == this.actor) {
                        item.update({'system.location': location});
                    } else {
                        const itemData = item.toObject();
                        itemData.system.location = location;
                        // let description = item.shortDescription;
                        // let isDamaged = item.system.isDamaged;
                        // let isDepressurised = item.system.isDepressurised;
                        // let isDestroyed = item.system.isDestroyed;
                        // let isOnFire = item.system.isOnFire;
                        // let isUnPowered = item.system.isUnPowered;
                        // let data = {
                        //     name: item.name,
                        //     type: item.type,
                        //     system: {location, description, isDamaged, isDepressurised, isDestroyed, isOnFire, isUnPowered},
                        // }
                        // lastActor.deleteEmbeddedDocuments("Item", [itemID]);
                        // this.actor.createEmbeddedDocuments("Item", [data]);
                        super._onDropItemCreate(itemData);
                    }
                }
            } else super._onDrop(event);
        } else super._onDrop(event);
    }

    _onItemCreate(event) {
        event.preventDefault();
        let header = event.currentTarget.dataset;
        let location = header.shiplocation;
        let data = {
            name: `New ${game.i18n.localize(`ITEM.Type${header.type.toLowerCase().capitalize()}`)}`,
            type: header.type
        }
        if (location) {
            data = {
                name: `New ${game.i18n.localize(`ITEM.Type${header.type.toLowerCase().capitalize()}`)}`,
                type: header.type,
                system: {location}
            }
        }
        this.actor.createEmbeddedDocuments("Item", [data], {renderSheet: true});
    }

    _onItemEdit(event) {
        event.preventDefault();
        const div = $(event.currentTarget).parents(".item");
        let item = this.actor.items.get(div.data("itemId"));
        item.sheet.render(true);
    }

    _onItemDelete(event) {
        event.preventDefault();
        const div = $(event.currentTarget).parents(".item");
        this.actor.deleteEmbeddedDocuments("Item", [div.data("itemId")]);
        div.slideUp(200, () => this.render(false));
    }

    _onCheckboxClick(event) {
        event.preventDefault();
        let name = event.currentTarget.dataset.name;
        const div = $(event.currentTarget).parents(".item");
        let item = this.actor.items.get(div.data("itemId"));
        if (name == "isOnFire") {
            item.update({'system.isOnFire': ! item.system?.isOnFire});
        }
        if (name == "isUnPowered") {
            item.update({'system.isUnPowered': ! item.system?.isUnPowered});
        }
        if (name == "isDepressurised") {
            item.update({'system.isDepressurised': ! item.system?.isDepressurised});
        }
        if (name == "isDamaged") {
            item.update({'system.isDamaged': ! item.system?.isDamaged});
        }
        if (name == "isDestroyed") {
            item.update({'system.isDestroyed': ! item.system?.isDestroyed});
        }
    }

    _onChangeInput(event) {
        event.preventDefault();
        let name = event.currentTarget.dataset.name;
        const div = $(event.currentTarget).parents(".item");
        let item = this.actor.items.get(div.data("itemId"));
        if (name == "energy") {
            item.update({'system.energy': event.currentTarget.value});
        } else if (name == "spaceNow") {
            item.update({'system.spaceNow': event.currentTarget.value});
        } else if (name == "spaceMax") {
            item.update({'system.spaceMax': event.currentTarget.value});
        } else super._onChangeInput(event);
    }

    _onFocusIn(event) {
        $(event.currentTarget).select();
    }

    async _prepareCustomRoll() {
        const rollData = {
            name: "DIALOG.CUSTOM_ROLL",
            baseTarget: 50,
            modifier: 0,
            ownerId: this.actor.id
        };
        await prepareCommonRoll(rollData);
    }

    async _prepareRollCharacteristic(event) {
        event.preventDefault();
        const characteristicName = $(event.currentTarget).data("characteristic");
        const characteristic = this.actor.characteristics[characteristicName];
        const rollData = {
            name: characteristic.label,
            baseTarget: characteristic.total,
            modifier: 0,
            ownerId: this.actor.id
        };
        await prepareCommonRoll(rollData);
    }

    _getCharacteristicOptions(selected) {
        const characteristics = [];
        for (let char of Object.values(this.actor.characteristics)) {
            characteristics.push({
                label: char.label,
                target: char.total,
                selected: char.short === selected
            });
        }
        return characteristics;
    }

    async _prepareRollSkill(event) {
        event.preventDefault();
        const skillName = $(event.currentTarget).data("skill");
        const skill = this.actor.skills[skillName];
        const defaultChar = skill.defaultCharacteristic || skill.characteristics[0];

        let characteristics = this._getCharacteristicOptions(defaultChar);
        characteristics = characteristics.map(char => {
            char.target += skill.advance;
            return char;
        });

        const rollData = {
            name: skill.label,
            baseTarget: skill.total,
            modifier: 0,
            characteristics: characteristics,
            ownerId: this.actor.id
        };
        await prepareCommonRoll(rollData);
    }

    async _prepareRollSpeciality(event) {
        event.preventDefault();
        const skillName = $(event.currentTarget).parents(".item").data("skill");
        const specialityName = $(event.currentTarget).data("speciality");
        const skill = this.actor.skills[skillName];
        const speciality = skill.specialities[specialityName];
        const rollData = {
            name: speciality.label,
            baseTarget: speciality.total,
            modifier: 0,
            ownerId: this.actor.id
        };
        await prepareCommonRoll(rollData);
    }

    async _prepareRollInsanity(event) {
        event.preventDefault();
        const characteristic = this.actor.characteristics.willpower;
        const rollData = {
            name: "FEAR.HEADER",
            baseTarget: characteristic.total,
            modifier: 0,
            ownerId: this.actor.id
        };
        await prepareCommonRoll(rollData);
    }

    async _prepareRollCorruption(event) {
        event.preventDefault();
        const characteristic = this.actor.characteristics.willpower;
        const rollData = {
            name: "CORRUPTION.HEADER",
            baseTarget: characteristic.total,
            modifier: this._getCorruptionModifier(),
            ownerId: this.actor.id
        };
        await prepareCommonRoll(rollData);
    }

    async _prepareRollWeapon(event) {
        event.preventDefault();
        const div = $(event.currentTarget).parents(".item");
        const weapon = this.actor.items.get(div.data("itemId"));
        await prepareCombatRoll(
            DarkHeresyUtil.createWeaponRollData(this.actor, weapon),
            this.actor
        );
    }

    async _prepareRollShipWeapon(event) {
        event.preventDefault();
        const div = $(event.currentTarget).parents(".item");
        const weapon = this.actor.items.get(div.data("itemId"));
        await prepareShipCombatRoll(
            DarkHeresyUtil.createShipWeaponRollData(this.actor, weapon),
            this.actor
        );
    }

    async _prepareRollUnitWeapon(event) {
        event.preventDefault();
        const div = $(event.currentTarget).parents(".item");
        let targetActor;
        for(let target of Array.from(game.user.targets)) {
            targetActor = target.actor;
        }
        let target = game.user.targets;
        const weapon = this.actor.items.get(div.data("itemId"));
        await prepareUnitCombatRoll(
            DarkHeresyUtil.createUnitWeaponRollData(this.actor, weapon, targetActor),
            this.actor
        );
    }

    async _prepareRollPsychicPower(event) {
        event.preventDefault();
        const div = $(event.currentTarget).parents(".item");
        const psychicPower = this.actor.items.get(div.data("itemId"));
        await preparePsychicPowerRoll(
            DarkHeresyUtil.createPsychicRollData(this.actor, psychicPower)
        );
    }

    _extractWeaponTraits(traits) {
        // These weapon traits never go above 9 or below 2
        return {
            accurate: this._hasNamedTrait(/Accurate/gi, traits),
            rfFace: this._extractNumberedTrait(/Vengeful.*\(\d\)/gi, traits), // The alternativ die face Righteous Fury is triggered on
            proven: this._extractNumberedTrait(/Proven.*\(\d\)/gi, traits),
            primitive: this._extractNumberedTrait(/Primitive.*\(\d\)/gi, traits),
            razorSharp: this._hasNamedTrait(/Razor *Sharp/gi, traits),
            skipAttackRoll: this._hasNamedTrait(/Spray/gi, traits),
            tearing: this._hasNamedTrait(/Tearing/gi, traits)
        };
    }

    _getMaxPsyRating() {
        let base = this.actor.psy.rating;
        switch (this.actor.psy.class) {
            case "bound":
                return base + 2;
            case "unbound":
                return base + 4;
            case "daemonic":
                return base + 3;
        }
    }

    _extractNumberedTrait(regex, traits) {
        let rfMatch = traits.match(regex);
        if (rfMatch) {
            regex = /\d+/gi;
            return parseInt(rfMatch[0].match(regex)[0]);
        }
        return undefined;
    }

    _hasNamedTrait(regex, traits) {
        let rfMatch = traits.match(regex);
        if (rfMatch) {
            return true;
        } else {
            return false;
        }
    }

    _getCorruptionModifier() {
        const corruption = this.actor.corruption;
        if (corruption <= 30) {
            return 0;
        } else if (corruption >= 31 && corruption <= 60) {
            return -10;
        } else if (corruption >= 61 && corruption <= 90) {
            return -20;
        } else if (corruption >= 91) {
            return -30;
        }
    }

    _getWeaponCharacteristic(weapon) {
        if (weapon.class === "melee") {
            return this.actor.characteristics.weaponSkill;
        } else {
            return this.actor.characteristics.ballisticSkill;
        }
    }

    _getFocusPowerTarget(psychicPower) {
        const normalizeName = psychicPower.focusPower.test.toLowerCase();
        if (this.actor.characteristics.hasOwnProperty(normalizeName)) {
            return this.actor.characteristics[normalizeName];
        } else if (this.actor.skills.hasOwnProperty(normalizeName)) {
            return this.actor.skills[normalizeName];
        } else {
            return this.actor.characteristics.willpower;
        }
    }

    constructItemLists() {
        let items = {}
        let itemTypes = this.actor.itemTypes;
        items.mentalDisorders = itemTypes["mentalDisorder"];
        items.malignancies = itemTypes["malignancy"];
        items.mutations = itemTypes["mutation"];
        if (this.actor.type === "npc") {
            items.abilities = itemTypes["talent"]
                .concat(itemTypes["trait"])
                .concat(itemTypes["specialAbility"]);
        }
        items.talents = itemTypes["talent"];
        items.systemAbilities = itemTypes["systemAbility"];
        items.traits = itemTypes["trait"];
        items.specialAbilities = itemTypes["specialAbility"];
        items.aptitudes = itemTypes["aptitude"];

        items.systemsProw = itemTypes["shipSystem"].filter(item => item.system.location === "prow");
        items.systemsPort = itemTypes["shipSystem"].filter(item => item.system.location === "port");
        items.systemsStarboard = itemTypes["shipSystem"].filter(item => item.system.location === "starboard");
        items.systemsMain = itemTypes["shipSystem"].filter(item => item.system.location === "main");
        items.systemsBridge = itemTypes["shipSystem"].filter(item => item.system.location === "bridge");
        items.systemsAft = itemTypes["shipSystem"].filter(item => item.system.location === "aft");

        items.psychicPowers = itemTypes["psychicPower"];

        items.criticalInjuries = itemTypes["criticalInjury"];

        items.gear = itemTypes["gear"];
        items.drugs = itemTypes["drug"];
        items.tools = itemTypes["tool"];
        items.cybernetics = itemTypes["cybernetic"];

        items.armour = itemTypes["armour"];
        items.forceFields = itemTypes["forceField"];

        items.weapons = itemTypes["weapon"];
        items.shipWeapons = itemTypes["shipWeapon"];
        items.unitWeapons = itemTypes["unitWeapon"];
        items.weaponMods = itemTypes["weaponModification"];
        items.ammunitions = itemTypes["ammunition"];
        this._sortItemLists(items)

        return items;
    }

    _sortItemLists(items) {
        for (let list in items) {
            if (Array.isArray(items[list]))
                items[list] = items[list].sort((a, b) => a.sort - b.sort)
            else if (typeof items[list] == "object")
                _sortItemLists(items[list])
        }
    }
}
