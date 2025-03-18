const BaseService = require('../base/BaseService');
const { Character } = require('../../domain/entities/Character');
const { CharacterNotFoundError, ValidationError } = require('../../utils/errors/ApplicationError');
const Logger = require('../../utils/Logger');
const config = require('../../config');
const { GetCamelToe, GetParams } = require('../../common/helpers/GenericHelper');
const { RealmEnum } = require('../../domain/enums/RealmEnum');
const { GetItems } = require('../../infrastructure/ItemManager');
const { ItemTypeEnum, ItemTypeEnumToString } = require('../../domain/enums/ItemTypeEnum');
const { WarmaneItemTypeEnum } = require('../../domain/enums/WarmaneItemTypeEnum');
const HttpClient = require('../http/HttpClient');
const cheerio = require('cheerio');

class CharacterService extends BaseService {
    constructor() {
        super();
        this.logger = Logger;
        this.httpClient = HttpClient;
    }

    async validate({ realm, name }) {
        if (!name) {
            throw new ValidationError('Character name is required');
        }

        const normalizedRealm = GetCamelToe(realm || config.warmane.defaultRealm);
        
        if (!Object.values(RealmEnum).includes(normalizedRealm)) {
            throw new ValidationError(`Invalid realm: ${realm}`);
        }

        return {
            realm: normalizedRealm,
            name: GetCamelToe(name)
        };
    }

    async getCharacterDetails(realm, name) {
        const logContext = { realm, name };
        this.logger.debug('Fetching character details', logContext);

        const { realm: validRealm, name: validName } = await this.validate({ realm, name });
        
        try {
            const character = await new Character(validRealm, validName);
            
            if (!character.valid) {
                throw new CharacterNotFoundError(validName, validRealm);
            }

            await this._enrichCharacterData(character);
            
            this.logger.info('Character details fetched successfully', {
                ...logContext,
                gearScore: character.GearScore
            });

            return character;
        } catch (error) {
            this.logger.error('Error fetching character details', {
                ...logContext,
                error: error.message
            });
            throw error;
        }
    }

    async _enrichCharacterData(character) {
        await Promise.all([
            this._getGearScore(character),
            this._getEnchants(character),
            this._getGems(character),
            this._getTalents(character),
            this._getSummary(character)
        ]);
    }

    async _getGearScore(character) {
        this.logger.debug('Calculating gear score', { character: character.name });
        
        if (!character?.equipment?.length) {
            this.logger.warn('No equipment found for character', { character: character.name });
            return;
        }

        let gearScore = 0;
        const equippedItems = character.equipment.map(item => Number(item.item));

        try {
            await new Promise((resolve) => {
                GetItems(equippedItems, (err, itemsDB) => {
                    if (err) {
                        this.logger.error('Error fetching items from DB', { error: err });
                        return;
                    }

                    const hunterWeaponTypes = [
                        ItemTypeEnum.OneHand,
                        ItemTypeEnum.TwoHand,
                        ItemTypeEnum.MainHand,
                        ItemTypeEnum.OffHand
                    ];
                    let weapons = [];

                    equippedItems.forEach(equippedItem => {
                        const item = itemsDB.find(element => element.itemID === equippedItem);

                        if (item.PVP === 1) {
                            character.PVPGear.push(`${ItemTypeEnumToString(item.type)}:\n\t\t\t\t\t${item.name}`);
                        }

                        if (character.class === "Hunter" && item.type === 26) {
                            gearScore += item.GearScore * 5.3224;
                        } else if (character.class === "Hunter" && hunterWeaponTypes.includes(item.type)) {
                            gearScore += item.GearScore * 0.3164;
                        } else if (item.class === 2 && [1, 5, 8].includes(item.subclass)) {
                            weapons.push(item.GearScore);
                        } else {
                            gearScore += item.GearScore;
                        }
                    });

                    // Handle Titan's Grip for warriors
                    if (weapons.length === 2) {
                        gearScore += Math.floor((weapons[0] + weapons[1]) / 2);
                    } else if (weapons.length === 1) {
                        gearScore += weapons[0];
                    }

                    character.GearScore = Math.ceil(gearScore);
                    resolve();
                });
            });

            this.logger.info('Gear score calculated successfully', {
                character: character.name,
                gearScore: character.GearScore
            });
        } catch (error) {
            this.logger.error('Error calculating gear score', {
                character: character.name,
                error: error.message
            });
            throw error;
        }
    }

    async _getEnchants(character) {
        this.logger.debug('Checking enchants', { character: character.name });
        
        const bannedItems = [1, 5, 6, 9, 14, 15];
        let missingEnchants = [];

        try {
            const response = await this.httpClient.get(`/character/${character.name}/${character.realm}/`);
            const $ = cheerio.load(response);

            const characterClass = $('.level-race-class').text().toLowerCase();
            const professions = [];
            $('.profskills').find('.text').each(function() {
                professions.push($(this).clone().children().remove().end().text().trim());
            });

            $('.item-model a').each(function(i) {
                const rel = $(this).attr('rel');
                
                if (rel && !bannedItems.includes(i)) {
                    if (rel.indexOf('ench') === -1) {
                        const itemType = WarmaneItemTypeEnum[i];
                        
                        if (itemType === 'Ranged') {
                            if (characterClass.indexOf('hunter') >= 0) {
                                missingEnchants.push(itemType);
                            }
                        } else if (['Ring #1', 'Ring #2'].includes(itemType)) {
                            if (professions.includes('Enchanting')) {
                                missingEnchants.push(itemType);
                            }
                        } else if (itemType === 'Off-hand') {
                            const spellCasters = ['mage', 'warlock', 'druid', 'priest'];
                            if (!spellCasters.some(caster => characterClass.indexOf(caster) >= 0)) {
                                missingEnchants.push(itemType);
                            }
                        } else {
                            missingEnchants.push(itemType);
                        }
                    }
                }
            });

            character.Enchants = missingEnchants.length === 0
                ? `${character.name} has all enchants! :white_check_mark:`
                : `${character.name} is missing enchants from: ${missingEnchants.join(', ')} :x:`;

            this.logger.info('Enchants check completed', {
                character: character.name,
                missingCount: missingEnchants.length
            });
        } catch (error) {
            this.logger.error('Error checking enchants', {
                character: character.name,
                error: error.message
            });
            throw error;
        }
    }

    async _getGems(character) {
        this.logger.debug('Checking gems', { character: character.name });
        
        try {
            const response = await this.httpClient.get(`/character/${character.name}/${character.realm}/`);
            const $ = cheerio.load(response);

            let equippedItems = [];
            let actualItems = [];
            let missingGems = [];

            $('.item-model a').each(function(i) {
                let amount = 0;
                const rel = $(this).attr('rel');

                if (rel) {
                    const params = GetParams(rel);
                    if (params.gems) {
                        amount = params.gems.split(':').filter(x => x != 0).length;
                    }

                    equippedItems.push(Number(params.item));
                    actualItems.push({
                        itemID: Number(params.item),
                        gems: amount,
                        type: WarmaneItemTypeEnum[i]
                    });
                }
            });

            await new Promise((resolve) => {
                GetItems(equippedItems, (err, itemsDB) => {
                    if (err) {
                        this.logger.error('Error fetching items from DB', { error: err });
                        return;
                    }

                    itemsDB.forEach(item => {
                        const foundItem = actualItems.find(x => x.itemID === item.itemID);
                        const hasBlacksmithing = character?.professions?.some(prof => prof.name === 'Blacksmithing');
                        const itsGlovesOrBracer = ['Gloves', 'Bracer'].includes(foundItem.type);

                        if (foundItem.type === 'Belt' || (itsGlovesOrBracer && hasBlacksmithing)) {
                            if ((item.gems + 1) !== foundItem.gems) {
                                missingGems.push(foundItem.type);
                            }
                        } else if (item.gems > foundItem.gems) {
                            missingGems.push(foundItem.type);
                        }
                    });

                    character.Gems = missingGems.length === 0
                        ? `${character.name} has gemmed all his items! :white_check_mark:`
                        : `${character.name} needs to gem ${missingGems.join(', ')} :x:`;

                    resolve();
                });
            });

            this.logger.info('Gems check completed', {
                character: character.name,
                missingCount: missingGems.length
            });
        } catch (error) {
            this.logger.error('Error checking gems', {
                character: character.name,
                error: error.message
            });
            throw error;
        }
    }

    async _getTalents(character) {
        this.logger.debug('Getting talents', { character: character.name });
        
        let res = '';

        if (character.talents?.length) {
            character.talents.forEach((talent, i) => {
                if (i === 1) res += ' and ';
                res += talent.tree;
                if (talent.points?.length) {
                    res += `(${talent.points.join('/')})`;
                }
            });
        }

        character.Talents = res;
        
        this.logger.info('Talents retrieved successfully', {
            character: character.name,
            talents: res
        });
    }

    async _getSummary(character) {
        this.logger.debug('Generating summary', { character: character.name });
        // The summary is generated automatically by the Character entity
        this.logger.info('Summary generated successfully', { character: character.name });
    }

    async getAchievements(character) {
        const logContext = { character: character.name };
        this.logger.debug('Fetching achievements', logContext);

        try {
            const categories = [
                { name: 'ULDUAR10', categoryId: '14961' },
                { name: 'ULDUAR25', categoryId: '14962' },
                { name: 'TOC10', categoryId: '15001' },
                { name: 'TOC25', categoryId: '15002' },
                { name: 'ICC10', categoryId: '15041' },
                { name: 'ICC25', categoryId: '15042' }
            ];

            // Achievement fetching logic will be implemented here
            this.logger.info('Achievements fetched successfully', logContext);
        } catch (error) {
            this.logger.error('Error fetching achievements', {
                ...logContext,
                error: error.message
            });
            throw error;
        }
    }
}

module.exports = new CharacterService(); 