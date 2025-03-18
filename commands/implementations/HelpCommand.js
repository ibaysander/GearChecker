const BaseCommand = require('../base/BaseCommand');
const { Help, Commands } = require('../../common/constants/CommandInfo');

class HelpCommand extends BaseCommand {
    constructor() {
        super(
            Commands.help,
            'Displays help information about available commands',
            '!help'
        );
    }

    async execute(msg) {
        await msg.reply(Help);
    }

    validateArgs(args) {
        return args.length === 1;
    }
}

module.exports = HelpCommand; 