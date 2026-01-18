/**
 * Animation Constants - Extracted from Import.smali
 *
 * Animation IDs are packed as: (packageId << 10) | animId
 * Direction order for all units: E, N, NE, NW, S, SE, SW, W (offsets 0-7)
 */

// Direction indices as used in Import.smali
export const ANIM_DIR = {
    E: 0,   // East
    N: 1,   // North
    NE: 2,  // Northeast
    NW: 3,  // Northwest
    S: 4,   // South
    SE: 5,  // Southeast
    SW: 6,  // Southwest
    W: 7    // West
};

// Map from game direction (0-7) to animation direction offset
// getDirection() returns: 0=N, 1=NE, 2=E, 3=SE, 4=S, 5=SW, 6=W, 7=NW
// Import.smali animation offsets: E=0, N=1, NE=2, NW=3, S=4, SE=5, SW=6, W=7
export const GAME_DIR_TO_ANIM_DIR = [
    1,  // Game 0 (N) -> Anim 1 (N)
    2,  // Game 1 (NE) -> Anim 2 (NE)
    0,  // Game 2 (E) -> Anim 0 (E)
    5,  // Game 3 (SE) -> Anim 5 (SE)
    4,  // Game 4 (S) -> Anim 4 (S)
    6,  // Game 5 (SW) -> Anim 6 (SW)
    7,  // Game 6 (W) -> Anim 7 (W)
    3   // Game 7 (NW) -> Anim 3 (NW)
];

/**
 * Unit animation configurations
 * Each entry contains: { package, attack, death, walk, idle }
 * Values are base animation IDs (add direction offset 0-7)
 */
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
