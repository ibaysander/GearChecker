const cheerio = require('cheerio');
const { fetchCharacterData, fetchArmoryPage, fetchAchievements, sleep } = require('../infrastructure/ArmoryClient');
const { GetItems } = require('../infrastructure/ItemManager');
const { Character } = require('../domain/entities/Character');
const { ItemTypeEnum, ItemTypeEnumToString } = require('../domain/enums/ItemTypeEnum');
const { WarmaneItemTypeEnum } = require('../domain/enums/WarmaneItemTypeEnum');
const { GetCamelToe, GetParams } = require('../common/helpers/GenericHelper');
const { Raids } = require('../common/constants/Achievements');
const logger = require('../common/helpers/logger');

// ─────────────────────────────────────────────
// GetCharacter — fetches and populates a full Character object
// Fix 2c: armory HTML fetched once, shared by GetEnchants + GetGems
// Fix 2d: properly throws on network error (no more hanging promise)
// Fix 4c: HTTP fetching moved to ArmoryClient; Character constructor is now synchronous
// ─────────────────────────────────────────────
async function GetCharacter(realm, name) {
    const normalName  = GetCamelToe(name);
    const normalRealm = GetCamelToe(realm);

    const data = await fetchCharacterData(normalName, normalRealm);

    if (data && data.error) {
        throw new Error(
            `Warmane API error for **${name}**: ${data.error}. Please try again in a moment.`
        );
    }

    if (!data || !data.name) {
        throw new Error(
            `Warmane's API returned no data for **${name}** on **${realm}**. ` +
            `The character may not exist or the armory is temporarily unavailable.`
        );
    }

    const character = new Character(data);

    await GetGearScore(character);

    // Fix 2c: single HTTP request shared by both enchant and gem checks
    const $ = await fetchArmoryPage(character.name, character.realm);
    await Promise.all([
        GetEnchants(character, $),
        GetGems(character, $)
    ]);

    await GetTalents(character);
    await GetSummary(character);

    return character;
}

// ─────────────────────────────────────────────
// CompareCharacters — fetches two characters sequentially with a pause
// Sequential + pause to respect Warmane's rate limit between API calls.
// ArmoryClient will also auto-retry with backoff if rate-limited.
// ─────────────────────────────────────────────
async function CompareCharacters(realm, name1, name2) {
    const char1 = await GetCharacter(realm, name1);
    // Pause between requests to let Warmane's rate limit window expire
    await sleep(2000);
    const char2 = await GetCharacter(realm, name2);
    return { char1, char2 };
}

// ─────────────────────────────────────────────
// GetGearScore
// ─────────────────────────────────────────────
async function GetGearScore(character) {
    if (!character || !character.equipment || character.equipment.length === 0) return;

    return new Promise((resolve, reject) => {
        const equippedItems = character.equipment.map(item => Number(item.item));

        GetItems(equippedItems, (err, itemsDB) => {
            if (err) {
                logger.error(`GetGearScore DB error: ${err.message}`);
                reject(err);
                return;
            }

            const hunterWeaponTypes = [
                ItemTypeEnum['OneHand'],
                ItemTypeEnum['TwoHand'],
                ItemTypeEnum['MainHand'],
                ItemTypeEnum['OffHand']
            ];

            let gearScore = 0;
            let weapons = [];

            for (const equippedItemId of equippedItems) {
                const item = itemsDB.find(el => el.itemID === equippedItemId);
                if (!item) continue;

                if (item.PVP === 1) {
                    character.PVPGear.push(`${ItemTypeEnumToString(item.type)}: ${item.name}`);
                }

                if (character.class === 'Hunter' && item.type === 26) {
                    // Ranged weapon — weighted heavily for hunters
                    gearScore += item.GearScore * 5.3224;
                } else if (character.class === 'Hunter' && hunterWeaponTypes.includes(item.type)) {
                    // Melee weapons deprioritised for hunters
                    gearScore += item.GearScore * 0.3164;
                } else if (item.class === 2 && [1, 5, 8].includes(item.subclass)) {
                    // Two-handed weapons — collect for Titan's Grip averaging
                    weapons.push(item.GearScore);
                } else {
                    gearScore += item.GearScore;
                }
            }

            // Warrior with Titan's Grip: average both 2H weapons
            if (weapons.length === 2) {
                gearScore += Math.floor((weapons[0] + weapons[1]) / 2);
            } else if (weapons.length === 1) {
                gearScore += weapons[0];
            }

            character.GearScore = Math.ceil(gearScore);
            resolve();
        });
    });
}

// ─────────────────────────────────────────────
// GetEnchants
// Fix 2c: receives pre-loaded $ instead of fetching the page itself
// ─────────────────────────────────────────────
async function GetEnchants(character, $) {
    // Slot indices to skip (shirt=5, tabard=6, trinkets=14/15, ammo=9(map index 1 under banned))
    const bannedSlots = [1, 5, 6, 9, 14, 15];
    const missingEnchants = [];

    const characterClass = ($('.level-race-class').text() || '').toLowerCase();
    const professions = [];
    $('.profskills').find('.text').each(function () {
        professions.push($(this).clone().children().remove().end().text().trim());
    });

    const items = [];
    $('.item-model a').each(function () {
        items.push($(this).attr('rel'));
    });

    for (let i = 0; i < items.length; i++) {
        if (!items[i] || bannedSlots.includes(i)) continue;

        if (items[i].indexOf('ench') === -1) {
            const slotName = WarmaneItemTypeEnum[i];

            if (slotName === 'Ranged') {
                if (characterClass.includes('hunter')) missingEnchants.push(slotName);
            } else if (slotName === 'Ring #1' || slotName === 'Ring #2') {
                if (professions.includes('Enchanting')) missingEnchants.push(slotName);
            } else if (slotName === 'Off-hand') {
                const casterClasses = ['mage', 'warlock', 'druid', 'priest'];
                if (!casterClasses.some(c => characterClass.includes(c))) {
                    missingEnchants.push(slotName);
                }
            } else {
                missingEnchants.push(slotName);
            }
        }
    }

    character.Enchants = missingEnchants.length === 0
        ? `${character.name} has all enchants! :white_check_mark:`
        : `${character.name} is missing enchants from: ${missingEnchants.join(', ')} :x:`;
}

// ─────────────────────────────────────────────
// GetGems
// Fix 2c: receives pre-loaded $ instead of fetching the page itself
// ─────────────────────────────────────────────
async function GetGems(character, $) {
    return new Promise((resolve, reject) => {
        const equippedItems = [];
        const actualItems = [];
        const missingGems = [];
        let i = 0;

        $('.item-model a').each(function () {
            const rel = $(this).attr('rel');
            if (rel) {
                const params = GetParams(rel);
                const gemCount = params['gems']
                    ? params['gems'].split(':').filter(x => x !== '0' && x !== 0).length
                    : 0;

                equippedItems.push(Number(params['item']));
                actualItems.push({
                    itemID: Number(params['item']),
                    gems: gemCount,
                    type: WarmaneItemTypeEnum[i]
                });
            }
            i++;
        });

        GetItems(equippedItems, (err, itemsDB) => {
            if (err) {
                logger.error(`GetGems DB error: ${err.message}`);
                reject(err);
                return;
            }

            const hasBlacksmithing = character.professions
                ? character.professions.some(p => p.name === 'Blacksmithing')
                : false;

            for (const item of itemsDB) {
                const foundItem = actualItems.find(x => x.itemID === item.itemID);
                if (!foundItem) continue;

                const isBelt = foundItem.type === 'Belt';
                const isGlovesOrBracer = foundItem.type === 'Gloves' || foundItem.type === 'Bracer';

                if (isBelt || (isGlovesOrBracer && hasBlacksmithing)) {
                    // Belt buckle / Blacksmithing socket adds +1 to expected
                    if ((item.gems + 1) !== foundItem.gems) {
                        missingGems.push(foundItem.type);
                    }
                } else if (item.gems > foundItem.gems) {
                    missingGems.push(foundItem.type);
                }
            }

            character.Gems = missingGems.length === 0
                ? `${character.name} has gemmed all items! :white_check_mark:`
                : `${character.name} needs to gem: ${missingGems.join(', ')} :x:`;

            resolve();
        });
    });
}

// ─────────────────────────────────────────────
// GetTalents
// ─────────────────────────────────────────────
async function GetTalents(character) {
    if (!character.talents) {
        character.Talents = 'Unknown';
        return;
    }

    character.Talents = character.talents
        .map((t, i) => {
            const pts = t.points ? `(${t.points.join('/')})` : '';
            return `${i > 0 ? ' / ' : ''}${t.tree}${pts}`;
        })
        .join('');
}

// ─────────────────────────────────────────────
// GetAchievements
// Fix 2b: all 8 category requests fired in parallel via Promise.all
// Fix 4b: corrected RS10/RS25 category comments
// ─────────────────────────────────────────────
async function GetAchievements(character) {
    const categories = [
        { categoryId: '14961' }, // Secrets of Ulduar 10
        { categoryId: '14962' }, // Secrets of Ulduar 25
        { categoryId: '15001' }, // Call of the Crusade 10
        { categoryId: '15002' }, // Call of the Crusade 25
        { categoryId: '15041' }, // Fall of the Lich King 10
        { categoryId: '15042' }, // Fall of the Lich King 25
        { categoryId: '14922' }, // Ruby Sanctum 10
        { categoryId: '14923' }, // Ruby Sanctum 25
    ];

    const results = {};

    // Fix 2b: parallel requests — all 8 fire simultaneously
    const htmlChunks = await Promise.all(
        categories.map(cat => fetchAchievements(character.name, character.realm, cat.categoryId))
    );

    for (const htmlContent of htmlChunks) {
        if (!htmlContent) continue;
        const $ = cheerio.load(htmlContent);

        $('.achievement').each(function () {
            const achievementId = $(this).attr('id');
            const hasDate = $(this).find('.date').length > 0;

            for (const [key, raid] of Object.entries(Raids)) {
                if (raid.id === achievementId) {
                    results[key] = hasDate ? '✅' : '❌';
                }
            }
        });
    }

    character.Achievements = formatAchievementResults(results);
}

function formatAchievementResults(results) {
    const r = (key) => results[key] || '❌';
    return `\`\`\`fix
Raid   | 25HC 25NM 10HC 10NM
----------------------------
ICC    |  ${r('ICC25HC')}   ${r('ICC25')}    ${r('ICC10HC')}   ${r('ICC10')}
RS     |  ${r('RS25HC')}   ${r('RS25')}    ${r('RS10HC')}   ${r('RS10')}
TOC    |  ${r('TOC25HC')}   ${r('TOC25')}    ${r('TOC10HC')}   ${r('TOC10')}
ULDUAR |  ${r('ULDUAR25HC')}   ${r('ULDUAR25')}    ${r('ULDUAR10HC')}   ${r('ULDUAR10')}\`\`\``;
}

// ─────────────────────────────────────────────
// GetSummary — legacy text summary (kept for compatibility)
// ─────────────────────────────────────────────
async function GetSummary(character) {
    const pvp = character.PVPGear.length === 0
        ? 'None'
        : '\n' + character.PVPGear.map(g => `  :exclamation: ${g}`).join('\n');

    character.Summary =
`Here is a summary for **${character.name}**:
**Status**: ${character.online ? 'Online :green_circle:' : 'Offline :red_circle:'}
**Character**: Level ${character.level} ${character.race} ${character.class} — ${character.faction} ${character.faction === 'Alliance' ? ':blue_heart:' : ':heart:'}
**Guild**: ${character.guild ? character.GuildLink : `${character.name} has no guild`}
**Specs**: ${character.Talents}
**Professions**: ${character.professions ? character.professions.map(p => `${p.skill} ${p.name}`).join(' and ') + ' :tools:' : 'None'}
**Achievement points**: ${character.achievementpoints} :trophy:
**Honorable kills**: ${character.honorablekills} :skull_crossbones:
**GearScore**: ${character.GearScore}
**Enchants**: ${character.Enchants}
**Gems**: ${character.Gems}
**Armory**: ${character.Armory}
**PVP items**: ${pvp}
**Achievements**: Use /achievements ${character.name} to see raid progress`;
}

module.exports = { GetCharacter, GetAchievements, CompareCharacters };
