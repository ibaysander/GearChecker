const BaseCommand = require('../base/BaseCommand');
const { Commands } = require('../../common/constants/CommandInfo');
const CharacterService = require('../../services/character/CharacterService');
const Logger = require('../../utils/Logger');

class GearScoreCommand extends BaseCommand {
    constructor() {
        super(
            Commands.gs,
            'Displays the GearScore of the player',
            '!gs [player_name] [realm?]'
        );
        this.logger = Logger;
    }

    async execute(msg, args) {
        const name = args[1];
        const realm = args[2];
        const logContext = { name, realm };

        try {
            const character = await CharacterService.getCharacterDetails(realm, name);
            await msg.reply(`${character.name}'s gear score is: ${character.GearScore}`);
            
            this.logger.info('GearScore command executed successfully', logContext);
        } catch (error) {
            this.logger.error('GearScore command failed', {
                ...logContext,
                error: error.message
            });
            await msg.reply(error.message);
        }
    }

    validateArgs(args) {
        return args.length >= 2 && args.length <= 3;
    }
}

module.exports = GearScoreCommand; 