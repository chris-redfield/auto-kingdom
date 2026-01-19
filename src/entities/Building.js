/**
 * Building - Static entity class for buildings/structures
 * Extends Entity (not DynamicEntity - buildings don't move)
 *
 * Used for: Castle, Guilds, Marketplace, etc.
 */

import { Entity, EntityType } from './Entity.js';
import { BuildingType, EntityState } from '../utils/Constants.js';
import * as IsoMath from '../world/IsoMath.js';

export class Building extends Entity {
    /**
     * Create a new building
     * @param {number} gridI - Grid column
     * @param {number} gridJ - Grid row
     * @param {number} buildingType - BuildingType constant
     */
    constructor(gridI, gridJ, buildingType = BuildingType.CASTLE) {
        super(gridI, gridJ);

        this.type = EntityType.BUILDING;
        this.buildingType = buildingType;

        // Buildings have more health than units
        this.maxHealth = 500;
        this.health = this.maxHealth;
        this.armor = 5;

        // Team/ownership (0 = player, 1 = enemy, 2 = neutral)
        this.team = 0;

        // Building size in grid cells (most buildings are 2x2 or 3x3)
        this.sizeI = 2;
        this.sizeJ = 2;

        // Visual dimensions (pixels)
        this.width = 80;
        this.height = 100;

        // Animation
        this.animationLoader = null;
        this.packageId = 1;  // Package 1 contains buildings
        this.animId = 0;     // Will be set based on buildingType
        this.frameId = 0;

        // Building state
        this.constructed = true;  // False during construction
        this.level = 1;           // Upgrade level
    }

    /**
     * Initialize sprite with placeholder graphics
     */
    initSprite() {
        this.sprite = new PIXI.Container();

        // Placeholder: colored rectangle based on team
        const graphics = new PIXI.Graphics();
        const color = this.team === 0 ? 0x4488ff :
                      this.team === 1 ? 0xff4444 : 0x888888;

        // Draw building shape (house-like)
        graphics.rect(-this.width/2, -this.height, this.width, this.height);
        graphics.fill(color);

        // Roof
        graphics.moveTo(-this.width/2 - 5, -this.height);
        graphics.lineTo(0, -this.height - 30);
        graphics.lineTo(this.width/2 + 5, -this.height);
        graphics.closePath();
        graphics.fill(color * 0.8);

        // Outline
        graphics.rect(-this.width/2, -this.height, this.width, this.height);
        graphics.stroke({ width: 2, color: 0x000000 });

        this.sprite.addChild(graphics);
        this.updateSpritePosition();
    }

    /**
     * Initialize sprite with real animations from AnimationLoader
     * @param {AnimationLoader} animLoader - Loaded animation data
     * @param {number} packageId - Animation package ID
     * @param {number} animId - Animation ID within package
     */
    initAnimatedSprite(animLoader, packageId, animId) {
        this.animationLoader = animLoader;
        this.packageId = packageId;
        this.animId = animId;
        this.frameId = 0;

        // Store old sprite's parent so we can add new sprite to same container
        const parent = this.sprite ? this.sprite.parent : null;

        // Remove old sprite from parent
        if (this.sprite && this.sprite.parent) {
            this.sprite.parent.removeChild(this.sprite);
            this.sprite.destroy();
        }

        // Create new container for animated sprite
        this.sprite = new PIXI.Container();
        this.updateAnimationFrame();
        this.updateSpritePosition();

        // Re-add to parent container
        if (parent) {
            parent.addChild(this.sprite);
        }
    }

    /**
     * Update animation frame display
     */
    updateAnimationFrame() {
        if (!this.animationLoader || !this.sprite) return;

        // Remove old frame
        while (this.sprite.children.length > 0) {
            const child = this.sprite.children[0];
            this.sprite.removeChild(child);
            if (child !== this.selectionIndicator) {
                child.destroy();
            }
        }

        // Add new frame
        const frameContainer = this.animationLoader.createFrameContainer(
            this.packageId,
            this.animId,
            this.frameId
        );

        if (frameContainer) {
            this.sprite.addChild(frameContainer);
        }

        // Re-add selection indicator if selected
        if (this.selected && this.selectionIndicator) {
            this.sprite.addChild(this.selectionIndicator);
        }
    }

    /**
     * Update sprite position (override for building offset)
     */
    updateSpritePosition() {
        if (this.sprite) {
            this.sprite.x = this.worldX;
            this.sprite.y = this.worldY;
            // Buildings need higher z-index since they're taller
            this.sprite.zIndex = IsoMath.getDepthAtWorld(this.worldX, this.worldY) + 100;
        }
    }

    /**
     * Get bounding box (larger for buildings)
     */
    getBounds() {
        return {
            x: this.worldX - this.width/2,
            y: this.worldY - this.height,
            width: this.width,
            height: this.height
        };
    }

    /**
     * Update selection indicator (larger for buildings)
     */
    updateSelectionIndicator() {
        if (!this.sprite) return;

        if (this.selected) {
            if (!this.selectionIndicator) {
                // Create larger selection ellipse for buildings
                this.selectionIndicator = new PIXI.Graphics();
                this.selectionIndicator.ellipse(0, 0, this.width/2 + 5, this.sizeI * 15);
                this.selectionIndicator.stroke({ width: 3, color: 0x00ff00 });
                this.sprite.addChild(this.selectionIndicator);
            }
            this.selectionIndicator.visible = true;
        } else if (this.selectionIndicator) {
            this.selectionIndicator.visible = false;
        }
    }

    /**
     * Get occupied grid cells
     * @returns {Array} Array of {i, j} positions
     */
    getOccupiedCells() {
        const cells = [];
        for (let di = 0; di < this.sizeI; di++) {
            for (let dj = 0; dj < this.sizeJ; dj++) {
                cells.push({
                    i: this.gridI + di,
                    j: this.gridJ + dj
                });
            }
        }
        return cells;
    }

    /**
     * Lock occupied cells on grid
     * @param {Grid} grid - Grid to lock cells on
     */
    lockCells(grid) {
        const cells = this.getOccupiedCells();
        for (const cell of cells) {
            grid.lock(cell.i, cell.j);
        }
    }

    /**
     * Update building (called each game tick)
     */
    update(deltaTime) {
        // Buildings are mostly static, but could have animated effects
        // e.g., smoke from chimney, flags waving, etc.
    }

    /**
     * Handle building death/destruction
     */
    die() {
        this.state = EntityState.DYING;
        this.health = 0;
        // Could play destruction animation here
        // For now, just mark as dead after a delay
        setTimeout(() => {
            this.state = EntityState.DEAD;
        }, 500);
    }

    /**
     * Get building name for UI
     */
    getName() {
        const names = {
            [BuildingType.CASTLE]: 'Castle',
            [BuildingType.WARRIOR_GUILD]: 'Warrior Guild',
            [BuildingType.RANGER_GUILD]: 'Ranger Guild',
            [BuildingType.WIZARD_GUILD]: 'Wizard Guild',
            [BuildingType.BLACKSMITH]: 'Blacksmith',
            [BuildingType.MARKETPLACE]: 'Marketplace',
            [BuildingType.ELF_BUNGALOW]: 'Elf Bungalow',
            [BuildingType.DWARF_WINDMILL]: 'Dwarf Windmill',
            [BuildingType.GNOME_HOVEL]: 'Gnome Hovel',
            [BuildingType.LIBRARY]: 'Library'
        };
        return names[this.buildingType] || 'Building';
    }

    /**
     * Serialize building state
     */
    serialize() {
        return {
            ...super.serialize(),
            buildingType: this.buildingType,
            team: this.team,
            level: this.level,
            constructed: this.constructed
        };
    }
}
