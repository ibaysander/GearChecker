const crypto = require('crypto');

class Logger {
    static generateLogId() {
        return crypto.randomUUID();
    }

    static formatMessage(level, message, context = {}) {
        const timestamp = new Date().toLocaleString();
        const logId = context.logId || this.generateLogId();
        const contextString = Object.keys(context).length > 0 
            ? `\nContext: ${JSON.stringify(context, null, 2)}` 
            : '';

        return `[${timestamp}][${logId}][${level}] ${message}${contextString}`;
    }

    static info(message, context = {}) {
        // Info logs are disabled by default
        if (process.env.ENABLE_INFO_LOGS === 'true') {
            console.log(this.formatMessage('INFO', message, context));
        }
    }

    static error(message, context = {}) {
        console.error(this.formatMessage('ERROR', message, context));
    }

    static debug(message, context = {}) {
        if (process.env.NODE_ENV !== 'production') {
            console.debug(this.formatMessage('DEBUG', message, context));
        }
    }

    static warn(message, context = {}) {
        console.warn(this.formatMessage('WARN', message, context));
    }
}

module.exports = Logger; 