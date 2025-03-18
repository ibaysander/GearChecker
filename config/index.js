require('dotenv').config();

const config = {
    app: {
        port: process.env.PORT || 2000,
        environment: process.env.NODE_ENV || 'development'
    },
    discord: {
        botToken: process.env.discord_bot_id,
        intents: ['GUILDS', 'GUILD_MESSAGES']
    },
    warmane: {
        baseUrl: 'http://armory.warmane.com',
        defaultRealm: 'Icecrown',
        api: {
            timeout: 5000,
            retries: 3
        }
    },
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.LOG_FORMAT || 'json'
    }
};

// Validate required configuration
const requiredConfigs = ['discord.botToken'];
const missingConfigs = requiredConfigs.filter(path => {
    const value = path.split('.').reduce((obj, key) => obj && obj[key], config);
    return value === undefined || value === null || value === '';
});

if (missingConfigs.length > 0) {
    throw new Error(`Missing required configuration: ${missingConfigs.join(', ')}`);
}

module.exports = config; 