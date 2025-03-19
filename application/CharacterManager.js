const cheerio = require("cheerio");
const request = require("request-promise");
const { GetItems } = require('../infrastructure/ItemManager')
const { Character } = require('../domain/entities/Character')
const { ItemTypeEnum, ItemTypeEnumToString } = require('../domain/enums/ItemTypeEnum')
const { WarmaneItemTypeEnum } = require('../domain/enums/WarmaneItemTypeEnum')
const { GetCamelToe, GetParams } = require('../common/helpers/GenericHelper')

const axios = require('axios');
const { Raids } = require('../common/constants/Achievements');

async function GetCharacter(realm, name) {
    try {
        const character = await Character.create(GetCamelToe(realm), GetCamelToe(name));
        
        if (!character.valid) {
            throw new Error(`Unfortunately, Warmane's API didn't return any information about ${name} from realm ${realm}. Try again, please.`);
        }

        await GetGearScore(character);
        await GetEnchants(character);
        await GetGems(character);
        await GetTalents(character);
        await GetSummary(character);

        return character;
    } catch (error) {
        console.error('Error in GetCharacter:', error);
        throw error;
    }
}

async function GetGearScore(character) {
    let gearScore = 0;

    if (character && character.equipment && character.equipment.length > 0) {
        return new Promise((resolve) => {
            let equippedItems = [];

            character.equipment.forEach(item => {
                equippedItems.push(Number(item.item));
            });

            GetItems(equippedItems, (err, itemsDB) => {
                if (err) {
                    console.log("Error:", err);
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

                    if (item.PVP === 1) {
                        character.PVPGear.push(ItemTypeEnumToString(item.type) + ":\n\t\t\t\t\t" + item.name);
                    }

                    if (character.class === "Hunter" && item.type === 26) {
                        gearScore += item.GearScore * 5.3224;
                    } else if (character.class === "Hunter" && hunterWeaponTypes.indexOf(item.type) > -1) {
                        gearScore += item.GearScore * 0.3164;
                    } else if (item.class === 2 && (item.subclass === 1 || item.subclass === 5 || item.subclass === 8)) {
                        weapons.push(item.GearScore);
                    } else {
                        gearScore += item.GearScore;
                    }
                });

                // Probably a warrior with Titan's Grip
                if (weapons.length === 2) {
                    gearScore += Math.floor(((weapons[0] + weapons[1]) / 2));
                } else if (weapons.length === 1) {
                    gearScore += weapons[0];
                }
                character.GearScore = Math.ceil(gearScore);

                resolve(character);
            });
        });
    }
}

async function GetGems(character) {
    const options = {
        uri: `http://armory.warmane.com/character/${character.name}/${character.realm}/`,
        transform: function (body) {
            return cheerio.load(body);
        }
    };

    return new Promise((resolve, reject) => {
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
                            "type": WarmaneItemTypeEnum[i]
                        });
                    }

                    i++;
                })

                GetItems(equippedItems, (err, itemsDB) => {
                    if (err) {
                        console.log("Error:", err);
                        return;
                    }

                    itemsDB.forEach(item => {
                        let foundItem = actualItems.filter(x => x.itemID === item.itemID)[0];
                        let hasBlacksmithing = character && character.professions && character.professions.length > 0 ?
                            character.professions.map(prof => prof.name).includes("Blacksmithing") :
                            false;
                        let itsGlovesOrBracer = (foundItem.type === "Gloves" || foundItem.type === "Bracer");

                        if (foundItem.type === "Belt" || (itsGlovesOrBracer && hasBlacksmithing)) {
                            if ((item.gems + 1) !== foundItem.gems) {
                                missingGems.push(foundItem.type);
                            }
                        } else if (item.gems > foundItem.gems) {
                            missingGems.push(foundItem.type);
                        }

                    });
                    if (missingGems.length === 0) character.Gems = `${character.name} has gemmed all his items! :white_check_mark:`;
                    else character.Gems = `${character.name} needs to gem ${missingGems.join(", ")} :x:`;

                    resolve(character.Gems);
                });
            })
            .catch(err => {
                console.log(err.message);

                reject(new Error("Couldn't connect to the armory"));
            });
    });
}

async function GetEnchants(character) {
    const bannedItems = [1, 5, 6, 9, 14, 15];
    let missingEnchants = [];

    const options = {
        uri: `http://armory.warmane.com/character/${character.name}/${character.realm}/`,
        transform: function (body) {
            return cheerio.load(body);
        }
    };

    return new Promise((resolve) => {
        request(options).then(($) => {
            let items = [];
            let characterClass = $(".level-race-class").text().toLowerCase();
            let professions = [];
            $(".profskills").find(".text").each(function () {
                professions.push($(this).clone().children().remove().end().text().trim());
            });
            $(".item-model a").each(function () {
                $(this).attr("href");
                let rel = $(this).attr("rel");
                items.push(rel);
            });

            for (let i = 0; i < items.length; i++) {
                if (items[i]) {
                    if (!bannedItems.includes(i)) {
                        if (items[i].indexOf("ench") === -1) {
                            if (WarmaneItemTypeEnum[i] === "Ranged") {
                                if (characterClass.indexOf("hunter") >= 0) {
                                    missingEnchants.push(WarmaneItemTypeEnum[i]);
                                }
                            } else if (WarmaneItemTypeEnum[i] === "Ring #1" || WarmaneItemTypeEnum[i] === "Ring #2") {
                                if (professions.includes("Enchanting")) {
                                    missingEnchants.push(WarmaneItemTypeEnum[i]);
                                }
                            } else if (WarmaneItemTypeEnum[i] === "Off-hand") {
                                if (characterClass.indexOf("mage") < 0 && characterClass.indexOf("warlock") < 0 && characterClass.indexOf("druid") < 0 && characterClass.indexOf("priest") < 0) {
                                    missingEnchants.push(WarmaneItemTypeEnum[i]);
                                }
                            } else {
                                missingEnchants.push(WarmaneItemTypeEnum[i]);
                            }
                        }
                    }
                }
            }

            if (missingEnchants.length === 0) character.Enchants = `${character.name} has all enchants! :white_check_mark:`;
            else character.Enchants = `${character.name} is missing enchants from: ${missingEnchants.join(", ")} :x:`;

            resolve(character.Enchants);
        });
    });
}

async function GetTalents(character) {
    let res = "";

    if (character.talents != null) {
        for (let i=0; i < character.talents.length; i++) {
            if (i === 1) res += " and ";

            res += character.talents[i].tree;

            if (character.talents[i].points != null) {
                res += "(" + character.talents[i].points.map(p => p).join("/") + ")";
            }
        }
    }

    character.Talents = res;
}

async function GetAchievements(character) {
    try {
        // Define the achievement categories we need to check
        const categories = [
            { name: "ULDUAR10", categoryId: "14961" }, // Secrets of Ulduar 10
            { name: "ULDUAR25", categoryId: "14962" }, // Secrets of Ulduar 25
            { name: "TOC10", categoryId: "15001" },    // Call of the Crusade 10
            { name: "TOC25", categoryId: "15002" },    // Call of the Crusade 25
            { name: "ICC10", categoryId: "15041" },    // Fall of the Lich King 10
            { name: "ICC25", categoryId: "15042" },    // Fall of the Lich King 25
            { name: "RS10", categoryId: "14922" }, // Secrets of Ulduar 10
            { name: "RS25", categoryId: "14923" }, // Secrets of Ulduar 10
            // Ruby Sanctum might be under Dungeons & Raids (168) or have its own category
        ];
        
        // Results object to store achievement completion status
        const results = {};
        
        // Process each category with API request
        for (const category of categories) {
            const response = await axios({
                method: 'post',
                url: `https://armory.warmane.com/character/${character.name}/${character.realm}/achievements`,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'Accept-Encoding': 'identity' // Important to prevent compression
                },
                data: `category=${category.categoryId}`
            });
            
            // Parse the HTML content returned by the API
            const htmlContent = response.data.content;
            const $ = cheerio.load(htmlContent);
            
            // Check achievements for this category
            $('.achievement').each(function() {
                const achievementId = $(this).attr('id');
                const hasDate = $(this).find('.date').length > 0;
                
                // Map achievement IDs to our keys
                Object.entries(Raids).forEach(([key, raid]) => {
                    if (raid.id === achievementId) {
                        results[key] = hasDate ? '✅' : '❌';
                    }
                });
            });
        }
        
        // Format the results into the table
        character.Achievements = formatAchievementResults(results);
        
    } catch (error) {
        console.error("Error fetching achievements:", error);
        character.Achievements = "Error retrieving achievements. Please try again later.";
    }
}

// Format the results into a table
function formatAchievementResults(results) {
    return `\`\`\`fix
Raid   | 25HC 25NM 10HC 10NM
----------------------------
ICC    |  ${results.ICC25HC || '❌'}   ${results.ICC25 || '❌'}    ${results.ICC10HC || '❌'}   ${results.ICC10 || '❌'}
RS     |  ${results.RS25HC || '❌'}   ${results.RS25 || '❌'}    ${results.RS10HC || '❌'}   ${results.RS10 || '❌'}
TOC    |  ${results.TOC25HC || '❌'}   ${results.TOC25 || '❌'}    ${results.TOC10HC || '❌'}   ${results.TOC10 || '❌'}
ULDUAR |  ${results.ULDUAR25HC || '❌'}   ${results.ULDUAR25 || '❌'}    ${results.ULDUAR10HC || '❌'}   ${results.ULDUAR10 || '❌'}\`\`\``;
}

async function GetSummary(character) {
    const listPattern = "\n\t\t";
    const pvpGearPattern = listPattern + ":exclamation:";

    character.Summary =
    `
Do you enjoy using the bot? :wink:
Feel free to donate some gold/coins to Metalforce (Alliance, Icecrown).
This helps paying the bills for my dedicated server and developing the bot.

Here is a summary for **${character.name}**:
**Status**: ${character.online ? "Online :green_circle:" : "Offline :red_circle:"}
**Character**: ${"Level " + character.level + " " + character.race + " " + character.class + " - " + character.faction + " " + (character.faction === "Alliance" ? ":blue_heart:" : ":heart:")}
**Guild**: ${character.guild ? character.GuildLink : `${character.name} doesn't have a guild`}
**Specs**: ${character.Talents}
**Professions**: ${character.professions ? character.professions.map(profession => (profession.skill + " " + profession.name)).join(" and ") + " :tools:" : "No professions to show"}
**Achievement points**: ${character.achievementpoints} :trophy:
**Honorable kills**: ${character.honorablekills} :skull_crossbones:
**GearScore**: ${character.GearScore}
**Enchants**: ${character.Enchants}
**Gems**: ${character.Gems}
**Armory**: ${character.Armory}
**PVP items**: ${character.PVPGear.length === 0 ? "None" : pvpGearPattern + character.PVPGear.join(pvpGearPattern)}
**Achievements**: Type !achievements ${character.name} or !achi ${character.name}
    `
}

module.exports = { GetCharacter, GetAchievements }