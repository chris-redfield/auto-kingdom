/**
 * DynamicEntity - Moving entity (ported from DynamicObject.smali)
 *
 * Extends Entity with:
 * - Movement and pathfinding
 * - Direction (8-directional)
 * - Speed and velocity
 * - Target following
 * - Sprite animations (optional)
 * - RPG stats (strength, vitality, etc.)
 * - Equipment and inventory
 */

import { Entity, EntityType } from './Entity.js';
import * as IsoMath from '../world/IsoMath.js';
import { EntityState, FLD_BUSY, FLD_EMPTY, BuildingType } from '../utils/Constants.js';
import { AnimatedSprite } from '../graphics/AnimationLoader.js';
import { UNIT_ANIMS, GAME_DIR_TO_ANIM_DIR, getAnimId } from '../utils/AnimationConstants.js';
import { SOUNDS, getDeathSoundForUnit } from '../audio/SoundConstants.js';
import { Inventory } from './Inventory.js';
import {
    DEBUG,
    UNIT_TYPE, ATTACK_TYPE, OBJECT_TYPE,
    UNIT_BASE_STATS, LEVEL_UP, COMBAT, EXPERIENCE, GOLD,
    EQUIPMENT, ITEMS, SPEED,
    COMBAT_CONSTANTS, AI_CONFIG, VISUAL, GAME_RULES, TIMERS,
    BLACKSMITH_CONFIG,
    MARKETPLACE_CONFIG,
    ENCHANT_CONFIG,
    getUnitStats, rollStat, getWeaponDamage, getWeaponID
} from '../config/GameConfig.js';

export class DynamicEntity extends Entity {
    /**
     * Create a new dynamic entity
     * @param {number} gridI - Initial grid column
     * @param {number} gridJ - Initial grid row
     */
    constructor(gridI = 0, gridJ = 0) {
        super(gridI, gridJ);

        this.type = EntityType.UNIT;

        // Movement
        this.speed = 2;           // Pixels per tick
        this.direction = 4;       // Current facing direction (0-7), default: down

        // Path following
        this.path = [];           // Array of {i, j} waypoints
        this.targetI = gridI;     // Current movement target
        this.targetJ = gridJ;
        this.moving = false;

        // Target world position (for smooth movement)
        this.targetWorldX = this.worldX;
        this.targetWorldY = this.worldY;

        // Combat
        this.attackTimer = 0;
        this.attackTarget = null;

        // Auto-play
        this.autoPlay = true;     // Whether AI controls this unit

        // =====================================================================
        // RPG STATS (from original game)
        // =====================================================================

        // Unit type ID (from UNIT_TYPE constants)
        this.unitTypeId = UNIT_TYPE.WARRIOR;
        this.objectType = OBJECT_TYPE.HERO;  // HERO, MONSTER, or SUMMON

        // Level and experience
        this.level = 1;
        this.maxLevel = 10;
        this.experience = 0;
        this.prevExp = 0;         // Track XP at last level up
        this.levelUpXp = 1000;    // XP needed per level

        // Primary stats
        this.strength = 10;       // Affects melee damage
        this.intelligence = 10;   // Affects magic damage and spells
        this.artifice = 10;       // Crafting/item skill
        this.vitality = 10;       // Affects HP on level up
        this.willpower = 10;      // Affects magic resistance

        // Combat skills
        this.H2H = 30;            // Hand-to-hand (melee hit chance)
        this.ranged = 0;          // Ranged attack skill
        this.parry = 15;          // Block melee attacks
        this.dodge = 15;          // Dodge ranged attacks
        this.resist = 15;         // Magic resistance

        // Damage
        this.minDamage = 5;
        this.maxDamage = 15;
        this.armor = 0;           // Reduces incoming damage

        // Combat parameters
        this.attackRange = 1;     // Tiles
        this.attackType = ATTACK_TYPE.MELEE;
        this.attackSpeed = TIMERS.DEFAULT_ATTACK_COOLDOWN;  // ms between attacks (1760ms default)
        this.sightRange = 8;      // Tiles for spotting enemies

        // Gold (for heroes)
        this.gold = 0;            // Personal gold
        this.taxGold = 0;         // Tax collected, to be returned to castle
        this.deadGold = 20;       // Gold given when killed (monsters)
        this.deadExp = 100;       // XP given when killed (monsters)
        this.expPerDmg = 0;       // XP per damage dealt to this unit
        this.leaveExp = 0;        // XP already distributed from this unit (for fair distribution)

        // Equipment levels (1-based)
        this.weaponLevel = 1;
        this.armorLevel = 1;
        this.enchantedWeaponLevel = 0;  // Enchantment bonus
        this.enchantedArmorLevel = 0;

        // Inventory (created in initFromUnitType for heroes)
        this.inventory = null;
        this.curePotionsCount = 0;
        this.hasRingOfProtection = false;
        this.hasAmuletOfTeleportation = false;
        this.amuletOfTeleportationTicks = 9999;

        // AI state for building visits
        this.targetBlacksmith = null;  // Persists until hero purchases or can't afford
        this.targetMarketplace = null; // Persists until hero purchases or can't afford
        this.targetWizardGuild = null; // Persists until hero enchants or can't afford

        // =====================================================================
        // END RPG STATS
        // =====================================================================

        // Visual customization
        this.bodyColor = 0x4488ff;
        this.headColor = 0xffcc88;

        // Grid reference (set when added to game)
        this.grid = null;

        // Game reference (for spawning missiles, etc.)
        this.game = null;

        // Combat type (derived from attackType)
        this.isRanged = false;       // If true, uses ranged attacks
        this.rangedRange = 5;        // Attack range for ranged units (in tiles)
        this.meleeRange = 1.5;       // Attack range for melee units

        // Team for combat targeting
        this.team = 'neutral';

        // Animation system (optional - uses placeholder graphics if not set)
        this.animLoader = null;      // Reference to shared AnimationLoader
        this.animPackage = -1;       // Animation package ID (-1 = use placeholder)
        this.animSprite = null;      // AnimatedSprite instance
        this.useAnimations = false;  // Whether to use sprite animations

        // Unit animation config (from UNIT_ANIMS constant)
        // Contains: { package, attack, death, walk, idle } - base anim IDs
        this.unitAnimConfig = null;
        this.currentAnimState = 'idle';
        this.currentAnimDir = 0;     // Track animation direction offset (0-7)

        // Unit type for sounds (e.g., 'warrior', 'rat', 'troll')
        this.unitType = 'warrior';
    }

    /**
     * Initialize stats from unit type ID
     * Call this after creating the entity to set up proper stats
     * @param {number} unitTypeId - From UNIT_TYPE constants
     * @param {number} [level=1] - Starting level
     */
    initFromUnitType(unitTypeId, level = 1) {
        this.unitTypeId = unitTypeId;

        // Get base stats for this unit type
        const stats = getUnitStats(unitTypeId);

        // Apply stats
        this.maxLevel = stats.maxLevel;
        this.levelUpXp = stats.levelUp;
        this.strength = stats.strength;
        this.intelligence = stats.intelligence;
        this.artifice = stats.artifice;
        this.vitality = stats.vitality;
        this.willpower = stats.willpower;
        this.H2H = stats.H2H;
        this.ranged = stats.ranged;
        this.parry = stats.parry;
        this.dodge = stats.dodge;
        this.resist = stats.resist;
        this.sightRange = stats.visionRange;
        this.attackType = stats.attackType;

        // Set combat mode based on attack type
        this.isRanged = stats.attackType === ATTACK_TYPE.RANGED ||
                        stats.attackType === ATTACK_TYPE.MAGIC;
        this.attackRange = stats.attackRange;
        if (this.isRanged) {
            this.rangedRange = stats.attackRange;
        }

        // HP
        this.health = stats.life;
        this.maxHealth = stats.life;

        // Weapon for heroes (damage comes from weapon, not minDamage/maxDamage)
        if (stats.weapon !== undefined) {
            this.weapon = stats.weapon;
        }

        // Armor from config
        if (stats.armor !== undefined) {
            this.armor = stats.armor;
        }

        // Damage for monsters (heroes use weapon-based damage instead)
        if (stats.minDamage !== undefined) {
            this.minDamage = stats.minDamage;
            this.maxDamage = stats.maxDamage;
        }

        // Speed (convert from original format)
        this.speed = SPEED.toPixelsPerTick(stats.speed);

        // XP and gold rewards when killed
        this.deadExp = stats.deadExp;
        this.deadGold = stats.deadGold;
        this.expPerDmg = Math.floor(this.deadExp / this.maxHealth);

        // Determine object type
        if (unitTypeId >= 0x50) {
            this.objectType = OBJECT_TYPE.MONSTER;
        } else {
            this.objectType = OBJECT_TYPE.HERO;
            // Create inventory for heroes (for equipment, potions, accessories)
            this.inventory = new Inventory(this);
        }

        // Apply level-ups if starting above level 1
        if (level > 1) {
            for (let i = 1; i < level; i++) {
                this.applyLevelUpStats();
            }
            this.level = level;
        }
    }

    /**
     * Calculate damage based on strength and weapon
     */
    calculateDamageFromStats() {
        // Base damage formula (simplified from original)
        const weaponBonus = (this.weaponLevel - 1) * COMBAT_CONSTANTS.WEAPON_DAMAGE_PER_LEVEL;
        const enchantBonus = this.enchantedWeaponLevel * COMBAT_CONSTANTS.WEAPON_ENCHANT_BONUS;

        if (this.attackType === ATTACK_TYPE.MELEE) {
            this.minDamage = Math.floor(this.strength / COMBAT_CONSTANTS.MELEE_MIN_DIVISOR) + weaponBonus + enchantBonus;
            this.maxDamage = Math.floor(this.strength / COMBAT_CONSTANTS.MELEE_MAX_DIVISOR) + weaponBonus + enchantBonus + COMBAT_CONSTANTS.MELEE_BASE_MAX;
        } else if (this.attackType === ATTACK_TYPE.RANGED) {
            this.minDamage = Math.floor(this.artifice / COMBAT_CONSTANTS.RANGED_MIN_DIVISOR) + weaponBonus + enchantBonus;
            this.maxDamage = Math.floor(this.artifice / COMBAT_CONSTANTS.RANGED_MAX_DIVISOR) + weaponBonus + enchantBonus + COMBAT_CONSTANTS.RANGED_BASE_MAX;
        } else {
            // Magic - uses same formula as melee but with intelligence
            this.minDamage = Math.floor(this.intelligence / COMBAT_CONSTANTS.MELEE_MIN_DIVISOR) + enchantBonus;
            this.maxDamage = Math.floor(this.intelligence / COMBAT_CONSTANTS.MELEE_MAX_DIVISOR) + enchantBonus + COMBAT_CONSTANTS.MELEE_BASE_MAX;
        }
    }

    /**
     * Get total armor including equipment (NOT enchantments — those are applied to damage directly)
     */
    getTotalArmor() {
        let total = this.armor;

        // Get values from inventory if available, otherwise use direct properties
        const armorLevel = this.inventory ? this.inventory.armorLevel : this.armorLevel;
        const hasRing = this.inventory ? this.inventory.hasRingOfProtection : this.hasRingOfProtection;

        // Armor from equipment level
        total += (armorLevel - 1) * COMBAT_CONSTANTS.ARMOR_DEFENSE_PER_LEVEL;

        // Ring of protection bonus
        if (hasRing) {
            total += ITEMS.RING_OF_PROTECTION.bonus;
        }

        return total;
    }

    /**
     * Initialize the sprite
     */
    initSprite() {
        this.sprite = new PIXI.Container();

        if (this.useAnimations && this.animLoader && this.animPackage >= 0) {
            // Use animated sprite from AnimationLoader
            this.initAnimatedSprite();
        } else {
            // Use placeholder graphics
            this.initPlaceholderSprite();
        }

        // Health bar (hidden by default)
        this.healthBar = this.createHealthBar();
        this.healthBar.visible = false;
        this.sprite.addChild(this.healthBar);

        this.updateSpritePosition();
    }

    /**
     * Initialize placeholder sprite (geometric shapes)
     */
    initPlaceholderSprite() {
        // Shadow
        const shadow = new PIXI.Graphics();
        shadow.ellipse(0, 2, 14, 7);
        shadow.fill({ color: 0x000000, alpha: 0.3 });
        this.sprite.addChild(shadow);

        // Body
        const body = new PIXI.Graphics();
        body.ellipse(0, -8, 12, 10);
        body.fill(this.bodyColor);
        body.stroke({ width: 2, color: 0xffffff, alpha: 0.5 });
        this.sprite.addChild(body);
        this.bodyGraphics = body;

        // Head
        const head = new PIXI.Graphics();
        head.circle(0, -22, 8);
        head.fill(this.headColor);
        head.stroke({ width: 1, color: 0xcc9966 });
        this.sprite.addChild(head);
        this.headGraphics = head;
    }

    /**
     * Initialize animated sprite from AnimationLoader
     */
    initAnimatedSprite() {
        // Get animation ID for current state and direction
        const animId = this.getAnimIdForStateAndDir(this.currentAnimState, this.direction);
        this.animSprite = new AnimatedSprite(this.animLoader, this.animPackage, animId);

        // Center the animation container
        this.animSprite.container.y = VISUAL.UNIT_SPRITE_Y_OFFSET;

        this.sprite.addChild(this.animSprite.container);
    }

    /**
     * Get animation ID for a state and game direction
     * @param {string} state - 'idle', 'walk', 'attack', 'death'
     * @param {number} gameDirection - Game direction 0-7
     * @returns {number} Animation ID within the package
     */
    getAnimIdForStateAndDir(state, gameDirection) {
        if (!this.unitAnimConfig) return 0;
        return getAnimId(this.unitAnimConfig, state, gameDirection);
    }

    /**
     * Set up animations for this entity using unit config
     * @param {AnimationLoader} loader - Shared animation loader
     * @param {object} unitAnimConfig - Unit config from UNIT_ANIMS (e.g., UNIT_ANIMS.WARRIOR)
     */
    setAnimations(loader, unitAnimConfig) {
        this.animLoader = loader;
        this.unitAnimConfig = unitAnimConfig;
        this.animPackage = unitAnimConfig.package;
        this.useAnimations = true;

        // Re-initialize sprite if already created
        if (this.sprite) {
            // Save existing UI elements that need to be preserved
            const healthBar = this.healthBar;
            const selectionIndicator = this.selectionIndicator;
            const wasSelected = this.selected;

            this.sprite.removeChildren();
            this.initAnimatedSprite();

            // Restore health bar
            if (healthBar) {
                this.sprite.addChild(healthBar);
            }

            // Restore selection indicator if was selected
            if (wasSelected && selectionIndicator) {
                this.sprite.addChild(selectionIndicator);
            }
        }
    }

    /**
     * Change animation state (idle, walk, attack, death) with direction
     * @param {string} state - Animation state
     * @param {number} [dir] - Optional direction override (uses this.direction if not provided)
     */
    setAnimState(state, dir = null) {
        if (!this.useAnimations || !this.animSprite) return;

        const direction = dir !== null ? dir : this.direction;
        const animDirOffset = GAME_DIR_TO_ANIM_DIR[direction] || 0;

        // Only update if state or direction changed
        if (this.currentAnimState === state && this.currentAnimDir === animDirOffset) {
            return;
        }

        const newAnimId = this.getAnimIdForStateAndDir(state, direction);

        this.currentAnimState = state;
        this.currentAnimDir = animDirOffset;
        this.animSprite.setAnimation(this.animPackage, newAnimId);
    }

    /**
     * Update animation to match current direction (for state changes without state change)
     */
    updateAnimDirection() {
        if (!this.useAnimations || !this.animSprite) return;

        const animDirOffset = GAME_DIR_TO_ANIM_DIR[this.direction] || 0;

        if (this.currentAnimDir !== animDirOffset) {
            this.setAnimState(this.currentAnimState, this.direction);
        }
    }

    /**
     * Update animation frame
     */
    updateAnimation() {
        if (this.animSprite) {
            this.animSprite.update();
        }
    }

    /**
     * Create health bar graphics
     */
    createHealthBar() {
        const container = new PIXI.Container();
        container.y = VISUAL.HEALTH_BAR_Y_OFFSET;

        const barWidth = VISUAL.HEALTH_BAR_WIDTH;
        const barHeight = VISUAL.HEALTH_BAR_HEIGHT;
        const fillWidth = VISUAL.HEALTH_BAR_FILL_WIDTH;
        const halfWidth = barWidth / 2;

        // Background
        const bg = new PIXI.Graphics();
        bg.rect(-halfWidth, 0, barWidth, barHeight);
        bg.fill(0x333333);
        container.addChild(bg);

        // Health fill
        const fill = new PIXI.Graphics();
        fill.rect(-halfWidth + 1, 1, fillWidth, barHeight - 2);
        fill.fill(0x00ff00);
        container.addChild(fill);
        this.healthBarFill = fill;

        return container;
    }

    /**
     * Update health bar display
     */
    updateHealthBar() {
        if (!this.healthBarFill) return;

        const healthPercent = this.health / this.maxHealth;
        const fillWidth = VISUAL.HEALTH_BAR_FILL_WIDTH;
        const halfWidth = VISUAL.HEALTH_BAR_WIDTH / 2;
        const barHeight = VISUAL.HEALTH_BAR_HEIGHT;

        this.healthBarFill.clear();
        this.healthBarFill.rect(-halfWidth + 1, 1, fillWidth * healthPercent, barHeight - 2);

        // Color based on health
        let color = 0x00ff00; // Green
        if (healthPercent < 0.3) {
            color = 0xff0000; // Red
        } else if (healthPercent < 0.6) {
            color = 0xffff00; // Yellow
        }
        this.healthBarFill.fill(color);
    }

    /**
     * Show health bar
     */
    showHealthBar() {
        if (this.healthBar) {
            this.healthBar.visible = true;
            this.updateHealthBar();
        }
    }

    /**
     * Hide health bar
     */
    hideHealthBar() {
        if (this.healthBar) {
            this.healthBar.visible = false;
        }
    }

    /**
     * Set body color
     */
    setBodyColor(color) {
        this.bodyColor = color;
        if (this.bodyGraphics) {
            this.bodyGraphics.clear();
            this.bodyGraphics.ellipse(0, -8, 12, 10);
            this.bodyGraphics.fill(color);
            this.bodyGraphics.stroke({ width: 2, color: 0xffffff, alpha: 0.5 });
        }
    }

    /**
     * Update entity (called each game tick)
     */
    update(deltaTime) {
        // Skip processing for dead/dying entities (except animation updates)
        if (!this.isAlive()) {
            this.updateAnimation();  // Still update death animation
            return;
        }

        super.update(deltaTime);

        // Update animation
        this.updateAnimation();

        // Update inventory (for heroes)
        if (this.inventory) {
            this.inventory.update(deltaTime);
        }

        // Update movement
        if (this.moving) {
            this.updateMovement(deltaTime);
            this.setAnimState('walk');  // Will auto-use current direction
        } else if (this.state === EntityState.IDLE) {
            this.setAnimState('idle');  // Will auto-use current direction
        }

        // Update attack timer
        if (this.attackTimer > 0) {
            this.attackTimer -= deltaTime;
        }

        // Continuous combat - attack target if we have one and are in range
        if (this.attackTarget && this.attackTarget.isAlive()) {
            if (this.isInAttackRange(this.attackTarget)) {
                // In range - attack when timer is ready, otherwise wait
                if (this.canAttack(this.attackTarget)) {
                    this.attack(this.attackTarget);
                }
                // Don't move - we're in range, just waiting for cooldown
            } else if (!this.moving && this.state === EntityState.IDLE) {
                // Not in range - move closer
                const targetCell = this.findAttackPosition(
                    this.attackTarget.gridI,
                    this.attackTarget.gridJ
                );
                if (targetCell) {
                    this.moveTo(targetCell.i, targetCell.j, this.grid);
                } else {
                    // Fallback: no perfect attack position, try to move towards target anyway
                    // Pick a random walkable cell near the target
                    const fallbackCell = this.findFallbackMovePosition(
                        this.attackTarget.gridI,
                        this.attackTarget.gridJ
                    );
                    if (fallbackCell) {
                        this.moveTo(fallbackCell.i, fallbackCell.j, this.grid);
                    }
                }
            } else if (this.moving && this.attackTarget) {
                // Currently moving - check if target has moved and we need to reroute
                this.checkTargetMoved();
            }
        } else if (this.attackTarget && !this.attackTarget.isAlive()) {
            // Clear dead target
            this.clearAttackTarget();
        }

        // Show health bar if damaged
        if (this.health < this.maxHealth) {
            this.showHealthBar();
        }

        // Auto-play AI processing
        if (this.autoPlay && this.isAlive()) {
            this.processAI(deltaTime);
        }
    }

    /**
     * AI processing - autonomous behavior
     * Throttled to reduce CPU load with many units
     */
    processAI(deltaTime) {
        // Don't process if already engaged in combat or moving
        if (this.attackTarget && this.attackTarget.isAlive()) {
            return;  // Already has a target, let combat logic handle it
        }

        // If already moving towards something, don't interrupt
        if (this.moving) {
            return;
        }

        // Throttle expensive AI operations - only run every 5-10 frames
        // BUT always run immediately for newly spawned units (aiThrottle undefined)
        if (this.aiThrottle !== undefined) {
            this.aiThrottle++;
            const throttleRate = 5 + (this.id % 5);  // Stagger between 5-10 frames
            if (this.aiThrottle < throttleRate) {
                return;
            }
        }
        this.aiThrottle = 0;

        // Look for enemies to fight
        if (!this.attackTarget && this.game) {
            const enemy = this.findNearestEnemy();
            if (enemy) {
                this.setAttackTarget(enemy);
                return;
            }
        }

        // Continue going to blacksmith if we have a target (persistent state)
        if (!this.attackTarget && this.targetBlacksmith) {
            if (this.tryVisitBlacksmith()) {
                return;  // Hero is heading to or at blacksmith
            }
            // If tryVisitBlacksmith returns false, target is cleared (purchased or can't afford)
        }

        // No enemies and no blacksmith target - consider visiting Blacksmith
        if (!this.attackTarget && !this.targetBlacksmith && this.shouldVisitBlacksmith()) {
            if (this.tryVisitBlacksmith()) {
                return;  // Hero started heading to blacksmith
            }
        }

        // Continue going to marketplace if we have a target (persistent state)
        if (!this.attackTarget && !this.targetBlacksmith && this.targetMarketplace) {
            if (this.tryVisitMarketplace()) {
                return;
            }
        }

        // No enemies and no shop targets - consider visiting Marketplace
        if (!this.attackTarget && !this.targetBlacksmith && !this.targetMarketplace && !this.targetWizardGuild && this.shouldVisitMarketplace()) {
            if (this.tryVisitMarketplace()) {
                return;
            }
        }

        // Continue going to wizard guild if we have a target (persistent state)
        if (!this.attackTarget && !this.targetBlacksmith && !this.targetMarketplace && this.targetWizardGuild) {
            if (this.tryVisitWizardGuild()) {
                return;
            }
        }

        // No enemies and no shop targets - consider visiting Wizard Guild for enchanting
        if (!this.attackTarget && !this.targetBlacksmith && !this.targetMarketplace && !this.targetWizardGuild && this.shouldVisitWizardGuild()) {
            if (this.tryVisitWizardGuild()) {
                return;
            }
        }

        // Idle behavior - random wandering (only if not heading somewhere)
        if (!this.moving && !this.attackTarget && !this.targetBlacksmith && !this.targetMarketplace && !this.targetWizardGuild && Math.random() < AI_CONFIG.WANDER_CHANCE) {
            this.wanderRandomly();
        }
    }

    /**
     * Find nearest enemy within sight range
     * Searches both units and buildings
     * Limited checks to prevent performance issues
     */
    findNearestEnemy() {
        if (!this.game) return null;

        let nearestEnemy = null;
        let nearestDist = this.sightRange;

        // Limit checks to prevent O(n²) with many units
        const MAX_CHECKS = 30;
        let checks = 0;

        // First, check enemy units
        if (this.game.entities) {
            for (const entity of this.game.entities) {
                // Skip self, dead, and same team
                if (entity === this) continue;
                if (!entity.isAlive()) continue;
                if (entity.team === this.team) continue;

                checks++;
                const dist = this.distanceTo(entity);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestEnemy = entity;
                    // Early exit if we found something very close
                    if (dist < 3) break;
                }

                if (checks >= MAX_CHECKS) break;
            }
        }

        // If no enemy units found, check enemy buildings (especially castle)
        // Enemies (team='enemy') will attack player buildings (team=0)
        // Player units (team='player') will attack enemy buildings (team=1)
        if (!nearestEnemy && this.game.buildings) {
            const targetTeam = this.team === 'enemy' ? 0 : 1;
            // Use much larger range for buildings (will pathfind to them)
            const buildingSearchRange = AI_CONFIG.BUILDING_SEARCH_RANGE;

            for (const building of this.game.buildings) {
                if (!building.isAlive()) continue;
                if (building.team !== targetTeam) continue;

                const dist = this.distanceTo(building);
                if (dist < buildingSearchRange && (!nearestEnemy || dist < nearestDist)) {
                    nearestDist = dist;
                    nearestEnemy = building;
                }
            }
        }

        return nearestEnemy;
    }

    /**
     * Wander to a random nearby tile
     */
    wanderRandomly() {
        if (!this.grid) return;

        // Pick a random direction
        const directions = [
            { di: 0, dj: -1 }, { di: 1, dj: 0 },
            { di: 0, dj: 1 }, { di: -1, dj: 0 },
            { di: 1, dj: -1 }, { di: 1, dj: 1 },
            { di: -1, dj: 1 }, { di: -1, dj: -1 }
        ];

        // Shuffle and try each direction
        const shuffled = directions.sort(() => Math.random() - 0.5);

        for (const dir of shuffled) {
            const newI = this.gridI + dir.di * (1 + Math.floor(Math.random() * 2));
            const newJ = this.gridJ + dir.dj * (1 + Math.floor(Math.random() * 2));

            if (this.grid.isInBounds(newI, newJ) && this.grid.isWalkable(newI, newJ)) {
                this.moveTo(newI, newJ, this.grid);
                return;
            }
        }
    }

    // =========================================================================
    // BLACKSMITH VISITING (Hero AI)
    // =========================================================================

    /**
     * Check if this hero should visit the Blacksmith
     * Based on: has gold, can upgrade, random chance per unit type
     */
    shouldVisitBlacksmith() {
        // Only player heroes visit blacksmith
        if (this.team !== 'player') return false;
        if (this.objectType !== OBJECT_TYPE.HERO) return false;

        // Wizards don't use blacksmith (from smali: RND_WIZARD_GO_BLACKSMITH = -1)
        const unitTypeName = this.getUnitTypeName();
        const visitChance = BLACKSMITH_CONFIG.VISIT_CHANCE[unitTypeName];
        if (visitChance === undefined || visitChance < 0) return false;

        // Check if hero has enough gold for any upgrade
        const totalGold = (this.gold || 0) + (this.taxGold || 0);
        const minWeaponCost = BLACKSMITH_CONFIG.HERO_WEAPON_PRICES[0];
        const minArmorCost = BLACKSMITH_CONFIG.HERO_ARMOR_PRICES[0];

        if (totalGold < Math.min(minWeaponCost, minArmorCost)) {
            return false;  // Can't afford any upgrade
        }

        // Random chance based on unit type (rnd(100) < visitChance, from smali)
        return Math.random() * 100 < visitChance;
    }

    /**
     * Get unit type name for config lookup
     */
    getUnitTypeName() {
        const typeNames = {
            [UNIT_TYPE.WARRIOR]: 'WARRIOR',
            [UNIT_TYPE.RANGER]: 'RANGER',
            [UNIT_TYPE.PALADIN]: 'PALADIN',
            [UNIT_TYPE.WIZARD]: 'WIZARD',
            [UNIT_TYPE.WIZARD_HEALER]: 'WIZARD_HEALER',
            [UNIT_TYPE.WIZARD_NECROMANCER]: 'WIZARD_NECROMANCER',
            [UNIT_TYPE.BARBARIAN]: 'BARBARIAN',
            [UNIT_TYPE.DWARF]: 'DWARF',
            [UNIT_TYPE.ELF]: 'ELF',
        };
        return typeNames[this.unitTypeId] || 'WARRIOR';
    }

    /**
     * Find the nearest player-owned Blacksmith
     */
    findNearestBlacksmith() {
        if (!this.game || !this.game.buildings) return null;

        let nearest = null;
        let nearestDist = Infinity;

        for (const building of this.game.buildings) {
            // Must be player-owned Blacksmith that's fully constructed
            if (building.buildingType !== BuildingType.BLACKSMITH) continue;
            if (building.team !== 0) continue;
            if (!building.constructed) continue;

            const dist = this.distanceTo(building);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = building;
            }
        }

        return nearest;
    }

    /**
     * Try to visit the Blacksmith for upgrades
     * Called from processAI when hero is idle or has targetBlacksmith set
     * @returns {boolean} True if hero is heading to or at blacksmith
     */
    tryVisitBlacksmith() {
        // Use existing target or find nearest
        const blacksmith = this.targetBlacksmith || this.findNearestBlacksmith();
        if (!blacksmith) {
            this.targetBlacksmith = null;
            return false;
        }

        // Check if we can actually upgrade at this blacksmith
        const canUpgradeWeapon = this.canUpgradeWeaponAt(blacksmith);
        const canUpgradeArmor = this.canUpgradeArmorAt(blacksmith);

        if (!canUpgradeWeapon && !canUpgradeArmor) {
            this.targetBlacksmith = null;  // Clear target - nothing to buy
            return false;
        }

        // Calculate distance to building CENTER (not top-left corner)
        const buildingSizeI = blacksmith.sizeI || 2;
        const buildingSizeJ = blacksmith.sizeJ || 2;
        const centerI = blacksmith.gridI + buildingSizeI / 2;
        const centerJ = blacksmith.gridJ + buildingSizeJ / 2;
        const dx = this.gridI - centerI;
        const dy = this.gridJ - centerJ;
        const distToCenter = Math.sqrt(dx * dx + dy * dy);

        // Check if we're already at the blacksmith (adjacent to building)
        if (distToCenter <= 2.5) {
            // We're at the blacksmith - purchase upgrades!
            this.purchaseBlacksmithUpgrades(blacksmith);
            this.targetBlacksmith = null;  // Clear target after purchase
            return true;
        }

        // Set persistent target so we keep heading there
        this.targetBlacksmith = blacksmith;

        // Try tiles around the blacksmith (prioritize front, then sides)
        const offsets = [
            { i: 0, j: 2 },   // Front
            { i: 0, j: -1 },  // Back
            { i: 2, j: 0 },   // Right
            { i: -1, j: 0 },  // Left
            { i: 1, j: 2 },   // Front-right
            { i: -1, j: 2 },  // Front-left
            { i: 2, j: 1 },   // Right-front
            { i: -1, j: 1 },  // Left-front
        ];

        for (const offset of offsets) {
            const targetI = Math.floor(centerI + offset.i);
            const targetJ = Math.floor(centerJ + offset.j);

            if (this.grid && this.grid.isWalkable(targetI, targetJ)) {
                this.moveTo(targetI, targetJ, this.grid);
                return true;
            }
        }

        this.targetBlacksmith = null;  // Clear target - can't reach
        return false;
    }

    /**
     * Check if hero can upgrade weapon at this blacksmith
     */
    canUpgradeWeaponAt(blacksmith) {
        // Hero's weapon level must be below building's unlocked tier
        if (this.weaponLevel >= blacksmith.weaponLevel) return false;

        // Hero must have enough gold
        const upgradeCost = BLACKSMITH_CONFIG.HERO_WEAPON_PRICES[this.weaponLevel - 1] || 0;
        const totalGold = (this.gold || 0) + (this.taxGold || 0);

        return totalGold >= upgradeCost;
    }

    /**
     * Check if hero can upgrade armor at this blacksmith
     */
    canUpgradeArmorAt(blacksmith) {
        // Hero's armor level must be below building's unlocked tier
        if (this.armorLevel >= blacksmith.armorLevel) return false;

        // Hero must have enough gold
        const upgradeCost = BLACKSMITH_CONFIG.HERO_ARMOR_PRICES[this.armorLevel - 1] || 0;
        const totalGold = (this.gold || 0) + (this.taxGold || 0);

        return totalGold >= upgradeCost;
    }

    /**
     * Purchase upgrades at the Blacksmith
     * Hero spends their personal gold (taxGold first, then gold)
     */
    purchaseBlacksmithUpgrades(blacksmith) {
        let upgraded = false;

        // Try weapon upgrade first
        if (this.canUpgradeWeaponAt(blacksmith)) {
            const cost = BLACKSMITH_CONFIG.HERO_WEAPON_PRICES[this.weaponLevel - 1];
            this.spendGold(cost);
            this.weaponLevel++;

            // Update weapon ID based on unit type and new level
            // This is what actually increases damage (from smali)
            this.weapon = getWeaponID(this.unitTypeId, this.weaponLevel);

            // Update inventory if present
            if (this.inventory) {
                this.inventory.weaponLevel = this.weaponLevel;
            }

            // Recalculate damage with new weapon level
            this.calculateDamageFromStats();

            console.log(`${this.unitType} upgraded weapon to level ${this.weaponLevel} (weapon ID: ${this.weapon}) for ${cost}g, damage: ${this.minDamage}-${this.maxDamage}`);
            upgraded = true;

            // Show visual effect
            this.showUpgradeEffect('weapon');

            // Show message
            if (this.game && this.game.showMessage) {
                this.game.showMessage(`${this.unitType} upgraded weapon!`);
            }
        }

        // Try armor upgrade (with slight delay if weapon was also upgraded)
        if (this.canUpgradeArmorAt(blacksmith)) {
            const doArmorUpgrade = () => {
                const cost = BLACKSMITH_CONFIG.HERO_ARMOR_PRICES[this.armorLevel - 1];
                this.spendGold(cost);
                this.armorLevel++;

                // Update armor defense
                if (this.inventory) {
                    this.inventory.armorLevel = this.armorLevel;
                }

                console.log(`${this.unitType} upgraded armor to level ${this.armorLevel} for ${cost}g`);

                // Show visual effect
                this.showUpgradeEffect('armor');

                // Show message
                if (this.game && this.game.showMessage) {
                    this.game.showMessage(`${this.unitType} upgraded armor!`);
                }
            };

            // Delay armor upgrade visual if weapon was also upgraded
            if (upgraded) {
                setTimeout(doArmorUpgrade, 800);
            } else {
                doArmorUpgrade();
            }
            upgraded = true;
        }

        // Play upgrade sound
        if (upgraded && this.game && this.game.playSoundAt) {
            this.game.playSoundAt(SOUNDS.UPGRADE_COMPLETE || SOUNDS.GOLD, this.worldX, this.worldY);
        }
    }

    // =========================================================================
    // MARKETPLACE AI
    // =========================================================================

    /**
     * Check if this hero should visit the Marketplace
     */
    shouldVisitMarketplace() {
        if (this.team !== 'player') return false;
        if (this.objectType !== OBJECT_TYPE.HERO) return false;
        if (!this.inventory) return false;

        const unitTypeName = this.getUnitTypeName();
        const visitChance = MARKETPLACE_CONFIG.VISIT_CHANCE[unitTypeName];
        if (visitChance === undefined || visitChance < 0) return false;

        // Check if hero has gold for the cheapest item (a potion)
        const totalGold = (this.gold || 0) + (this.taxGold || 0);
        if (totalGold < ITEMS.HEALING_POTION.price) return false;

        // Find nearest marketplace and check if it has any researched items we need
        const marketplace = this.findNearestMarketplace();
        if (!marketplace) return false;

        // Check if marketplace has anything researched that this hero can buy
        if (!this.canBuyAnythingAtMarketplace(marketplace)) return false;

        // Random chance based on unit type (rnd(100) < visitChance, from smali)
        return Math.random() * 100 < visitChance;
    }

    /**
     * Find the nearest player-owned Marketplace
     */
    findNearestMarketplace() {
        if (!this.game || !this.game.buildings) return null;

        let nearest = null;
        let nearestDist = Infinity;

        for (const building of this.game.buildings) {
            if (building.buildingType !== BuildingType.MARKETPLACE) continue;
            if (building.team !== 0) continue;
            if (!building.constructed) continue;

            const buildingSizeI = building.sizeI || 2;
            const buildingSizeJ = building.sizeJ || 2;
            const centerI = building.gridI + buildingSizeI / 2;
            const centerJ = building.gridJ + buildingSizeJ / 2;
            const dx = this.gridI - centerI;
            const dy = this.gridJ - centerJ;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = building;
            }
        }

        return nearest;
    }

    /**
     * Try to visit the Marketplace for purchases
     * @returns {boolean} True if hero is heading to or at marketplace
     */
    tryVisitMarketplace() {
        const marketplace = this.targetMarketplace || this.findNearestMarketplace();
        if (!marketplace) {
            this.targetMarketplace = null;
            return false;
        }

        // Check if we can actually buy anything
        if (!this.canBuyAnythingAtMarketplace(marketplace)) {
            this.targetMarketplace = null;
            return false;
        }

        // Calculate distance to building center
        const buildingSizeI = marketplace.sizeI || 2;
        const buildingSizeJ = marketplace.sizeJ || 2;
        const centerI = marketplace.gridI + buildingSizeI / 2;
        const centerJ = marketplace.gridJ + buildingSizeJ / 2;
        const dx = this.gridI - centerI;
        const dy = this.gridJ - centerJ;
        const distToCenter = Math.sqrt(dx * dx + dy * dy);

        // At the marketplace - purchase items!
        if (distToCenter <= 2.5) {
            this.purchaseMarketplaceItems(marketplace);
            this.targetMarketplace = null;
            return true;
        }

        // Set persistent target and move towards marketplace
        this.targetMarketplace = marketplace;

        const offsets = [
            { i: 0, j: 2 },  { i: 0, j: -1 }, { i: 2, j: 0 },  { i: -1, j: 0 },
            { i: 1, j: 2 },  { i: -1, j: 2 }, { i: 2, j: 1 },  { i: -1, j: 1 },
        ];

        for (const offset of offsets) {
            const targetI = Math.floor(centerI + offset.i);
            const targetJ = Math.floor(centerJ + offset.j);

            if (this.grid && this.grid.isWalkable(targetI, targetJ)) {
                this.moveTo(targetI, targetJ, this.grid);
                return true;
            }
        }

        this.targetMarketplace = null;
        return false;
    }

    /**
     * Check if hero can buy anything at this marketplace
     */
    canBuyAnythingAtMarketplace(marketplace) {
        if (!this.inventory) return false;
        const totalGold = (this.gold || 0) + (this.taxGold || 0);

        // Potions (requires researched at marketplace)
        if (marketplace.researchedPotion) {
            if (this.inventory.healingPotions < MARKETPLACE_CONFIG.MAX_POTIONS_PER_HERO &&
                totalGold >= ITEMS.HEALING_POTION.price) {
                return true;
            }
        }

        // Ring of Protection (requires researched)
        if (marketplace.researchedRing &&
            !this.inventory.hasRingOfProtection && totalGold >= ITEMS.RING_OF_PROTECTION.price) {
            return true;
        }

        // Amulet of Teleportation (requires researched)
        if (marketplace.researchedAmulet &&
            !this.inventory.hasAmuletOfTeleportation && totalGold >= ITEMS.AMULET_OF_TELEPORTATION.price) {
            return true;
        }

        return false;
    }

    /**
     * Purchase items at the Marketplace
     * Priority: Ring > Amulet > Potions
     */
    purchaseMarketplaceItems(marketplace) {
        let purchased = false;

        // Buy Ring of Protection (one-time, high priority, requires researched)
        if (marketplace.researchedRing && !this.inventory.hasRingOfProtection) {
            if (this.inventory.buyRingOfProtection()) {
                console.log(`${this.unitType} bought Ring of Protection`);
                purchased = true;
                if (this.game && this.game.showMessage) {
                    this.game.showMessage(`${this.unitType} bought Ring of Protection!`);
                }
                this.showUpgradeEffect('ring');
            }
        }

        // Buy Amulet of Teleportation (one-time, requires researched)
        if (marketplace.researchedAmulet && !this.inventory.hasAmuletOfTeleportation) {
            if (this.inventory.buyAmuletOfTeleportation()) {
                console.log(`${this.unitType} bought Amulet of Teleportation`);
                purchased = true;
                if (this.game && this.game.showMessage) {
                    this.game.showMessage(`${this.unitType} bought Amulet!`);
                }
            }
        }

        // Buy Healing Potions (requires researched, up to max 5)
        if (marketplace.researchedPotion) {
            let potionsBought = 0;
            while (this.inventory.healingPotions < MARKETPLACE_CONFIG.MAX_POTIONS_PER_HERO) {
                if (!this.inventory.buyHealingPotion()) break;
                potionsBought++;
                purchased = true;
            }
            if (potionsBought > 0) {
                console.log(`${this.unitType} bought ${potionsBought} potion(s) (${this.inventory.healingPotions}/${MARKETPLACE_CONFIG.MAX_POTIONS_PER_HERO})`);
            }
        }

        if (purchased && this.game && this.game.playSoundAt) {
            this.game.playSoundAt(SOUNDS.GOLD, this.worldX, this.worldY);
        }
    }

    /**
     * Spend gold (uses taxGold first, then personal gold)
     */
    spendGold(amount) {
        // First use taxGold
        if (this.taxGold >= amount) {
            this.taxGold -= amount;
            return;
        }

        // Use all taxGold and remainder from personal gold
        const remainder = amount - this.taxGold;
        this.taxGold = 0;
        this.gold = Math.max(0, (this.gold || 0) - remainder);
    }

    // =========================================================================
    // WIZARD GUILD ENCHANTING (from Script.smali goingToWizardGuild)
    // =========================================================================

    /**
     * Check if this hero should visit the Wizard Guild for enchanting
     */
    shouldVisitWizardGuild() {
        if (this.team !== 'player') return false;
        if (this.objectType !== OBJECT_TYPE.HERO) return false;
        if (!this.inventory) return false;

        const unitTypeName = this.getUnitTypeName();
        const visitChance = ENCHANT_CONFIG.VISIT_CHANCE[unitTypeName];
        if (visitChance === undefined || visitChance < 0) return false;  // Wizards never enchant

        // Check if hero has enough gold (flat 200g per enchant)
        const totalGold = (this.gold || 0) + (this.taxGold || 0);
        if (totalGold < ENCHANT_CONFIG.ENCHANT_PRICE) return false;

        // Find nearest wizard guild and check if hero can enchant there
        const guild = this.findNearestWizardGuild();
        if (!guild) return false;

        // Check if hero still needs enchanting (either weapon or armor below guild level)
        const maxLevel = Math.min(guild.level || 1, ENCHANT_CONFIG.MAX_LEVEL);
        const needsWeapon = this.inventory.enchantedWeaponLevel < maxLevel;
        const needsArmor = this.inventory.enchantedArmorLevel < maxLevel;
        if (!needsWeapon && !needsArmor) return false;

        // Random chance based on unit type (rnd(100) < visitChance, from smali)
        return Math.random() * 100 < visitChance;
    }

    /**
     * Find the nearest player-owned Wizard Guild
     */
    findNearestWizardGuild() {
        if (!this.game || !this.game.buildings) return null;

        let nearest = null;
        let nearestDist = Infinity;

        for (const building of this.game.buildings) {
            if (building.buildingType !== BuildingType.WIZARD_GUILD) continue;
            if (building.team !== 0) continue;
            if (!building.constructed) continue;

            const buildingSizeI = building.sizeI || 2;
            const buildingSizeJ = building.sizeJ || 2;
            const centerI = building.gridI + buildingSizeI / 2;
            const centerJ = building.gridJ + buildingSizeJ / 2;
            const dx = this.gridI - centerI;
            const dy = this.gridJ - centerJ;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = building;
            }
        }

        return nearest;
    }

    /**
     * Try to visit the Wizard Guild for enchanting
     * @returns {boolean} True if hero is heading to or at wizard guild
     */
    tryVisitWizardGuild() {
        const guild = this.targetWizardGuild || this.findNearestWizardGuild();
        if (!guild) {
            this.targetWizardGuild = null;
            return false;
        }

        // Check if we can still enchant anything
        const maxLevel = Math.min(guild.level || 1, ENCHANT_CONFIG.MAX_LEVEL);
        const totalGold = (this.gold || 0) + (this.taxGold || 0);
        if (totalGold < ENCHANT_CONFIG.ENCHANT_PRICE ||
            (this.inventory.enchantedWeaponLevel >= maxLevel && this.inventory.enchantedArmorLevel >= maxLevel)) {
            this.targetWizardGuild = null;
            return false;
        }

        // Calculate distance to building center
        const buildingSizeI = guild.sizeI || 2;
        const buildingSizeJ = guild.sizeJ || 2;
        const centerI = guild.gridI + buildingSizeI / 2;
        const centerJ = guild.gridJ + buildingSizeJ / 2;
        const dx = this.gridI - centerI;
        const dy = this.gridJ - centerJ;
        const distToCenter = Math.sqrt(dx * dx + dy * dy);

        // At the wizard guild - enchant!
        if (distToCenter <= 2.5) {
            this.purchaseEnchantments(guild);
            this.targetWizardGuild = null;
            return true;
        }

        // Set persistent target and move towards wizard guild
        this.targetWizardGuild = guild;

        const offsets = [
            { i: 0, j: 2 },  { i: 0, j: -1 }, { i: 2, j: 0 },  { i: -1, j: 0 },
            { i: 1, j: 2 },  { i: -1, j: 2 }, { i: 2, j: 1 },  { i: -1, j: 1 },
        ];

        for (const offset of offsets) {
            const targetI = Math.floor(centerI + offset.i);
            const targetJ = Math.floor(centerJ + offset.j);

            if (this.grid && this.grid.isWalkable(targetI, targetJ)) {
                this.moveTo(targetI, targetJ, this.grid);
                return true;
            }
        }

        this.targetWizardGuild = null;
        return false;
    }

    /**
     * Purchase enchantments at the Wizard Guild
     * From smali: 50/50 weapon vs armor, falls back to the other
     */
    purchaseEnchantments(guild) {
        if (!this.inventory) return;

        const guildLevel = guild.level || 1;
        const maxLevel = Math.min(guildLevel, ENCHANT_CONFIG.MAX_LEVEL);
        let enchanted = false;

        const canEnchantWeapon = this.inventory.enchantedWeaponLevel < maxLevel;
        const canEnchantArmor = this.inventory.enchantedArmorLevel < maxLevel;

        // 50/50 random: try weapon first or armor first (smali: rnd(100) <= 50)
        if (Math.random() < 0.5) {
            // Try weapon first, then armor
            if (canEnchantWeapon && this.inventory.enchantWeapon(guildLevel)) {
                console.log(`${this.unitType} enchanted weapon to +${this.inventory.enchantedWeaponLevel}`);
                enchanted = true;
                this.showUpgradeEffect('enchant');
                if (this.game && this.game.showMessage) {
                    this.game.showMessage(`${this.unitType} enchanted weapon +${this.inventory.enchantedWeaponLevel}!`);
                }
            } else if (canEnchantArmor && this.inventory.enchantArmor(guildLevel)) {
                console.log(`${this.unitType} enchanted armor to +${this.inventory.enchantedArmorLevel}`);
                enchanted = true;
                this.showUpgradeEffect('enchant');
                if (this.game && this.game.showMessage) {
                    this.game.showMessage(`${this.unitType} enchanted armor +${this.inventory.enchantedArmorLevel}!`);
                }
            }
        } else {
            // Try armor first, then weapon
            if (canEnchantArmor && this.inventory.enchantArmor(guildLevel)) {
                console.log(`${this.unitType} enchanted armor to +${this.inventory.enchantedArmorLevel}`);
                enchanted = true;
                this.showUpgradeEffect('enchant');
                if (this.game && this.game.showMessage) {
                    this.game.showMessage(`${this.unitType} enchanted armor +${this.inventory.enchantedArmorLevel}!`);
                }
            } else if (canEnchantWeapon && this.inventory.enchantWeapon(guildLevel)) {
                console.log(`${this.unitType} enchanted weapon to +${this.inventory.enchantedWeaponLevel}`);
                enchanted = true;
                this.showUpgradeEffect('enchant');
                if (this.game && this.game.showMessage) {
                    this.game.showMessage(`${this.unitType} enchanted weapon +${this.inventory.enchantedWeaponLevel}!`);
                }
            }
        }

        if (enchanted && this.game && this.game.playSoundAt) {
            this.game.playSoundAt(SOUNDS.GOLD, this.worldX, this.worldY);
        }
    }

    // =========================================================================
    // END WIZARD GUILD ENCHANTING
    // =========================================================================

    /**
     * Set grid reference and occupy initial cell
     */
    setGrid(grid) {
        this.grid = grid;
        // Occupy the current cell
        this.occupyCell(this.gridI, this.gridJ);
    }

    /**
     * Occupy a cell
     */
    occupyCell(i, j) {
        if (this.grid) {
            this.grid.setFlags(i, j, FLD_BUSY);
        }
    }

    /**
     * Vacate a cell
     */
    vacateCell(i, j) {
        if (this.grid) {
            this.grid.setFlags(i, j, FLD_EMPTY);
        }
    }

    /**
     * Update movement along path
     */
    updateMovement(deltaTime) {
        // Calculate target world position
        const targetPos = IsoMath.gridToWorld(this.targetI, this.targetJ);
        this.targetWorldX = targetPos.x;
        this.targetWorldY = targetPos.y;

        // Move towards target
        const dx = this.targetWorldX - this.worldX;
        const dy = this.targetWorldY - this.worldY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.speed) {
            // Vacate old cell
            this.vacateCell(this.gridI, this.gridJ);

            // Reached current waypoint
            this.worldX = this.targetWorldX;
            this.worldY = this.targetWorldY;
            this.gridI = this.targetI;
            this.gridJ = this.targetJ;

            // Occupy new cell
            this.occupyCell(this.gridI, this.gridJ);

            // Get next waypoint from path
            if (this.path.length > 0) {
                const next = this.path.shift();

                // Check if next cell is still walkable (another unit might have moved there)
                if (this.grid && !this.grid.isWalkable(next.i, next.j)) {
                    // Path blocked, stop and recalculate later
                    this.moving = false;
                    this.state = EntityState.IDLE;
                    this.path = [];
                    return;
                }

                this.targetI = next.i;
                this.targetJ = next.j;

                // Update direction
                this.direction = IsoMath.getDirection(this.gridI, this.gridJ, next.i, next.j);
            } else {
                // Path complete
                this.moving = false;
                this.state = EntityState.IDLE;
            }
        } else {
            // Move towards target
            this.worldX += (dx / dist) * this.speed;
            this.worldY += (dy / dist) * this.speed;
        }

        // Update sprite position
        this.updateSpritePosition();
    }

    /**
     * Start moving to a grid position
     * @param {number} targetI - Target grid column
     * @param {number} targetJ - Target grid row
     * @param {Grid} grid - Game grid for pathfinding
     * @returns {boolean} True if path was found
     */
    moveTo(targetI, targetJ, grid) {
        if (!grid) return false;

        // Find path to target
        const path = grid.findPath(this.gridI, this.gridJ, targetI, targetJ);

        if (path.length > 1) {
            // Remove starting position
            path.shift();

            // Set path and start moving
            this.path = path;
            this.targetI = path[0].i;
            this.targetJ = path[0].j;
            path.shift();
            this.moving = true;
            this.state = EntityState.MOVING;

            // Update direction immediately so sprite faces the right way
            this.direction = IsoMath.getDirection(this.gridI, this.gridJ, this.targetI, this.targetJ);

            return true;
        }

        return false;
    }

    /**
     * Stop moving
     */
    stopMoving() {
        this.moving = false;
        this.path = [];
        this.targetI = this.gridI;
        this.targetJ = this.gridJ;
        this.state = EntityState.IDLE;
        this.setAnimState('idle');
    }

    /**
     * Check if attack target has moved and reroute if needed
     */
    checkTargetMoved() {
        if (!this.attackTarget || !this.moving) return;

        // Get where we're currently heading (final destination)
        let destI, destJ;
        if (this.path.length > 0) {
            const lastPoint = this.path[this.path.length - 1];
            destI = lastPoint.i;
            destJ = lastPoint.j;
        } else {
            destI = this.targetI;
            destJ = this.targetJ;
        }

        // Check distance from our destination to where target actually is now
        const targetI = this.attackTarget.gridI;
        const targetJ = this.attackTarget.gridJ;
        const distFromDest = Math.abs(destI - targetI) + Math.abs(destJ - targetJ);

        // If target has moved significantly from where we're heading, reroute
        if (distFromDest > AI_CONFIG.REROUTE_THRESHOLD) {
            // Recalculate path to new position
            const newTarget = this.findAttackPosition(targetI, targetJ);
            if (newTarget && (newTarget.i !== destI || newTarget.j !== destJ)) {
                this.stopMoving();
                this.moveTo(newTarget.i, newTarget.j, this.grid);
            }
        }
    }

    /**
     * Find a walkable cell adjacent to the target position (for melee)
     */
    findAdjacentWalkableCell(targetI, targetJ) {
        if (!this.grid) return null;

        // Check all 8 directions, prioritize cardinal directions
        const directions = [
            { di: 0, dj: -1 },  // Up
            { di: 1, dj: 0 },   // Right
            { di: 0, dj: 1 },   // Down
            { di: -1, dj: 0 },  // Left
            { di: 1, dj: -1 },  // Up-right
            { di: 1, dj: 1 },   // Down-right
            { di: -1, dj: 1 },  // Down-left
            { di: -1, dj: -1 }  // Up-left
        ];

        for (const dir of directions) {
            const i = targetI + dir.di;
            const j = targetJ + dir.dj;

            if (this.grid.isInBounds(i, j) && this.grid.isWalkable(i, j)) {
                // Also check if another unit is already heading to this cell
                if (!this.isCellTargetedByOther(i, j)) {
                    return { i, j };
                }
            }
        }

        // Fallback: return first walkable cell even if targeted (better than nothing)
        for (const dir of directions) {
            const i = targetI + dir.di;
            const j = targetJ + dir.dj;
            if (this.grid.isInBounds(i, j) && this.grid.isWalkable(i, j)) {
                return { i, j };
            }
        }

        return null;
    }

    /**
     * Check if another unit is already moving towards this cell
     * Limited check to prevent O(n²) performance issues with many units
     */
    isCellTargetedByOther(i, j) {
        if (!this.game || !this.game.entities) return false;

        // Limit checks to prevent performance issues with many units
        const MAX_CHECKS = 20;
        let checks = 0;

        for (const entity of this.game.entities) {
            if (entity === this) continue;
            if (!entity.isAlive || !entity.isAlive()) continue;

            checks++;
            if (checks > MAX_CHECKS) break;  // Stop checking after limit

            // Check if this entity is moving towards the cell (simple check only)
            if (entity.moving && entity.targetI === i && entity.targetJ === j) {
                return true;
            }
        }
        return false;
    }

    /**
     * Find a position to attack from (respects ranged vs melee range)
     */
    findAttackPosition(targetI, targetJ) {
        if (!this.grid) return null;

        const attackRange = this.getAttackRange();

        // For melee units, find adjacent cell
        if (!this.isRanged || attackRange <= 1.5) {
            return this.findAdjacentWalkableCell(targetI, targetJ);
        }

        // For ranged units, find a cell within attack range
        // Prefer cells that are closer to current position but still in range
        const myI = this.gridI;
        const myJ = this.gridJ;

        // Calculate direction towards target
        const dI = targetI - myI;
        const dJ = targetJ - myJ;
        const dist = Math.sqrt(dI * dI + dJ * dJ);

        if (dist <= attackRange) {
            // Already in range - shouldn't be called, but just in case
            return null;
        }

        // Move towards target, stopping when we'd be in range
        // Find the cell along the path that puts us just within range
        const steps = Math.ceil(dist - attackRange + 1);
        const stepI = dI / dist;
        const stepJ = dJ / dist;

        for (let s = 1; s <= steps; s++) {
            const checkI = Math.round(myI + stepI * s);
            const checkJ = Math.round(myJ + stepJ * s);

            if (this.grid.isInBounds(checkI, checkJ) && this.grid.isWalkable(checkI, checkJ)) {
                // Check if this position is within attack range of target
                const newDist = Math.sqrt(
                    Math.pow(targetI - checkI, 2) + Math.pow(targetJ - checkJ, 2)
                );
                if (newDist <= attackRange) {
                    return { i: checkI, j: checkJ };
                }
            }
        }

        // Fallback: just move closer (find adjacent cell)
        return this.findAdjacentWalkableCell(targetI, targetJ);
    }

    /**
     * Find a fallback position to move towards when no attack position is available
     * Tries to find ANY walkable cell closer to the target
     */
    findFallbackMovePosition(targetI, targetJ) {
        if (!this.grid) return null;

        const myI = Math.floor(this.gridI);
        const myJ = Math.floor(this.gridJ);

        // Calculate direction towards target
        const dI = targetI - myI;
        const dJ = targetJ - myJ;
        const dist = Math.sqrt(dI * dI + dJ * dJ);

        if (dist < 2) return null;  // Already very close

        // Try to move partway towards the target (about halfway or less)
        const maxSteps = Math.min(5, Math.floor(dist / 2));

        for (let steps = maxSteps; steps >= 1; steps--) {
            const checkI = Math.round(myI + (dI / dist) * steps);
            const checkJ = Math.round(myJ + (dJ / dist) * steps);

            if (this.grid.isInBounds(checkI, checkJ) && this.grid.isWalkable(checkI, checkJ)) {
                return { i: checkI, j: checkJ };
            }
        }

        return null;
    }

    /**
     * Get effective attack range
     */
    getAttackRange() {
        return this.isRanged ? this.rangedRange : this.meleeRange;
    }

    /**
     * Check if target is in attack range
     */
    isInAttackRange(target) {
        return this.distanceTo(target) <= this.getAttackRange();
    }

    /**
     * Check if can attack target
     */
    canAttack(target) {
        if (!target || !target.isAlive()) return false;
        if (this.attackTimer > 0) return false;
        return this.isInAttackRange(target);
    }

    /**
     * Attack a target
     */
    attack(target) {
        if (!this.canAttack(target)) return false;

        // Face the target
        this.direction = IsoMath.getDirection(
            this.gridI, this.gridJ,
            target.gridI, target.gridJ
        );

        // Reset attack timer
        this.attackTimer = this.attackSpeed;

        // Set state
        this.state = EntityState.ATTACKING;
        this.setAnimState('attack');

        if (this.isRanged) {
            // Ranged attack - roll damage and spawn missile
            const damage = this.rollDamage(target);
            if (this.game && this.game.spawnMissile) {
                this.game.spawnMissile(this, target, undefined, damage);
            }
            // Play ranged attack sound
            if (this.game && this.game.playSoundAt) {
                this.game.playSoundAt(SOUNDS.RANGE_UNIT_SHOT, this.worldX, this.worldY);
            }
            return false;  // Damage dealt by missile on impact
        } else {
            // Melee attack - check hit with stats
            const hitResult = this.rollAttackHit(target);

            if (DEBUG.COMBAT) {
                const dmgInfo = this.weapon !== undefined ? `weapon:${this.weapon}` : `dmg:${this.minDamage}-${this.maxDamage}`;
                console.log(`[COMBAT] ${this.unitType || 'unit'}(HP:${this.health}/${this.maxHealth}, H2H:${this.H2H}, ${dmgInfo}, objType:${this.objectType}) attacks ${target.unitType || 'target'}(HP:${target.health}/${target.maxHealth}, parry:${target.parry}, armor:${target.armor})`);
                console.log(`  Hit check: ${hitResult.hit ? 'HIT' : 'MISS'}`);
            }

            if (hitResult.hit) {
                // Calculate damage using stats
                const damage = this.rollDamage(target);
                if (DEBUG.COMBAT) {
                    console.log(`  Damage: ${damage}, Target HP before: ${target.health}`);
                }
                const killed = target.takeDamage(damage, this);
                if (DEBUG.COMBAT) {
                    console.log(`  Target HP after: ${target.health}, Killed: ${killed}`);
                }

                // Visual feedback for melee hit
                this.showMeleeEffect(target);

                // Play melee hit sound
                if (this.game && this.game.playSoundAt) {
                    this.game.playSoundAt(SOUNDS.PHYSIC_UNIT_HIT_ENEMY, target.worldX, target.worldY);
                }

                // Give experience based on damage dealt (original game mechanic)
                // Uses getKickExp which tracks XP distribution fairly
                const xpGained = target.getKickExp ? target.getKickExp(damage) : damage;
                this.gainExperience(xpGained);

                // Gold reward on kill (no extra XP - already distributed via getKickExp)
                if (killed) {

                    // Collect gold from kill (for heroes)
                    if (this.objectType === OBJECT_TYPE.HERO) {
                        const goldEarned = GOLD.getKillGold({ deadGold: target.deadGold || 20 });
                        this.addGold(goldEarned);
                    }
                }

                return killed;
            } else {
                // Attack missed/parried
                this.showMissEffect(target);
                return false;
            }
        }
    }

    /**
     * Roll to see if attack hits (using combat stats)
     * @param {DynamicEntity} target
     * @returns {{hit: boolean, critical: boolean}}
     */
    rollAttackHit(target) {
        // Get defender's parry/dodge bonus (e.g., paladin bonus)
        let defenderBonus = 0;
        if (target.unitTypeId === UNIT_TYPE.PALADIN) {
            defenderBonus = COMBAT.PALADIN_DEFENSE_BONUS;
        }

        let hit = false;
        if (this.attackType === ATTACK_TYPE.MELEE) {
            hit = COMBAT.meleeHitCheck(this.H2H, target.parry, defenderBonus);
        } else if (this.attackType === ATTACK_TYPE.RANGED) {
            hit = COMBAT.rangedHitCheck(this.ranged, target.dodge, defenderBonus);
        } else {
            // Magic attacks check against resist
            const roll = Math.floor(Math.random() * COMBAT.HIT_ROLL_MAX);
            hit = (roll + this.intelligence) >= (target.resist + COMBAT.BASE_DEFENSE);
        }

        return { hit, critical: false };  // TODO: Add critical hits
    }

    /**
     * Roll damage for an attack
     * Original game has two damage systems:
     * - Heroes (objectType=1): damage = rnd(1, weaponDamage) + enchantedWeaponLevel
     * - Monsters (objectType=2): damage = rnd(minDamage, maxDamage)
     * @param {DynamicEntity} target
     * @returns {number} Damage amount
     */
    rollDamage(target) {
        // Get attacker bonus (e.g., paladin vs undead)
        let attackerBonus = 0;
        if (this.unitTypeId === UNIT_TYPE.PALADIN &&
            (target.unitTypeId === UNIT_TYPE.SKELETON ||
             target.unitTypeId === UNIT_TYPE.ZOMBIE ||
             target.unitTypeId === UNIT_TYPE.VAMPIRE)) {
            attackerBonus = COMBAT.PALADIN_ATTACK_BONUS;
        }

        let minDmg, maxDmg;

        // Heroes use weapon-based damage
        if (this.objectType === OBJECT_TYPE.HERO && this.weapon !== undefined) {
            const weaponDamage = getWeaponDamage(this.weapon);
            minDmg = 1;
            maxDmg = weaponDamage;
            // Add enchanted weapon bonus (from inventory if available)
            const enchantBonus = this.inventory ?
                this.inventory.enchantedWeaponLevel :
                (this.enchantedWeaponLevel || 0);
            minDmg += enchantBonus;
            maxDmg += enchantBonus;
        } else {
            // Monsters use minDamage/maxDamage
            minDmg = this.minDamage || 1;
            maxDmg = this.maxDamage || 5;
        }

        // Calculate base damage with target's armor
        const targetArmor = target.getTotalArmor ? target.getTotalArmor() : (target.armor || 0);
        let damage = COMBAT.calculateDamage(
            minDmg + attackerBonus,
            maxDmg + attackerBonus,
            targetArmor
        );

        // Apply armor enchantment reduction (smali: damage -= enchantedArmorLevel, floored at 0)
        const targetArmorEnchant = target.inventory ?
            target.inventory.enchantedArmorLevel :
            (target.enchantedArmorLevel || 0);
        if (targetArmorEnchant > 0) {
            damage = Math.max(0, damage - targetArmorEnchant);
        }

        return damage;
    }

    /**
     * Show visual effect for missed attack
     */
    showMissEffect(target) {
        if (!this.sprite || !this.sprite.parent) return;

        // Create a "miss" indicator
        const missText = new PIXI.Text({
            text: 'Miss!',
            style: {
                fontFamily: 'Arial',
                fontSize: 12,
                fill: 0xaaaaaa,
                fontWeight: 'bold'
            }
        });
        missText.x = target.worldX - 15;
        missText.y = target.worldY - 30;
        missText.zIndex = 99999;

        this.sprite.parent.addChild(missText);

        // Float up and fade
        let alpha = 1.0;
        let yOffset = 0;
        const fadeCallback = () => {
            alpha -= VISUAL.MISS_TEXT_FADE_RATE;
            yOffset -= VISUAL.MISS_TEXT_RISE_SPEED;
            missText.alpha = alpha;
            missText.y = target.worldY - 30 + yOffset;
            if (alpha <= 0) {
                PIXI.Ticker.shared.remove(fadeCallback);
                if (missText.parent) {
                    missText.parent.removeChild(missText);
                }
                missText.destroy();
            }
        };
        PIXI.Ticker.shared.add(fadeCallback);
    }

    /**
     * Add gold to hero's personal gold
     */
    addGold(amount) {
        if (this.objectType !== OBJECT_TYPE.HERO) return;

        this.gold += amount;

        // Show gold pickup animation (optional)
        if (this.game && this.game.playSound) {
            this.game.playSound(SOUNDS.GOLD);
        }
    }

    /**
     * Add tax gold (to be delivered to castle)
     */
    addTaxGold(amount) {
        this.taxGold += amount;
    }

    /**
     * Deliver tax gold to player's treasury
     */
    deliverTaxGold() {
        if (this.taxGold > 0 && this.game) {
            this.game.gold += this.taxGold;
            console.log(`Hero delivered ${this.taxGold} gold (total: ${this.game.gold})`);
            this.taxGold = 0;
        }
    }

    /**
     * Show visual effect for melee attack
     */
    showMeleeEffect(target) {
        if (!this.sprite || !this.sprite.parent) return;

        // Create a slash effect - diagonal lines crossing
        const slash = new PIXI.Graphics();

        // First diagonal
        slash.moveTo(-12, -12);
        slash.lineTo(12, 12);
        slash.stroke({ width: 4, color: 0xffffff, alpha: 1.0 });

        // Second diagonal
        slash.moveTo(12, -12);
        slash.lineTo(-12, 12);
        slash.stroke({ width: 4, color: 0xffff00, alpha: 1.0 });

        slash.x = target.worldX;
        slash.y = target.worldY - 15;

        // Set very high zIndex to render on top
        slash.zIndex = 99999;

        this.sprite.parent.addChild(slash);

        // Fade out using PIXI ticker (better than setInterval)
        let alpha = 1.0;
        const fadeCallback = () => {
            alpha -= VISUAL.MELEE_EFFECT_FADE_RATE;
            slash.alpha = alpha;
            if (alpha <= 0) {
                PIXI.Ticker.shared.remove(fadeCallback);
                if (slash.parent) {
                    slash.parent.removeChild(slash);
                }
                slash.destroy();
            }
        };
        PIXI.Ticker.shared.add(fadeCallback);
    }

    /**
     * Set attack target
     */
    setAttackTarget(target) {
        this.attackTarget = target;
        this.target = target;
        // Combat takes priority - abandon shop visits
        this.targetBlacksmith = null;
        this.targetMarketplace = null;
        this.targetWizardGuild = null;
    }

    /**
     * Clear attack target
     */
    clearAttackTarget() {
        this.attackTarget = null;
        this.target = null;
        // Reset state to IDLE so entity can move/find new targets
        if (this.state === EntityState.ATTACKING) {
            this.state = EntityState.IDLE;
            this.setAnimState('idle');
        }
    }

    /**
     * Gain experience (with diminishing returns at higher levels)
     * Formula from original: exp += addedXp / currentLevel
     */
    gainExperience(amount) {
        // Can't gain XP if at max level
        if (this.level >= this.maxLevel) return;
        if (amount <= 0) return;

        // Apply diminishing returns at higher levels
        const adjustedXp = EXPERIENCE.getAdjustedXp(amount, this.level);
        this.experience += adjustedXp;

        // Debug logging
        console.log(`[XP] ${this.unitType} gained ${adjustedXp} XP (base: ${amount}, level: ${this.level}) - Total: ${this.experience}/${this.prevExp + this.levelUpXp}`);

        // Check for level up(s)
        while (this.experience - this.prevExp >= this.levelUpXp &&
               this.level < this.maxLevel) {
            this.prevExp += this.levelUpXp;
            this.levelUp();
        }
    }

    /**
     * Level up - increase stats based on unit type
     */
    levelUp() {
        this.level++;

        // Apply stat increases
        this.applyLevelUpStats();

        // Play level up sound
        if (this.game && this.game.playSoundAt) {
            this.game.playSoundAt(SOUNDS.UNIT_LEVELUP, this.worldX, this.worldY);
        }

        // Show level up visual effect
        this.showLevelUpEffect();

        console.log(`${this.unitType} leveled up to ${this.level}!`);
    }

    /**
     * Apply stat increases for a level up
     */
    applyLevelUpStats() {
        // Increase primary stat based on unit type (every odd level)
        const primaryStat = LEVEL_UP.getPrimaryStatIncrease(this.unitTypeId, this.level);
        if (primaryStat && this[primaryStat] < LEVEL_UP.STAT_CAP) {
            this[primaryStat]++;
        }

        // Increase combat skill based on attack type
        if (this.attackType === ATTACK_TYPE.MELEE) {
            if (this.H2H < LEVEL_UP.STAT_CAP) this.H2H++;
        } else if (this.attackType === ATTACK_TYPE.RANGED) {
            if (this.ranged < LEVEL_UP.STAT_CAP) this.ranged++;
        }

        // Increase parry and dodge
        if (this.parry < LEVEL_UP.STAT_CAP) this.parry++;
        if (this.dodge < LEVEL_UP.STAT_CAP) this.dodge++;

        // Special: Barbarians double regeneration at level 6
        if (this.unitTypeId === UNIT_TYPE.BARBARIAN && this.level === 6) {
            this.regeneration = (this.regeneration || 1) * 4;
        }

        // Special: Wizards increase resurrection counter
        if (this.unitTypeId === UNIT_TYPE.WIZARD_HEALER) {
            this.resurrectionCounter = (this.resurrectionCounter || 0) + 1;
        }

        // HP increase based on vitality
        const hpIncrease = LEVEL_UP.getHpIncrease(this.vitality);
        this.maxHealth += hpIncrease;
        this.health = this.maxHealth;  // Full heal on level up

        // Recalculate damage from new stats
        this.calculateDamageFromStats();
    }

    /**
     * Show level up visual effect
     */
    showLevelUpEffect() {
        if (!this.sprite || !this.sprite.parent) return;

        // Create a glowing ring effect
        const ring = new PIXI.Graphics();
        ring.circle(0, 0, 25);
        ring.stroke({ width: 3, color: 0xffff00, alpha: 1.0 });
        ring.x = this.worldX;
        ring.y = this.worldY - 15;
        ring.zIndex = 99998;

        this.sprite.parent.addChild(ring);

        // Create level up text
        const levelText = new PIXI.Text({
            text: `Lv.${this.level}!`,
            style: {
                fontFamily: 'Arial',
                fontSize: 14,
                fill: 0xffff00,
                fontWeight: 'bold',
                stroke: { color: 0x000000, width: 2 }
            }
        });
        levelText.x = this.worldX - 20;
        levelText.y = this.worldY - 45;
        levelText.zIndex = 99999;

        this.sprite.parent.addChild(levelText);

        // Animate: ring expands and fades, text floats up
        let alpha = 1.0;
        let scale = 1.0;
        let yOffset = 0;
        const animCallback = () => {
            alpha -= VISUAL.LEVEL_UP_FADE_RATE;
            scale += VISUAL.LEVEL_UP_SCALE_RATE;
            yOffset -= 0.5;

            ring.alpha = alpha;
            ring.scale.set(scale);
            levelText.alpha = alpha;
            levelText.y = this.worldY - 45 + yOffset;

            if (alpha <= 0) {
                PIXI.Ticker.shared.remove(animCallback);
                if (ring.parent) ring.parent.removeChild(ring);
                if (levelText.parent) levelText.parent.removeChild(levelText);
                ring.destroy();
                levelText.destroy();
            }
        };
        PIXI.Ticker.shared.add(animCallback);
    }

    /**
     * Show upgrade visual effect (floating text + flash)
     * @param {string} upgradeType - 'weapon' or 'armor'
     */
    showUpgradeEffect(upgradeType) {
        if (!this.sprite || !this.sprite.parent) return;

        // Color based on upgrade type
        const color = upgradeType === 'weapon' ? 0xff6644 : 0x44aaff;
        const text = upgradeType === 'weapon' ? '+Weapon' : '+Armor';

        // Create flash effect (brief color overlay)
        const flash = new PIXI.Graphics();
        flash.circle(0, -20, 25);
        flash.fill({ color: color, alpha: 0.6 });
        flash.x = this.worldX;
        flash.y = this.worldY;
        flash.zIndex = 99998;
        this.sprite.parent.addChild(flash);

        // Create floating text
        const upgradeText = new PIXI.Text({
            text: text,
            style: {
                fontSize: 14,
                fill: color,
                fontWeight: 'bold',
                stroke: { color: 0x000000, width: 2 }
            }
        });
        upgradeText.anchor.set(0.5);
        upgradeText.x = this.worldX;
        upgradeText.y = this.worldY - 35;
        upgradeText.zIndex = 99999;
        this.sprite.parent.addChild(upgradeText);

        // Animate: flash fades quickly, text floats up
        let alpha = 1.0;
        let flashAlpha = 0.6;
        let yOffset = 0;
        const animCallback = () => {
            alpha -= 0.025;
            flashAlpha -= 0.1;  // Flash fades faster
            yOffset -= 0.8;

            flash.alpha = Math.max(0, flashAlpha);
            upgradeText.alpha = alpha;
            upgradeText.y = this.worldY - 35 + yOffset;

            if (alpha <= 0) {
                PIXI.Ticker.shared.remove(animCallback);
                if (flash.parent) flash.parent.removeChild(flash);
                if (upgradeText.parent) upgradeText.parent.removeChild(upgradeText);
                flash.destroy();
                upgradeText.destroy();
            }
        };
        PIXI.Ticker.shared.add(animCallback);
    }

    /**
     * Die
     */
    die() {
        super.die();
        this.stopMoving();
        this.clearAttackTarget();

        // Update health bar to show 0 HP before hiding
        this.updateHealthBar();
        this.hideHealthBar();

        // Vacate the cell we're on
        this.vacateCell(this.gridI, this.gridJ);

        // Deselect this unit if it was selected
        if (this.game && this.game.selectedUnit === this) {
            this.setSelected(false);
            this.game.selectedUnit = null;
            // Hide unit menu
            if (this.game.unitMenu) {
                this.game.unitMenu.hide();
            }
        }

        // Award gold to player treasury when enemy dies (not collected by hero)
        if (this.team === 'enemy' && this.game) {
            const goldReward = this.getGoldReward();
            this.game.gold += goldReward;
            console.log(`+${goldReward} gold from kill (treasury: ${this.game.gold})`);
            // Play gold sound
            if (this.game.playSound) {
                this.game.playSound(SOUNDS.GOLD);
            }
        }

        // If a hero dies, drop their gold
        if (this.objectType === OBJECT_TYPE.HERO && this.game) {
            const droppedGold = Math.floor((this.gold + this.taxGold) * GAME_RULES.HERO_DEATH_GOLD_LOSS);
            if (droppedGold > 0) {
                console.log(`Hero died! Lost ${this.gold + this.taxGold - droppedGold} gold`);
                // TODO: Create gold pile at death location
            }
            this.gold = 0;
            this.taxGold = 0;
        }

        // Play death sound
        if (this.game && this.game.playSoundAt) {
            const deathSound = getDeathSoundForUnit(this.unitType);
            this.game.playSoundAt(deathSound, this.worldX, this.worldY);
        }

        // Play death animation if available
        if (this.useAnimations && this.animSprite) {
            this.setAnimState('death');
            this.animSprite.loop = false;  // Don't loop death animation
        }
    }

    /**
     * Get gold reward for killing this unit
     * Uses stats from GameConfig
     */
    getGoldReward() {
        return GOLD.getKillGold({ deadGold: this.deadGold || 20 });
    }

    /**
     * Get XP reward for killing this unit
     */
    getExpReward() {
        return EXPERIENCE.getKillXp({ deadExp: this.deadExp || 100 });
    }

    /**
     * Get XP for damage dealt (original game mechanic)
     * Distributes total XP (deadExp) across all damage dealt.
     * Tracks leaveExp to ensure total XP given never exceeds deadExp.
     * @param {number} damage - Damage dealt
     * @returns {number} XP to award
     */
    getKickExp(damage) {
        // Calculate XP based on damage
        const expPerDmg = this.expPerDmg || Math.floor((this.deadExp || 100) / (this.maxHealth || 100));
        let xpGain = expPerDmg * damage;

        // Track accumulated XP given
        this.leaveExp = (this.leaveExp || 0) + xpGain;

        // Cap at deadExp - don't give more XP than the enemy is worth
        const deadExp = this.deadExp || 100;
        if (this.leaveExp > deadExp) {
            const overflow = this.leaveExp - deadExp;
            xpGain -= overflow;
            this.leaveExp = deadExp;
        }

        // Ensure non-negative
        return Math.max(0, xpGain);
    }

    /**
     * Serialize entity state
     */
    serialize() {
        return {
            ...super.serialize(),
            speed: this.speed,
            direction: this.direction,
            level: this.level,
            experience: this.experience,
            damage: this.damage,
            attackRange: this.attackRange,
            bodyColor: this.bodyColor
        };
    }

    /**
     * Deserialize entity state
     */
    deserialize(data) {
        super.deserialize(data);
        this.speed = data.speed || 2;
        this.direction = data.direction || 4;
        this.level = data.level || 1;
        this.experience = data.experience || 0;
        this.damage = data.damage || 10;
        this.attackRange = data.attackRange || 1;
        if (data.bodyColor) {
            this.setBodyColor(data.bodyColor);
        }
    }
}
