const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../common/helpers/logger');

const TIMEOUT_MS = 12000;
const RATE_LIMIT_MSG = 'Too many requests.';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Fetches character JSON from Warmane API.
// Retries automatically on "Too many requests" with exponential backoff.
async function fetchCharacterData(name, realm, maxRetries = 4) {
    const delays = [2000, 4000, 8000]; // ms to wait before each retry

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const response = await axios.get(
            `http://armory.warmane.com/api/character/${name}/${realm}/`,
            { timeout: TIMEOUT_MS }
        );

        if (response.data && response.data.error === RATE_LIMIT_MSG) {
            if (attempt < maxRetries) {
                const waitMs = delays[attempt - 1] || 8000;
                logger.warn(`Warmane rate limit hit for ${name} (attempt ${attempt}/${maxRetries}), retrying in ${waitMs}ms...`);
                await sleep(waitMs);
                continue;
            }
            // Exhausted retries — surface the error to caller
        }

        return response.data;
    }
}

async function fetchArmoryPage(name, realm) {
    const response = await axios.get(
        `http://armory.warmane.com/character/${name}/${realm}/`,
        { timeout: TIMEOUT_MS }
    );
    return cheerio.load(response.data);
}

async function fetchAchievements(name, realm, categoryId) {
    const response = await axios.post(
        `https://armory.warmane.com/character/${name}/${realm}/achievements`,
        `category=${categoryId}`,
        {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Accept-Encoding': 'identity'
            },
            timeout: TIMEOUT_MS
        }
    );
    return response.data.content;
}

module.exports = { fetchCharacterData, fetchArmoryPage, fetchAchievements, sleep };
