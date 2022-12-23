const request = require("request-promise");
const MongoClient = require('mongodb').MongoClient;
const url = `mongodb+srv://${process.env.mongo_username}:${process.env.mongo_password}@${process.env.mongo_uri}/${process.env.mongo_database}`;
const cheerio = require("cheerio");
const selenium = require("selenium-webdriver");
const { Client, Intents } = require("discord.js");
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

let chatMsg;

client.on('ready', () => {
    console.log(`[${new Date().toLocaleString()}]:> Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', msg => {
    chatMsg = msg;
    if (chatMsg.content[0] === "!") {
        console.log(`[${new Date().toLocaleString()}]:> ${msg.content}`);

        const realms = ["Icecrown", "Lordaeron", "Frostmourne", "Blackrock"]

        let command = chatMsg.content.split(" ")[0].substring(1);
        let name = chatMsg.content.split(" ")[1];
        let realm = chatMsg.content.split(" ")[2] == null ? realms[0] : chatMsg.content.split(" ")[2];

        // Fix format
        realm = realm.toLowerCase().replace(realm[0].toLowerCase(), realm[0].toUpperCase());

        const commands = {
            "help": () => {
                chatMsg.channel.send(`
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
                getGuild(realm, name, chatMsg);
            },
            "gs": () => {
                getGearScore(realm, name).then(character => {
                    chatMsg.channel.send(`${getName(name)}'s GearScore is ${character.GearScore}`);
                })
            },
            "ench": () => {
                getEnchants(realm, name).then(message => {
                    chatMsg.channel.send(message);
                })
            },
            "gems": () => {
                getGems(realm, name).then(message => {
                    chatMsg.channel.send(message);
                })
            },
            "armory": () => {
                getArmory(realm, name).then(message => {
                    chatMsg.channel.send(message);
                })
            },
            "test": () => {
                getAchievements(realm, name).then(message => {
                    chatMsg.channel.send(message);
                })
            },
            "summary": () => {
                getGearScore(realm, name).then(character => {
                    getEnchants(realm, name).then(enchants => {
                        getGems(realm, name, character.professions).then(gems => {
                            getArmory(realm, name).then(armory => {
                                chatMsg.channel.send(`
    Here is a summary for **${getName(name)}**:
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
            chatMsg.channel.send(`
**Invalid command**: 
            ${chatMsg.content}
            
Please execute the !help command to see the list of supported commands and an example of usage.`)
        }
    }
});

class Character {
    constructor(realm, charName) {
        this.request = request(`http://armory.warmane.com/api/character/${getName(charName)}/${realm}/`, (err, response, body) => {
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

function getGuild(realm, name, chatMsg) {
    var character = new Character(realm, name);
    character.request.then(_ => {
        let guild = character.guild
        if (guild === "") {
            chatMsg.channel.send("No guild found");
        } else if (guild) {
            chatMsg.channel.send(guild);
        } else {
            chatMsg.channel.send("Did you type the right name?");
        }
    });
}

function getGearScore(realm, name) {
    var character = new Character(realm, name);
    var gearscore = 0;

    return new Promise((resolve, reject) => {
        character.request.then(_ => {
            MongoClient.connect(url, (err, db) => {
                if (err) { console.log(err); }

                if (character.equipment && character.equipment.length > 0) {
                    var itemsToFind = [];

                    character.equipment.forEach(item => {
                        itemsToFind.push({
                            "itemID": Number(item.item)
                        });
                    });

                    db.db(process.env.mongo_database).collection("items").find({ $or: itemsToFind }).toArray((err, items) => {
                        let weapons = [];

                        items.forEach(item => {
                            if (item.class === 2 && (item.subclass === 1 || item.subclass === 5 || item.subclass === 8)) {
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
                        character.GearScore = gearscore;
                        resolve(character);
                        db.close();
                    });
                } else {
                    chatMsg.channel.send(`${getName(name)} does not have any items equipped. Maybe you typed the wrong name?`);
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
        uri: `http://armory.warmane.com/character/${getName(name)}/${realm}/`,
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

            MongoClient.connect(url, (err, db) => {
                    if (err) {
                        console.log(err);
                    }
                    db.db(process.env.mongo_database).collection("items").find({$or: itemIDs}).toArray((err, items) => {
                        items.forEach(item => {
                            let foundItem = actualItems.filter(x => x.itemID == item.itemID)[0];
                            let hasBlacksmithing = professions.map(prof => prof.name).includes("Blacksmithing");
                            let itsGlovesOrBracer = (foundItem.type == "Gloves" || foundItem.type == "Bracer");

                            if (foundItem.type == "Belt" || (itsGlovesOrBracer && hasBlacksmithing)) {
                                if ((item.gems + 1) != foundItem.gems) {
                                    missingGems.push(foundItem.type);
                                }
                            }
                            else if (item.gems > foundItem.gems) {
                                missingGems.push(foundItem.type);
                            }

                        });
                        if (missingGems.length === 0) {
                            resolve(`${getName(name)} has gemmed all his items!`);
                        } else {
                            resolve(`${getName(name)} needs to gem ${missingGems.join(", ")}`);
                        }
                        db.close();
                    });
                });
        });
    });
}

function getEnchants(realm, name) {
    const itemNames = ["Head", "Neck", "Shoulders", "Cloak", "Chest", "Shirt", "Tabard", "Bracer", "Gloves", "Belt", "Legs", "Boots", "Ring #1", "Ring #2", "Trinket #1", "Trinket #2", "Main-hand", "Off-hand", "Ranged"];
    const bannedItems = [1, 5, 6, 9, 14, 15];
    var missingEnchants = [];

    const options = {
        uri: `http://armory.warmane.com/character/${getName(name)}/${realm}/`,
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
                resolve(`${getName(name)} has all enchants!`);
            } else {
                resolve(`${getName(name)} is missing enchants from: ${missingEnchants.join(", ")}`);
            }
        });
    });
}

function getArmory(realm, name) {
    return new Promise((resolve, reject) => {
        resolve(`${getName(name)}'s Armory link: http://armory.warmane.com/character/${getName(name)}/${realm}/`);
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

function getName(name) {
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

function getAchievements(realm, name) {
    const options = {
        uri: `http://armory.warmane.com/character/${getName(name)}/${realm}/achievements`,
        transform: function (body) {
            return cheerio.load(body);
        },
        resolveWithFullResponse: true
    };

    return new Promise((resolve, reject) => {
        request(options).then(($) => {
            $(".categories a :nth-child(20)").click();
            $("a:contains('Lich King 25-Player Raid')").click();
            $("a:contains('Fall of the Lich King 25')").click();
            console.log($("#ach4597 :nth-child(5)").text());

            // $(".item-model a").each(function () {
            //     var rel = $(this).attr("rel");
            //     if (rel) {
            //         var params = getParams(rel);
            //         if (params["gems"]) {
            //             var amount = params["gems"].split(":").filter(x => x != 0).length;
            //         } else {
            //             var amount = 0;
            //         }
            //
            //         itemIDs.push({
            //             "itemID": Number(params["item"])
            //         });
            //
            //         actualItems.push({
            //             "itemID": Number(params["item"]),
            //             "gems": amount,
            //             "type": itemNames[i]
            //         });
            //     }
            //     i++;
            // });
        });
    });
}

//Release
client.login(process.env.discord_bot_id);
