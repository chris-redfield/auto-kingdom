/**
 * Entity - Base class for all game objects (ported from GameObject.smali)
 *
 * Contains common properties for all entities:
 * - Position (grid and world coordinates)
 * - Health/life
 * - State and flags
 * - Visual representation (sprite)
 */

import * as IsoMath from '../world/IsoMath.js';
import { EntityState } from '../utils/Constants.js';

// Entity types
export const EntityType = {
    UNKNOWN: 0,
    UNIT: 1,
    BUILDING: 2,
    PROJECTILE: 3,
    DECORATION: 4,
    RESOURCE: 5
};

export class Entity {
    /**
     * Create a new entity
     * @param {number} gridI - Initial grid column
     * @param {number} gridJ - Initial grid row
     */
    constructor(gridI = 0, gridJ = 0) {
        // Unique identifier
        this.id = Entity.nextId++;

        // Entity type
        this.type = EntityType.UNKNOWN;

        // Grid position (tile coordinates)
        this.gridI = gridI;
        this.gridJ = gridJ;

        // World position (pixel coordinates)
        const worldPos = IsoMath.gridToWorld(gridI, gridJ);
        this.worldX = worldPos.x;
        this.worldY = worldPos.y;

        // State
        this.state = EntityState.IDLE;
        this.flags = 0;
        this.active = true;
        this.visible = true;

        // Health
        this.health = 100;
        this.maxHealth = 100;
        this.armor = 0;

        // Combat
        this.damage = 0;
        this.attackRange = 1;
        this.attackSpeed = 1000;  // ms between attacks

        // Visual
        this.sprite = null;
        this.selected = false;
        this.selectionIndicator = null;

        // Relationships
        this.owner = null;      // Player/faction that owns this entity
        this.target = null;     // Current target (for combat/following)
        this.home = null;       // Home building (for units)

        // Animation
        this.animator = null;
        this.currentAnimation = null;
    }

    /**
     * Initialize the sprite (override in subclasses)
     */
    initSprite() {
        // Default: create a simple colored rectangle
        this.sprite = new PIXI.Graphics();
        this.sprite.rect(-10, -20, 20, 20);
        this.sprite.fill(0x888888);
        this.updateSpritePosition();
    }

    /**
     * Update sprite position to match world coordinates
     */
    updateSpritePosition() {
        if (this.sprite) {
            this.sprite.x = this.worldX;
            this.sprite.y = this.worldY;
            // Add small offset so entities render on top of buildings/decorations at same depth
            this.sprite.zIndex = IsoMath.getDepthAtWorld(this.worldX, this.worldY) + 0.5;
        }
    }

    /**
     * Set grid position and update world position
     */
    setGridPosition(i, j) {
        this.gridI = i;
        this.gridJ = j;
        const worldPos = IsoMath.gridToWorld(i, j);
        this.worldX = worldPos.x;
        this.worldY = worldPos.y;
        this.updateSpritePosition();
    }

    /**
     * Set world position and update grid position
     */
    setWorldPosition(x, y) {
        this.worldX = x;
        this.worldY = y;
        const gridPos = IsoMath.worldToGridRounded(x, y);
        this.gridI = gridPos.i;
        this.gridJ = gridPos.j;
        this.updateSpritePosition();
    }

    /**
     * Get current world position
     */
    getWorldPosition() {
        return { x: this.worldX, y: this.worldY };
    }

    /**
     * Get current grid position
     */
    getGridPosition() {
        return { i: this.gridI, j: this.gridJ };
    }

    /**
     * Update entity (called each game tick)
     * @param {number} deltaTime - Time since last update in ms
     */
    update(deltaTime) {
        // Override in subclasses
        if (this.animator) {
            this.animator.update(deltaTime);
        }
    }

    /**
     * Take damage
     * @param {number} amount - Damage amount
     * @param {Entity} source - Entity that caused the damage
     * @returns {boolean} True if entity died
     */
    takeDamage(amount, source = null) {
        // NOTE: Armor is already applied in rollDamage() -> COMBAT.calculateDamage()
        // Do NOT apply armor here again - amount is already the final damage
        this.health -= amount;

        if (this.health <= 0) {
            this.health = 0;
            this.die();
            return true;
        }
        return false;
    }

    /**
     * Heal entity
     * @param {number} amount - Heal amount
     */
    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }

    /**
     * Check if entity is alive
     */
    isAlive() {
        return this.health > 0 && this.state !== EntityState.DEAD;
    }

    /**
     * Check if entity is dead
     */
    isDead() {
        return this.state === EntityState.DEAD || this.health <= 0;
    }

    /**
     * Kill the entity
     */
    die() {
        this.state = EntityState.DYING;
        this.health = 0;
        // Subclasses can override to add death animation, etc.
    }

    /**
     * Set selected state
     */
    setSelected(selected) {
        this.selected = selected;
        this.updateSelectionIndicator();
    }

    /**
     * Update selection indicator visibility
     */
    updateSelectionIndicator() {
        if (!this.sprite) return;

        if (this.selected) {
            if (!this.selectionIndicator) {
                // Create selection circle
                this.selectionIndicator = new PIXI.Graphics();
                this.selectionIndicator.ellipse(0, 0, 20, 10);
                this.selectionIndicator.stroke({ width: 2, color: 0x00ff00 });
                this.sprite.addChild(this.selectionIndicator);
            }
            this.selectionIndicator.visible = true;
        } else if (this.selectionIndicator) {
            this.selectionIndicator.visible = false;
        }
    }

    /**
     * Get bounding box for hit testing
     */
    getBounds() {
        return {
            x: this.worldX - 15,
            y: this.worldY - 30,
            width: 30,
            height: 35
        };
    }

    /**
     * Check if point is inside entity
     */
    containsPoint(worldX, worldY) {
        const bounds = this.getBounds();
        return (
            worldX >= bounds.x &&
            worldX <= bounds.x + bounds.width &&
            worldY >= bounds.y &&
            worldY <= bounds.y + bounds.height
        );
    }

    /**
     * Get distance to another entity (in grid units)
     */
    distanceTo(other) {
        return IsoMath.gridDistanceEuclidean(
            this.gridI, this.gridJ,
            other.gridI, other.gridJ
        );
    }

    /**
     * Get Manhattan distance to another entity
     */
    manhattanDistanceTo(other) {
        return IsoMath.gridDistance(
            this.gridI, this.gridJ,
            other.gridI, other.gridJ
        );
    }

    /**
     * Check if another entity is within attack range
     */
    isInAttackRange(other) {
        return this.manhattanDistanceTo(other) <= this.attackRange;
    }

    /**
     * Destroy entity and clean up resources
     */
    destroy() {
        this.active = false;
        if (this.sprite) {
            if (this.sprite.parent) {
                this.sprite.parent.removeChild(this.sprite);
            }
            this.sprite.destroy();
            this.sprite = null;
        }
        if (this.selectionIndicator) {
            this.selectionIndicator.destroy();
            this.selectionIndicator = null;
        }
    }

    /**
     * Serialize entity state (for saving)
     */
    serialize() {
        return {
            id: this.id,
            type: this.type,
            gridI: this.gridI,
            gridJ: this.gridJ,
            health: this.health,
            maxHealth: this.maxHealth,
            state: this.state
        };
    }

    /**
     * Deserialize entity state (for loading)
     */
    deserialize(data) {
        this.gridI = data.gridI;
        this.gridJ = data.gridJ;
        this.health = data.health;
        this.maxHealth = data.maxHealth;
        this.state = data.state;
        this.setGridPosition(data.gridI, data.gridJ);
    }
}

// Static ID counter
Entity.nextId = 1;
