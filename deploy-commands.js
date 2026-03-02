/**
 * deploy-commands.js
 * Run this ONCE (or whenever commands change) to register slash commands with Discord.
 *
 * Usage:
 *   node deploy-commands.js
 *
 * Requires discord_bot_id in your .env file.
 * DISCORD_CLIENT_ID is optional — it is extracted automatically from the bot token if not set.
 */

require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

if (!process.env.discord_bot_id) {
    console.error('Missing discord_bot_id (bot token) in .env');
    process.exit(1);
}

// The Application ID is always encoded in the first segment of the bot token (base64).
// We extract it from the token directly so no extra env variable is needed.
// DISCORD_CLIENT_ID in .env is only used as a manual override if it looks like a valid snowflake.
function extractClientId(token) {
    try {
        return Buffer.from(token.split('.')[0], 'base64').toString('utf8');
    } catch {
        return null;
    }
}

const tokenClientId  = extractClientId(process.env.discord_bot_id);
const envClientId    = process.env.DISCORD_CLIENT_ID;
// Prefer the token-derived ID; fall back to env only if it's a plain numeric snowflake
const clientId = /^\d+$/.test(tokenClientId)
    ? tokenClientId
    : (/^\d+$/.test(envClientId) ? envClientId : null);

if (!clientId) {
    console.error(
        'Could not determine Application ID from the bot token.\n' +
        'Please add DISCORD_CLIENT_ID=<your application id> to your .env file.\n' +
        'Find it at: Discord Developer Portal → Your App → General Information → Application ID'
    );
    process.exit(1);
}

const realmChoices = [
    { name: 'Icecrown',   value: 'Icecrown' },
    { name: 'Lordaeron',  value: 'Lordaeron' },
    { name: 'Frostmourne', value: 'Frostmourne' },
    { name: 'Blackrock',  value: 'Blackrock' },
    { name: 'Onyxia',    value: 'Onyxia' }
];

const nameOption = (opt) =>
    opt.setName('name').setDescription('Character name').setRequired(true);

const realmOption = (opt) =>
    opt.setName('realm')
        .setDescription('Realm (default: Icecrown)')
        .addChoices(...realmChoices);

const commands = [
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show all available commands'),

    new SlashCommandBuilder()
        .setName('guild')
        .setDescription("Show a character's guild")
        .addStringOption(nameOption)
        .addStringOption(realmOption),

    new SlashCommandBuilder()
        .setName('gs')
        .setDescription("Show a character's GearScore")
        .addStringOption(nameOption)
        .addStringOption(realmOption),

    new SlashCommandBuilder()
        .setName('ench')
        .setDescription("Show missing enchants for a character")
        .addStringOption(nameOption)
        .addStringOption(realmOption),

    new SlashCommandBuilder()
        .setName('gems')
        .setDescription("Show missing gems for a character")
        .addStringOption(nameOption)
        .addStringOption(realmOption),

    new SlashCommandBuilder()
        .setName('armory')
        .setDescription("Get the Warmane armory link for a character")
        .addStringOption(nameOption)
        .addStringOption(realmOption),

    new SlashCommandBuilder()
        .setName('sum')
        .setDescription("Full character summary: GS, enchants, gems, talents, professions")
        .addStringOption(nameOption)
        .addStringOption(realmOption),

    new SlashCommandBuilder()
        .setName('achievements')
        .setDescription("Show raid achievement progress (ICC, RS, TOC, Ulduar)")
        .addStringOption(nameOption)
        .addStringOption(realmOption),

    new SlashCommandBuilder()
        .setName('compare')
        .setDescription("Compare two characters' GearScore and gear side by side")
        .addStringOption(opt =>
            opt.setName('char1').setDescription('First character name').setRequired(true))
        .addStringOption(opt =>
            opt.setName('char2').setDescription('Second character name').setRequired(true))
        .addStringOption(realmOption)
].map(cmd => cmd.toJSON());

const rest = new REST().setToken(process.env.discord_bot_id);

(async () => {
    try {
        console.log(`Registering ${commands.length} slash commands for app ${clientId}...`);
        const data = await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands }
        );
        console.log(`Successfully registered ${data.length} commands.`);
    } catch (error) {
        console.error('Failed to register commands:', error);
        process.exit(1);
    }
})();
