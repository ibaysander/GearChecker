const cheerio = require("cheerio");
const axios = require("axios");
const { GetItems } = require("../infrastructure/ItemManager");
const { Character } = require("../domain/entities/Character");
const { ItemTypeEnum, ItemTypeEnumToString } = require("../domain/enums/ItemTypeEnum");
const { WarmaneItemTypeEnum } = require("../domain/enums/WarmaneItemTypeEnum");
const { GetCamelToe, GetParams } = require("../common/helpers/GenericHelper");
const { Raids } = require("../common/constants/Achievements");

async function GetCharacter(realm, name) {
    const character = new Character(GetCamelToe(realm), GetCamelToe(name));

    try {
        await character.request;

        if (!character.valid) {
            throw new Error(`Unfortunately, Warmane's API didn't return any information about ${name} from realm ${realm}. Try again, please.`);
        }

        await GetGearScore(character);
        await GetEnchants(character);
        await GetGems(character);
        await GetTalents(character);
        await GetAchievements(character);
        await GetSummary(character);

        return character;
    } catch (error) {
        console.error(error.message);
        throw error;
    }
}

async function GetGearScore(character) {
    let gearScore = 0;

    if (!character.equipment || character.equipment.length === 0) return;

    const equippedItems = character.equipment.map(item => Number(item.item));
    const itemsDB = await new Promise((resolve, reject) => {
        GetItems(equippedItems, (err, items) => (err ? reject(err) : resolve(items)));
    });

    for (const item of character.equipment) {
        const dbItem = itemsDB.find(i => i.itemID === Number(item.item));

        if (!dbItem) continue;

        if (dbItem.PVP === 1) {
            character.PVPGear.push(`${ItemTypeEnumToString(dbItem.type)}:\n\t\t\t\t\t${dbItem.name}`);
        }

        if (character.class === "Hunter") {
            if (dbItem.type === 26) {
                gearScore += dbItem.GearScore * 5.3224;
            } else if ([ItemTypeEnum.OneHand, ItemTypeEnum.TwoHand, ItemTypeEnum.MainHand, ItemTypeEnum.OffHand].includes(dbItem.type)) {
                gearScore += dbItem.GearScore * 0.3164;
            }
        } else if (dbItem.class === 2 && [1, 5, 8].includes(dbItem.subclass)) {
            gearScore += dbItem.GearScore;
        } else {
            gearScore += dbItem.GearScore;
        }
    }

    character.GearScore = Math.ceil(gearScore);
}

async function GetGems(character) {
    const url = `http://armory.warmane.com/character/${character.name}/${character.realm}/`;
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    const equippedItems = [];
    const actualItems = [];
    let missingGems = [];

    $(".item-model a").each(function () {
        const rel = $(this).attr("rel");
        if (rel) {
            const params = GetParams(rel);
            const gemsAmount = params["gems"]?.split(":").filter(x => x != 0).length || 0;

            equippedItems.push(Number(params["item"]));
            actualItems.push({
                itemID: Number(params["item"]),
                gems: gemsAmount,
                type: WarmaneItemTypeEnum[equippedItems.length - 1],
            });
        }
    });

    const itemsDB = await new Promise((resolve, reject) => {
        GetItems(equippedItems, (err, items) => (err ? reject(err) : resolve(items)));
    });

    for (const dbItem of itemsDB) {
        const foundItem = actualItems.find(x => x.itemID === dbItem.itemID);
        const hasBlacksmithing = character.professions?.some(prof => prof.name === "Blacksmithing");
        const isGlovesOrBracer = ["Gloves", "Bracer"].includes(foundItem.type);

        if ((foundItem.type === "Belt" || (isGlovesOrBracer && hasBlacksmithing))) {
            if ((dbItem.gems + 1) !== foundItem.gems) {
                missingGems.push(foundItem.type);
            }
        } else if (dbItem.gems > foundItem.gems) {
            missingGems.push(foundItem.type);
        }
    }

    character.Gems = missingGems.length === 0
        ? `${character.name} has gemmed all their items! ✅`
        : `${character.name} needs to gem ${missingGems.join(", ")} ❌`;
}

async function GetEnchants(character) {
    const bannedSlots = [1, 5, 6, 9, 14, 15];
    const url = `http://armory.warmane.com/character/${character.name}/${character.realm}/`;
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    const missingEnchants = [];
    const characterClass = $(".level-race-class").text().toLowerCase();
    const professions = $(".profskills .text")
        .map((_, el) => $(el).clone().children().remove().end().text().trim())
        .get();

    $(".item-model a").each(function (index) {
        const rel = $(this).attr("rel");
        if (!rel) return;

        const slot = WarmaneItemTypeEnum[index];

        if (!bannedSlots.includes(index) && !rel.includes("ench")) {
            if (slot === "Ranged" && characterClass.includes("hunter")) {
                missingEnchants.push(slot);
            } else if (["Ring #1", "Ring #2"].includes(slot) && professions.includes("Enchanting")) {
                missingEnchants.push(slot);
            } else if (slot === "Off-hand" && !["mage", "warlock", "druid", "priest"].some(c => characterClass.includes(c))) {
                missingEnchants.push(slot);
            } else {
                missingEnchants.push(slot);
            }
        }
    });

    character.Enchants = missingEnchants.length === 0
        ? `${character.name} has all enchants! ✅`
        : `${character.name} is missing enchants from: ${missingEnchants.join(", ")} ❌`;
}

async function GetTalents(character) {
    character.Talents = character.talents
        ?.map(talent => `${talent.tree}(${talent.points.join("/")})`)
        .join(" and ");
}

async function GetAchievements(character) {
    const categories = [
        { name: "ULDUAR10", categoryId: "14961" },
        { name: "ULDUAR25", categoryId: "14962" },
        { name: "TOC10", categoryId: "15001" },
        { name: "TOC25", categoryId: "15002" },
        { name: "ICC10", categoryId: "15041" },
        { name: "ICC25", categoryId: "15042" },
        { name: "RS10", categoryId: "14922" },
        { name: "RS25", categoryId: "14923" },
    ];

    const results = {};

    try {
        for (const { name, categoryId } of categories) {
            const response = await axios.post(
                `https://armory.warmane.com/character/${character.name}/${character.realm}/achievements`,
                `category=${categoryId}`,
                {
                    headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
                }
            );

            const $ = cheerio.load(response.data.content);
            $(".achievement").each(function () {
                const achievementId = $(this).attr("id");
                const hasDate = $(this).find(".date").length > 0;

                Object.entries(Raids).forEach(([key, raid]) => {
                    if (raid.id === achievementId) {
                        results[key] = hasDate ? "✅" : "❌";
                    }
                });
            });
        }

        character.Achievements = formatAchievementResults(results);
    } catch (error) {
        console.error("Error fetching achievements:", error);
        character.Achievements = "Error retrieving achievements. Please try again later.";
    }
}

function formatAchievementResults(results) {
    return `
\`\`\`fix
Raid   | 25HC 25NM 10HC 10NM
----------------------------
ICC    |  ${results.ICC25HC || "❌"}   ${results.ICC25 || "❌"}    ${results.ICC10HC || "❌"}   ${results.ICC10 || "❌"}
RS     |  ${results.RS25HC || "❌"}   ${results.RS25 || "❌"}    ${results.RS10HC || "❌"}   ${results.RS10 || "❌"}
TOC    |  ${results.TOC25HC || "❌"}   ${results.TOC25 || "❌"}    ${results.TOC10HC || "❌"}   ${results.TOC10 || "❌"}
ULDUAR |  ${results.ULDUAR25HC || "❌"}   ${results.ULDUAR25 || "❌"}    ${results.ULDUAR10HC || "❌"}   ${results.ULDUAR10 || "❌"}
\`\`\``;
}

async function GetSummary(character) {
    character.Summary = `
Here is a summary for **${character.name}**:
**Status**: ${character.online ? "Online ✅" : "Offline ❌"}
**Character**: Level ${character.level} ${character.race} ${character.class} - ${character.faction}
**Guild**: ${character.guild ? character.GuildLink : `${character.name} doesn't have a guild`}
**Specs**: ${character.Talents || "No talents found"}
**Professions**: ${character.professions?.map(prof => `${prof.skill} ${prof.name}`).join(" and ") || "No professions to show"}
**Achievement Points**: ${character.achievementpoints} 🏆
**Honorable Kills**: ${character.honorablekills} 💀
**Gear Score**: ${character.GearScore}
**Enchants**: ${character.Enchants}
**Gems**: ${character.Gems}
**Armory**: ${character.Armory}
**PVP Items**: ${character.PVPGear.length === 0 ? "None" : "\n\t\t❗" + character.PVPGear.join("\n\t\t❗")}
**Achievements**: Type !achievements ${character.name} or !achi ${character.name}`;
}

module.exports = { GetCharacter };