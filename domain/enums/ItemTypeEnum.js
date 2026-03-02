// WoW WotLK inventory type IDs
// Fixed: removed duplicate Chest (5/20) and OffHand (14/22) keys that caused silent overwrites
const ItemTypeEnum = {
    Item: 0,
    Head: 1,
    Neck: 2,
    Shoulder: 3,
    Shirt: 4,
    Chest: 5,       // Plate/mail/leather/cloth chest
    Waist: 6,
    Legs: 7,
    Boots: 8,
    Wrist: 9,
    Hands: 10,
    Ring: 11,
    Trinket: 12,
    OneHand: 13,
    Shield: 14,     // Was incorrectly sharing key "OffHand" with type 22
    Bow: 15,
    Cloak: 16,
    TwoHand: 17,
    Container: 18,
    Tabard: 19,
    Robe: 20,       // Was incorrectly sharing key "Chest" with type 5
    MainHand: 21,
    OffHand: 22,    // Held-in-offhand weapons/items
    HeldInOffHand: 23,
    Ammo: 24,
    Thrown: 25,
    Crossbow: 26,
    Relic: 28
};

function ItemTypeEnumToString(value) {
    for (const key in ItemTypeEnum) {
        if (ItemTypeEnum[key] === value) {
            return key;
        }
    }
    return 'Unknown';
}

module.exports = { ItemTypeEnum, ItemTypeEnumToString };
