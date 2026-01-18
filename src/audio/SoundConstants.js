/**
 * Sound Constants - Extracted from X.smali
 *
 * Contains all sound IDs and their file mappings
 */

// Sound effect IDs (matching original game)
export const SOUNDS = {
    // Building sounds
    BUILDING_COMPLETED: 0x00,
    BUILDING_STARTS: 0x01,
    BUILDING_UPGRADED: 0x02,

    // UI sounds
    CLICK_APPROVE: 0x03,
    CLICK_DENY: 0x04,
    CLICK_MENU_AND_GAME_BUTTON: 0x05,

    // Misc sounds
    DESTROY_ENEMY_BUILDING: 0x06,
    FLAG: 0x07,
    GOLD: 0x08,

    // Mage unit sounds
    MAGE_UNIT_DEATH: 0x09,
    MAGE_UNIT_HIT_BUILDING: 0x0a,
    MAGE_UNIT_HIT_ENEMY: 0x0b,
    MAGE_UNIT_READY: 0x0c,
    MAGE_UNIT_SHOT: 0x0d,

    // Physical unit sounds
    PHYSIC_UNIT_DEATH: 0x0e,
    PHYSIC_UNIT_HIT_ENEMY: 0x0f,
    PHYSIC_UNIT_READY: 0x10,
    PHYSIC_UNIT_SHOT: 0x11,

    // Ranged unit sounds
    RANGE_UNIT_SHOT: 0x12,

    // Selection sounds
    SELECT_BUILDING: 0x13,
    SELECT_MISSION: 0x14,

    // Messages
    TOOLTIP_OR_MESSAGE: 0x15,
    UNIT_LEVELUP: 0x16,
    UPGRADE_COMPLETE: 0x17,
    YOUR_BUILDING_DENIED: 0x18,

    // Monster death sounds
    GOBLIN_ANY_DEATH: 0x19,
    GOBLIN_HUNTER_SHOT: 0x1a,
    GOBLIN_PRIEST_SHOT: 0x1b,
    HARPY_DEATH: 0x1c,
    MINOTAUR_DEATH: 0x1d,
    POISON: 0x1e,
    RAT_DEATH: 0x1f,
    SKELETON_DEATH: 0x20,
    SPIDER_DEATH: 0x21,
    DUBOLOM_DEATH: 0x22,  // Trees death
    TROLL_DEATH: 0x23,
    VAMPIRE_DEATH: 0x24,
    VAMPIRE_MIRROR: 0x25,
    VAMPIRE_NECRO_SHOT: 0x26,
    ZOMBIE_DEATH: 0x27,

    // Enemy sounds
    ENEMY_SHOT: 0x28,
    PHYSIC_UNIT_HIT_BUILDING: 0x29,

    // Magic sounds
    FIREBALL: 0x2a,
    FIRE_BLAST: 0x2b,
    LIGHTNING: 0x2c,
    LIGHTNING_STORM: 0x2d,
    METEOR_STORM: 0x2e,
    WITHER: 0x2f,

    // Spells (buff/debuff)
    ANTI_MAGIC: 0x30,
    AURA_OF_PEACE: 0x31,
    BLESSING: 0x32,
    CAMOUFLAGE: 0x33,
    CONTROL_UNDEAD: 0x34,
    FARSEEING: 0x35,
    FIRE_SHIELD: 0x36,
    HEAL: 0x37,
    INVISIBILITY: 0x38,
    MAGIC_RESIST: 0x39,
    MEDITATION: 0x3a,
    RAISE_SKELETON: 0x3b,
    REANIMATE: 0x3c,
    RESURRECTION: 0x3d,
    SHIELD_OF_LIGHT: 0x3e,
    SUPERCHARGE: 0x3f,
    TELEPORT: 0x40,

    // Other sounds
    OPEN_CHEST: 0x41,
    OPEN_SARCOPHAGE: 0x42,
    UNIT_POTION_DRINK: 0x43,
    GUARD_TOWER_SHOT: 0x44
};

// Music IDs
export const MUSIC = {
    MAIN_THEME: 0x45,
    INGAME_1: 0x46,
    INGAME_2: 0x47,
    INGAME_3: 0x48,
    INGAME_4: 0x49,
    INGAME_5: 0x4a,
    INGAME_6: 0x4b,
    MAP: 0x4c
};

// ID to filename mapping
export const SOUND_FILES = {
    [SOUNDS.BUILDING_COMPLETED]: 'building_completed.ogg',
    [SOUNDS.BUILDING_STARTS]: 'building_starts.ogg',
    [SOUNDS.BUILDING_UPGRADED]: 'building_upgraded.ogg',
    [SOUNDS.CLICK_APPROVE]: 'click_approve.ogg',
    [SOUNDS.CLICK_DENY]: 'click_deny.ogg',
    [SOUNDS.CLICK_MENU_AND_GAME_BUTTON]: 'click_menu_and_game_button.ogg',
    [SOUNDS.DESTROY_ENEMY_BUILDING]: 'destroy_enemy_building.ogg',
    [SOUNDS.FLAG]: 'flag.ogg',
    [SOUNDS.GOLD]: 'gold.ogg',
    [SOUNDS.MAGE_UNIT_DEATH]: 'mage_unit_death.ogg',
    [SOUNDS.MAGE_UNIT_HIT_BUILDING]: 'mage_unit_hit_building.ogg',
    [SOUNDS.MAGE_UNIT_HIT_ENEMY]: 'mage_unit_hit_enemy.ogg',
    [SOUNDS.MAGE_UNIT_READY]: 'mage_unit_ready.ogg',
    [SOUNDS.MAGE_UNIT_SHOT]: 'mage_unit_shot.ogg',
    [SOUNDS.PHYSIC_UNIT_DEATH]: 'physic_unit_death.ogg',
    [SOUNDS.PHYSIC_UNIT_HIT_ENEMY]: 'physic_unit_hit_enemy.ogg',
    [SOUNDS.PHYSIC_UNIT_READY]: 'physic_unit_ready.ogg',
    [SOUNDS.PHYSIC_UNIT_SHOT]: 'physic_unit_shot.ogg',
    [SOUNDS.RANGE_UNIT_SHOT]: 'range_unit_shot.ogg',
    [SOUNDS.SELECT_BUILDING]: 'select_building.ogg',
    [SOUNDS.SELECT_MISSION]: 'select_mission.ogg',
    [SOUNDS.TOOLTIP_OR_MESSAGE]: 'tooltip_or_message.ogg',
    [SOUNDS.UNIT_LEVELUP]: 'unit_levelup.ogg',
    [SOUNDS.UPGRADE_COMPLETE]: 'upgrade_complete.ogg',
    [SOUNDS.YOUR_BUILDING_DENIED]: 'your_building_destroyed_denied.ogg',
    [SOUNDS.GOBLIN_ANY_DEATH]: 'goblin_any_death.ogg',
    [SOUNDS.GOBLIN_HUNTER_SHOT]: 'goblin_hunter_shot.ogg',
    [SOUNDS.GOBLIN_PRIEST_SHOT]: 'goblin_priest_shot.ogg',
    [SOUNDS.HARPY_DEATH]: 'harpy_death.ogg',
    [SOUNDS.MINOTAUR_DEATH]: 'minotaur_death.ogg',
    [SOUNDS.POISON]: 'poison.ogg',
    [SOUNDS.RAT_DEATH]: 'rat_death.ogg',
    [SOUNDS.SKELETON_DEATH]: 'skeleton_death.ogg',
    [SOUNDS.SPIDER_DEATH]: 'spider_death.ogg',
    [SOUNDS.DUBOLOM_DEATH]: 'trees_death.ogg',
    [SOUNDS.TROLL_DEATH]: 'troll_death.ogg',
    [SOUNDS.VAMPIRE_DEATH]: 'vampire_death.ogg',
    [SOUNDS.VAMPIRE_MIRROR]: 'vampire_mirror.ogg',
    [SOUNDS.VAMPIRE_NECRO_SHOT]: 'vampire_necro_shot.ogg',
    [SOUNDS.ZOMBIE_DEATH]: 'zombie_death.ogg',
    [SOUNDS.ENEMY_SHOT]: 'enemy_shot.ogg',
    [SOUNDS.PHYSIC_UNIT_HIT_BUILDING]: 'physic_unit_hit_building.ogg',
    [SOUNDS.FIREBALL]: 'fireball.ogg',
    [SOUNDS.FIRE_BLAST]: 'fire_blast.ogg',
    [SOUNDS.LIGHTNING]: 'lightning.ogg',
    [SOUNDS.LIGHTNING_STORM]: 'lightning_storm.ogg',
    [SOUNDS.METEOR_STORM]: 'meteor_storm.ogg',
    [SOUNDS.WITHER]: 'wither.ogg',
    [SOUNDS.ANTI_MAGIC]: 'anti_magic.ogg',
    [SOUNDS.AURA_OF_PEACE]: 'aura_of_peace.ogg',
    [SOUNDS.BLESSING]: 'blessing.ogg',
    [SOUNDS.CAMOUFLAGE]: 'camouflage.ogg',
    [SOUNDS.CONTROL_UNDEAD]: 'control_undead.ogg',
    [SOUNDS.FARSEEING]: 'farseeing.ogg',
    [SOUNDS.FIRE_SHIELD]: 'fire_shield.ogg',
    [SOUNDS.HEAL]: 'heal.ogg',
    [SOUNDS.INVISIBILITY]: 'invisibility.ogg',
    [SOUNDS.MAGIC_RESIST]: 'magic_resist.ogg',
    [SOUNDS.MEDITATION]: 'meditation.ogg',
    [SOUNDS.RAISE_SKELETON]: 'raise_skeleton.ogg',
    [SOUNDS.REANIMATE]: 'reanimate.ogg',
    [SOUNDS.RESURRECTION]: 'resurrection.ogg',
    [SOUNDS.SHIELD_OF_LIGHT]: 'shield_of_light.ogg',
    [SOUNDS.SUPERCHARGE]: 'supercharge.ogg',
    [SOUNDS.TELEPORT]: 'teleport.ogg',
    [SOUNDS.OPEN_CHEST]: 'open_chest.ogg',
    [SOUNDS.OPEN_SARCOPHAGE]: 'open_sarcophage.ogg',
    [SOUNDS.UNIT_POTION_DRINK]: 'unit_potion_drink.ogg',
    [SOUNDS.GUARD_TOWER_SHOT]: 'guard_tower_shot.ogg'
};

// Music ID to filename mapping
export const MUSIC_FILES = {
    [MUSIC.MAIN_THEME]: 'maintheme.ogg',
    [MUSIC.INGAME_1]: 'ingame1.ogg',
    [MUSIC.INGAME_2]: 'ingame2.ogg',
    [MUSIC.INGAME_3]: 'ingame3.ogg',
    [MUSIC.INGAME_4]: 'ingame4.ogg',
    [MUSIC.INGAME_5]: 'ingame5.ogg',
    [MUSIC.INGAME_6]: 'ingame6.ogg',
    [MUSIC.MAP]: 'map.ogg'
};

/**
 * Get death sound ID for a unit type
 * @param {string} unitType - Type of unit ('rat', 'troll', 'skeleton', etc.)
 * @returns {number} Sound ID
 */
export function getDeathSoundForUnit(unitType) {
    const deathSounds = {
        'rat': SOUNDS.RAT_DEATH,
        'troll': SOUNDS.TROLL_DEATH,
        'skeleton': SOUNDS.SKELETON_DEATH,
        'spider': SOUNDS.SPIDER_DEATH,
        'harpy': SOUNDS.HARPY_DEATH,
        'minotaur': SOUNDS.MINOTAUR_DEATH,
        'vampire': SOUNDS.VAMPIRE_DEATH,
        'zombie': SOUNDS.ZOMBIE_DEATH,
        'goblin': SOUNDS.GOBLIN_ANY_DEATH,
        'tree': SOUNDS.DUBOLOM_DEATH,
        'mage': SOUNDS.MAGE_UNIT_DEATH,
        'physic': SOUNDS.PHYSIC_UNIT_DEATH,
        'warrior': SOUNDS.PHYSIC_UNIT_DEATH,
        'knight': SOUNDS.PHYSIC_UNIT_DEATH,
        'ranger': SOUNDS.PHYSIC_UNIT_DEATH
    };
    return deathSounds[unitType] || SOUNDS.PHYSIC_UNIT_DEATH;
}
