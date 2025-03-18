const crypto = require('crypto');
const { InvalidCommand } = require('../common/constants/CommandInfo');

class CommandHandler {
    constructor() {
        this.commands = new Map();
    }

    registerCommand(command) {
        this.commands.set(command.name, command);
    }

    async handleMessage(msg) {
        if (msg.content[0] !== "!") return;

        const guid = crypto.randomUUID();
        console.log(`[${new Date().toLocaleString()}]:> ${msg.content}`);

        try {
            const args = msg.content.split(" ");
            const commandName = args[0];
            const command = this.commands.get(commandName);

            if (!command) {
                return await msg.reply(InvalidCommand);
            }

            if (!command.validateArgs(args)) {
                return await msg.reply(InvalidCommand);
            }

            await command.execute(msg, args);
        } catch (e) {
            console.log(`[${new Date().toLocaleString()}: ${guid}]:> ${e.message}`);
            await msg.reply('An error occurred while processing your command.');
        }
    }
}

module.exports = CommandHandler; 