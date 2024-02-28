require("dotenv").config();
const {Client, Intents} = require("discord.js");
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });
const crypto = require('crypto');
const CharacterManager = require('./application/CharacterManager')
const CommandInfo = require('./common/constants/CommandInfo')
const {RealmEnum} = require('./domain/enums/RealmEnum')
const {GetCamelToe} = require("./common/helpers/GenericHelper");

let msg;

client.on('ready', () => {
    console.log(`[${new Date().toLocaleString()}]:> Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', msgIn => {
    let guid = crypto.randomUUID();
    msg = msgIn;

    try {
        if (msg.content[0] === "!") {
            console.log(`[${new Date().toLocaleString()}]:> ${msg.content}`);

            let command = msg.content.split(" ")[0];
            let name = msg.content.split(" ")[1] !== undefined ? msg.content.split(" ")[1] : null;
            let realm = msg.content.split(" ")[2] !== undefined ? msg.content.split(" ")[2] : RealmEnum[0];
            realm = GetCamelToe(realm);

            if (command === CommandInfo.Commands.help) msg.channel.send(CommandInfo.Help);
            else if (Object.values(CommandInfo.Commands).includes(command) && Object.values(RealmEnum).includes(realm)) {
                CharacterManager.GetCharacter(realm, name)
                .then(character => {
                    switch (command) {
                        case CommandInfo.Commands.guild:
                            msg.channel.send(
                                character.guild ?
                                    `${character.name}'s guild: ${character.GuildLink}` :
                                    `${character.name} doesn't have a guild`);
                            break;
                        case CommandInfo.Commands.gs:
                            msg.channel.send(`${character.name}'s gear score is: ${character.GearScore}`);
                            break;
                        case CommandInfo.Commands.ench:
                            msg.channel.send(character.Enchants);
                            break;
                        case CommandInfo.Commands.gems:
                            msg.channel.send(character.Gems);
                            break;
                        case CommandInfo.Commands.armory:
                            msg.channel.send(`${character.name}'s armory: ${character.Armory}`);
                            break;
                        case CommandInfo.Commands.summary:
                            msg.channel.send(character.Summary);
                            break;
                    }
                })
                .catch(err => {
                    console.error(err);

                    msg.channel.send(err);
                });
            }
            else msg.channel.send(CommandInfo.InvalidCommand);
        }
    }
    catch (e) {
        console.error(`[${new Date().toLocaleString()}: ${guid}]:> ${e.message}`);
    }
});

client.login(process.env.discord_bot_id);