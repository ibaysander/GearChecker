class BaseCommand {
    constructor(name, description, usage) {
        this.name = name;
        this.description = description;
        this.usage = usage;
    }

    async execute(msg, args) {
        throw new Error('Method not implemented.');
    }

    validateArgs(args) {
        throw new Error('Method not implemented.');
    }
}

module.exports = BaseCommand; 