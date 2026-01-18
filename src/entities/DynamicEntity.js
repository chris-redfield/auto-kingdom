/**
 * DynamicEntity - Moving entity (ported from DynamicObject.smali)
 *
 * Extends Entity with:
 * - Movement and pathfinding
 * - Direction (8-directional)
 * - Speed and velocity
 * - Target following
 * - Sprite animations (optional)
 */

import { Entity, EntityType } from './Entity.js';
import * as IsoMath from '../world/IsoMath.js';
import { EntityState, FLD_BUSY, FLD_EMPTY } from '../utils/Constants.js';
import { AnimatedSprite } from '../graphics/AnimationLoader.js';
import { UNIT_ANIMS, GAME_DIR_TO_ANIM_DIR, getAnimId } from '../utils/AnimationConstants.js';
import { SOUNDS, getDeathSoundForUnit } from '../audio/SoundConstants.js';

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

        // Level and experience
        this.level = 1;
        this.experience = 0;
        this.experienceToLevel = 100;

        // Unit stats
        this.damage = 10;
        this.attackRange = 1;
        this.attackSpeed = 1000;  // ms between attacks
        this.sightRange = 8;      // Tiles for spotting enemies

        // Visual customization
        this.bodyColor = 0x4488ff;
        this.headColor = 0xffcc88;

        // Grid reference (set when added to game)
        this.grid = null;

        // Game reference (for spawning missiles, etc.)
        this.game = null;

        // Combat type
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
        this.animSprite.container.y = -20;  // Offset to match placeholder positioning

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
            // Clear existing children except health bar
            const healthBar = this.healthBar;
            this.sprite.removeChildren();
            this.initAnimatedSprite();
            if (healthBar) {
                this.sprite.addChild(healthBar);
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
        container.y = -38;

        // Background
        const bg = new PIXI.Graphics();
        bg.rect(-15, 0, 30, 4);
        bg.fill(0x333333);
        container.addChild(bg);

        // Health fill
        const fill = new PIXI.Graphics();
        fill.rect(-14, 1, 28, 2);
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
        this.healthBarFill.clear();
        this.healthBarFill.rect(-14, 1, 28 * healthPercent, 2);

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
        if (!this.moving && !this.attackTarget && Math.random() < 0.005) {
            this.wanderRandomly();
        }
    }

    /**
     * Find nearest enemy within sight range
     */
    findNearestEnemy() {
        if (!this.game || !this.game.entities) return null;

        let nearestEnemy = null;
        let nearestDist = this.sightRange;

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

        // If target has moved more than 2 tiles from where we're heading, reroute
        if (distFromDest > 2) {
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
            // Melee attack - deal damage directly
            const killed = target.takeDamage(this.damage, this);

            // Visual feedback for melee hit
            this.showMeleeEffect(target);

            // Play melee hit sound
            if (this.game && this.game.playSoundAt) {
                this.game.playSoundAt(SOUNDS.PHYSIC_UNIT_HIT_ENEMY, target.worldX, target.worldY);
            }

            // Give experience if killed
            if (killed) {
                this.gainExperience(25);
            }

            return killed;
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

        // Fade out and remove
        let alpha = 1.0;
        const fadeInterval = setInterval(() => {
            alpha -= 0.15;
            slash.alpha = alpha;
            if (alpha <= 0) {
                clearInterval(fadeInterval);
                if (slash.parent) {
                    slash.parent.removeChild(slash);
                }
                slash.destroy();
            }
        }, 40);
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
    }

    /**
     * Gain experience
     */
    gainExperience(amount) {
        this.experience += amount;

        // Check for level up
        while (this.experience >= this.experienceToLevel) {
            this.levelUp();
        }
    }

    /**
     * Level up
     */
    levelUp() {
        this.experience -= this.experienceToLevel;
        this.level++;
        this.experienceToLevel = Math.floor(this.experienceToLevel * 1.5);

        // Increase stats
        this.maxHealth += 10;
        this.health = this.maxHealth;
        this.damage += 2;

        // Play level up sound
        if (this.game && this.game.playSoundAt) {
            this.game.playSoundAt(SOUNDS.UNIT_LEVELUP, this.worldX, this.worldY);
        }

        console.log(`Entity ${this.id} leveled up to ${this.level}!`);
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

        // Fade out the sprite
        if (this.sprite) {
            this.sprite.alpha = 0.5;
        }
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
