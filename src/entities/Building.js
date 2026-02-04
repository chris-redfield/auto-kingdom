/**
 * Building - Static entity class for buildings/structures
 * Extends Entity (not DynamicEntity - buildings don't move)
 *
 * Used for: Castle, Guilds, Marketplace, etc.
 */

import { Entity, EntityType } from './Entity.js';
import { BuildingType, EntityState } from '../utils/Constants.js';
import * as IsoMath from '../world/IsoMath.js';
import {
    getBuildingHP,
    getBuildingConstructionTime,
    getBuildingSize,
    TIMERS,
    VISUAL
} from '../config/GameConfig.js';

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

        // Buildings have more health than units - get from config
        this.maxHealth = getBuildingHP(buildingType, 1);
        this.health = this.maxHealth;
        this.armor = 5;

        // Team/ownership (0 = player, 1 = enemy, 2 = neutral)
        this.team = 0;

        // Building size in grid cells - get from config
        const size = getBuildingSize(buildingType);
        this.sizeI = size.i;
        this.sizeJ = size.j;

        // Visual dimensions (pixels)
        this.width = 80;
        this.height = 100;

        // Animation
        this.animationLoader = null;
        this.packageId = 1;  // Package 1 contains buildings
        this.animId = 0;     // Will be set based on buildingType
        this.frameId = 0;
        this.frameCount = 0;
        this.animationTimer = 0;
        this.animationSpeed = TIMERS.BUILDING_ANIM_SPEED;

        // Building state
        this.constructed = true;  // False during construction
        this.level = 1;           // Upgrade level

        // Blacksmith upgrade tiers (max level heroes can purchase)
        // These are unlocked by the player paying gold
        this.weaponLevel = 1;     // Max weapon tier available (1-4)
        this.armorLevel = 1;      // Max armor tier available (1-4)

        // Construction properties
        this.constructionProgress = 0;    // 0 to 1
        this.constructionTime = getBuildingConstructionTime(buildingType);
        this.idleAnimId = null;           // Store idle animation to switch to after construction
        this.progressBar = null;          // Visual progress bar

        // Training properties (for guild buildings)
        this.isTraining = false;          // Currently training a hero
        this.trainingProgress = 0;        // 0 to 1
        this.trainingUnitType = null;     // Unit type being trained
        this.trainingTime = 5000;         // Training duration in ms (default 5 seconds)
        this.trainingCallback = null;     // Function to call when training completes
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
        this.animationTimer = 0;

        // Get frame count for this animation
        const anim = animLoader.getAnimation(packageId, animId);
        this.frameCount = anim ? anim.frameCount : 1;

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

        // Remove old frame (but preserve UI elements)
        while (this.sprite.children.length > 0) {
            const child = this.sprite.children[0];
            this.sprite.removeChild(child);
            if (child !== this.selectionIndicator && child !== this.progressBar) {
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

        // Re-add progress bar if under construction
        if (this.progressBar) {
            this.sprite.addChild(this.progressBar);
        }
    }

    /**
     * Update sprite position (override for building offset)
     */
    updateSpritePosition() {
        if (this.sprite) {
            this.sprite.x = this.worldX;
            this.sprite.y = this.worldY;
            // Use y position for z-index - same as entities for proper sorting
            // Units at higher y (in front of building) will render on top
            // Units at lower y (behind building) will render behind
            this.sprite.zIndex = IsoMath.getDepthAtWorld(this.worldX, this.worldY);
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
                // Create selection ellipse for buildings
                // Use consistent size based on building footprint (sizeI x sizeJ)
                const radiusX = Math.max(this.sizeI, this.sizeJ) * 20;
                const radiusY = radiusX * 0.5;  // Isometric perspective
                const offsetY = VISUAL.BUILDING_SELECTION_OFFSET_Y;

                this.selectionIndicator = new PIXI.Graphics();
                this.selectionIndicator.ellipse(0, offsetY, radiusX, radiusY);
                this.selectionIndicator.stroke({ width: 2, color: 0x00ff00 });
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
     * Start construction mode with build animation
     * @param {AnimationLoader} animLoader - Animation loader
     * @param {number} packageId - Animation package
     * @param {number} buildAnimId - Build animation ID
     * @param {number} idleAnimId - Idle animation ID to switch to when done
     * @param {number} constructionTime - Time to build in ms (optional)
     */
    startConstruction(animLoader, packageId, buildAnimId, idleAnimId, constructionTime = 5000) {
        this.constructed = false;
        this.constructionProgress = 0;
        this.constructionTime = constructionTime;
        this.idleAnimId = idleAnimId;

        // Initialize with build animation
        this.initAnimatedSprite(animLoader, packageId, buildAnimId);

        // Create progress bar
        this.createProgressBar();
    }

    /**
     * Create a progress bar above the building
     */
    createProgressBar() {
        if (!this.sprite) return;

        // Remove existing progress bar
        if (this.progressBar) {
            this.progressBar.destroy();
        }

        this.progressBar = new PIXI.Container();

        const barWidth = VISUAL.PROGRESS_BAR_WIDTH;
        const barHeight = VISUAL.PROGRESS_BAR_HEIGHT;
        const halfWidth = barWidth / 2;

        // Background bar (gray)
        const bgBar = new PIXI.Graphics();
        bgBar.rect(-halfWidth, -this.height - 20, barWidth, barHeight);
        bgBar.fill(0x333333);
        bgBar.stroke({ width: 1, color: 0x000000 });
        this.progressBar.addChild(bgBar);

        // Progress fill (green)
        const fillBar = new PIXI.Graphics();
        fillBar.rect(-halfWidth + 1, -this.height - 19, 0, barHeight - 2);
        fillBar.fill(0x44aa44);
        this.progressBar.fillBar = fillBar;
        this.progressBar.addChild(fillBar);

        this.sprite.addChild(this.progressBar);
    }

    /**
     * Update progress bar fill
     */
    updateProgressBar() {
        if (!this.progressBar || !this.progressBar.fillBar) return;

        const fillBar = this.progressBar.fillBar;
        fillBar.clear();
        const maxFillWidth = VISUAL.PROGRESS_BAR_FILL_WIDTH;
        const fillWidth = Math.floor(maxFillWidth * this.constructionProgress);
        const halfWidth = VISUAL.PROGRESS_BAR_WIDTH / 2;
        if (fillWidth > 0) {
            fillBar.rect(-halfWidth + 1, -this.height - 19, fillWidth, VISUAL.PROGRESS_BAR_HEIGHT - 2);
            fillBar.fill(0x44aa44);
        }
    }

    /**
     * Start training a hero unit
     * @param {string} unitType - Type of unit to train (e.g., 'WARRIOR')
     * @param {number} trainingTime - Time to train in ms
     * @param {function} callback - Called when training completes with (unitType)
     */
    startTraining(unitType, trainingTime, callback) {
        if (this.isTraining) {
            console.warn('Building is already training a unit');
            return false;
        }

        this.isTraining = true;
        this.trainingProgress = 0;
        this.trainingUnitType = unitType;
        this.trainingTime = trainingTime;
        this.trainingCallback = callback;

        console.log(`Started training ${unitType} (${trainingTime}ms)`);
        return true;
    }

    /**
     * Complete training - spawn the unit
     */
    completeTraining() {
        if (!this.isTraining) return;

        const unitType = this.trainingUnitType;
        const callback = this.trainingCallback;

        // Reset training state
        this.isTraining = false;
        this.trainingProgress = 0;
        this.trainingUnitType = null;
        this.trainingCallback = null;

        // Call the callback to spawn the unit
        if (callback) {
            callback(unitType);
        }

        console.log(`Training complete: ${unitType}`);
    }

    /**
     * Cancel training (refund handled by caller)
     */
    cancelTraining() {
        if (!this.isTraining) return false;

        this.isTraining = false;
        this.trainingProgress = 0;
        this.trainingUnitType = null;
        this.trainingCallback = null;

        console.log('Training cancelled');
        return true;
    }

    /**
     * Get training progress (0 to 1)
     */
    getTrainingProgress() {
        return this.trainingProgress;
    }

    /**
     * Complete construction - switch to idle animation
     */
    completeConstruction() {
        this.constructed = true;
        this.constructionProgress = 1;

        // Remove progress bar
        if (this.progressBar) {
            if (this.progressBar.parent) {
                this.progressBar.parent.removeChild(this.progressBar);
            }
            this.progressBar.destroy();
            this.progressBar = null;
        }

        // Switch to idle animation
        if (this.animationLoader && this.idleAnimId !== null) {
            this.initAnimatedSprite(this.animationLoader, this.packageId, this.idleAnimId);
        }
    }

    /**
     * Update building (called each game tick)
     */
    update(deltaTime) {
        // Handle construction progress
        if (!this.constructed) {
            this.constructionProgress += deltaTime / this.constructionTime;

            if (this.constructionProgress >= 1) {
                this.completeConstruction();
            } else {
                this.updateProgressBar();

                // During construction, frame is tied to progress (play once through)
                if (this.animationLoader && this.frameCount > 1) {
                    const newFrame = Math.min(
                        Math.floor(this.constructionProgress * this.frameCount),
                        this.frameCount - 1
                    );
                    if (newFrame !== this.frameId) {
                        this.frameId = newFrame;
                        this.updateAnimationFrame();
                    }
                }
            }
            return;  // Don't run normal animation cycling during construction
        }

        // Update training progress
        if (this.isTraining) {
            this.trainingProgress += deltaTime / this.trainingTime;

            if (this.trainingProgress >= 1) {
                this.trainingProgress = 1;
                this.completeTraining();
            }
        }

        // Animate completed building (flags waving, smoke, etc.) - cycles continuously
        if (this.animationLoader && this.frameCount > 1) {
            this.animationTimer += deltaTime;

            if (this.animationTimer >= this.animationSpeed) {
                this.animationTimer = 0;
                this.frameId = (this.frameId + 1) % this.frameCount;
                this.updateAnimationFrame();
            }
        }
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
        }, TIMERS.BUILDING_DEATH_DELAY);
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
            0x24: 'Temple of Agrela',
            0x25: 'Temple of Krypta',
            0x26: 'Temple of Krolm',
            [BuildingType.BLACKSMITH]: 'Blacksmith',
            0x28: 'Guard Tower',
            [BuildingType.MARKETPLACE]: 'Marketplace',
            0x2a: 'Statue',
            [BuildingType.ELF_BUNGALOW]: 'Elven Bungalow',
            [BuildingType.DWARF_WINDMILL]: 'Dwarven Settlement',
            0x2d: 'Dwarf Tower',
            [BuildingType.GNOME_HOVEL]: 'Gnome Hovel',
            0x2f: 'Statue',
            0x30: 'Inn',
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
            constructed: this.constructed,
            weaponLevel: this.weaponLevel,
            armorLevel: this.armorLevel
        };
    }

    /**
     * Unlock next weapon tier at Blacksmith
     * @returns {boolean} True if upgrade succeeded
     */
    unlockWeaponTier() {
        if (this.weaponLevel >= 4) {
            console.log('Weapon tier already at max (4)');
            return false;
        }
        this.weaponLevel++;
        console.log(`Blacksmith weapon tier unlocked: ${this.weaponLevel}`);
        return true;
    }

    /**
     * Unlock next armor tier at Blacksmith
     * @returns {boolean} True if upgrade succeeded
     */
    unlockArmorTier() {
        if (this.armorLevel >= 4) {
            console.log('Armor tier already at max (4)');
            return false;
        }
        this.armorLevel++;
        console.log(`Blacksmith armor tier unlocked: ${this.armorLevel}`);
        return true;
    }

    /**
     * Check if a hero can upgrade their weapon at this Blacksmith
     * @param {DynamicEntity} hero - Hero to check
     * @returns {boolean} True if hero can upgrade
     */
    canHeroUpgradeWeapon(hero) {
        if (!hero) return false;
        // Hero's weapon level must be below building's unlocked tier
        return hero.weaponLevel < this.weaponLevel;
    }

    /**
     * Check if a hero can upgrade their armor at this Blacksmith
     * @param {DynamicEntity} hero - Hero to check
     * @returns {boolean} True if hero can upgrade
     */
    canHeroUpgradeArmor(hero) {
        if (!hero) return false;
        // Hero's armor level must be below building's unlocked tier
        return hero.armorLevel < this.armorLevel;
    }
}
