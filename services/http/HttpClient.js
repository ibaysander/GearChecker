const axios = require('axios');
const config = require('../../config');
const Logger = require('../../utils/Logger');
const { ArmoryError } = require('../../utils/errors/ApplicationError');

class HttpClient {
    constructor() {
        this.client = axios.create({
            baseURL: config.warmane.baseUrl,
            timeout: config.warmane.api.timeout
        });

        this.logger = Logger;
    }

    async get(url, options = {}) {
        const logContext = { url, ...options };
        this.logger.debug('Making HTTP GET request', logContext);

        try {
            const response = await this._makeRequest(() => 
                this.client.get(url, options)
            );

            this.logger.debug('HTTP GET request successful', {
                ...logContext,
                status: response.status
            });

            return response.data;
        } catch (error) {
            this.logger.error('HTTP GET request failed', {
                ...logContext,
                error: error.message
            });
            throw new ArmoryError(`Failed to fetch data from ${url}`, {
                originalError: error.message
            });
        }
    }

    async _makeRequest(requestFn) {
        let lastError;
        
        for (let attempt = 1; attempt <= config.warmane.api.retries; attempt++) {
            try {
                return await requestFn();
            } catch (error) {
                lastError = error;
                this.logger.warn(`Request attempt ${attempt} failed`, {
                    error: error.message
                });

                if (attempt < config.warmane.api.retries) {
                    await this._delay(1000 * attempt); // Exponential backoff
                }
            }
        }

        throw lastError;
    }

    async _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = new HttpClient(); 