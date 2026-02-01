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
import { EntityState, FLD_BUSY, FLD_EMPTY } from '../utils/Constants.js';
import { AnimatedSprite } from '../graphics/AnimationLoader.js';
import { UNIT_ANIMS, GAME_DIR_TO_ANIM_DIR, getAnimId } from '../utils/AnimationConstants.js';
import { SOUNDS, getDeathSoundForUnit } from '../audio/SoundConstants.js';
import {
    UNIT_TYPE, ATTACK_TYPE, OBJECT_TYPE,
    UNIT_BASE_STATS, LEVEL_UP, COMBAT, EXPERIENCE, GOLD,
    EQUIPMENT, ITEMS, SPEED,
    COMBAT_CONSTANTS, AI_CONFIG, VISUAL, GAME_RULES,
    getUnitStats, rollStat
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
        this.attackSpeed = 1000;  // ms between attacks
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

        // Inventory
        this.curePotionsCount = 0;
        this.hasRingOfProtection = false;
        this.hasAmuletOfTeleportation = false;
        this.amuletOfTeleportationTicks = 9999;

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

        // Damage (if specified, otherwise calculate from strength)
        if (stats.minDamage !== undefined) {
            this.minDamage = stats.minDamage;
            this.maxDamage = stats.maxDamage;
        } else {
            // Calculate damage from strength (heroes)
            this.calculateDamageFromStats();
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
     * Get total armor including equipment and enchantments
     */
    getTotalArmor() {
        let total = this.armor;

        // Armor from equipment level
        total += (this.armorLevel - 1) * COMBAT_CONSTANTS.ARMOR_DEFENSE_PER_LEVEL;

        // Enchantment bonus
        total += this.enchantedArmorLevel * COMBAT_CONSTANTS.ARMOR_ENCHANT_BONUS;

        // Ring of protection bonus
        if (this.hasRingOfProtection) {
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
     */
    processAI(deltaTime) {
        // Don't process if already engaged in combat or moving
        if (this.attackTarget && this.attackTarget.isAlive()) {
            return;  // Already has a target, let combat logic handle it
        }

        // Look for enemies to fight
        if (!this.attackTarget && this.game) {
            const enemy = this.findNearestEnemy();
            if (enemy) {
                this.setAttackTarget(enemy);
                return;
            }
        }

        // Idle behavior - random wandering
        if (!this.moving && !this.attackTarget && Math.random() < AI_CONFIG.WANDER_CHANCE) {
            this.wanderRandomly();
        }
    }

    /**
     * Find nearest enemy within sight range
     * Searches both units and buildings
     */
    findNearestEnemy() {
        if (!this.game) return null;

        let nearestEnemy = null;
        let nearestDist = this.sightRange;

        // First, check enemy units
        if (this.game.entities) {
            for (const entity of this.game.entities) {
                // Skip self, dead, and same team
                if (entity === this) continue;
                if (!entity.isAlive()) continue;
                if (entity.team === this.team) continue;

                const dist = this.distanceTo(entity);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestEnemy = entity;
                }
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
                return { i, j };
            }
        }

        return null;
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
            // Ranged attack - spawn missile
            if (this.game && this.game.spawnMissile) {
                this.game.spawnMissile(this, target);
            }
            // Play ranged attack sound
            if (this.game && this.game.playSoundAt) {
                this.game.playSoundAt(SOUNDS.RANGE_UNIT_SHOT, this.worldX, this.worldY);
            }
            return false;  // Damage dealt by missile on impact
        } else {
            // Melee attack - check hit with stats
            const hitResult = this.rollAttackHit(target);

            if (hitResult.hit) {
                // Calculate damage using stats
                const damage = this.rollDamage(target);
                const killed = target.takeDamage(damage, this);

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

        // Calculate base damage with target's armor
        const targetArmor = target.getTotalArmor ? target.getTotalArmor() : (target.armor || 0);
        return COMBAT.calculateDamage(
            this.minDamage + attackerBonus,
            this.maxDamage + attackerBonus,
            targetArmor
        );
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
     * Die
     */
    die() {
        super.die();
        this.stopMoving();
        this.clearAttackTarget();

        // Vacate the cell we're on
        this.vacateCell(this.gridI, this.gridJ);

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
