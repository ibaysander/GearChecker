require("dotenv").config();
const { Client, Intents } = require("discord.js");
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });
const crypto = require('crypto');
const CharacterManager = require('./application/CharacterManager')
const CI = require('./common/constants/CommandInfo')
const { RealmEnum } = require('./domain/enums/RealmEnum')
const { GetCamelToe } = require("./common/helpers/GenericHelper");
const express = require('express');
const { exec } = require('child_process');

const app = express();
const port = 2001;

client.on('ready', () => {
    console.log(`[${new Date().toLocaleString()}]:> Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async(msg) => {
    let guid = crypto.randomUUID();

    try {
        if (msg.content[0] === "!") {
            console.log(`[${new Date().toLocaleString()}]:> ${msg.content}`);

            let command = msg.content.split(" ")[0];
            let name = msg.content.split(" ")[1] !== undefined ? msg.content.split(" ")[1] : null;
            let realm = msg.content.split(" ")[2] !== undefined ? GetCamelToe(msg.content.split(" ")[2]) : RealmEnum[0];

            msg = await msg.channel.messages.fetch(msg.id);

            if (command === CI.Commands.help) msg.reply(CI.Help);
            else if (Object.values(CI.Commands).includes(command) && Object.values(RealmEnum).includes(realm) && name != null) {
                CharacterManager.GetCharacter(realm, name)
                .then(async character => {
                    switch (command) {
                        case CI.Commands.guild:
                            msg.reply(
                                character.guild ?
                                    `${character.name}'s guild: ${character.GuildLink}` :
                                    `${character.name} doesn't have a guild`);
                            break;
                        case CI.Commands.gs:
                            msg.reply(`${character.name}'s gear score is: ${character.GearScore}`);
                            break;
                        case CI.Commands.ench:
                            msg.reply(character.Enchants);
                            break;
                        case CI.Commands.gems:
                            msg.reply(character.Gems);
                            break;
                        case CI.Commands.armory:
                            msg.reply(`${character.name}'s armory: ${character.Armory}`);
                            break;
                        case CI.Commands.summary:
                            msg.reply(character.Summary);
                            break;
                        case CI.Commands.achievements:
                        case CI.Commands.achi:
                            await CharacterManager.GetAchievements(character).then(async () => {
                                msg.reply(`**${character.name}'s achievements**:\n${character.Achievements}`);
                            });
                            break;
                    }
                })
                .catch(err => {
                    console.log(err);

                    msg.reply(err);
                });
            }
            else msg.reply(CI.InvalidCommand);
        }
    }
    catch (e) {
        console.log(`[${new Date().toLocaleString()}: ${guid}]:> ${e.message}`);
    }
});

client.login(process.env.discord_bot_id);

// Route to handle GitHub webhook requests
app.post('/', (req, res) => {
    const scriptPath = process.env.app_dir + 'update_app.ps1';
    const command = `Start-Process powershell -ArgumentList '-File "${scriptPath}"' -Verb RunAs`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.log(`Error executing script: ${error}`);
            return;
        }

        console.log('Command output:', stdout);
        console.log('Command errors:', stderr);
    });

    // Respond to the webhook request
    res.sendStatus(200); // OK
});


// Start express server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});