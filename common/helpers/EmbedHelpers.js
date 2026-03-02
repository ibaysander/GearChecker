const { EmbedBuilder } = require('discord.js');

// Faction color palette
const COLOR_ALLIANCE = 0x0070DD;
const COLOR_HORDE    = 0xCC2200;
const COLOR_NEUTRAL  = 0xFFAA00;
const COLOR_SUCCESS  = 0x00AA44;
const COLOR_ERROR    = 0xDD2222;
const COLOR_COMPARE  = 0x9933FF;
const COLOR_ACHIEVE  = 0xFFD700;

function factionColor(faction) {
    if (!faction) return COLOR_NEUTRAL;
    return faction === 'Alliance' ? COLOR_ALLIANCE : COLOR_HORDE;
}

function armoryUrl(character) {
    return `http://armory.warmane.com/character/${character.name}/${character.realm}`;
}

// ─────────────────────────────────────────────
// /help
// ─────────────────────────────────────────────
function buildHelpEmbed() {
    return new EmbedBuilder()
        .setTitle('GearChecker — Commands')
        .setColor(COLOR_NEUTRAL)
        .setDescription('Inspect Warmane characters directly from Discord.')
        .addFields(
            { name: '/gs <name> [realm]',          value: 'Show GearScore',                       inline: false },
            { name: '/ench <name> [realm]',         value: 'Show missing enchants',                inline: false },
            { name: '/gems <name> [realm]',         value: 'Show missing gems',                    inline: false },
            { name: '/sum <name> [realm]',          value: 'Full character summary',               inline: false },
            { name: '/guild <name> [realm]',        value: 'Show guild',                           inline: false },
            { name: '/armory <name> [realm]',       value: 'Armory link',                          inline: false },
            { name: '/achievements <name> [realm]', value: 'Raid achievement table',               inline: false },
            { name: '/compare <char1> <char2> [realm]', value: 'Side-by-side GearScore comparison', inline: false }
        )
        .setFooter({ text: 'Default realm: Icecrown | Realms: Icecrown, Lordaeron, Frostmourne, Blackrock, Onyxia' });
}

// ─────────────────────────────────────────────
// /guild
// ─────────────────────────────────────────────
function buildGuildEmbed(character) {
    return new EmbedBuilder()
        .setTitle(`${character.name} — Guild`)
        .setColor(factionColor(character.faction))
        .setURL(armoryUrl(character))
        .setDescription(
            character.guild
                ? `Guild: ${character.GuildLink}`
                : `${character.name} is not in a guild.`
        )
        .setFooter({ text: character.realm });
}

// ─────────────────────────────────────────────
// /gs
// ─────────────────────────────────────────────
function buildGsEmbed(character) {
    return new EmbedBuilder()
        .setTitle(`${character.name} — GearScore`)
        .setColor(factionColor(character.faction))
        .setURL(armoryUrl(character))
        .addFields(
            { name: 'GearScore', value: String(character.GearScore), inline: true },
            { name: 'Class',     value: `${character.race} ${character.class}`, inline: true },
            { name: 'Level',     value: String(character.level), inline: true }
        )
        .setFooter({ text: character.realm });
}

// ─────────────────────────────────────────────
// /ench
// ─────────────────────────────────────────────
function buildEnchEmbed(character) {
    const ok = character.Enchants && character.Enchants.includes(':white_check_mark:');
    return new EmbedBuilder()
        .setTitle(`${character.name} — Enchants`)
        .setColor(ok ? COLOR_SUCCESS : COLOR_ERROR)
        .setURL(armoryUrl(character))
        .setDescription(character.Enchants || 'No enchant data available.')
        .setFooter({ text: character.realm });
}

// ─────────────────────────────────────────────
// /gems
// ─────────────────────────────────────────────
function buildGemsEmbed(character) {
    const ok = character.Gems && character.Gems.includes(':white_check_mark:');
    return new EmbedBuilder()
        .setTitle(`${character.name} — Gems`)
        .setColor(ok ? COLOR_SUCCESS : COLOR_ERROR)
        .setURL(armoryUrl(character))
        .setDescription(character.Gems || 'No gem data available.')
        .setFooter({ text: character.realm });
}

// ─────────────────────────────────────────────
// /armory
// ─────────────────────────────────────────────
function buildArmoryEmbed(character) {
    return new EmbedBuilder()
        .setTitle(`${character.name} — Armory`)
        .setColor(factionColor(character.faction))
        .setURL(armoryUrl(character))
        .setDescription(`[View ${character.name} on Warmane Armory](${armoryUrl(character)})`)
        .setFooter({ text: character.realm });
}

// ─────────────────────────────────────────────
// /sum
// ─────────────────────────────────────────────
function buildSummaryEmbed(character) {
    const pvpValue = character.PVPGear.length === 0
        ? 'None'
        : character.PVPGear.join('\n');

    const professionValue = character.professions && character.professions.length > 0
        ? character.professions.map(p => `${p.skill} ${p.name}`).join(' · ')
        : 'None';

    return new EmbedBuilder()
        .setTitle(`${character.name} — Summary`)
        .setColor(factionColor(character.faction))
        .setURL(armoryUrl(character))
        .addFields(
            {
                name: 'Status',
                value: character.online ? ':green_circle: Online' : ':red_circle: Offline',
                inline: true
            },
            {
                name: 'Character',
                value: `Level ${character.level} ${character.race} ${character.class}`,
                inline: true
            },
            {
                name: 'Faction',
                value: `${character.faction} ${character.faction === 'Alliance' ? ':blue_heart:' : ':heart:'}`,
                inline: true
            },
            {
                name: 'Guild',
                value: character.guild ? character.GuildLink : 'No guild',
                inline: true
            },
            {
                name: 'GearScore',
                value: String(character.GearScore),
                inline: true
            },
            {
                name: 'Specs',
                value: character.Talents || 'Unknown',
                inline: true
            },
            {
                name: 'Professions',
                value: professionValue,
                inline: true
            },
            {
                name: 'Achievement Points',
                value: String(character.achievementpoints),
                inline: true
            },
            {
                name: 'Honorable Kills',
                value: String(character.honorablekills),
                inline: true
            },
            {
                name: 'Enchants',
                value: character.Enchants || 'N/A',
                inline: false
            },
            {
                name: 'Gems',
                value: character.Gems || 'N/A',
                inline: false
            },
            {
                name: ':warning: PVP Gear',
                value: pvpValue,
                inline: false
            }
        )
        .setFooter({ text: `${character.realm} • Use /achievements ${character.name} to see raid progress` });
}

// ─────────────────────────────────────────────
// /achievements
// ─────────────────────────────────────────────
function buildAchievementsEmbed(character) {
    return new EmbedBuilder()
        .setTitle(`${character.name} — Raid Achievements`)
        .setColor(COLOR_ACHIEVE)
        .setURL(armoryUrl(character))
        .setDescription(character.Achievements || 'No achievement data available.')
        .setFooter({ text: `${character.realm} • Achievement Points: ${character.achievementpoints}` });
}

// ─────────────────────────────────────────────
// /compare
// ─────────────────────────────────────────────
function buildCompareEmbed(char1, char2) {
    const gsDiff = char1.GearScore - char2.GearScore;
    const footerText = gsDiff > 0
        ? `${char1.name} leads by ${gsDiff} GearScore`
        : gsDiff < 0
            ? `${char2.name} leads by ${Math.abs(gsDiff)} GearScore`
            : "It's a tie!";

    const char1GS = `${char1.GearScore}${gsDiff > 0 ? ' ✅' : ''}`;
    const char2GS = `${char2.GearScore}${gsDiff < 0 ? ' ✅' : ''}`;

    return new EmbedBuilder()
        .setTitle(`⚔️  ${char1.name}  vs  ${char2.name}`)
        .setColor(COLOR_COMPARE)
        .addFields(
            {
                name: char1.name,
                value: `Lv${char1.level} ${char1.race}\n${char1.class}\n${char1.faction}`,
                inline: true
            },
            { name: '\u200b', value: '**VS**', inline: true },
            {
                name: char2.name,
                value: `Lv${char2.level} ${char2.race}\n${char2.class}\n${char2.faction}`,
                inline: true
            },
            { name: `${char1.name} GearScore`,  value: char1GS,            inline: true },
            { name: 'Difference',               value: `Δ ${Math.abs(gsDiff)}`, inline: true },
            { name: `${char2.name} GearScore`,  value: char2GS,            inline: true },
            { name: `${char1.name} Enchants`,   value: char1.Enchants || 'N/A', inline: false },
            { name: `${char2.name} Enchants`,   value: char2.Enchants || 'N/A', inline: false },
            { name: `${char1.name} Gems`,       value: char1.Gems || 'N/A', inline: false },
            { name: `${char2.name} Gems`,       value: char2.Gems || 'N/A', inline: false }
        )
        .setFooter({ text: footerText });
}

// ─────────────────────────────────────────────
// Error embed
// ─────────────────────────────────────────────
function buildErrorEmbed(message) {
    return new EmbedBuilder()
        .setTitle('Error')
        .setColor(COLOR_ERROR)
        .setDescription(message || 'An unexpected error occurred. Please try again.');
}

module.exports = {
    buildHelpEmbed,
    buildGuildEmbed,
    buildGsEmbed,
    buildEnchEmbed,
    buildGemsEmbed,
    buildArmoryEmbed,
    buildSummaryEmbed,
    buildAchievementsEmbed,
    buildCompareEmbed,
    buildErrorEmbed
};
