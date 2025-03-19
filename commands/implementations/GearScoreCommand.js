const BaseCommand = require('../base/BaseCommand');
const { Commands } = require('../../common/constants/CommandInfo');
const CharacterService = require('../../services/character/CharacterService');
const config = require('../../config');

class GearScoreCommand extends BaseCommand {
    constructor() {
        super(
            Commands.gs,
            'Displays the GearScore of the player',
            '!gs [player_name] [realm?]'
        );
    }

    async execute(msg, args) {
        const name = args[1];
        const realm = args[2] || config.warmane.defaultRealm;

        try {
            const character = await CharacterService.getCharacterDetails(realm, name);
            await msg.reply(`${character.name}'s gear score is: ${character.GearScore}`);
        } catch (error) {
            const errorMessage = error.code === 'CHARACTER_NOT_FOUND'
                ? `Character ${name} not found in realm ${realm}`
                : 'An error occurred while fetching character information. Please try again later.';
                
            await msg.reply(errorMessage);
        }
    }

    validateArgs(args) {
        return args.length >= 2 && args.length <= 3;
    }
}

module.exports = GearScoreCommand; 