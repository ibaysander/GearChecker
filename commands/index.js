const HelpCommand = require('./implementations/HelpCommand');
const GuildCommand = require('./implementations/GuildCommand');
const GearScoreCommand = require('./implementations/GearScoreCommand');
const EnchantsCommand = require('./implementations/EnchantsCommand');
const GemsCommand = require('./implementations/GemsCommand');
const ArmoryCommand = require('./implementations/ArmoryCommand');
const SummaryCommand = require('./implementations/SummaryCommand');
const { AchievementsCommand, AchiCommand } = require('./implementations/AchievementsCommand');
const CommandHandler = require('./CommandHandler');

// Create and configure the command handler
const commandHandler = new CommandHandler();

// Register all commands
const commands = [
    new HelpCommand(),
    new GuildCommand(),
    new GearScoreCommand(),
    new EnchantsCommand(),
    new GemsCommand(),
    new ArmoryCommand(),
    new SummaryCommand(),
    new AchievementsCommand(),
    new AchiCommand()
];

commands.forEach(command => commandHandler.registerCommand(command));

module.exports = commandHandler; 