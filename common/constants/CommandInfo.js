const Commands = {
    help: "!help",
    guild: "!guild",
    gs: "!gs",
    ench: "!ench",
    gems: "!gems",
    armory: "!armory",
    sum: "!sum",
    achievements: "!achievements",
	achi: "!achi"
}

const Help =
`
**Info**:
            **Menerima jual beli ginjal, DM @ccz15**                
                
**Supported commands**:
            **!help**: Displays this help text.
            **!guild [player_name] [realm?]**: Displays the gild of the player.
            **!gs [player_name] [realm?]**: Displays the GearScore of the player. 
            **!ench [player_name] [realm?]**: Displays which enchants are missing from the player's currently equipped items.
            **!gems [player_name] [realm?]**: Displays which gems are missing from the player's currently equipped items.
            **!armory [player_name] [realm?]**: Returns a link to the player's armory.
            **!sum [player_name] [realm?]**: Lists all the details regarding the given player.
            **!achievements or !achi [player_name] [realm?]**: Displays a table with the achievement progress of the player.
            
            **[realm?]** is an optional parameter. By default = Icecrown.
            
**Example of usage**:
            !sum Cly Icecrown
            !guild Cly
            !gs Cly
            !sum Cly Lordaeron
            !gs Cly Lordaeron
            !achievements Cly
            !achi Cly!**
`;

const InvalidCommand =
`
**Invalid command**: 
                        
Please execute the !help command to see the list of supported commands and an example of usage.`;

module.exports = { Help, InvalidCommand, Commands }