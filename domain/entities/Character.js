class Character {
    constructor(data) {
        this.valid = !!(data && data.name);
        this.name = data.name;
        this.realm = data.realm;
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

        // Calculated properties (populated by CharacterManager)
        this.GearScore = 0;
        this.Enchants = null;
        this.Gems = null;
        this.Armory = `[${this.name}](http://armory.warmane.com/character/${this.name}/${this.realm})`;
        this.Talents = null;
        this.Summary = null;
        this.GuildLink = this.guild
            ? `[${this.guild}](http://armory.warmane.com/guild/${this.guild.replaceAll(' ', '+')}/${this.realm})`
            : null;
        this.PVPGear = [];
        this.Achievements = null;
    }
}

module.exports = { Character };
