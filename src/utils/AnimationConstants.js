/**
 * Animation Constants - Extracted from Import.smali (with corrections)
 *
 * Animation IDs are packed as: (packageId << 10) | animId
 * Direction order for all units: SE, NE, E, N, SW, S, W, NW (offsets 0-7)
 * Note: Original smali docs said E, N, NE, NW, S, SE, SW, W but actual sprites are +45° rotated
 */

// Direction indices as used in animation files
// Note: The actual sprite directions are rotated +45° from Import.smali docs
export const ANIM_DIR = {
    SE: 0,  // Southeast (Import.smali said E)
    NE: 1,  // Northeast (Import.smali said N)
    E: 2,   // East (Import.smali said NE)
    N: 3,   // North (Import.smali said NW)
    SW: 4,  // Southwest (Import.smali said S)
    S: 5,   // South (Import.smali said SE)
    W: 6,   // West (Import.smali said SW)
    NW: 7   // Northwest (Import.smali said W)
};

// Map from game direction (0-7) to animation direction offset
// getDirection() returns: 0=N, 1=NE, 2=E, 3=SE, 4=S, 5=SW, 6=W, 7=NW
// Actual animation file order: SE=0, NE=1, E=2, N=3, SW=4, S=5, W=6, NW=7
export const GAME_DIR_TO_ANIM_DIR = [
    3,  // Game 0 (N) -> Anim 3 (N)
    1,  // Game 1 (NE) -> Anim 1 (NE)
    2,  // Game 2 (E) -> Anim 2 (E)
    0,  // Game 3 (SE) -> Anim 0 (SE)
    5,  // Game 4 (S) -> Anim 5 (S)
    4,  // Game 5 (SW) -> Anim 4 (SW)
    6,  // Game 6 (W) -> Anim 6 (W)
    7   // Game 7 (NW) -> Anim 7 (NW)
];

/**
 * Unit animation configurations
 * Each entry contains: { package, attack, death, walk, idle }
 * Values are base animation IDs (add direction offset 0-7)
 */
/**
 * Building animation configurations
 * Extracted from Import.smali - packed IDs decoded as: package = id >> 10, anim = id & 0x3FF
 */
export const BUILDING_ANIMS = {
    // Castle - CASTLE_1_ON = 0x412 -> package 1, anim 18
    CASTLE: {
        package: 1,
        idle: 18,       // CASTLE_1_ON
        off: 17,        // CASTLE_1_OFF
        destroyed: 16   // CASTLE_1_DESTROY
    },

    // Warrior Guild - WARRIOR_GUILD_ON = 0x2024 -> package 8, anim 36
    WARRIOR_GUILD: {
        package: 8,
        idle: 36,       // WARRIOR_GUILD_ON
        off: 35,        // WARRIOR_GUILD_OFF
        destroyed: 34,  // WARRIOR_GUILD_DESTROY
        build: 33       // WARRIOR_GUILD_BUILD
    },

    // Ranger Guild - RANGER_GUILD_ON = 0x1c23 -> package 7, anim 35
    RANGER_GUILD: {
        package: 7,
        idle: 35,       // RANGER_GUILD_ON
        off: 34,        // RANGER_GUILD_OFF
        destroyed: 33,  // RANGER_GUILD_DESTROY
        build: 32       // RANGER_GUILD_BUILD
    },

    // Wizard Guild - WIZARD_GUILD_1_ON = 0x2448 -> package 9, anim 72
    WIZARD_GUILD: {
        package: 9,
        idle: 72,       // WIZARD_GUILD_1_ON
        off: 71,        // WIZARD_GUILD_1_OFF
        destroyed: 70,  // WIZARD_GUILD_1_DESTROY
        build: 79       // WIZARD_GUILD_BUILD
    },

    // Marketplace - MARKETPLACE_1_ON = 0x441 -> package 1, anim 65
    MARKETPLACE: {
        package: 1,
        idle: 65,       // MARKETPLACE_1_ON
        off: 64,        // MARKETPLACE_1_OFF
        destroyed: 63,  // MARKETPLACE_1_DESTROY
        build: 72       // MARKETPLACE_BUILD
    },

    // Blacksmith - BLACKSMITH_1_ON = 0x402 -> package 1, anim 2
    BLACKSMITH: {
        package: 1,
        idle: 2,        // BLACKSMITH_1_ON
        off: 1,         // BLACKSMITH_1_OFF
        destroyed: 0,   // BLACKSMITH_1_DESTROY
        build: 9        // BLACKSMITH_BUILD
    },

    // Guard Tower - GUARDTOWER_ON = 0x434 -> package 1, anim 52
    GUARD_TOWER: {
        package: 1,
        idle: 52,       // GUARDTOWER_ON
        off: 51,        // GUARDTOWER_OFF
        destroyed: 50,  // GUARDTOWER_DESTROY
        build: 49       // GUARDTOWER_BUILD
    },

    // Agrela Temple - AGRELLA_TEMPLE_1_ON = 0x802 -> package 2, anim 2
    AGRELLA_TEMPLE: {
        package: 2,
        idle: 2,        // AGRELLA_TEMPLE_1_ON
        off: 1,         // AGRELLA_TEMPLE_1_OFF
        destroyed: 0,   // AGRELLA_TEMPLE_1_DESTROY
        build: 9        // AGRELLA_TEMPLE_BUILD
    },

    // Crypta Temple - CRYPTA_TEMPLE_1_ON = 0xc02 -> package 3, anim 2
    CRYPTA_TEMPLE: {
        package: 3,
        idle: 2,        // CRYPTA_TEMPLE_1_ON
        off: 1,         // CRYPTA_TEMPLE_1_OFF
        destroyed: 0,   // CRYPTA_TEMPLE_1_DESTROY
        build: 9        // CRYPTA_TEMPLE_BUILD
    },

    // Krolm Temple - KROLM_TEMPLE_ON = 0x182b -> package 6, anim 43
    KROLM_TEMPLE: {
        package: 6,
        idle: 43,       // KROLM_TEMPLE_ON
        off: 42,        // KROLM_TEMPLE_OFF
        destroyed: 41,  // KROLM_TEMPLE_DESTROY
        build: 40       // KROLM_TEMPLE_BUILD
    },

    // Elf Bungalow - ELF_BUNGALOW_ON = 0x142c -> package 5, anim 44
    ELF_BUNGALOW: {
        package: 5,
        idle: 44,       // ELF_BUNGALOW_ON
        off: 43,        // ELF_BUNGALOW_OFF
        destroyed: 42,  // ELF_BUNGALOW_DESTROY
        build: 41       // ELF_BUNGALOW_BUILD
    },

    // Dwarf Windmill - DWARF_WINDMILL_ON = 0x1010 -> package 4, anim 16
    DWARF_WINDMILL: {
        package: 4,
        idle: 16,       // DWARF_WINDMILL_ON
        off: 15,        // DWARF_WINDMILL_OFF
        destroyed: 14,  // DWARF_WINDMILL_DESTROY
        build: 13       // DWARF_WINDMILL_BUILD
    },

    // Dwarf Tower - DWARF_TOWER_ON = 0x100b -> package 4, anim 11
    DWARF_TOWER: {
        package: 4,
        idle: 11,       // DWARF_TOWER_ON
        off: 10,        // DWARF_TOWER_OFF
        destroyed: 9,   // DWARF_TOWER_DESTROY
        build: 8        // DWARF_TOWER_BUILD
    },

    // Gnome Hovel - GNOME_HOUEL_ON = 0x423 -> package 1, anim 35
    GNOME_HOVEL: {
        package: 1,
        idle: 35,       // GNOME_HOUEL_ON
        off: 34,        // GNOME_HOUEL_OFF
        destroyed: 33,  // GNOME_HOUEL_DESTROY
        build: 32       // GNOME_HOUEL_BUILD
    },

    // Library - LIBRARY_1_ON = 0x2403 -> package 9, anim 3
    LIBRARY: {
        package: 9,
        idle: 3,        // LIBRARY_1_ON
        off: 2,         // LIBRARY_1_OFF
        destroyed: 1,   // LIBRARY_1_DESTROY
        build: 0        // LIBRARY_1_BUILD
    },

    // Inn/House - HOUSE_ON = 0x439 -> package 1, anim 57
    INN: {
        package: 1,
        idle: 57,       // HOUSE_ON
        off: 56,        // HOUSE_OFF
        destroyed: 55,  // HOUSE_DESTROY
        build: 54       // HOUSE_BUILD
    }
};

export const UNIT_ANIMS = {
    // Package 7: Rangers (green units, ranged)
    RANGER: {
        package: 7,
        attack: 0,   // 0x1c00 = (7 << 10) | 0
        death: 8,    // 0x1c08 = (7 << 10) | 8
        walk: 16,    // 0x1c10 = (7 << 10) | 16
        idle: 24     // 0x1c18 = (7 << 10) | 24
    },

    // Package 8: Warriors/Knights (metal armor, melee)
    WARRIOR: {
        package: 8,
        attack: 1,   // 0x2001 = (8 << 10) | 1
        death: 9,    // 0x2009 = (8 << 10) | 9
        walk: 17,    // 0x2011 = (8 << 10) | 17
        idle: 25     // 0x2019 = (8 << 10) | 25
    },

    // Package 3: Dark Warriors (fire theme)
    DWARRIOR: {
        package: 3,
        attack: 13,  // 0xc0d = (3 << 10) | 13
        death: 21,   // 0xc15 = (3 << 10) | 21
        walk: 29,    // 0xc1d = (3 << 10) | 29
        idle: 37     // 0xc25 = (3 << 10) | 37
    },

    // Package 13: Giant Rats (enemy)
    GIANT_RAT: {
        package: 13,
        attack: 8,   // 0x3408 = (13 << 10) | 8
        death: 16,   // 0x3410 = (13 << 10) | 16
        walk: 24,    // 0x3418 = (13 << 10) | 24
        idle: 32     // 0x3420 = (13 << 10) | 32
    },

    // Package 14: Trolls (enemy)
    TROLL: {
        package: 14,
        attack: 1,   // 0x3801 = (14 << 10) | 1
        death: 9,    // 0x3809 = (14 << 10) | 9
        walk: 17,    // 0x3811 = (14 << 10) | 17
        idle: 25     // 0x3819 = (14 << 10) | 25
    },

    // Package 9: Wizards (MAG_RED - red mage, from Wizard Guild)
    WIZARD: {
        package: 9,
        attack: 33,  // 0x2421 = (9 << 10) | 33
        death: 41,   // 0x2429 = (9 << 10) | 41
        walk: 49,    // 0x2431 = (9 << 10) | 49
        idle: 57     // 0x2439 = (9 << 10) | 57
    }
};

/**
 * Get animation ID for a unit state and direction
 * @param {object} unitConfig - One of UNIT_ANIMS entries
 * @param {string} state - 'idle', 'walk', 'attack', 'death'
 * @param {number} gameDirection - Game direction 0-7
 * @returns {number} Animation ID within the package
 */
export function getAnimId(unitConfig, state, gameDirection) {
    const baseId = unitConfig[state];
    if (baseId === undefined) return 0;

    const animDirOffset = GAME_DIR_TO_ANIM_DIR[gameDirection] || 0;
    return baseId + animDirOffset;
}

/**
 * Get packed animation ID (includes package)
 * @param {object} unitConfig - One of UNIT_ANIMS entries
 * @param {string} state - 'idle', 'walk', 'attack', 'death'
 * @param {number} gameDirection - Game direction 0-7
 * @returns {number} Packed animation ID
 */
export function getPackedAnimId(unitConfig, state, gameDirection) {
    const animId = getAnimId(unitConfig, state, gameDirection);
    return (unitConfig.package << 10) | animId;
}
