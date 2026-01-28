/**
 * Game Constants - ported from Majesty Android smali
 */

// Game timing
export const TICK = 40;              // ms per game tick (25 FPS logic)
export const FPS = 1000 / TICK;      // 25 frames per second

// Grid system
export const CELL_SIZE = 8;          // Grid cell size in pixels

// Cell flags
export const FLD_EMPTY = 0x7e;       // Empty cell flag
export const FLD_BUSY = 0x7f;        // Occupied cell
export const FLD_LOCK = 0x80;        // Locked cell

// Combat
export const ATTACK_RANGE = 15;      // Cells for combat detection

// Directions (8-directional movement)
export const DIR = {
    NONE: -1,
    UP: 0,
    UP_RIGHT: 1,
    RIGHT: 2,
    DOWN_RIGHT: 3,
    DOWN: 4,
    DOWN_LEFT: 5,
    LEFT: 6,
    UP_LEFT: 7
};

// Direction deltas for isometric movement
export const DIR_DX = [0, 1, 1, 1, 0, -1, -1, -1];
export const DIR_DY = [-1, -1, 0, 1, 1, 1, 0, -1];

// Game states (from Game.smali)
export const GameState = {
    INIT: 1,
    LOAD_LEVEL: 2,
    LOAD_TRAINING_LEVEL: 3,
    LOAD_TEST_LEVEL: 4,
    LOAD_SKIRMISH: 5,
    MAIN_MENU: 11,
    LEVEL_MENU: 12,
    BRIEFING_LEVEL: 13,
    GAME: 20,
    GAME_PAUSE: 21,
    GAME_MENU: 22,
    BUILD_DIALOG: 23,
    ERROR: 100
};

// Entity states
export const EntityState = {
    IDLE: 0,
    MOVING: 1,
    ATTACKING: 2,
    DYING: 3,
    DEAD: 4
};

// Building types (from Const.smali TYPE_* constants)
export const BuildingType = {
    CASTLE: 0x20,           // 32
    WARRIOR_GUILD: 0x21,    // 33
    RANGER_GUILD: 0x22,     // 34
    WIZARD_GUILD: 0x23,     // 35
    AGRELLA_TEMPLE: 0x24,   // 36 - healer temple
    CRYPTA_TEMPLE: 0x25,    // 37 - necromancer temple
    KROLM_TEMPLE: 0x26,     // 38 - barbarian temple
    BLACKSMITH: 0x27,       // 39
    GUARD_TOWER: 0x28,      // 40
    MARKETPLACE: 0x29,      // 41
    STATUE: 0x2a,           // 42
    ELF_BUNGALOW: 0x2b,     // 43
    DWARF_WINDMILL: 0x2c,   // 44
    DWARF_TOWER: 0x2d,      // 45
    GNOME_HOVEL: 0x2e,      // 46
    STATUE2: 0x2f,          // 47
    INN: 0x30,              // 48
    LIBRARY: 0x31           // 49 - research
};

// Building type bit flags (for iXXXPresent flags in Location.smali)
export const BuildingFlag = {
    CASTLE: 0x1,
    WARRIOR_GUILD: 0x2,
    RANGER_GUILD: 0x4,
    WIZARD_GUILD: 0x8,
    BLACKSMITH: 0x80,
    MARKETPLACE: 0x100
};

// Screen dimensions (default, can be adjusted)
export const SCREEN_WIDTH = 1024;
export const SCREEN_HEIGHT = 768;
