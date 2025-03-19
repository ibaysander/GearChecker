const axios = require('axios');
const Logger = require('../../utils/Logger');

class Character {
    constructor(realm, charName) {
        this.valid = false;
        this.name = charName;
        this.realm = realm;
        this.GearScore = 0;
        this.Enchants = null;
        this.Gems = null;
        this.Armory = `[${charName}](http://armory.warmane.com/character/${charName}/${realm})`;
        this.Talents = null;
        this.Summary = null;
        this.GuildLink = null;
        this.PVPGear = [];
        this.Achievements = null;
    }

    static async create(realm, charName) {
        const character = new Character(realm, charName);
        await character._initialize();
        return character;
    }

    async _initialize() {
        try {
            const response = await axios.get(`http://armory.warmane.com/api/character/${this.name}/${this.realm}/`);
            const data = response.data;

            // Update properties from API response
            this.valid = Boolean(data?.name);
            this.online = data.online;
            this.level = data.level;
            this.faction = data.faction;
            this.gender = data.gender;
            this.class = data.class;
            this.honorablekills = data.honorablekills;
            this.guild = data.guild;
            this.achievementpoints = data.achievementpoints;
            this.equipment = data.equipment;
            this.race = data.race;
            this.talents = data.talents;
            this.professions = data.professions;

            if (this.guild) {
                this.GuildLink = `[${this.guild}](http://armory.warmane.com/guild/${this.guild.replace(/\s+/g, "+")}/${this.realm})`;
            }

            // Generate summary if we have valid data
            if (this.valid) {
                this._generateSummary();
            }

            return this;
        } catch (error) {
            Logger.error('Failed to initialize character', {
                name: this.name,
                realm: this.realm,
                error: error.message
            });
            this.valid = false;
            return this;
        }
    }

    _generateSummary() {
        const status = this.online ? ':green_circle:' : ':red_circle:';
        const faction = this.faction === 'Alliance' ? ':blue_heart:' : ':heart:';
        
        let summary = [
            'Do you enjoy using the bot? :wink:',
            'Feel free to donate some gold/coins to Metalforce (Alliance, Icecrown).',
            'This helps paying the bills for my dedicated server and developing the bot.\n',
            `Here is a summary for ${this.name}:`,
            `Status: ${this.online ? 'Online' : 'Offline'} ${status}`,
            `Character: Level ${this.level} ${this.race} ${this.class} - ${this.faction} ${faction}`
        ];

        if (this.guild) {
            summary.push(`Guild: ${this.guild}`);
        }

        if (this.talents?.length) {
            const specs = this.talents.map(t => 
                `${t.tree}(${t.points ? t.points.join('/') : ''})`
            ).join(' and ');
            summary.push(`Specs: ${specs}`);
        }

        if (this.professions?.length) {
            const profs = this.professions.map(p => 
                `${p.value} ${p.name}`
            ).join(' and ');
            summary.push(`Professions: ${profs} :tools:`);
        }

        if (this.achievementpoints) {
            summary.push(`Achievement points: ${this.achievementpoints} :trophy:`);
        }

        if (this.honorablekills) {
            summary.push(`Honorable kills: ${this.honorablekills} :skull_crossbones:`);
        }

        if (this.GearScore) {
            summary.push(`GearScore: ${this.GearScore}`);
        }

        if (this.Enchants) {
            summary.push(`Enchants: ${this.Enchants}`);
        }

        if (this.Gems) {
            summary.push(`Gems: ${this.Gems}`);
        }

        if (this.Armory) {
            summary.push(`Armory: ${this.name}`);
        }

        if (this.PVPGear.length) {
            summary.push(`PVP items: ${this.PVPGear.join(', ')}`);
        } else {
            summary.push('PVP items: None');
        }

        summary.push(`Achievements: Type !achievements ${this.name} or !achi ${this.name}`);

        this.Summary = summary.join('\n');
    }
}

module.exports = { Character };