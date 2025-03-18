const BaseCommand = require('../base/BaseCommand');
const { Commands } = require('../../common/constants/CommandInfo');
const { RealmEnum } = require('../../domain/enums/RealmEnum');
const CharacterManager = require('../../application/CharacterManager');
const { GetCamelToe } = require('../../common/helpers/GenericHelper');

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
        const realm = args[2] !== undefined ? GetCamelToe(args[2]) : RealmEnum[0];

        try {
            const character = await CharacterManager.GetCharacter(realm, name);
            await msg.reply(`${character.name}'s gear score is: ${character.GearScore}`);
        } catch (error) {
            await msg.reply(error);
        }
    }

    validateArgs(args) {
        if (args.length < 2 || args.length > 3) return false;
        if (args[2] && !Object.values(RealmEnum).includes(GetCamelToe(args[2]))) return false;
        return true;
    }
}

module.exports = GearScoreCommand; 