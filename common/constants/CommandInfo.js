const Commands = {
    help: '!help',
    guild: '!guild',
    gs: '!gs',
    ench: '!ench',
    gems: '!gems',
    armory: '!armory',
    sum: '!sum',
    achievements: '!achievements',
    achi: '!achi',
    compare: '!compare'
};

const Help =
`
**Info**:
            **Hello! I'm GearChecker! I support all WotLK Warmane realms.
            Add the realm after your character's name.
            If you don't, Icecrown is searched by default.**

**Supported commands**:
            **/help**: Displays this help text.
            **/guild [player_name] [realm?]**: Displays the guild of the player.
            **/gs [player_name] [realm?]**: Displays the GearScore of the player.
            **/ench [player_name] [realm?]**: Displays which enchants are missing.
            **/gems [player_name] [realm?]**: Displays which gems are missing.
            **/armory [player_name] [realm?]**: Returns a link to the player's armory.
            **/sum [player_name] [realm?]**: Lists all the details regarding the given player.
            **/achievements [player_name] [realm?]**: Displays raid achievement progress.
            **/compare [char1] [char2] [realm?]**: Compares GearScore and gear of two characters.

            **[realm?]** is an optional parameter. By default = Icecrown.
            Supported realms: Icecrown, Lordaeron, Frostmourne, Blackrock, Onyxia.

**Example of usage**:
            /sum Metalforce Icecrown
            /guild Metalforce
            /gs Metalforce
            /sum Koch Lordaeron
            /compare Metalforce Koch

**Feel free to join the official Discord server of the bot [here](https://discord.gg/ZSDpeftAB7) and ask/suggest me anything!**
`;

const InvalidCommand =
`
**Invalid command**:

Please use **/help** to see the list of supported commands and examples.`;

module.exports = { Help, InvalidCommand, Commands };
