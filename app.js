require("dotenv").config();
const { Client, Intents } = require("discord.js");
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });
const crypto = require('crypto');
const CharacterManager = require('./application/CharacterManager')
const CommandInfo = require('./common/constants/CommandInfo')
const { RealmEnum } = require('./domain/enums/RealmEnum')

let msg;

client.on('ready', () => {
    console.log(`[${new Date().toLocaleString()}]:> Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', msgIn => {
    let guid = crypto.randomUUID();
    msg = msgIn;

    try {
        if (msg.content[0] === "!") {
            console.log(`[${new Date().toLocaleString()}: ${guid}]:> ${msg.content}`);

            let command = msg.content.split(" ")[0];
            let name = msg.content.split(" ")[1] !== undefined ? msg.content.split(" ")[1] : null;
            let realm = msg.content.split(" ")[2] !== undefined ? msg.content.split(" ")[2] : RealmEnum[0];

            if (command === CommandInfo.Commands.help) msg.channel.send(CommandInfo.Help);
            else if (Object.values(CommandInfo.Commands).includes(command) && Object.values(RealmEnum).includes(realm)) {
                CharacterManager.GetCharacter(realm, name)
                .then(character => {
                    switch (command) {
                        case CommandInfo.Commands.guild:
                                msg.channel.send(character.guild);
                                break;
                        case CommandInfo.Commands.summary:
                            msg.channel.send(character.Summary);
                            break;
                    }
                })
                .catch(err => {

                });
            }
            else msg.channel.send(CommandInfo.InvalidCommand);
        }
    }
    catch (e){
        console.error(`[${new Date().toLocaleString()}: ${guid}]:> ${e.message}`);
    }
});

client.login(process.env.discord_bot_id);