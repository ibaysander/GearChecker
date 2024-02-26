require("dotenv").config();
const { Client, Intents } = require("discord.js");
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });
const crypto = require('crypto');
const CharacterManager = require('./application/CharacterManager')
const { GetCamelToe } = require('./common/helpers/GenericHelper')
const { RealmEnum } = require('./domain/enums/RealmEnum')
const CommandInfo = require('./common/constants/CommandInfo')

let msg;

client.on('ready', () => {
    console.log(`[${new Date().toLocaleString()}]:> Logged in as ${client.user.tag}!`);

    CharacterManager.GetCharacter("Icecrown", "Naabb")
        .then(character => {
            CharacterManager.GetGearScore(character)
                .then(result => {
                    console.log(result);
                })
                .catch(err => {
                    console.error(err.message);
                });
            CharacterManager.GetGems(character)
                .then(result => {
                    console.log(result);
                })
                .catch(err => {
                    console.error(err.message);
                });
            CharacterManager.GetEnchants(character)
                .then(result => {
                    console.log(result);
                })
                .catch(err => {
                    console.error(err.message);
                });
            CharacterManager.GetGuild(character)
                .then(result => {
                    console.log(result);
                })
                .catch(err => {
                    console.error(err.message);
                });

            console.log(CharacterManager.GetArmory(character));
            console.log(CharacterManager.GetTalents(character));
        });
});

client.on('messageCreate', msgIn => {
    let guid = crypto.randomUUID();
    msg = msgIn;

    try {
        if (msg.content[0] === "!") {
            console.log(`[${new Date().toLocaleString()}: ${guid}]:> ${msg.content}`);

            let command = msg.content.split(" ")[0].substring(1);
            let name = msg.content.split(" ")[1] !== undefined ? msg.content.split(" ")[1] : null;
            let realm = msg.content.split(" ")[2] !== undefined ? msg.content.split(" ")[2] : RealmEnum[0];

            if (command === "help") msg.channel.send(CommandInfo.Help);
            else {
                switch(command) {
                    case "guild":
                        CharacterManager.GetGuild(realm, name).then(message => {
                            msg.channel.send(message);
                        });
                }
            }


            const commands = {
                "help": () => {
                },
                "guild": () => {
                },
                "gs": () => {
                    getGearScore(realm, name).then(character => {
                        msg.channel.send(`${GetCamelToe(name)}'s GearScore is ${character.GearScore}`);
                    })
                },
                "ench": () => {
                    getEnchants(realm, name).then(message => {
                        msg.channel.send(message);
                    })
                },
                "gems": () => {
                    getGems(realm, name).then(message => {
                        msg.channel.send(message);
                    })
                },
                "armory": () => {
                    getArmory(realm, name).then(message => {
                        msg.channel.send(message);
                    })
                },
                "summary": () => {
                    getGearScore(realm, name).then(character => {
                        getEnchants(realm, name).then(enchants => {
                            getGems(realm, name, character.professions).then(gems => {
                                getArmory(realm, name).then(armory => {
                                    msg.channel.send(`
    Here is a summary for **${GetCamelToe(name)}**:
    **Status**: ${character.online ? "Online" : "Offline"}
    **Character**: ${"Level " + character.level + " " + character.race + " " + character.class + " - " + character.faction}
    **Guild**: ${character.guild}
    **Specs**: ${getTalents(character.talents)}
    **Professions**: ${character.professions.map(profession => (profession.skill + " " + profession.name)).join(" and ")}
    **Achievement points**: ${character.achievementpoints}
    **Honorable kills**: ${character.honorablekills}
    **GearScore**: ${character.GearScore}
    **Enchants**: ${enchants}
    **Gems**: ${gems}
    **Armory**: ${armory}
                             `);
                                });
                            });
                        });
                    });
                }
            }

            if (typeof commands[command] === "function" && Object.values(RealmEnum).includes(realm)) {
                //If the command sent is actually a command, execute it!
                commands[command]();
            }
            else {
                msg.channel.send(CommandInfo.InvalidCommand);
            }
        }
    }
    catch (e){
        console.error(`[${new Date().toLocaleString()}: ${guid}]:> ${e.message}`);
    }
});

client.login(process.env.discord_bot_id);