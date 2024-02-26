require("dotenv").config();
const { Client, Intents } = require("discord.js");
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });
const crypto = require('crypto');
const CharacterManager = require('./application/CharacterManager')
const { GetCamelToe } = require('./common/helpers/GenericHelper')

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

            const realms = ["Icecrown", "Lordaeron", "Frostmourne", "Blackrock"]

            let command = msg.content.split(" ")[0].substring(1);
            let name = msg.content.split(" ")[1] != undefined ? GetCamelToe(msg.content.split(" ")[1]) : null;
            let realm = msg.content.split(" ")[2] != undefined ? GetCamelToe(msg.content.split(" ")[2]) : realms[0];

            const commands = {
                "help": () => {
                    msg.channel.send(`
**Info**:
            **Hello! I'm Snuske's child! I now officially support Lordaeron and other WotLK Warmane realms! 
            The usage is the same as before but you can add the realm after your character's name. 
            But if you don't I'll search in Icecrown as the default realm.**                
                
**Supported commands**:
            **!help**: Displays this help text.
            **!guild [player_name] [realm?]**: Displays the gild of the player.
            **!gs [player_name] [realm?]**: Displays the GearScore of the player. 
            **!ench [player_name] [realm?]**: Displays which enchants are missing from the player's currently equipped items.
            **!gems [player_name] [realm?]**: Displays which gems are missing from the player's currently equipped items.
            **!armory [player_name] [realm?]**: Returns a link to the player's armory.
            **!summary [player_name] [realm?]**: Lists all the details regarding the given player.
            
            **[realm?]** is an optional parameter. By default = Icecrown.
            
**Example of usage**:
            !summary Metalforce Icecrown
            !guild Metalforce
            !gs Metalforce
            !summary Koch Lordaeron
            !gs Koch Lordaeron
                 `)
                },
                "guild": () => {
                    getGuild(realm, name).then(message => {
                        msg.channel.send(message);
                    });
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
                "test": () => {
                    getAchievements(realm, name).then(message => {
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

            if (typeof commands[command] === "function" && realms.includes(realm)) {
                //If the command sent is actually a command, execute it!
                commands[command]();
            }
            else {
                msg.channel.send(`
**Invalid command**: 
            ${msg.content}
            
Please execute the !help command to see the list of supported commands and an example of usage.`)
            }
        }
    }
    catch (e){
        console.log(`[${new Date().toLocaleString()}: ${guid}]:> ${e.message}`);
    }
});

client.login(process.env.discord_bot_id);