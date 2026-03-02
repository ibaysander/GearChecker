require('dotenv').config();

const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const express = require('express');
const crypto  = require('crypto');

const CharacterManager = require('./application/CharacterManager');
const { RealmEnum }    = require('./domain/enums/RealmEnum');
const { GetCamelToe }  = require('./common/helpers/GenericHelper');
const logger           = require('./common/helpers/logger');
const { closeDb, healthCheck } = require('./infrastructure/ItemManager');
const {
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
} = require('./common/helpers/EmbedHelpers');

// ─────────────────────────────────────────────
// Discord client (v14 — slash commands only, no GUILD_MESSAGES needed)
// ─────────────────────────────────────────────
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// ─────────────────────────────────────────────
// Express healthcheck server
// ─────────────────────────────────────────────
const expressApp = express();
const PORT = process.env.PORT || 2000;

expressApp.get('/healthcheck', (req, res) => {
    healthCheck((dbOk) => {
        const discordOk = client.isReady();
        const status = discordOk && dbOk ? 200 : 503;
        res.status(status).json({
            status:   status === 200 ? 'ok' : 'degraded',
            discord:  discordOk ? 'connected' : 'disconnected',
            database: dbOk     ? 'ok'         : 'error',
            uptime:   process.uptime()
        });
    });
});

const server = expressApp.listen(PORT, () => {
    logger.info(`Healthcheck server running on port ${PORT}`);
});

// ─────────────────────────────────────────────
// Discord ready
// ─────────────────────────────────────────────
client.on('ready', () => {
    logger.info(`Logged in as: ${client.user.tag}`);
    client.user.setActivity('/help', { type: ActivityType.Listening });
});

// ─────────────────────────────────────────────
// Slash command handler
// ─────────────────────────────────────────────
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;
    const requestId = crypto.randomUUID();

    logger.info(`[${requestId}] /${commandName} by ${interaction.user.tag} in ${interaction.guild?.name || 'DM'}`);

    // /help — reply immediately (no external calls)
    if (commandName === 'help') {
        await interaction.reply({ embeds: [buildHelpEmbed()] });
        return;
    }

    // All other commands call external APIs — defer to prevent 3s timeout
    await interaction.deferReply();

    const realm = interaction.options.getString('realm') || RealmEnum[0];

    try {
        // ── /compare ──────────────────────────────
        if (commandName === 'compare') {
            const name1 = GetCamelToe(interaction.options.getString('char1'));
            const name2 = GetCamelToe(interaction.options.getString('char2'));

            logger.info(`[${requestId}] Comparing ${name1} vs ${name2} on ${realm}`);
            const { char1, char2 } = await CharacterManager.CompareCharacters(realm, name1, name2);

            await interaction.editReply({ embeds: [buildCompareEmbed(char1, char2)] });
            return;
        }

        // ── All single-character commands ─────────
        const name = GetCamelToe(interaction.options.getString('name'));
        logger.info(`[${requestId}] Fetching ${name} on ${realm}`);

        const character = await CharacterManager.GetCharacter(realm, name);

        switch (commandName) {
            case 'guild':
                await interaction.editReply({ embeds: [buildGuildEmbed(character)] });
                break;
            case 'gs':
                await interaction.editReply({ embeds: [buildGsEmbed(character)] });
                break;
            case 'ench':
                await interaction.editReply({ embeds: [buildEnchEmbed(character)] });
                break;
            case 'gems':
                await interaction.editReply({ embeds: [buildGemsEmbed(character)] });
                break;
            case 'armory':
                await interaction.editReply({ embeds: [buildArmoryEmbed(character)] });
                break;
            case 'sum':
                await interaction.editReply({ embeds: [buildSummaryEmbed(character)] });
                break;
            case 'achievements':
                await CharacterManager.GetAchievements(character);
                await interaction.editReply({ embeds: [buildAchievementsEmbed(character)] });
                break;
            default:
                await interaction.editReply({ embeds: [buildErrorEmbed('Unknown command.')] });
        }

        logger.info(`[${requestId}] /${commandName} completed for ${name}`);

    } catch (err) {
        logger.error(`[${requestId}] /${commandName} failed: ${err.message || err}`);

        const message = typeof err === 'string'
            ? err
            : err.message || 'An unexpected error occurred. Please try again.';

        try {
            await interaction.editReply({ embeds: [buildErrorEmbed(message)] });
        } catch {
            // editReply may fail if already replied or interaction expired
            try {
                await interaction.followUp({ embeds: [buildErrorEmbed(message)], ephemeral: true });
            } catch {
                // interaction expired — nothing to do
            }
        }
    }
});

// ─────────────────────────────────────────────
// Graceful shutdown
// ─────────────────────────────────────────────
async function shutdown(signal) {
    logger.info(`${signal} received — shutting down gracefully`);
    try {
        client.destroy();
        await closeDb();
        server.close(() => {
            logger.info('HTTP server closed');
            process.exit(0);
        });
        // Force-exit if server doesn't close within 5s
        setTimeout(() => process.exit(0), 5000).unref();
    } catch (err) {
        logger.error(`Error during shutdown: ${err.message}`);
        process.exit(1);
    }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
    logger.error(`Unhandled promise rejection: ${reason}`);
});

// ─────────────────────────────────────────────
// Start
// ─────────────────────────────────────────────
client.login(process.env.discord_bot_id);
