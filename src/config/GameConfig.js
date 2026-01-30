/**
 * GameConfig.js - Centralized game configuration
 *
 * Contains all stats, formulas, and constants from the original game.
 * Values reverse-engineered from smali/DynamicObject.smali and Const.smali
 */

// =============================================================================
// UNIT TYPE IDs (from Const.smali)
// =============================================================================
export const UNIT_TYPE = {
    WARRIOR: 0,
    RANGER: 1,
    PALADIN: 2,
    BARBARIAN: 3,
    DWARF_WARRIOR: 4,
    ELF: 5,
    DWARF: 6,
    WIZARD: 7,
    WIZARD_HEALER: 8,
    WIZARD_NECROMANCER: 9,
    // Monsters
    RAT: 0x50,          // 80
    SPIDER: 0x51,       // 81
    SKELETON: 0x52,     // 82
    ZOMBIE: 0x53,       // 83
    TAX_COLLECTOR: 0x54, // 84
    TROLL: 0x57,        // 87
    GOBLIN: 0x58,       // 88
    GOBLIN_ARCHER: 0x59, // 89
    GOBLIN_CHAMPION: 0x5A, // 90
    GOBLIN_SHAMAN: 0x5B,   // 91
    MINOTAUR: 0x5C,     // 92
    VAMPIRE: 0x5D,      // 93
    GARPY: 0x5E,        // 94
    GOLEM: 0x5F,        // 95
    DRAGON: 0x61,       // 97
    BLACK_DRAGON: 0x62, // 98
    DUBOLOM: 0x63,      // 99
};

// =============================================================================
// ATTACK TYPE (from smali)
// =============================================================================
export const ATTACK_TYPE = {
    MELEE: 1,
    RANGED: 2,
    MAGIC: 3,
};

// =============================================================================
// OBJECT TYPE (from smali)
// =============================================================================
export const OBJECT_TYPE = {
    HERO: 1,      // Player heroes
    MONSTER: 2,   // Enemy monsters
    SUMMON: 5,    // Summoned creatures
};

// =============================================================================
// BASE STATS BY UNIT TYPE
// Extracted from DynamicObject.smali Init() method
// Format: { stat: [min, max] } for random range, or { stat: value } for fixed
// =============================================================================
export const UNIT_BASE_STATS = {
    // TYPE_WARRIOR (0) - Warrior Guild hero
    [UNIT_TYPE.WARRIOR]: {
        speed: 0x800,           // 2048
        levelUp: 0x5dc,         // 1500 XP per level
        maxLevel: 10,
        // Primary stats
        strength: [17, 21],     // rnd(17, 21) - 0x11 to 0x15
        intelligence: [7, 11],  // rnd(7, 11)
        artifice: [21, 25],     // rnd(21, 25) - 0x15 to 0x19
        vitality: [15, 24],     // rnd(15, 24) - 0x0f to 0x18
        willpower: 16,          // 0x10
        // Combat skills
        H2H: 70,                // 0x46 - melee skill
        ranged: 0,
        parry: 35,              // 0x23
        dodge: 20,              // 0x14
        resist: 25,             // 0x19
        // Combat stats
        attackRange: 1,         // Melee
        attackType: ATTACK_TYPE.MELEE,
        visionRange: 8,
        // HP
        life: 40,               // Starting HP
        // Gold and XP rewards
        deadExp: [300, 600],
        deadGold: [50, 100],
    },

    // TYPE_RANGER (1) - Ranger Guild hero
    [UNIT_TYPE.RANGER]: {
        speed: 0xc00,           // 3072 - faster
        levelUp: 0x4e2,         // 1250 XP per level
        maxLevel: 10,
        strength: [8, 12],
        intelligence: [22, 26], // High INT - 0x16 to 0x1a
        artifice: [3, 8],
        vitality: [6, 8],
        willpower: 18,          // 0x12
        H2H: 0,
        ranged: 70,             // 0x46 - ranged skill
        parry: 10,
        dodge: 25,
        resist: 30,             // 0x1e
        attackRange: 8,         // Ranged
        attackType: ATTACK_TYPE.RANGED,
        visionRange: 10,
        life: 27,               // 0x1b - lower HP
        deadExp: [300, 600],
        deadGold: [50, 100],
    },

    // TYPE_PALADIN (2) - Temple hero
    [UNIT_TYPE.PALADIN]: {
        speed: 0xc00,
        levelUp: 0x7d0,         // 2000 XP per level
        maxLevel: 10,
        strength: [15, 20],
        intelligence: [1, 3],
        artifice: [0, 3],
        vitality: [0, 5],
        willpower: 0,
        H2H: 45,                // 0x2d
        ranged: 0,
        parry: 25,              // 0x19
        dodge: 45,              // 0x2d
        resist: 60,             // 0x3c - high magic resist
        attackRange: 1,
        attackType: ATTACK_TYPE.MELEE,
        visionRange: 8,
        life: 35,               // 0x23
        deadExp: [1200, 4800],
        deadGold: 200,
    },

    // TYPE_WIZARD (7) - Wizard Guild hero
    [UNIT_TYPE.WIZARD]: {
        speed: 0x800,
        levelUp: 0x7d0,         // 2000 XP per level
        maxLevel: 10,
        strength: [1, 4],
        intelligence: [23, 27], // High INT - 0x17 to 0x1b
        artifice: [2, 6],
        vitality: [2, 6],
        willpower: 17,          // 0x11
        H2H: 0,
        ranged: 0,
        parry: 15,              // 0x0f
        dodge: 25,              // 0x19
        resist: 35,             // 0x23
        attackRange: 8,
        attackType: ATTACK_TYPE.MAGIC,
        visionRange: 8,
        life: 18,               // Low HP
        weapon: 22,             // 0x16
        deadExp: [400, 800],
        deadGold: [50, 100],
    },

    // TYPE_WIZARD_HEALER (8) - Healer wizard
    [UNIT_TYPE.WIZARD_HEALER]: {
        speed: 0xc00,
        levelUp: 0x384,         // 900 XP per level (easiest to level)
        maxLevel: 10,
        strength: [1, 3],
        intelligence: [15, 24], // 0x0f to 0x18
        artifice: [1, 5],
        vitality: [5, 9],
        willpower: 0,
        H2H: 0,
        ranged: 0,
        parry: 25,
        dodge: 15,
        resist: 10,
        attackRange: 8,
        attackType: ATTACK_TYPE.MAGIC,
        visionRange: 8,
        life: 18,               // 0x12
        deadExp: [800, 1200],
        deadGold: 200,
    },

    // TYPE_WIZARD_NECROMANCER (9) - Dark wizard
    [UNIT_TYPE.WIZARD_NECROMANCER]: {
        speed: 0x800,
        levelUp: 0x4b0,         // 1200 XP per level
        maxLevel: 10,
        strength: [1, 4],
        intelligence: [22, 26], // 0x16 to 0x1a
        artifice: [3, 8],
        vitality: [6, 8],
        willpower: 18,          // 0x12
        H2H: 0,
        ranged: 0,
        parry: 10,
        dodge: 15,
        resist: 35,             // 0x23
        attackRange: 8,
        attackType: ATTACK_TYPE.MAGIC,
        visionRange: 8,
        life: 10,
        weapon: 21,             // 0x15
        deadExp: [400, 800],
        deadGold: [50, 100],
    },

    // TYPE_DWARF (6) - Dwarf Settlement hero
    [UNIT_TYPE.DWARF]: {
        speed: 0x800,
        levelUp: 0x5dc,         // 1500 XP per level
        maxLevel: 10,
        strength: [17, 21],
        intelligence: [7, 11],
        artifice: [21, 25],
        vitality: [15, 24],
        willpower: 16,
        H2H: 70,
        ranged: 0,
        parry: 35,
        dodge: 20,
        resist: 25,
        attackRange: 1,
        attackType: ATTACK_TYPE.MELEE,
        visionRange: 8,
        life: 40,
        deadExp: [300, 600],
        deadGold: [50, 100],
    },

    // TYPE_ELF (5) - Elf Bungalow hero
    [UNIT_TYPE.ELF]: {
        speed: 0x1000,          // 4096 - fastest hero
        levelUp: 0x640,         // 1600 XP per level
        maxLevel: 10,
        strength: [8, 12],
        intelligence: 22,       // 0x16
        artifice: 27,           // 0x1b
        vitality: [8, 12],
        willpower: 15,
        H2H: 0,
        ranged: 70,             // 0x46
        parry: 10,
        dodge: 15,
        resist: 30,             // 0x1e
        attackRange: 8,
        attackType: ATTACK_TYPE.RANGED,
        visionRange: 10,
        life: 27,               // 0x1b
        deadExp: [1500, 2500],  // 0x5dc to 0x9c4
        deadGold: [200, 500],   // 0xc8 to 0x1f4
    },

    // TYPE_BARBARIAN (3) - Krolm Temple hero
    [UNIT_TYPE.BARBARIAN]: {
        speed: 0x800,
        levelUp: 0x4b0,         // 1200 XP per level
        maxLevel: 10,
        strength: [20, 25],     // High strength
        intelligence: [3, 7],
        artifice: [5, 10],
        vitality: [18, 25],     // High vitality
        willpower: 10,
        H2H: 80,                // High melee
        ranged: 0,
        parry: 40,
        dodge: 15,
        resist: 20,
        attackRange: 1,
        attackType: ATTACK_TYPE.MELEE,
        visionRange: 8,
        life: 50,
        deadExp: [400, 800],
        deadGold: [75, 150],
    },

    // ==========================================================================
    // MONSTERS
    // ==========================================================================

    // TYPE_RAT (0x50) - Giant Rat
    [UNIT_TYPE.RAT]: {
        speed: 0xc00,
        levelUp: 0,             // Monsters don't level up
        maxLevel: 1,
        strength: 5,
        intelligence: 1,
        artifice: 0,
        vitality: 3,
        willpower: 0,
        H2H: 20,
        ranged: 0,
        parry: 5,
        dodge: 30,
        resist: 10,
        attackRange: 1,
        attackType: ATTACK_TYPE.MELEE,
        visionRange: 6,
        life: 12,
        minDamage: 2,
        maxDamage: 5,
        deadExp: [50, 100],
        deadGold: [5, 15],
    },

    // TYPE_TROLL (0x57) - Troll
    [UNIT_TYPE.TROLL]: {
        speed: 0x800,
        levelUp: 0,
        maxLevel: 1,
        strength: 25,
        intelligence: 3,
        artifice: 0,
        vitality: 20,
        willpower: 5,
        H2H: 50,
        ranged: 0,
        parry: 30,
        dodge: 10,
        resist: 20,
        attackRange: 1,
        attackType: ATTACK_TYPE.MELEE,
        visionRange: 8,
        life: 80,
        minDamage: 10,
        maxDamage: 20,
        deadExp: [200, 400],
        deadGold: [30, 75],
    },

    // TYPE_GOBLIN (0x58) - Goblin
    [UNIT_TYPE.GOBLIN]: {
        speed: 0xc00,
        levelUp: 0,
        maxLevel: 1,
        strength: 10,
        intelligence: 5,
        artifice: 5,
        vitality: 8,
        willpower: 3,
        H2H: 35,
        ranged: 0,
        parry: 20,
        dodge: 35,
        resist: 15,
        attackRange: 1,
        attackType: ATTACK_TYPE.MELEE,
        visionRange: 7,
        life: 25,
        minDamage: 5,
        maxDamage: 12,
        deadExp: [100, 200],
        deadGold: [15, 40],
    },

    // TYPE_GOBLIN_ARCHER (0x59)
    [UNIT_TYPE.GOBLIN_ARCHER]: {
        speed: 0xc00,
        levelUp: 0,
        maxLevel: 1,
        strength: 8,
        intelligence: 8,
        artifice: 10,
        vitality: 6,
        willpower: 5,
        H2H: 15,
        ranged: 40,
        parry: 10,
        dodge: 40,
        resist: 20,
        attackRange: 6,
        attackType: ATTACK_TYPE.RANGED,
        visionRange: 8,
        life: 20,
        minDamage: 4,
        maxDamage: 10,
        deadExp: [100, 200],
        deadGold: [15, 40],
    },

    // TYPE_SKELETON (0x52) - Skeleton
    [UNIT_TYPE.SKELETON]: {
        speed: 0x800,
        levelUp: 0,
        maxLevel: 1,
        strength: 12,
        intelligence: 2,
        artifice: 0,
        vitality: 10,
        willpower: 0,
        H2H: 40,
        ranged: 0,
        parry: 25,
        dodge: 15,
        resist: 50,             // High magic resist (undead)
        attackRange: 1,
        attackType: ATTACK_TYPE.MELEE,
        visionRange: 6,
        life: 30,
        minDamage: 6,
        maxDamage: 14,
        deadExp: [75, 150],
        deadGold: [10, 30],
    },

    // TYPE_ZOMBIE (0x53) - Zombie
    [UNIT_TYPE.ZOMBIE]: {
        speed: 0x400,           // Slow
        levelUp: 0,
        maxLevel: 1,
        strength: 15,
        intelligence: 1,
        artifice: 0,
        vitality: 15,
        willpower: 0,
        H2H: 35,
        ranged: 0,
        parry: 15,
        dodge: 5,               // Very slow to dodge
        resist: 60,             // High magic resist
        attackRange: 1,
        attackType: ATTACK_TYPE.MELEE,
        visionRange: 5,
        life: 45,
        minDamage: 8,
        maxDamage: 16,
        deadExp: [100, 200],
        deadGold: [15, 35],
    },

    // TYPE_VAMPIRE (0x5D) - Vampire
    [UNIT_TYPE.VAMPIRE]: {
        speed: 0x800,
        levelUp: 0,
        maxLevel: 1,
        strength: 20,
        intelligence: 15,
        artifice: 10,
        vitality: 18,
        willpower: 15,
        H2H: 55,
        ranged: 0,
        parry: 35,
        dodge: 40,
        resist: 45,
        attackRange: 1,
        attackType: ATTACK_TYPE.MELEE,
        visionRange: 10,
        life: 70,
        minDamage: 12,
        maxDamage: 25,
        deadExp: [300, 600],
        deadGold: [75, 150],
    },

    // TYPE_MINOTAUR (0x5C) - Minotaur
    [UNIT_TYPE.MINOTAUR]: {
        speed: 0x800,
        levelUp: 0,
        maxLevel: 1,
        strength: 30,
        intelligence: 5,
        artifice: 0,
        vitality: 25,
        willpower: 10,
        H2H: 60,
        ranged: 0,
        parry: 35,
        dodge: 15,
        resist: 25,
        attackRange: 1,
        attackType: ATTACK_TYPE.MELEE,
        visionRange: 8,
        life: 100,
        minDamage: 15,
        maxDamage: 30,
        deadExp: [400, 800],
        deadGold: [100, 200],
    },

    // TYPE_DRAGON (0x61) - Dragon
    [UNIT_TYPE.DRAGON]: {
        speed: 0x800,
        levelUp: 0,
        maxLevel: 1,
        strength: 35,
        intelligence: 20,
        artifice: 15,
        vitality: 30,
        willpower: 25,
        H2H: 70,
        ranged: 60,             // Can use fire breath
        parry: 40,
        dodge: 30,
        resist: 60,
        attackRange: 5,
        attackType: ATTACK_TYPE.RANGED,
        visionRange: 12,
        life: 150,
        minDamage: 20,
        maxDamage: 45,
        deadExp: [7000, 12000], // 0x1b58 to 0x2ee0
        deadGold: [200, 500],
    },
};

// =============================================================================
// LEVEL UP FORMULAS
// =============================================================================
export const LEVEL_UP = {
    // Stat cap for all stats
    STAT_CAP: 95,               // 0x5f - maximum stat value

    /**
     * Get HP increase on level up based on vitality
     * Formula from smali: rnd(1, vitality/2) + vitality/2
     */
    getHpIncrease(vitality) {
        const halfVit = Math.floor(vitality / 2) || 1;
        return Math.floor(Math.random() * halfVit) + 1 + halfVit;
    },

    /**
     * Get which primary stat increases on level up for a unit type
     * Warriors/Rangers increase STR on odd levels
     * Paladins/Wizards increase INT
     * Barbarians/Dwarves increase VIT
     */
    getPrimaryStatIncrease(unitType, level) {
        // Only increase every other level (odd levels)
        if (level % 2 === 0) return null;

        switch (unitType) {
            case UNIT_TYPE.WARRIOR:
            case UNIT_TYPE.RANGER:
            case UNIT_TYPE.DWARF:
                return 'strength';
            case UNIT_TYPE.PALADIN:
            case UNIT_TYPE.WIZARD:
            case UNIT_TYPE.WIZARD_HEALER:
            case UNIT_TYPE.WIZARD_NECROMANCER:
                return 'intelligence';
            case UNIT_TYPE.BARBARIAN:
            case UNIT_TYPE.DWARF_WARRIOR:
                return 'vitality';
            case UNIT_TYPE.ELF:
                return 'artifice';  // Elves always increase artifice
            default:
                return null;
        }
    },
};

// =============================================================================
// COMBAT FORMULAS
// =============================================================================
export const COMBAT = {
    // Hit chance base values
    HIT_ROLL_MAX: 200,          // rnd(200) for hit check
    BASE_DEFENSE: 100,          // Added to parry/dodge for defense

    /**
     * Check if melee attack hits
     * Formula: rnd(200) + attacker.H2H >= defender.parry + 100 + bonus
     */
    meleeHitCheck(attackerH2H, defenderParry, defenderBonus = 0) {
        const roll = Math.floor(Math.random() * this.HIT_ROLL_MAX);
        return (roll + attackerH2H) >= (defenderParry + this.BASE_DEFENSE + defenderBonus);
    },

    /**
     * Check if ranged attack hits
     * Formula: rnd(200) + attacker.ranged >= defender.dodge + 100 + bonus
     */
    rangedHitCheck(attackerRanged, defenderDodge, defenderBonus = 0) {
        const roll = Math.floor(Math.random() * this.HIT_ROLL_MAX);
        return (roll + attackerRanged) >= (defenderDodge + this.BASE_DEFENSE + defenderBonus);
    },

    /**
     * Calculate damage with armor reduction
     * Armor reduces damage by a percentage
     */
    calculateDamage(minDamage, maxDamage, defenderArmor) {
        const baseDamage = minDamage + Math.floor(Math.random() * (maxDamage - minDamage + 1));
        // Armor reduces damage (each point = ~1% reduction, capped at 75%)
        const reduction = Math.min(0.75, defenderArmor / 100);
        return Math.max(1, Math.floor(baseDamage * (1 - reduction)));
    },

    /**
     * Paladin defender bonus against certain unit types
     * Paladins are especially effective defenders
     */
    PALADIN_DEFENSE_BONUS: 25,  // 0x19
    PALADIN_ATTACK_BONUS: 5,
};

// =============================================================================
// EXPERIENCE FORMULAS
// =============================================================================
export const EXPERIENCE = {
    /**
     * Add experience with diminishing returns at higher levels
     * Formula from smali: exp += addedXp / currentLevel
     */
    getAdjustedXp(baseXp, level) {
        return Math.floor(baseXp / level);
    },

    /**
     * Get XP reward for killing a target
     * Uses target's deadExp range
     */
    getKillXp(targetStats) {
        const deadExp = targetStats.deadExp;
        if (Array.isArray(deadExp)) {
            return deadExp[0] + Math.floor(Math.random() * (deadExp[1] - deadExp[0] + 1));
        }
        return deadExp || 50;
    },
};

// =============================================================================
// GOLD FORMULAS
// =============================================================================
export const GOLD = {
    /**
     * Get gold reward for killing a target
     */
    getKillGold(targetStats) {
        const deadGold = targetStats.deadGold;
        if (Array.isArray(deadGold)) {
            return deadGold[0] + Math.floor(Math.random() * (deadGold[1] - deadGold[0] + 1));
        }
        return deadGold || 10;
    },

    // Hero tax collection
    TAX_COLLECTION_INTERVAL: 500,  // Ticks between tax collection attempts
    MIN_GOLD_TO_COLLECT: 20,       // Minimum gold before hero returns to castle
};

// =============================================================================
// EQUIPMENT & ITEMS
// =============================================================================
export const EQUIPMENT = {
    // Armor types and their defense values
    ARMOR: {
        NONE: { id: 0, name: 'None', defense: 0 },
        PLATE: { id: 1, name: 'Plate Armor', defense: 10 },
        HEAVY_PLATE: { id: 2, name: 'Heavy Plate', defense: 15 },
        STEEL_PLATE: { id: 3, name: 'Steel Plate', defense: 20 },
        MITHRIL_PLATE: { id: 4, name: 'Mithril Plate', defense: 25 },
        SOFT_LEATHER: { id: 5, name: 'Soft Leather', defense: 5 },
        HARD_LEATHER: { id: 6, name: 'Hard Leather', defense: 8 },
        STUDDED_LEATHER: { id: 7, name: 'Studded Leather', defense: 12 },
        CHAOS_ARMOR: { id: 11, name: 'Chaos Armor', defense: 30 },
        ULTRA_CHAOS_ARMOR: { id: 12, name: 'Ultra Chaos', defense: 35 },
    },

    // Weapon upgrade prices (from Const.smali)
    WEAPON_UPGRADE_PRICES: [0, 100, 200, 300, 400, 500],
    ARMOR_UPGRADE_PRICES: [0, 150, 300, 450, 600, 750],

    // Enchantment bonuses
    WEAPON_ENCHANT_DAMAGE_BONUS: 3,  // +3 damage per enchant level
    ARMOR_ENCHANT_DEFENSE_BONUS: 5,   // +5 defense per enchant level
};

// =============================================================================
// ITEMS
// =============================================================================
export const ITEMS = {
    HEALING_POTION: {
        id: 'healing_potion',
        name: 'Healing Potion',
        price: 25,  // CURE_POTION_PRICE = 0x19
        healAmount: 30, // HEALING_POTION_VALUE = 0x1e
    },
    RING_OF_PROTECTION: {
        id: 'ring_protection',
        name: 'Ring of Protection',
        price: 750,  // COST_MARKETPALCE_RING_PROTECTION = 0x2ee
        bonus: 10,   // RING_PROTECTION_BONUS = 0xa
    },
    AMULET_OF_TELEPORTATION: {
        id: 'amulet_teleport',
        name: 'Amulet of Teleportation',
        price: 1000, // AMULET_OF_TELEPORTATION_PRICE = 0x3e8
    },
    POISONED_WEAPON: {
        id: 'poison_weapon',
        name: 'Poisoned Weapon',
        price: 200,  // POISONED_WEAPON_PRICE = 0xc8
    },
};

// =============================================================================
// SPEED CONVERSION
// =============================================================================
export const SPEED = {
    // Original game uses fixed-point speed values
    // Convert to pixels per tick for our game
    SCALE: 1 / 512,  // Divide original speed by 512 to get pixels/tick

    /**
     * Convert original speed value to pixels per tick
     */
    toPixelsPerTick(originalSpeed) {
        return originalSpeed * this.SCALE;
    },

    // Common speed values (in pixels per tick after conversion)
    SLOW: 0x400 / 512,      // ~2
    NORMAL: 0x800 / 512,    // ~4
    FAST: 0xc00 / 512,      // ~6
    VERY_FAST: 0x1000 / 512, // ~8
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get a random value from a range or return fixed value
 * @param {number|number[]} value - Either a number or [min, max] array
 */
export function rollStat(value) {
    if (Array.isArray(value)) {
        return value[0] + Math.floor(Math.random() * (value[1] - value[0] + 1));
    }
    return value;
}

/**
 * Get base stats for a unit type, rolling random values where applicable
 * @param {number} unitTypeId - Unit type ID from UNIT_TYPE
 * @returns {object} Object with all stats rolled
 */
export function getUnitStats(unitTypeId) {
    const baseStats = UNIT_BASE_STATS[unitTypeId];
    if (!baseStats) {
        console.warn(`Unknown unit type: ${unitTypeId}, using defaults`);
        return getDefaultStats();
    }

    return {
        speed: baseStats.speed || 0x800,
        levelUp: baseStats.levelUp || 1000,
        maxLevel: baseStats.maxLevel || 10,
        strength: rollStat(baseStats.strength || 10),
        intelligence: rollStat(baseStats.intelligence || 10),
        artifice: rollStat(baseStats.artifice || 10),
        vitality: rollStat(baseStats.vitality || 10),
        willpower: rollStat(baseStats.willpower || 10),
        H2H: rollStat(baseStats.H2H || 0),
        ranged: rollStat(baseStats.ranged || 0),
        parry: rollStat(baseStats.parry || 10),
        dodge: rollStat(baseStats.dodge || 10),
        resist: rollStat(baseStats.resist || 10),
        attackRange: baseStats.attackRange || 1,
        attackType: baseStats.attackType || ATTACK_TYPE.MELEE,
        visionRange: baseStats.visionRange || 8,
        life: rollStat(baseStats.life || 30),
        minDamage: baseStats.minDamage || 5,
        maxDamage: baseStats.maxDamage || 15,
        deadExp: rollStat(baseStats.deadExp || [50, 100]),
        deadGold: rollStat(baseStats.deadGold || [10, 30]),
    };
}

/**
 * Get default stats for unknown unit types
 */
function getDefaultStats() {
    return {
        speed: 0x800,
        levelUp: 1000,
        maxLevel: 10,
        strength: 10,
        intelligence: 10,
        artifice: 10,
        vitality: 10,
        willpower: 10,
        H2H: 30,
        ranged: 0,
        parry: 15,
        dodge: 15,
        resist: 15,
        attackRange: 1,
        attackType: ATTACK_TYPE.MELEE,
        visionRange: 8,
        life: 30,
        minDamage: 5,
        maxDamage: 15,
        deadExp: 100,
        deadGold: 20,
    };
}
