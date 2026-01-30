/**
 * Missile - Projectile entity (ported from Missile.smali)
 *
 * Represents projectiles fired by units:
 * - Arrows, fireballs, etc.
 * - Travels from source to target
 * - Deals damage on hit
 */

import { Entity, EntityType } from './Entity.js';
import * as IsoMath from '../world/IsoMath.js';
import { EntityState } from '../utils/Constants.js';

export class Missile extends Entity {
    /**
     * Create a new missile
     * @param {number} startX - Starting world X position
     * @param {number} startY - Starting world Y position
     * @param {Entity} target - Target entity
     * @param {number} damage - Damage to deal on hit
     * @param {Entity} owner - Entity that fired this missile
     */
    constructor(startX, startY, target, damage, owner = null) {
        // Convert world position to grid position (approximate)
        const gridPos = IsoMath.worldToGridRounded(startX, startY);
        super(gridPos.i, gridPos.j);

        this.type = EntityType.PROJECTILE;

        // Override world position with exact start position
        this.worldX = startX;
        this.worldY = startY;

        // Target
        this.target = target;
        this.targetWorldX = target.worldX;
        this.targetWorldY = target.worldY;

        // Combat
        this.damage = damage;
        this.owner = owner;

        // Movement
        this.speed = 8;  // Faster than units

        // Visual
        this.color = 0xffaa00;  // Orange/yellow by default
        this.size = 4;

        // Lifespan (in case target dies or is invalid)
        this.maxLifetime = 3000;  // 3 seconds max
        this.lifetime = 0;

        // State
        this.state = EntityState.MOVING;
        this.active = true;
    }

    /**
     * Initialize the sprite
     */
    initSprite() {
        this.sprite = new PIXI.Graphics();

        // Draw a small circle/dot for the projectile
        this.sprite.circle(0, 0, this.size);
        this.sprite.fill(this.color);

        // Add a trail effect
        const trail = new PIXI.Graphics();
        trail.circle(-2, 0, this.size * 0.6);
        trail.fill({ color: this.color, alpha: 0.5 });
        trail.x = -3;
        this.sprite.addChild(trail);

        this.updateSpritePosition();
    }

    /**
     * Set missile color (for different projectile types)
     */
    setColor(color) {
        this.color = color;
        if (this.sprite) {
            this.sprite.clear();
            this.sprite.circle(0, 0, this.size);
            this.sprite.fill(color);
        }
    }

    /**
     * Update missile (called each game tick)
     */
    update(deltaTime) {
        if (!this.active) return;

        this.lifetime += deltaTime;

        // Check for timeout
        if (this.lifetime >= this.maxLifetime) {
            this.destroy();
            return;
        }

        // Update target position (track moving targets)
        if (this.target && this.target.isAlive()) {
            this.targetWorldX = this.target.worldX;
            this.targetWorldY = this.target.worldY;
        }

        // Move towards target
        const dx = this.targetWorldX - this.worldX;
        const dy = this.targetWorldY - this.worldY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.speed) {
            // Hit the target
            this.onHit();
        } else {
            // Move towards target
            this.worldX += (dx / dist) * this.speed;
            this.worldY += (dy / dist) * this.speed;

            // Rotate sprite to face direction of travel
            if (this.sprite) {
                this.sprite.rotation = Math.atan2(dy, dx);
            }
        }

        // Update sprite position
        this.updateSpritePosition();
    }

    /**
     * Called when missile hits the target
     */
    onHit() {
        // Deal damage to target
        if (this.target && this.target.isAlive()) {
            const killed = this.target.takeDamage(this.damage, this.owner);

            // Give experience and gold to owner
            if (this.owner) {
                // XP for damage dealt (uses getKickExp for fair distribution)
                if (this.owner.gainExperience && this.target.getKickExp) {
                    const xpGained = this.target.getKickExp(this.damage);
                    this.owner.gainExperience(xpGained);
                }

                // Gold for hero units on kill (no extra XP - already distributed via getKickExp)
                if (killed) {
                    if (this.owner.addGold && this.owner.objectType === 1) {  // OBJECT_TYPE.HERO = 1
                        const goldEarned = this.target.deadGold || 20;
                        this.owner.addGold(goldEarned);
                    }
                }
            }
        }

        // Create hit effect (flash)
        this.createHitEffect();

        // Destroy missile
        this.destroy();
    }

    /**
     * Create a visual hit effect
     */
    createHitEffect() {
        if (!this.sprite || !this.sprite.parent) return;

        // Create a flash effect at impact point
        const flash = new PIXI.Graphics();
        flash.circle(0, 0, this.size * 2);
        flash.fill({ color: 0xffffff, alpha: 0.8 });
        flash.x = this.worldX;
        flash.y = this.worldY;

        const parent = this.sprite.parent;
        parent.addChild(flash);

        // Fade out using PIXI ticker (better than setInterval)
        let alpha = 0.8;
        const fadeCallback = () => {
            alpha -= 0.1;
            flash.alpha = alpha;
            if (alpha <= 0) {
                PIXI.Ticker.shared.remove(fadeCallback);
                if (flash.parent) {
                    flash.parent.removeChild(flash);
                }
                flash.destroy();
            }
        };
        PIXI.Ticker.shared.add(fadeCallback);
    }

    /**
     * Destroy missile
     */
    destroy() {
        this.active = false;
        super.destroy();
    }
}

/**
 * Missile types for different projectile appearances
 */
export const MissileType = {
    ARROW: { color: 0x8b4513, speed: 10, size: 3 },      // Brown arrow
    FIREBALL: { color: 0xff4400, speed: 6, size: 6 },    // Orange fireball
    ICEBOLT: { color: 0x00ccff, speed: 8, size: 5 },     // Blue ice
    ROCK: { color: 0x666666, speed: 4, size: 8 },        // Gray rock
    MAGIC: { color: 0xff00ff, speed: 7, size: 4 }        // Purple magic
};

/**
 * Factory function to create missiles with preset types
 */
export function createMissile(type, startX, startY, target, damage, owner) {
    const missile = new Missile(startX, startY, target, damage, owner);
    missile.color = type.color;
    missile.speed = type.speed;
    missile.size = type.size;
    return missile;
}
