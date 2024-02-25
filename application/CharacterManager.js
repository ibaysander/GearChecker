const cheerio = require("cheerio");
const request = require("request-promise");
const { GetItems } = require('../infrastructure/ItemManager')
const { Character } = require('../domain/entities/Character')
const { ItemTypeEnum, ItemTypeEnumToString } = require('../domain/enums/ItemTypeEnum')
const { WarmaneItemTypeEnum } = require('../domain/enums/WarmaneItemTypeEnum')
const { GetCamelToe, GetParams } = require('../common/helpers/GenericHelper')

function getGuild(realm, name) {
    let character = new Character(realm, name);

    return new Promise((resolve) => {
        character.request.then(_ => {
            resolve(character.guild !== undefined ? character.guild : "No guild found");
        });
    });
}

async function GetGearScore(realm, name) {
    let character = new Character(realm, name);
    let gearScore = 0;

    return new Promise((resolve, reject) => {
        character.request.then(_ => {
            if (character.equipment && character.equipment.length > 0) {
                let equippedItems = [];
                character.PVPGear = [];

                character.equipment.forEach(item => {
                    equippedItems.push(Number(item.item));
                });

                GetItems(equippedItems, (err, itemsDB) => {
                    if (err) {
                        console.error("Error:", err);
                        return;
                    }

                    const hunterWeaponTypes =
                        [
                            ItemTypeEnum["OneHand"],
                            ItemTypeEnum["TwoHand"],
                            ItemTypeEnum["MainHand"],
                            ItemTypeEnum["OffHand"]
                        ];
                    let weapons = [];

                    equippedItems.forEach(equippedItem => {
                        const item = itemsDB.find(element => element.itemID === equippedItem);

                        if(item.PVP === 1) {
                            character.PVPGear.push(item.name + " (" + ItemTypeEnumToString(item.type) + ")");
                        }

                        if (character.class == "Hunter" && item.type == 26) {
                            gearScore += item.GearScore * 5.3224;
                        } else if (character.class == "Hunter" && hunterWeaponTypes.indexOf(item.type) > -1) {
                            gearScore += item.GearScore * 0.3164;
                        } else if (item.class === 2 && (item.subclass === 1 || item.subclass === 5 || item.subclass === 8)) {
                            weapons.push(item.GearScore);
                        } else {
                            gearScore += item.GearScore;
                        }
                    });

                    // Probably a warrior with Titan's Grip
                    if (weapons.length == 2) {
                        gearScore += Math.floor(((weapons[0] + weapons[1]) / 2));
                    } else if (weapons.length == 1) {
                        gearScore += weapons[0];
                    }
                    character.GearScore = Math.ceil(gearScore);
                    resolve(character);
                });
            } else {
                reject(new Error(`${GetCamelToe(name)} does not have any items equipped. Maybe you typed the wrong name?`));
            }
        });
    });
}

function GetCharacter(realm, name) {
    let character = new Character(realm, name);

    return new Promise((resolve, reject) => {
        character.request
            .then(_ => {
                resolve(character);
            })
            .catch(_ => {
                reject(new Error(`Couldn't load character ${name} from realm ${realm}`));
            });
    })
}

function GetGems(realm, name, professions) {
    const options = {
        uri: `http://armory.warmane.com/character/${GetCamelToe(name)}/${realm}/`,
        transform: function (body) {
            return cheerio.load(body);
        }
    };

    return new Promise((resolve) => {
        let equippedItems = [];
        let actualItems = [];
        let i = 0;
        let missingGems = [];

        request(options)
            .then(($) => {
                $(".item-model a").each(function () {
                    let amount = 0;
                    let rel = $(this).attr("rel");

                    if (rel) {
                        var params = GetParams(rel);

                        if (params["gems"]) amount = params["gems"].split(":").filter(x => x != 0).length;

                        equippedItems.push(Number(params["item"]));

                        actualItems.push({
                            "itemID": Number(params["item"]),
                            "gems": amount,
                            "type": itemNames[i]
                        });
                    }

                    i++;
                })

                GetItems(equippedItems, (err, itemsDB) => {
                    if (err) {
                        console.error("Error:", err);
                        return;
                    }

                    itemsDB.forEach(item => {
                        let foundItem = actualItems.filter(x => x.itemID == item.itemID)[0];
                        let hasBlacksmithing = professions.map(prof => prof.name).includes("Blacksmithing");
                        let itsGlovesOrBracer = (foundItem.type == "Gloves" || foundItem.type == "Bracer");

                        if (foundItem.type == "Belt" || (itsGlovesOrBracer && hasBlacksmithing)) {
                            if ((item.gems + 1) != foundItem.gems) {
                                missingGems.push(foundItem.type);
                            }
                        } else if (item.gems > foundItem.gems) {
                            missingGems.push(foundItem.type);
                        }

                    });
                    if (missingGems.length === 0) {
                        resolve(`${GetCamelToe(name)} has gemmed all his items!`);
                    } else {
                        resolve(`${GetCamelToe(name)} needs to gem ${missingGems.join(", ")}`);
                    }
                });
            })
            .catch((err) => {
                console.error(err.message);

                reject(new Error("Couldn't connect to the armory"));
            });
    });
}

function GetEnchants(realm, name) {
    const itemNames = ["Head", "Neck", "Shoulders", "Cloak", "Chest", "Shirt", "Tabard", "Bracer", "Gloves", "Belt", "Legs", "Boots", "Ring #1", "Ring #2", "Trinket #1", "Trinket #2", "Main-hand", "Off-hand", "Ranged"];
    const bannedItems = [1, 5, 6, 9, 14, 15];
    var missingEnchants = [];

    const options = {
        uri: `http://armory.warmane.com/character/${GetCamelToe(name)}/${realm}/`,
        transform: function (body) {
            return cheerio.load(body);
        }
    };

    return new Promise((resolve, reject) => {
        request(options).then(($) => {
            var items = [];
            var characterClass = $(".level-race-class").text().toLowerCase();
            let professions = [];
            $(".profskills").find(".text").each(function (profession) {
                professions.push($(this).clone().children().remove().end().text().trim());
            });
            $(".item-model a").each(function () {
                var item = $(this).attr("href");
                var rel = $(this).attr("rel");
                items.push(rel);
            });

            for (i = 0; i < items.length; i++) {
                if (items[i]) {
                    if (!bannedItems.includes(i)) {
                        if (items[i].indexOf("ench") == -1) {
                            if (itemNames[i] === "Ranged") {
                                if (characterClass.indexOf("hunter") >= 0) {
                                    missingEnchants.push(itemNames[i]);
                                }
                            } else if (itemNames[i] === "Ring #1" || itemNames[i] === "Ring #2") {
                                if (professions.includes("Enchanting")) {
                                    missingEnchants.push(itemNames[i]);
                                }
                            } else if (itemNames[i] === "Off-hand") {
                                if (characterClass.indexOf("mage") < 0 && characterClass.indexOf("warlock") < 0 && characterClass.indexOf("druid") < 0 && characterClass.indexOf("priest") < 0) {
                                    missingEnchants.push(itemNames[i]);
                                }
                            } else {
                                missingEnchants.push(itemNames[i]);
                            }
                        }
                    }
                }
            };
            if (missingEnchants.length === 0) {
                resolve(`${GetCamelToe(name)} has all enchants!`);
            } else {
                resolve(`${GetCamelToe(name)} is missing enchants from: ${missingEnchants.join(", ")}`);
            }
        });
    });
}

function GetArmory(realm, name) {
    return new Promise((resolve, reject) => {
        resolve(`${GetCamelToe(name)}'s Armory link: http://armory.warmane.com/character/${GetCamelToe(name)}/${realm}/`);
    });
}

function GetTalents(talents) {
    let res = "";

    if (talents != null) {
        for (let i=0; i < talents.length; i++) {
            if (i == 1) res += " and ";

            res += talents[i].tree;

            if (talents[i].points != null) {
                res += "(" + talents[i].points.map(p => p).join("/") + ")";
            }
        }
    }

    return res;
}

module.exports = { GetGearScore, GetGems }