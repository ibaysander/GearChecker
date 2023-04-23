require("dotenv").config();
const request = require("request-promise");
const url = `mongodb+srv://${process.env.mongo_username}:${process.env.mongo_password}@${process.env.mongo_uri}/${process.env.mongo_database}`;
const MongoClient = require('mongodb').MongoClient;
const cheerio = require("cheerio");
const { Client, Intents } = require("discord.js");
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });
const crypto = require('crypto');

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

            const realms = ["Icecrown", "Lordaeron", "Frostmourne", "Blackrock"]

            let command = msg.content.split(" ")[0].substring(1);
            let name = msg.content.split(" ")[1] != undefined ? getCamelToe(msg.content.split(" ")[1]) : null;
            let realm = msg.content.split(" ")[2] != undefined ? getCamelToe(msg.content.split(" ")[2]) : realms[0];

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
                        msg.channel.send(`${getCamelToe(name)}'s GearScore is ${character.GearScore}`);
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
    Here is a summary for **${getCamelToe(name)}**:
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

        SendTelegramMsg(`Guid: ${guid}\nCommand: ${msg.content}\nUser: ${msg.author.username}#${msg.author.discriminator}\nError: ${e.message}`);
    }
});

class Character {
    constructor(realm, charName) {
        this.request = request(`http://armory.warmane.com/api/character/${charName}/${realm}/`, (err, response, body) => {
            body = JSON.parse(body);
            this.name = body.name;
            this.realm = body.realm;
            this.online = body.online;
            this.level = body.level;
            this.faction = body.faction;
            this.gender = body.gender;
            this.class = body.class;
            this.honorablekills = body.honorablekills;
            this.guild = body.guild;
            this.achievementpoints = body.achievementpoints;
            this.equipment = body.equipment;
            this.race = body.race;
            this.talents = body.talents;
            this.professions = body.professions;
        });
    }
}

function getGuild(realm, name) {
    let character = new Character(realm, name);

    return new Promise((resolve) => {
        character.request.then(_ => {
            resolve(character.guild !== undefined ? character.guild : "No guild found");
        });
    });
}

async function getGearScore(realm, name) {
    let character = new Character(realm, name);
    let gearscore = 0;

    return new Promise((resolve) => {
        character.request.then(_ => {
            MongoClient.connect(url).then(async client => {
                const itemsDB = client.db(process.env.mongo_database).collection("items");

                if (character.equipment && character.equipment.length > 0) {
                    var itemsToFind = [];

                    character.equipment.forEach(item => {
                        itemsToFind.push({
                            "itemID": Number(item.item)
                        });
                    });

                    const cursor = itemsDB.find({$or: itemsToFind});
                    const items = await cursor.toArray();

                    let weapons = [];
                    const hunterWeaponTypes = [13, 17, 21, 22 ]

                    items.forEach(item => {
                        if (character.class == "Hunter" && item.type == 26) {
                            gearscore += item.GearScore * 5.3224;
                        } else if (character.class == "Hunter" && hunterWeaponTypes.indexOf(item.type) > -1) {
                            gearscore += item.GearScore * 0.3164;
                        } else if (item.class === 2 && (item.subclass === 1 || item.subclass === 5 || item.subclass === 8)) {
                            weapons.push(item.GearScore);
                        } else {
                            gearscore += item.GearScore;
                        }
                    });

                    // Probably a warrior with Titan's Grip
                    if (weapons.length == 2) {
                        gearscore += Math.floor(((weapons[0] + weapons[1]) / 2));
                    } else if (weapons.length == 1) {
                        gearscore += weapons[0];
                    }
                    character.GearScore = Math.ceil(gearscore);
                    resolve(character);
                    await client.close();
                } else {
                    msg.channel.send(`${getCamelToe(name)} does not have any items equipped. Maybe you typed the wrong name?`);
                }
            });
        });
    });
}

function getParams(params) {
    params = params.split("&");
    var paramsMap = {};
    params.forEach(function (p) {
        var v = p.split("=");
        paramsMap[v[0]] = decodeURIComponent(v[1]);
    });
    return paramsMap;
};

function getGems(realm, name, professions) {
    const itemNames = ["Head", "Neck", "Shoulders", "Cloak", "Chest", "Shirt", "Tabard", "Bracer", "Gloves", "Belt", "Legs", "Boots", "Ring #1", "Ring #2", "Trinket #1", "Trinket #2", "Main-hand", "Off-hand", "Ranged"];

    const options = {
        uri: `http://armory.warmane.com/character/${getCamelToe(name)}/${realm}/`,
        transform: function (body) {
            return cheerio.load(body);
        }
    };

    return new Promise((resolve, reject) => {
        var itemIDs = [];
        var actualItems = [];
        var i = 0;
        let missingGems = [];


        request(options).then(($) => {
            $(".item-model a").each(function () {
                var rel = $(this).attr("rel");
                if (rel) {
                    var params = getParams(rel);
                    if (params["gems"]) {
                        var amount = params["gems"].split(":").filter(x => x != 0).length;
                    } else {
                        var amount = 0;
                    }

                    itemIDs.push({
                        "itemID": Number(params["item"])
                    });

                    actualItems.push({
                        "itemID": Number(params["item"]),
                        "gems": amount,
                        "type": itemNames[i]
                    });
                }
                i++;
            });

            MongoClient.connect(url).then(async client => {
                const itemsDB = client.db(process.env.mongo_database).collection("items");
                const cursor = itemsDB.find({$or: itemIDs});
                const items = await cursor.toArray();

                items.forEach(item => {
                    let foundItem = actualItems.filter(x => x.itemID == item.itemID)[0];
                    let hasBlacksmithing = professions.map(prof => prof.name).includes("Blacksmithing");
                    let itsGlovesOrBracer = (foundItem.type == "Gloves" || foundItem.type == "Bracer");

                    if (foundItem.type == "Belt" || (itsGlovesOrBracer && hasBlacksmithing)) {
                        if ((item.gems + 1) != foundItem.gems) {
                            missingGems.push(foundItem.type);
                        }
                    } else if (item.gems > foundItem.gems) {
                        missingGems.push(foundItem.type);
                    }

                });
                if (missingGems.length === 0) {
                    resolve(`${getCamelToe(name)} has gemmed all his items!`);
                } else {
                    resolve(`${getCamelToe(name)} needs to gem ${missingGems.join(", ")}`);
                }
                await client.close();
            });
        });
    });
}

function getEnchants(realm, name) {
    const itemNames = ["Head", "Neck", "Shoulders", "Cloak", "Chest", "Shirt", "Tabard", "Bracer", "Gloves", "Belt", "Legs", "Boots", "Ring #1", "Ring #2", "Trinket #1", "Trinket #2", "Main-hand", "Off-hand", "Ranged"];
    const bannedItems = [1, 5, 6, 9, 14, 15];
    var missingEnchants = [];

    const options = {
        uri: `http://armory.warmane.com/character/${getCamelToe(name)}/${realm}/`,
        transform: function (body) {
            return cheerio.load(body);
        }
    };

    return new Promise((resolve, reject) => {
        request(options).then(($) => {
            var items = [];
            var characterClass = $(".level-race-class").text().toLowerCase();
            let professions = [];
            $(".profskills").find(".text").each(function (profession) {
                professions.push($(this).clone().children().remove().end().text().trim());
            });
            $(".item-model a").each(function () {
                var item = $(this).attr("href");
                var rel = $(this).attr("rel");
                items.push(rel);
            });

            for (i = 0; i < items.length; i++) {
                if (items[i]) {
                    if (!bannedItems.includes(i)) {
                        if (items[i].indexOf("ench") == -1) {
                            if (itemNames[i] === "Ranged") {
                                if (characterClass.indexOf("hunter") >= 0) {
                                    missingEnchants.push(itemNames[i]);
                                }
                            } else if (itemNames[i] === "Ring #1" || itemNames[i] === "Ring #2") {
                                if (professions.includes("Enchanting")) {
                                    missingEnchants.push(itemNames[i]);
                                }
                            } else if (itemNames[i] === "Off-hand") {
                                if (characterClass.indexOf("mage") < 0 && characterClass.indexOf("warlock") < 0 && characterClass.indexOf("druid") < 0 && characterClass.indexOf("priest") < 0) {
                                    missingEnchants.push(itemNames[i]);
                                }
                            } else {
                                missingEnchants.push(itemNames[i]);
                            }
                        }
                    }
                }
            };
            if (missingEnchants.length === 0) {
                resolve(`${getCamelToe(name)} has all enchants!`);
            } else {
                resolve(`${getCamelToe(name)} is missing enchants from: ${missingEnchants.join(", ")}`);
            }
        });
    });
}

function getArmory(realm, name) {
    return new Promise((resolve, reject) => {
        resolve(`${getCamelToe(name)}'s Armory link: http://armory.warmane.com/character/${getCamelToe(name)}/${realm}/`);
    });
}

function getTalents(talents) {
    let res = "";

    if (talents != null) {
        for (let i=0; i < talents.length; i++) {
            if (i == 1) res += " and ";

            res += talents[i].tree;

            if (talents[i].points != null) {
                res += "(" + talents[i].points.map(p => p).join("/") + ")";
            }
        }
    }

    return res;
}

function getCamelToe(str) {
    var onlyLetters = str.replace(/[^a-zA-Z]+/g, '');

    if (onlyLetters) {
        return onlyLetters.charAt(0).toUpperCase() + onlyLetters.slice(1).toLowerCase();
    }
    else {
       return str;
    }
}

function SendTelegramMsg(msg) {
    try {
        msg = `Timestamp: ${new Date().toLocaleString()}\n${msg}`;

        request.post(
            encodeURI(`https://api.telegram.org/bot${process.env.telegram_bot_id}/sendMessage?chat_id=${process.env.telegram_chat_id}&text=${msg}`)
        )
    }
    catch (e) {
        console.log(`[${new Date().toLocaleString()}]:> ${e}`);
    }
}

client.login(process.env.discord_bot_id);