const BaseCommand = require('../base/BaseCommand');
const { Commands } = require('../../common/constants/CommandInfo');
const { RealmEnum } = require('../../domain/enums/RealmEnum');
const CharacterManager = require('../../application/CharacterManager');
const { GetCamelToe } = require('../../common/helpers/GenericHelper');

class AchievementsCommand extends BaseCommand {
    constructor() {
        super(
            Commands.achievements,
            'Displays a table with the achievement progress of the player',
            '!achievements [player_name] [realm?]'
        );
    }

    async execute(msg, args) {
        const name = args[1];
        const realm = args[2] !== undefined ? GetCamelToe(args[2]) : RealmEnum[0];

        try {
            const character = await CharacterManager.GetCharacter(realm, name);
            await CharacterManager.GetAchievements(character);
            await msg.reply(`**${character.name}'s achievements**:\n${character.Achievements}`);
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

// Create an alias for the achievements command
class AchiCommand extends AchievementsCommand {
    constructor() {
        super();
        this.name = Commands.achi;
    }
}

module.exports = { AchievementsCommand, AchiCommand }; 