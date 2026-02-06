/**
 * Game - Main game state machine (ported from Game.smali)
 *
 * Manages game states, entities, and coordinates all systems
 */

import { GameState, SCREEN_WIDTH, SCREEN_HEIGHT, BuildingType } from '../utils/Constants.js';
import { Camera } from '../graphics/Camera.js';
import { Grid } from '../world/Grid.js';
import * as IsoMath from '../world/IsoMath.js';
import { DynamicEntity } from '../entities/DynamicEntity.js';
import { Building } from '../entities/Building.js';
import { Missile, MissileType, createMissile } from '../entities/Missile.js';
// HUD disabled - using external HTML UI instead
// import { HUD } from '../ui/HUD.js';
import { AnimationLoader } from '../graphics/AnimationLoader.js';
import { UNIT_ANIMS, BUILDING_ANIMS } from '../utils/AnimationConstants.js';
import { getSoundManager } from '../audio/SoundManager.js';
import { SOUNDS, MUSIC } from '../audio/SoundConstants.js';
import { MapLoader } from '../world/MapLoader.js';
import { SpawnManager } from '../systems/SpawnManager.js';
import { BuildingMenu } from '../ui/BuildingMenu.js';
import { UnitMenu } from '../ui/UnitMenu.js';
import {
    UNIT_TYPE,
    OBJECT_TYPE,
    GAME_RULES,
    AI_CONFIG,
    VISUAL,
    TIMERS,
    GRID_CONFIG,
} from '../config/GameConfig.js';

export class Game {
    constructor(app, input, assetLoader) {
        this.app = app;              // PixiJS Application
        this.input = input;          // Input handler
        this.assetLoader = assetLoader;  // Asset loader
        this.state = GameState.INIT;
        this.previousState = GameState.INIT;

        // Camera
        this.camera = null;

        // Game world container
        this.worldContainer = null;
        this.uiContainer = null;

        // Entities
        this.entities = [];

        // Buildings (static structures)
        this.buildings = [];

        // Missiles (projectiles)
        this.missiles = [];

        // Game data
        this.gold = GAME_RULES.STARTING_GOLD;
        this.ticks = 0;

        // Game end flag (prevent multiple victory/defeat triggers)
        this.gameEnded = false;

        // Grid/Map
        this.grid = null;
        this.mapLoader = null;  // Loaded map data
        this.gridWidth = GRID_CONFIG.DEFAULT_GRID_WIDTH;    // Default, will be overridden by map
        this.gridHeight = GRID_CONFIG.DEFAULT_GRID_HEIGHT;

        // World size (calculated from grid)
        this.worldWidth = SCREEN_WIDTH * 2;
        this.worldHeight = SCREEN_HEIGHT * 2;

        // Debug
        this.debugMode = true;
        this.debugText = null;

        // Selected unit and building
        this.selectedUnit = null;
        this.selectedBuilding = null;

        // Hover highlight
        this.hoverHighlight = null;
        this.hoverTile = { i: -1, j: -1 };

        // Path visualization
        this.pathGraphics = null;

        // HUD disabled - using external HTML UI instead
        this.hud = null;

        // Animation system
        this.animLoader = new AnimationLoader();
        this.animationsLoaded = false;

        // Sound system
        this.soundManager = getSoundManager();
        this.soundsLoaded = false;

        // Spawn system
        this.spawnManager = new SpawnManager(this);

        // Player's castle reference (for win/lose conditions)
        this.playerCastle = null;

        // Building menu UI
        this.buildingMenu = null;  // Initialized after DOM is ready

        // Unit menu UI (for hero stats/inventory)
        this.unitMenu = null;  // Initialized after DOM is ready

        // Blacksmith upgrade levels
        this.weaponUpgradeLevel = 0;
        this.armorUpgradeLevel = 0;

        // Building placement mode
        this.placementMode = false;
        this.pendingBuilding = null;  // Building info being placed
        this.placementPreview = null; // Visual preview sprite

        this.init();
    }

    /**
     * Initialize game
     */
    init() {
        // Create world container (for game entities, will be scrollable)
        this.worldContainer = new PIXI.Container();
        this.app.stage.addChild(this.worldContainer);

        // Create UI container (fixed on screen, above world)
        this.uiContainer = new PIXI.Container();
        this.app.stage.addChild(this.uiContainer);

        // Create camera
        this.camera = new Camera(this.worldContainer);
        this.camera.setWorldBounds(this.worldWidth, this.worldHeight);

        // Link input to camera for coordinate conversion
        this.input.setCamera(this.camera);

        // Set up input callbacks
        this.setupInputCallbacks();

        // HUD disabled - using external HTML UI instead

        // Debug text (positioned in corner)
        if (this.debugMode) {
            this.debugText = new PIXI.Text({
                text: 'Majesty JS - Loading...',
                style: {
                    fontFamily: 'Arial',
                    fontSize: 12,
                    fill: 0x00ff00,
                    stroke: { color: 0x000000, width: 2 }
                }
            });
            this.debugText.x = 10;
            this.debugText.y = 10;
            this.uiContainer.addChild(this.debugText);
        }

        // Transition to game state (for prototype, skip menus)
        this.setState(GameState.GAME);

        // Load map and create world
        this.loadMapAndCreateWorld();
    }

    /**
     * Load map file and create game world with correct dimensions
     */
    async loadMapAndCreateWorld() {
        try {
            // Load map file
            this.mapLoader = new MapLoader();
            await this.mapLoader.load('./assets/maps/map0.m');
            console.log('Map loaded successfully!');
            console.log(`Dimensions: ${this.mapLoader.mapWidth}x${this.mapLoader.mapHeight}`);
            console.log(`Cell size: ${this.mapLoader.cellWidth}x${this.mapLoader.cellHeight}`);
            console.log(`Packages needed: ${this.mapLoader.packagesToLoad.join(', ')}`);
            console.log(`Terrain package: ${this.mapLoader.getTerrainPackage()}`);

            // Analyze overlay data for debugging
            this.mapLoader.analyzeOverlays();

            // Use map dimensions for grid
            this.gridWidth = this.mapLoader.mapWidth;
            this.gridHeight = this.mapLoader.mapHeight;

            // Load terrain tileset texture
            await this.loadTerrainTileset();

            // Now create the world with correct dimensions
            this.createTestContent();
        } catch (err) {
            console.error('Failed to load map:', err);
            // Fallback to default grid size
            this.createTestContent();
        }
    }

    /**
     * Load terrain tileset from the terrain package via AnimationLoader
     * Package 45 = grass, 46 = necro, 47 = snow
     *
     * IMPORTANT: Must use AnimationLoader to get per-frame offset data!
     * Each terrain tile has xOffset/yOffset that affects positioning.
     * Simply cutting up the PNG ignores these offsets and causes gaps.
     */
    async loadTerrainTileset() {
        if (!this.mapLoader) return;

        this.terrainPackage = this.mapLoader.getTerrainPackage();

        // Terrain will be loaded via AnimationLoader in loadAnimations()
        // Just store the package ID for now
        console.log(`Terrain package: ${this.terrainPackage} (will load via AnimationLoader)`);

        // Initialize empty - will be populated after AnimationLoader loads the package
        this.terrainTiles = [];
    }

    /**
     * Set up input callbacks
     */
    setupInputCallbacks() {
        // Click handler
        this.input.onClick((screenX, screenY, button, worldX, worldY) => {
            this.handleClick(screenX, screenY, button, worldX, worldY);
        });

        // Drag handler (for camera panning)
        this.input.onDrag((dx, dy, button) => {
            // Right-click drag or middle-click drag to pan camera
            if (button === 2 || button === 1) {
                this.camera.pan(dx, dy);
            }
        });

        // Key handler
        this.input.onKey((key, isDown) => {
            if (isDown) {
                this.handleKeyDown(key);
            }
        });
    }

    /**
     * Handle click events
     */
    handleClick(screenX, screenY, button, worldX, worldY) {
        if (this.state !== GameState.GAME) return;

        // Handle right-click to cancel placement mode
        if (button === 2 && this.placementMode) {
            this.cancelPlacementMode();
            return;
        }

        if (button === 0 && this.grid) {  // Left click
            // Convert to grid-local coordinates
            const localX = worldX - this.grid.container.x;
            const localY = worldY - this.grid.container.y;

            // Convert to grid position
            const gridPos = IsoMath.worldToGridRounded(localX, localY);

            // Handle building placement mode
            if (this.placementMode && this.pendingBuilding) {
                this.tryPlaceBuilding(gridPos.i, gridPos.j);
                return;
            }

            // Check if clicked on an entity first
            const clickedEntity = this.getEntityAt(localX, localY);

            if (clickedEntity) {
                // Don't interact with dead entities
                if (!clickedEntity.isAlive()) {
                    console.log('Clicked on dead entity, ignoring');
                    return;
                }

                // Check if clicking an enemy while having a unit selected
                if (this.selectedUnit &&
                    clickedEntity.team !== this.selectedUnit.team &&
                    clickedEntity.isAlive()) {
                    // Set attack target
                    this.selectedUnit.setAttackTarget(clickedEntity);

                    // Try to attack immediately if in range
                    if (this.selectedUnit.canAttack(clickedEntity)) {
                        this.selectedUnit.attack(clickedEntity);
                        console.log(`Attacking entity ${clickedEntity.id}!`);
                    } else if (this.selectedUnit.isInAttackRange(clickedEntity)) {
                        // In range but on cooldown - just wait
                        console.log(`Waiting for attack cooldown...`);
                    } else {
                        // Move towards enemy - use unit's findAttackPosition for proper range
                        const targetCell = this.selectedUnit.findAttackPosition(
                            clickedEntity.gridI,
                            clickedEntity.gridJ
                        );
                        if (targetCell) {
                            const moved = this.selectedUnit.moveTo(
                                targetCell.i,
                                targetCell.j,
                                this.grid
                            );
                            if (moved) {
                                console.log(`Moving to attack entity ${clickedEntity.id}`);
                            }
                        } else {
                            console.log('No path to target');
                        }
                    }
                } else {
                    // Select the clicked entity (friendly or self)
                    this.selectEntity(clickedEntity);
                    console.log(`Selected entity ${clickedEntity.id}`);
                }
            } else {
                // Check if clicked on a building
                const clickedBuilding = this.getBuildingAt(gridPos.i, gridPos.j);

                if (clickedBuilding && clickedBuilding.team === 0) {
                    // Player building - show building menu
                    this.handleBuildingClick(clickedBuilding, screenX, screenY);
                } else if (this.grid.isInBounds(gridPos.i, gridPos.j) &&
                           this.grid.isWalkable(gridPos.i, gridPos.j) &&
                           this.selectedUnit &&
                           this.selectedUnit.isAlive()) {
                    // Clear attack target when moving to empty tile
                    this.selectedUnit.clearAttackTarget();

                    // Move selected unit to clicked tile
                    const success = this.selectedUnit.moveTo(gridPos.i, gridPos.j, this.grid);

                    if (success) {
                        console.log(`Moving to (${gridPos.i}, ${gridPos.j})`);
                    } else {
                        console.log('No path found or already at destination');
                    }
                }
            }
        }
    }

    /**
     * Get building at grid position
     */
    getBuildingAt(gridI, gridJ) {
        for (const building of this.buildings) {
            // Check if position is within building's occupied cells
            if (gridI >= building.gridI && gridI < building.gridI + building.sizeI &&
                gridJ >= building.gridJ && gridJ < building.gridJ + building.sizeJ) {
                return building;
            }
        }
        return null;
    }

    /**
     * Handle click on a building - show building menu
     */
    handleBuildingClick(building, screenX, screenY) {
        // Deselect current unit
        if (this.selectedUnit && this.selectedUnit.setSelected) {
            this.selectedUnit.setSelected(false);
        }
        this.selectedUnit = null;

        // Hide unit menu
        if (this.unitMenu) {
            this.unitMenu.hide();
        }

        // Deselect previous building
        if (this.selectedBuilding && this.selectedBuilding.setSelected) {
            this.selectedBuilding.setSelected(false);
        }

        // Select this building
        this.selectedBuilding = building;
        if (building.setSelected) {
            building.setSelected(true);
        }

        // Initialize building menu if not already done
        if (!this.buildingMenu) {
            this.buildingMenu = new BuildingMenu(this);
        }

        // Show the building menu at click position
        if (this.buildingMenu) {
            this.buildingMenu.show(building, screenX, screenY);
        }

        console.log(`Selected ${building.getName()}`);
    }

    /**
     * Enter building placement mode
     */
    enterBuildingPlacementMode(buildingInfo) {
        this.placementMode = true;
        this.pendingBuilding = buildingInfo;

        // Show placement message
        this.showMessage(`Click to place ${buildingInfo.name} (Right-click to cancel)`);

        // Create placement preview
        this.createPlacementPreview(buildingInfo);

        console.log(`Entering placement mode for ${buildingInfo.name}`);
    }

    /**
     * Cancel building placement mode
     */
    cancelPlacementMode() {
        this.placementMode = false;
        this.pendingBuilding = null;

        // Remove preview from grid container
        if (this.placementPreview && this.grid) {
            this.grid.container.removeChild(this.placementPreview);
            this.placementPreview.destroy();
            this.placementPreview = null;
        }

        this.showMessage('Building cancelled');
        console.log('Placement mode cancelled');
    }

    /**
     * Create visual preview for building placement
     */
    createPlacementPreview(buildingInfo) {
        if (!this.grid) {
            console.error('Cannot create placement preview - grid is null!');
            return;
        }

        if (this.placementPreview) {
            this.grid.container.removeChild(this.placementPreview);
            this.placementPreview.destroy();
        }

        this.placementPreview = new PIXI.Graphics();
        this.placementPreview.zIndex = 10000;
        this.grid.container.addChild(this.placementPreview);
    }

    /**
     * Update placement preview position (called from update loop)
     */
    updatePlacementPreview() {
        if (!this.placementMode) return;
        if (!this.placementPreview) {
            console.warn('updatePlacementPreview: placementPreview is null');
            return;
        }
        if (!this.grid) {
            console.warn('updatePlacementPreview: grid is null');
            return;
        }

        // Get mouse position in world coordinates
        const worldPos = this.input.getWorldPosition();

        // Convert to grid-local coordinates
        const localX = worldPos.x - this.grid.container.x;
        const localY = worldPos.y - this.grid.container.y;

        // Snap to grid
        const gridPos = IsoMath.worldToGridRounded(localX, localY);

        // Clear and redraw
        this.placementPreview.clear();

        // Check validity
        const isValid = this.isValidPlacement(gridPos.i, gridPos.j, 2, 2);

        // Draw surrounding green tiles (1 tile border around the 2x2 building)
        const greenColor = 0x00ff00;
        for (let di = -1; di <= 2; di++) {
            for (let dj = -1; dj <= 2; dj++) {
                // Skip the center 2x2 (will be drawn in yellow)
                if (di >= 0 && di < 2 && dj >= 0 && dj < 2) continue;

                const corners = IsoMath.getTileCorners(gridPos.i + di, gridPos.j + dj);
                this.placementPreview.moveTo(corners[0].x, corners[0].y);
                this.placementPreview.lineTo(corners[1].x, corners[1].y);
                this.placementPreview.lineTo(corners[2].x, corners[2].y);
                this.placementPreview.lineTo(corners[3].x, corners[3].y);
                this.placementPreview.lineTo(corners[0].x, corners[0].y);
            }
        }
        this.placementPreview.fill({ color: greenColor, alpha: 0.25 });
        this.placementPreview.stroke({ width: 1, color: greenColor, alpha: 0.6 });

        // Draw center 2x2 building footprint in yellow (or red if invalid)
        const centerColor = isValid ? 0xffff00 : 0xff0000;
        for (let di = 0; di < 2; di++) {
            for (let dj = 0; dj < 2; dj++) {
                const corners = IsoMath.getTileCorners(gridPos.i + di, gridPos.j + dj);
                this.placementPreview.moveTo(corners[0].x, corners[0].y);
                this.placementPreview.lineTo(corners[1].x, corners[1].y);
                this.placementPreview.lineTo(corners[2].x, corners[2].y);
                this.placementPreview.lineTo(corners[3].x, corners[3].y);
                this.placementPreview.lineTo(corners[0].x, corners[0].y);
            }
        }
        this.placementPreview.fill({ color: centerColor, alpha: 0.4 });
        this.placementPreview.stroke({ width: 2, color: centerColor, alpha: 0.9 });
    }

    /**
     * Check if a building can be placed at the given position
     */
    isValidPlacement(gridI, gridJ, sizeI, sizeJ) {
        // Check all cells the building would occupy
        for (let di = 0; di < sizeI; di++) {
            for (let dj = 0; dj < sizeJ; dj++) {
                const i = gridI + di;
                const j = gridJ + dj;

                // Check bounds
                if (!this.grid.isInBounds(i, j)) {
                    return false;
                }

                // Check if cell is walkable (not blocked by terrain)
                if (!this.grid.isWalkable(i, j)) {
                    return false;
                }

                // Check if cell is occupied by another building
                const existingBuilding = this.getBuildingAt(i, j);
                if (existingBuilding) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * Try to place building at the specified position
     */
    tryPlaceBuilding(gridI, gridJ) {
        const buildingInfo = this.pendingBuilding;
        const sizeI = 2;
        const sizeJ = 2;

        // Check if placement is valid
        if (!this.isValidPlacement(gridI, gridJ, sizeI, sizeJ)) {
            this.showMessage("Can't build here!");
            if (this.playSound) {
                this.playSound(SOUNDS.CLICK_DENY);
            }
            return;
        }

        // Check if we can afford it
        if (this.gold < buildingInfo.cost) {
            this.showMessage(`Need ${buildingInfo.cost} gold!`);
            if (this.playSound) {
                this.playSound(SOUNDS.CLICK_DENY);
            }
            return;
        }

        // Deduct cost and place building
        this.gold -= buildingInfo.cost;

        // Create the building
        const building = new Building(gridI, gridJ, buildingInfo.type);
        building.team = 0;  // Player building
        building.game = this;
        building.initSprite();

        // Lock cells on grid
        building.lockCells(this.grid);

        // Add to grid container (not worldContainer - grid has its own offset)
        this.grid.container.addChild(building.sprite);
        this.buildings.push(building);

        // Initialize with animations if available (start in construction mode)
        if (this.animationsLoaded && this.animLoader) {
            this.initBuildingAnimation(building, true);  // true = start construction
        }

        // Exit placement mode
        this.cancelPlacementMode();

        // Show success message
        this.showMessage(`Building ${buildingInfo.name}...`);
        if (this.playSound) {
            this.playSound(SOUNDS.GOLD);
        }

        console.log(`Built ${buildingInfo.name} at (${gridI}, ${gridJ})`);
    }

    /**
     * Find a spawn position near a building (outside its footprint)
     */
    findSpawnPositionNearBuilding(building) {
        const sizeI = building.sizeI || 2;
        const sizeJ = building.sizeJ || 2;

        // Generate positions around the building perimeter
        // Southeast edge first (preferred spawn direction), then other edges
        const positions = [];

        // Southeast edge (bottom of building in isometric view) - preferred
        for (let di = 0; di < sizeI; di++) {
            positions.push([di, sizeJ]);  // South edge
        }
        for (let dj = 0; dj < sizeJ; dj++) {
            positions.push([sizeI, dj]);  // East edge
        }
        positions.push([sizeI, sizeJ]);  // Southeast corner

        // Southwest edge
        for (let dj = 0; dj < sizeJ; dj++) {
            positions.push([-1, dj]);
        }

        // Northeast edge
        for (let di = 0; di < sizeI; di++) {
            positions.push([di, -1]);
        }

        // Northwest corner
        positions.push([-1, -1]);

        // Check each position for walkability
        for (const [di, dj] of positions) {
            const i = building.gridI + di;
            const j = building.gridJ + dj;
            if (this.grid.isInBounds(i, j) && this.grid.isWalkable(i, j)) {
                // Also check it's not occupied by another unit
                const occupied = this.entities.some(e =>
                    e.isAlive && e.isAlive() &&
                    Math.floor(e.gridI) === i && Math.floor(e.gridJ) === j
                );
                if (!occupied) {
                    return { i, j };
                }
            }
        }
        return null;
    }

    /**
     * Spawn a player hero
     */
    spawnHero(configName, gridI, gridJ) {
        const animConfig = UNIT_ANIMS[configName];
        if (!animConfig) {
            console.warn(`SpawnHero: Unknown config ${configName}`);
            return null;
        }

        // Map config name to UNIT_TYPE for proper stats (including speed!)
        const configToUnitType = {
            'WARRIOR': UNIT_TYPE.WARRIOR,
            'RANGER': UNIT_TYPE.RANGER,
            'WIZARD': UNIT_TYPE.WIZARD,
            'PALADIN': UNIT_TYPE.PALADIN,
            'HEALER': UNIT_TYPE.HEALER,
            'ELF': UNIT_TYPE.ELF,
            'DWARF': UNIT_TYPE.DWARF,
            'GNOME': UNIT_TYPE.GNOME,
        };

        const hero = new DynamicEntity(gridI, gridJ);

        // Initialize stats from unit type (sets speed, HP, damage, etc.)
        const unitTypeId = configToUnitType[configName];
        if (unitTypeId !== undefined) {
            hero.initFromUnitType(unitTypeId);
        }

        hero.initSprite();
        hero.setBodyColor(0x44ff44);  // Green for player heroes
        hero.setGrid(this.grid);
        hero.game = this;
        hero.team = 'player';
        hero.autoPlay = true;  // Heroes act autonomously
        hero.sightRange = AI_CONFIG.PLAYER_HERO_SIGHT_RANGE;

        // Set unit type for sounds
        hero.unitType = configName.toLowerCase();

        // Apply animations if loaded
        if (this.animationsLoaded && this.animLoader.animationData[animConfig.package]) {
            hero.setAnimations(this.animLoader, animConfig);
        }

        // Add to grid container and entities
        if (this.grid) {
            this.grid.container.addChild(hero.sprite);
        }
        this.entities.push(hero);

        console.log(`Spawned ${configName} hero at (${gridI}, ${gridJ}) - speed: ${hero.speed}`);
        return hero;
    }

    /**
     * Handle key down events
     */
    handleKeyDown(key) {
        switch (key) {
            case 'escape':
                if (this.state === GameState.GAME) {
                    this.pause();
                } else if (this.state === GameState.GAME_PAUSE) {
                    this.resume();
                }
                break;

            case 'd':
                // Toggle debug
                if (this.debugText) {
                    this.debugText.visible = !this.debugText.visible;
                }
                break;

            case 'c':
                // Center camera on selected unit
                if (this.selectedUnit && this.grid) {
                    this.camera.centerOn(
                        this.selectedUnit.worldX + this.grid.container.x,
                        this.selectedUnit.worldY + this.grid.container.y
                    );
                }
                break;

            case 's':
                // Test screen shake
                this.camera.shake(10, 500);
                break;

            case 'm':
                // Toggle music
                if (this.soundsLoaded) {
                    const muted = this.soundManager.toggleMusicMute();
                    console.log(`Music ${muted ? 'muted' : 'unmuted'}`);
                    // Start music if not playing and just unmuted
                    if (!muted && !this.soundManager.currentMusic) {
                        this.soundManager.playRandomIngameMusic();
                    }
                }
                break;

            case 'n':
                // Toggle sound effects
                if (this.soundsLoaded) {
                    const muted = this.soundManager.toggleSoundMute();
                    console.log(`Sound effects ${muted ? 'muted' : 'unmuted'}`);
                }
                break;
        }
    }

    /**
     * Find a walkable cell adjacent to the target position
     * Used for moving to attack an enemy (can't move onto their cell)
     */
    findAdjacentWalkableCell(targetI, targetJ) {
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

        return null;  // No walkable adjacent cell found
    }

    /**
     * Get entity at world position
     */
    getEntityAt(worldX, worldY) {
        // Simple hit testing - check if point is within entity bounds
        for (const entity of this.entities) {
            const bounds = entity.getBounds ? entity.getBounds() : null;
            if (bounds) {
                if (worldX >= bounds.x && worldX <= bounds.x + bounds.width &&
                    worldY >= bounds.y && worldY <= bounds.y + bounds.height) {
                    return entity;
                }
            }
        }
        return null;
    }

    /**
     * Select an entity
     */
    selectEntity(entity) {
        // Deselect previous unit
        if (this.selectedUnit && this.selectedUnit.setSelected) {
            this.selectedUnit.setSelected(false);
        }

        // Deselect previous building and hide menus
        if (this.selectedBuilding && this.selectedBuilding.setSelected) {
            this.selectedBuilding.setSelected(false);
        }
        this.selectedBuilding = null;
        if (this.buildingMenu) {
            this.buildingMenu.hide();
        }

        this.selectedUnit = entity;

        // Select new
        if (entity && entity.setSelected) {
            entity.setSelected(true);
        }

        // Show unit menu for player heroes
        if (entity && entity.team === 'player' && this.unitMenu) {
            this.unitMenu.show(entity);
        } else if (this.unitMenu) {
            this.unitMenu.hide();
        }
    }

    /**
     * Create placeholder content for testing
     */
    createTestContent() {
        // Create isometric grid (pass app for texture generation)
        this.grid = new Grid(this.gridWidth, this.gridHeight, this.app);

        // If map data is loaded, pass it to the grid for terrain rendering
        // Terrain tiles will be loaded later via AnimationLoader
        if (this.mapLoader) {
            this.grid.setMapData(this.mapLoader, []);  // Empty array - will use AnimationLoader
            console.log('Map data set - terrain will render after AnimationLoader loads package');
        } else {
            // Fallback: generate test map
            this.grid.generateTestMap();
            console.log('Using procedural test map (no map data)');
        }

        this.grid.render();

        // Add grid to world container
        this.worldContainer.addChild(this.grid.container);

        // Enable depth sorting for the grid container
        this.grid.container.sortableChildren = true;

        // Calculate world size from grid bounds
        const bounds = this.grid.getWorldBounds();
        this.worldWidth = bounds.maxX - bounds.minX + 200;  // Add padding
        this.worldHeight = bounds.maxY - bounds.minY + 200;

        // Offset grid to center it with padding
        this.grid.container.x = -bounds.minX + 100;
        this.grid.container.y = -bounds.minY + 100;

        // Update camera bounds
        this.camera.setWorldBounds(this.worldWidth, this.worldHeight);

        // Create hover highlight (initially hidden)
        this.hoverHighlight = new PIXI.Graphics();
        this.grid.container.addChild(this.hoverHighlight);

        // Create path visualization container
        this.pathGraphics = new PIXI.Graphics();
        this.grid.container.addChild(this.pathGraphics);

        // Load animations (async - units will update when loaded)
        this.loadAnimations();

        // Initialize sound (async)
        this.initSound();

        // Initialize building menu UI
        this.buildingMenu = new BuildingMenu(this);

        // Initialize unit menu UI
        this.unitMenu = new UnitMenu(this);

        // Lock building cells BEFORE creating entities so they don't spawn on buildings
        this.lockMapBuildingCells();

        // Create test unit on the grid
        this.createTestUnit();

        // Create test building (only if map doesn't have a castle)
        const mapHasCastle = this.mapLoader?.objects?.some(obj => obj.type === 0x20);
        if (!mapHasCastle) {
            this.createTestBuilding();
        }

        // Center camera on the castle position (from map data) or grid center as fallback
        let cameraTarget = this.grid.getCenter();
        if (this.mapLoader && this.mapLoader.objects) {
            const castleObj = this.mapLoader.objects.find(obj => obj.type === 0x20);
            if (castleObj) {
                cameraTarget = IsoMath.gridToWorld(castleObj.gridI, castleObj.gridJ);
            }
        }
        this.camera.centerOn(
            cameraTarget.x + this.grid.container.x,
            cameraTarget.y + this.grid.container.y,
            true
        );

        // Note: Terrain will be rendered after loadAnimations() loads the terrain package
        // The game loop calls grid.updateVisibleTerrain() which handles rendering

        // Add compact controls hint (top right)
        const controlsHint = new PIXI.Text({
            text: 'Right-drag: Pan | Arrows: Move | Click: Select/Attack | D: Debug | M: Music | N: Mute SFX',
            style: {
                fontFamily: 'Arial',
                fontSize: 11,
                fill: 0x888888
            }
        });
        controlsHint.x = SCREEN_WIDTH - controlsHint.width - 10;
        controlsHint.y = 10;
        this.uiContainer.addChild(controlsHint);
    }

    /**
     * Load animation packages
     */
    async loadAnimations() {
        const basePath = 'assets/sprites/anims/anims';

        try {
            // Only generate procedural grass if we don't have real terrain tiles
            if (this.grid && !this.grid.mapLoader) {
                if (this.grid.generateGrassTexture()) {
                    this.grid.render();
                    console.log('Procedural grass background generated');
                }
            }

            // Package 0 MUST be loaded first (initializes animation arrays)
            await this.animLoader.loadPackage(basePath, 0);
            console.log('Loaded base package 0 (UI elements)');

            // Package 1: Buildings (castle, guilds, marketplace, etc.)
            await this.animLoader.loadPackage(basePath, 1);
            console.log('Loaded building animations (package 1)');

            // Load packages for all unit types we use
            // Package 7: Rangers (ranged friendly units)
            await this.animLoader.loadPackage(basePath, 7);
            console.log('Loaded ranger animations (package 7)');

            // Package 8: Warriors/Knights (melee friendly units)
            await this.animLoader.loadPackage(basePath, 8);
            console.log('Loaded warrior/knight animations (package 8)');

            // Package 13: Giant Rats (enemy units)
            await this.animLoader.loadPackage(basePath, 13);
            console.log('Loaded giant rat animations (package 13)');

            // Package 14: Trolls (enemy units)
            await this.animLoader.loadPackage(basePath, 14);
            console.log('Loaded troll animations (package 14)');

            // Package 2: Wizards (MAG_BLUE) and ice effects
            await this.animLoader.loadPackage(basePath, 2);
            console.log('Loaded wizard animations (package 2)');

            // Package 3: Crypta Temple
            await this.animLoader.loadPackage(basePath, 3);
            console.log('Loaded Crypta Temple animations (package 3)');

            // Package 4: Dwarf buildings (Windmill, Tower)
            await this.animLoader.loadPackage(basePath, 4);
            console.log('Loaded Dwarf building animations (package 4)');

            // Package 5: Elf Bungalow
            await this.animLoader.loadPackage(basePath, 5);
            console.log('Loaded Elf Bungalow animations (package 5)');

            // Package 6: Krolm Temple
            await this.animLoader.loadPackage(basePath, 6);
            console.log('Loaded Krolm Temple animations (package 6)');

            // Package 9: Wizard Guild, Library
            await this.animLoader.loadPackage(basePath, 9);
            console.log('Loaded Wizard Guild/Library animations (package 9)');

            // Package 27: Grass decorations (rocks, bushes, trees, etc.)
            await this.animLoader.loadPackage(basePath, 27);
            console.log('Loaded grass decoration animations (package 27)');

            // Load terrain package (45=grass, 46=necro, 47=snow)
            // MUST use AnimationLoader to get per-frame offset data!
            if (this.terrainPackage) {
                console.log(`Attempting to load terrain package ${this.terrainPackage}...`);
                try {
                    await this.animLoader.loadPackage(basePath, this.terrainPackage);
                    console.log(`SUCCESS: Loaded terrain animations (package ${this.terrainPackage})`);

                    // Pass the AnimationLoader to Grid for proper terrain rendering
                    if (this.grid) {
                        console.log('Setting terrain animations on grid...');
                        this.grid.setTerrainAnimations(this.animLoader, this.terrainPackage);
                        console.log('Terrain animations set on grid');
                    }
                } catch (terrainError) {
                    console.error(`FAILED to load terrain package ${this.terrainPackage}:`, terrainError);
                }
            } else {
                console.warn('No terrain package set - skipping terrain AnimationLoader');
            }

            this.animationsLoaded = true;

            // Render map decorations and buildings from parsed map data
            if (this.mapLoader && this.mapLoader.objects.length > 0) {
                this.renderMapDecorations();
                this.renderMapBuildings();

                // Initialize spawn system from map data (disabled for now - causes lag)
                // this.spawnManager.initFromMap(this.mapLoader);
                // this.spawnManager.start();
            }

            // Update existing entities to use animations
            this.applyAnimationsToEntities();

            // Update buildings to use real animations
            this.updateBuildingAnimations();

        } catch (error) {
            console.warn('Failed to load animations, using placeholder graphics:', error);
            this.animationsLoaded = false;
        }
    }

    /**
     * Initialize sound system
     */
    async initSound() {
        try {
            await this.soundManager.init();
            await this.soundManager.loadCommonSounds();
            this.soundsLoaded = true;
            console.log('Sound system initialized');

            // Optionally start background music
            // this.soundManager.playRandomIngameMusic();
        } catch (error) {
            console.warn('Failed to initialize sound:', error);
            this.soundsLoaded = false;
        }
    }

    /**
     * Play a sound effect
     * @param {number} soundId - Sound ID from SOUNDS constants
     */
    playSound(soundId) {
        if (this.soundsLoaded) {
            this.soundManager.play(soundId);
        }
    }

    /**
     * Play a sound at a position (with distance attenuation)
     * @param {number} soundId - Sound ID
     * @param {number} x - World X
     * @param {number} y - World Y
     */
    playSoundAt(soundId, x, y) {
        if (this.soundsLoaded) {
            this.soundManager.playAt(soundId, x, y, this.camera);
        }
    }

    /**
     * Apply animations to existing entities once loaded
     */
    applyAnimationsToEntities() {
        if (!this.animationsLoaded) return;

        for (const entity of this.entities) {
            if (entity.team === 'player') {
                if (entity.isRanged) {
                    // Ranged player units use RANGER animations
                    entity.setAnimations(this.animLoader, UNIT_ANIMS.RANGER);
                } else {
                    // Melee player units use WARRIOR (knight) animations
                    entity.setAnimations(this.animLoader, UNIT_ANIMS.WARRIOR);
                }
            } else if (entity.team === 'enemy') {
                // All rats for testing
                entity.setAnimations(this.animLoader, UNIT_ANIMS.GIANT_RAT);
            }
        }
    }

    /**
     * Create test units on the grid
     */
    createTestUnit() {
        // Get castle position from map data, or use grid center as fallback
        let castleI = Math.floor(this.gridWidth / 2);
        let castleJ = Math.floor(this.gridHeight / 2);

        if (this.mapLoader && this.mapLoader.objects) {
            const castleObj = this.mapLoader.objects.find(obj => obj.type === 0x20);
            if (castleObj) {
                castleI = castleObj.gridI;
                castleJ = castleObj.gridJ;
            }
        }

        // Spawn player knight near castle (offset to the side)
        const playerUnit = new DynamicEntity(castleI + 4, castleJ + 2);
        playerUnit.initFromUnitType(UNIT_TYPE.WARRIOR);  // Use warrior stats (includes speed!)
        playerUnit.initSprite();
        playerUnit.setBodyColor(0x4488ff);  // Blue for player
        playerUnit.setGrid(this.grid);  // Link to grid for cell occupancy
        playerUnit.game = this;  // Link to game for combat
        playerUnit.team = 'player';  // Team for combat targeting
        playerUnit.autoPlay = true;  // Auto-attack enemies like other heroes
        playerUnit.sightRange = AI_CONFIG.PLAYER_HERO_SIGHT_RANGE;
        playerUnit.unitType = 'knight';  // For death sounds
        this.grid.container.addChild(playerUnit.sprite);
        this.entities.push(playerUnit);

        // Store reference to selected unit
        this.selectedUnit = playerUnit;
        playerUnit.setSelected(true);
        playerUnit.showHealthBar();

        // Create some enemy units (red)
        const enemyPositions = [
            { i: 5, j: 5 },
            { i: 8, j: 12 },
            { i: 20, j: 8 },
            { i: 25, j: 20 }
        ];

        for (let idx = 0; idx < enemyPositions.length; idx++) {
            const pos = enemyPositions[idx];
            if (this.grid.isWalkable(pos.i, pos.j)) {
                const enemy = new DynamicEntity(pos.i, pos.j);

                // All rats for testing
                enemy.initFromUnitType(UNIT_TYPE.RAT);

                enemy.initSprite();
                enemy.setBodyColor(0xff4444);  // Red for enemies
                enemy.autoPlay = true;
                enemy.sightRange = AI_CONFIG.ENEMY_SIGHT_RANGE;
                enemy.setGrid(this.grid);
                enemy.game = this;
                enemy.team = 'enemy';
                enemy.unitType = 'rat';
                this.grid.container.addChild(enemy.sprite);
                this.entities.push(enemy);

                console.log(`Map enemy: ${enemy.unitType} - HP: ${enemy.maxHealth}, deadExp: ${enemy.deadExp}`);
            }
        }

        // Create some friendly units (green) - spawn near castle
        const friendlyPositions = [
            { i: castleI + 5, j: castleJ },
            { i: castleI + 3, j: castleJ + 4 },
            { i: castleI + 6, j: castleJ + 3 }
        ];

        for (const pos of friendlyPositions) {
            if (this.grid.isWalkable(pos.i, pos.j)) {
                const friendly = new DynamicEntity(pos.i, pos.j);
                friendly.initFromUnitType(UNIT_TYPE.RANGER);  // Use ranger stats (includes speed!)
                friendly.initSprite();
                friendly.setBodyColor(0x44ff44);  // Green for friendlies
                friendly.setGrid(this.grid);
                friendly.game = this;
                friendly.team = 'player';  // Same team as player
                friendly.autoPlay = true;  // Autonomous behavior
                friendly.sightRange = AI_CONFIG.PLAYER_HERO_SIGHT_RANGE;
                friendly.unitType = 'ranger';  // For death sounds
                this.grid.container.addChild(friendly.sprite);
                this.entities.push(friendly);
            }
        }

        console.log(`Created ${this.entities.length} entities`);
    }

    /**
     * Create test buildings to verify building rendering
     */
    createTestBuilding() {
        // Place a castle near the center
        const centerI = Math.floor(this.gridWidth / 2) - 5;
        const centerJ = Math.floor(this.gridHeight / 2) - 5;

        const castle = new Building(centerI, centerJ, BuildingType.CASTLE);
        castle.team = 0;  // Player team
        castle.game = this;

        // Initialize with placeholder sprite first
        castle.initSprite();

        // Add to grid container
        this.grid.container.addChild(castle.sprite);

        // Lock the cells the building occupies
        castle.lockCells(this.grid);

        // Store building
        this.buildings.push(castle);
        this.playerCastle = castle;

        console.log(`Created test building (Castle) at (${centerI}, ${centerJ})`);

        // When animations are loaded, update the building sprite
        // This happens in the callback after loadAnimations completes
    }

    /**
     * Update buildings to use real animations (called after animations load)
     */
    updateBuildingAnimations() {
        for (const building of this.buildings) {
            // Get animation config for this building type
            let animConfig = null;

            if (building.buildingType === BuildingType.CASTLE) {  // 0x20
                animConfig = BUILDING_ANIMS.CASTLE;
            } else if (building.buildingType === BuildingType.WARRIOR_GUILD) {  // 0x21
                animConfig = BUILDING_ANIMS.WARRIOR_GUILD;
            } else if (building.buildingType === BuildingType.RANGER_GUILD) {  // 0x22
                animConfig = BUILDING_ANIMS.RANGER_GUILD;
            } else if (building.buildingType === BuildingType.MARKETPLACE) {  // 0x29
                animConfig = BUILDING_ANIMS.MARKETPLACE;
            } else if (building.buildingType === BuildingType.BLACKSMITH) {  // 0x27
                animConfig = BUILDING_ANIMS.BLACKSMITH;
            }

            if (animConfig && this.animLoader.animationData[animConfig.package]) {
                building.initAnimatedSprite(
                    this.animLoader,
                    animConfig.package,
                    animConfig.idle
                );
                console.log(`Updated building to use animation package ${animConfig.package}, anim ${animConfig.idle}`);
            }
        }
    }

    /**
     * Initialize animation for a single building
     */
    initBuildingAnimation(building, startConstruction = false) {
        if (!this.animationsLoaded || !this.animLoader) return;

        // Get animation config for this building type
        let animConfig = null;

        if (building.buildingType === BuildingType.CASTLE) {
            animConfig = BUILDING_ANIMS.CASTLE;
        } else if (building.buildingType === BuildingType.WARRIOR_GUILD) {
            animConfig = BUILDING_ANIMS.WARRIOR_GUILD;
        } else if (building.buildingType === BuildingType.RANGER_GUILD) {
            animConfig = BUILDING_ANIMS.RANGER_GUILD;
        } else if (building.buildingType === BuildingType.WIZARD_GUILD) {
            animConfig = BUILDING_ANIMS.WIZARD_GUILD;
        } else if (building.buildingType === BuildingType.MARKETPLACE) {
            animConfig = BUILDING_ANIMS.MARKETPLACE;
        } else if (building.buildingType === BuildingType.BLACKSMITH) {
            animConfig = BUILDING_ANIMS.BLACKSMITH;
        } else if (building.buildingType === BuildingType.GUARD_TOWER) {
            animConfig = BUILDING_ANIMS.GUARD_TOWER;
        } else if (building.buildingType === BuildingType.AGRELLA_TEMPLE) {
            animConfig = BUILDING_ANIMS.AGRELLA_TEMPLE;
        } else if (building.buildingType === BuildingType.CRYPTA_TEMPLE) {
            animConfig = BUILDING_ANIMS.CRYPTA_TEMPLE;
        } else if (building.buildingType === BuildingType.KROLM_TEMPLE) {
            animConfig = BUILDING_ANIMS.KROLM_TEMPLE;
        } else if (building.buildingType === BuildingType.ELF_BUNGALOW) {
            animConfig = BUILDING_ANIMS.ELF_BUNGALOW;
        } else if (building.buildingType === BuildingType.DWARF_WINDMILL) {
            animConfig = BUILDING_ANIMS.DWARF_WINDMILL;
        } else if (building.buildingType === BuildingType.DWARF_TOWER) {
            animConfig = BUILDING_ANIMS.DWARF_TOWER;
        } else if (building.buildingType === BuildingType.GNOME_HOVEL) {
            animConfig = BUILDING_ANIMS.GNOME_HOVEL;
        } else if (building.buildingType === BuildingType.LIBRARY) {
            animConfig = BUILDING_ANIMS.LIBRARY;
        } else if (building.buildingType === BuildingType.INN) {
            animConfig = BUILDING_ANIMS.INN;
        }

        if (animConfig && this.animLoader.animationData[animConfig.package]) {
            if (startConstruction && animConfig.build !== undefined) {
                // Start in construction mode with build animation
                building.startConstruction(
                    this.animLoader,
                    animConfig.package,
                    animConfig.build,
                    animConfig.idle,
                    5000  // 5 seconds construction time
                );
                console.log(`Started construction: package ${animConfig.package}, build anim ${animConfig.build}`);
            } else {
                // Directly show idle animation (for existing buildings like Castle)
                building.initAnimatedSprite(
                    this.animLoader,
                    animConfig.package,
                    animConfig.idle
                );
                console.log(`Initialized building animation: package ${animConfig.package}, anim ${animConfig.idle}`);
            }
        }
    }

    /**
     * Render decorations from parsed map objects
     * Uses Package 27 (grass decorations) for decoration sprites
     */
    renderMapDecorations() {
        if (!this.mapLoader || !this.grid || !this.animationsLoaded) return;

        const objects = this.mapLoader.objects;
        let decorationsRendered = 0;

        // Type → animation mapping for decoration types
        // Based on Script.getAnimID() and Import.smali constants
        // Animation IDs for Package 27 (grass decorations):
        // TREE_GREEN1=45, TREE_GREEN2=49, TREE_GREEN3=52, TREE_GREEN4=56, TREE_GREEN5=60
        // RUINS_GRASS: PART1=17, PART2=18, PART3=19, PART4=20, PART5=21
        // DECOR_GRASS: BIGROCK=0, BIGROCK2=1, HOLM=2, HOLM2=3, IDOL=4, KOLONNA1=5, KOLONNA2=6, etc.
        const typeToAnim = {
            // Types 0x60-0x64 (96-100) are green trees
            96: 45,   // TREE_GREEN1
            97: 49,   // TREE_GREEN2
            98: 52,   // TREE_GREEN3
            99: 56,   // TREE_GREEN4
            100: 60,  // TREE_GREEN5

            // Types 0x65-0x69 (101-105) are RUINS_GRASS decorations
            101: 17,  // RUINS_GRASS_PART1
            102: 18,  // RUINS_GRASS_PART2
            103: 19,  // RUINS_GRASS_PART3
            104: 20,  // RUINS_GRASS_PART4
            105: 21,  // RUINS_GRASS_PART5

            // Types 0x6a-0x6f (106-111) - more ruins/grave decorations
            106: 22,  // RUINS_GRASS_GRAVE1
            107: 23,  // RUINS_GRASS_GRAVE2
            108: 24,  // RUINS_GRASS_GRAVE3
            109: 25,  // RUINS_GRASS_GRAVE4
            110: 26,  // RUINS_GRASS_GRAVE5
            111: 27,  // RUINS_GRASS_GRAVE6

            // Types 0x70-0x7b (112-123) - DECOR_GRASS decorations
            112: 0,   // DECOR_GRASS_BIGROCK
            113: 1,   // DECOR_GRASS_BIGROCK2
            114: 2,   // DECOR_GRASS_HOLM
            115: 3,   // DECOR_GRASS_HOLM2
            116: 4,   // DECOR_GRASS_IDOL
            117: 5,   // DECOR_GRASS_KOLONNA1
            118: 6,   // DECOR_GRASS_KOLONNA2
            119: 7,   // DECOR_GRASS_KOLONNA3
            120: 8,   // DECOR_GRASS_KOLISHEK1
            121: 9,   // DECOR_GRASS_KOLISHEK2
            122: 10,  // DECOR_GRASS_LAKE
            123: 11,  // DECOR_GRASS_ROCK

            // Types 0x83-0x88 (131-136) - additional decorations
            131: 28,  // Additional decoration 1
            132: 29,  // Additional decoration 2
            133: 30,  // Additional decoration 3
            134: 31,  // Additional decoration 4
            135: 32,  // Additional decoration 5
            136: 33,  // Additional decoration 6
        };

        const unmappedTypes = new Set();

        for (const obj of objects) {
            // Skip spawn points and buildings
            if (obj.isRespawn || obj.isWaveSpawn || obj.type === 0x20) continue;

            // Only render decorations (types we know about)
            const animId = typeToAnim[obj.type];
            if (animId === undefined) {
                // Track unmapped decoration types for debugging
                if (obj.isDecoration) {
                    unmappedTypes.add(obj.type);
                }
                continue;
            }

            // Use createFrameContainer which handles multi-layer sprites properly
            // Trees and complex decorations have multiple layers that need to be combined
            const frameContainer = this.animLoader.createFrameContainer(27, animId, 0);
            if (!frameContainer) continue;

            // Convert grid position to world position
            const worldPos = IsoMath.gridToWorld(obj.gridI, obj.gridJ);

            // Position container at world position
            frameContainer.x = worldPos.x;
            frameContainer.y = worldPos.y;

            // Set depth for sorting - use same calculation as entities (i + j)
            frameContainer.zIndex = IsoMath.getDepthAtWorld(worldPos.x, worldPos.y);

            // Add to main grid container for proper z-sorting with entities
            this.grid.container.addChild(frameContainer);
            decorationsRendered++;
        }

        console.log(`Rendered ${decorationsRendered} map decorations`);
        if (unmappedTypes.size > 0) {
            console.log(`Unmapped decoration types: ${Array.from(unmappedTypes).sort((a,b) => a-b).join(', ')}`);
        }
    }

    /**
     * Render buildings from parsed map objects
     * Uses Package 1 (buildings) for building sprites
     */
    renderMapBuildings() {
        if (!this.mapLoader || !this.grid || !this.animationsLoaded) return;

        const objects = this.mapLoader.objects;
        let buildingsRendered = 0;

        // Building type → [packageId, animId] mapping
        // Based on Script.getAnimID() and Import.smali constants
        // AnimId format: packageId << 10 | animIndex
        // CASTLE_1_OFF = 0x411 → Package 1, anim 17
        // BLACKSMITH_1_OFF = 0x401 → Package 1, anim 1
        const buildingAnims = {
            0x20: { pkg: 1, anim: 17 },   // Castle (level 1)
            0x21: { pkg: 1, anim: 24 },   // Warrior Guild
            0x22: { pkg: 1, anim: 1 },    // Blacksmith
            0x23: { pkg: 1, anim: 32 },   // Ranger Guild
            0x24: { pkg: 1, anim: 40 },   // Wizard Guild
            0x25: { pkg: 1, anim: 48 },   // Marketplace
            0x26: { pkg: 1, anim: 56 },   // Guardtower
            0x27: { pkg: 1, anim: 64 },   // Library
            0x28: { pkg: 1, anim: 72 },   // Inn
            0x29: { pkg: 1, anim: 80 },   // Temple of Krypta
            0x2a: { pkg: 1, anim: 88 },   // Temple of Agrela
            0x2b: { pkg: 1, anim: 96 },   // Palace
        };

        for (const obj of objects) {
            // Only process building objects (not decorations or spawn points)
            if (obj.isRespawn || obj.isWaveSpawn || obj.isDecoration) continue;

            // For Castle (0x20), create a proper Building object instead of just a sprite
            if (obj.type === 0x20) {
                // Skip if we already have a castle (prevent duplicates)
                if (this.playerCastle) {
                    continue;
                }

                const castle = new Building(obj.gridI, obj.gridJ, BuildingType.CASTLE);
                castle.team = 0;
                castle.game = this;
                castle.maxHealth = 1000;
                castle.health = castle.maxHealth;
                castle.sizeI = 3;
                castle.sizeJ = 3;
                castle.initSprite();
                this.grid.container.addChild(castle.sprite);
                castle.lockCells(this.grid);
                this.buildings.push(castle);
                this.playerCastle = castle;

                // Initialize with animation
                this.initBuildingAnimation(castle);

                console.log(`Created player Castle at (${obj.gridI}, ${obj.gridJ}) from map data`);
                buildingsRendered++;
                continue;
            }

            const buildingAnim = buildingAnims[obj.type];
            if (!buildingAnim) continue;

            // Use createFrameContainer which handles multi-layer sprites properly
            const frameContainer = this.animLoader.createFrameContainer(buildingAnim.pkg, buildingAnim.anim, 0);
            if (!frameContainer) {
                console.log(`No frame for building type ${obj.type} (pkg ${buildingAnim.pkg}, anim ${buildingAnim.anim})`);
                continue;
            }

            // Convert grid position to world position
            const worldPos = IsoMath.gridToWorld(obj.gridI, obj.gridJ);

            // Position container at world position
            frameContainer.x = worldPos.x;
            frameContainer.y = worldPos.y;

            // Set depth for sorting - use same calculation as entities (i + j)
            frameContainer.zIndex = IsoMath.getDepthAtWorld(worldPos.x, worldPos.y);

            // Add to main grid container (same as entities) for proper z-sorting
            this.grid.container.addChild(frameContainer);
            buildingsRendered++;

            // Lock grid cells so units can't walk through buildings
            const buildingSize = this.getBuildingSizeForType(obj.type);
            for (let di = 0; di < buildingSize.i; di++) {
                for (let dj = 0; dj < buildingSize.j; dj++) {
                    this.grid.lock(obj.gridI + di, obj.gridJ + dj);
                }
            }

            console.log(`Building type ${obj.type} at (${obj.gridI}, ${obj.gridJ}) - size: ${buildingSize.i}x${buildingSize.j}`);
        }

        console.log(`Rendered ${buildingsRendered} map buildings`);
    }

    /**
     * Get building size in grid cells based on type
     * Returns {i, j} object matching BUILDING_SIZE config format
     */
    getBuildingSizeForType(buildingType) {
        // Import from GameConfig if available, otherwise use defaults
        const sizes = {
            0x20: { i: 3, j: 3 },  // Castle
            0x2b: { i: 3, j: 3 },  // Palace
        };
        return sizes[buildingType] || { i: 2, j: 2 };
    }

    /**
     * Lock building cells early (before animations load) so entities don't spawn on buildings
     * This is called before createTestUnit() to ensure walkability checks work
     */
    lockMapBuildingCells() {
        if (!this.mapLoader || !this.grid) return;

        const objects = this.mapLoader.objects;
        if (!objects) return;

        // Building types that should lock cells (all building types)
        const buildingTypes = [
            0x20, // Castle
            0x21, // Warrior Guild
            0x22, // Blacksmith
            0x23, // Ranger Guild
            0x24, // Wizard Guild
            0x25, // Marketplace
            0x26, // Guardtower
            0x27, // Library
            0x28, // Inn
            0x29, // Temple of Krypta
            0x2a, // Temple of Agrela
            0x2b, // Palace
            0x2c, // Elf Bungalow
            0x2d, // Dwarf Windmill
            0x2e, // Gnome Hovel
        ];

        let lockedCount = 0;
        for (const obj of objects) {
            if (!buildingTypes.includes(obj.type)) continue;

            const size = this.getBuildingSizeForType(obj.type);
            for (let di = 0; di < size.i; di++) {
                for (let dj = 0; dj < size.j; dj++) {
                    this.grid.lock(obj.gridI + di, obj.gridJ + dj);
                    lockedCount++;
                }
            }
        }

        console.log(`Locked ${lockedCount} building cells early (before entity spawn)`);
    }

    /**
     * Spawn units from parsed map objects
     *
     * NOTE: Type 0x57 (87) = TYPE_TROLL in Const.smali, but the objects
     * with this type in map data have invalid positions (e.g., 22279, 577
     * for a 200x200 map). These are likely not pre-placed units but rather
     * spawn configuration data that was misinterpreted.
     *
     * Actual enemies should spawn from:
     * - Type 0xFF (255) = Border respawn points
     * - Type 0xFE (254) = Wave spawn points
     */
    spawnMapUnits() {
        if (!this.mapLoader || !this.grid || !this.animationsLoaded) return;

        // TODO: Implement proper spawn point handling
        // The map has 9 border respawn points (type 255) and 3 wave spawns (type 254)
        // These contain monster type lists (including TYPE_TROLL = 0x57)
        // For now, enemies are created manually in createTestUnit()

        const objects = this.mapLoader.objects;
        let spawnPoints = 0;
        let waveSpawns = 0;

        for (const obj of objects) {
            if (obj.isRespawn) {
                spawnPoints++;
                // Log spawn point info for future implementation
                if (spawnPoints <= 3) {
                    console.log(`Spawn point at (${obj.gridI}, ${obj.gridJ}): ` +
                        `monsters=[${obj.monsterTypes?.join(', ') || 'none'}], ` +
                        `time=${obj.startTime}-${obj.endTime}, pause=${obj.pause}`);
                }
            }
            if (obj.isWaveSpawn) {
                waveSpawns++;
            }
        }

        console.log(`Map has ${spawnPoints} respawn points and ${waveSpawns} wave spawns (not yet implemented)`);
    }

    /**
     * Draw path visualization for selected unit
     */
    updatePathVisualization() {
        if (!this.pathGraphics) return;

        this.pathGraphics.clear();

        // Draw path for selected unit if moving and alive
        if (this.selectedUnit && this.selectedUnit.isAlive() && this.selectedUnit.moving && this.selectedUnit.path.length > 0) {
            // Draw remaining path
            const path = [
                { i: this.selectedUnit.targetI, j: this.selectedUnit.targetJ },
                ...this.selectedUnit.path
            ];

            for (let idx = 0; idx < path.length; idx++) {
                const point = path[idx];
                const corners = IsoMath.getTileCorners(point.i, point.j);

                // Fade the color based on distance
                const alpha = 0.4 - (idx * 0.03);
                if (alpha <= 0) continue;

                this.pathGraphics.moveTo(corners[0].x, corners[0].y);
                this.pathGraphics.lineTo(corners[1].x, corners[1].y);
                this.pathGraphics.lineTo(corners[2].x, corners[2].y);
                this.pathGraphics.lineTo(corners[3].x, corners[3].y);
                this.pathGraphics.lineTo(corners[0].x, corners[0].y);
                this.pathGraphics.fill({ color: 0x00ff00, alpha: alpha });
            }
        }
    }

    /**
     * Update hover highlight based on mouse position
     */
    updateHoverTile() {
        if (!this.grid || !this.hoverHighlight) return;

        // Hide hover highlight during placement mode (placement preview handles it)
        if (this.placementMode) {
            this.hoverHighlight.clear();
            return;
        }

        const worldPos = this.input.getWorldPosition();

        // Convert to grid-local coordinates
        const localX = worldPos.x - this.grid.container.x;
        const localY = worldPos.y - this.grid.container.y;

        // Convert to grid position
        const gridPos = IsoMath.worldToGridRounded(localX, localY);

        // Only update if tile changed
        if (gridPos.i !== this.hoverTile.i || gridPos.j !== this.hoverTile.j) {
            this.hoverTile = gridPos;

            // Clear and redraw highlight
            this.hoverHighlight.clear();

            if (this.grid.isInBounds(gridPos.i, gridPos.j)) {
                const corners = IsoMath.getTileCorners(gridPos.i, gridPos.j);
                const isWalkable = this.grid.isWalkable(gridPos.i, gridPos.j);
                const color = isWalkable ? 0xffff00 : 0xff4444;

                this.hoverHighlight.moveTo(corners[0].x, corners[0].y);
                this.hoverHighlight.lineTo(corners[1].x, corners[1].y);
                this.hoverHighlight.lineTo(corners[2].x, corners[2].y);
                this.hoverHighlight.lineTo(corners[3].x, corners[3].y);
                this.hoverHighlight.lineTo(corners[0].x, corners[0].y);
                this.hoverHighlight.fill({ color: color, alpha: 0.3 });
                this.hoverHighlight.stroke({ width: 2, color: color, alpha: 0.8 });
            }
        }
    }

    /**
     * Set game state
     */
    setState(newState) {
        this.previousState = this.state;
        this.state = newState;

        console.log(`Game state: ${this.getStateName(this.previousState)} -> ${this.getStateName(newState)}`);
    }

    /**
     * Get state name for debugging
     */
    getStateName(state) {
        for (const [name, value] of Object.entries(GameState)) {
            if (value === state) return name;
        }
        return 'UNKNOWN';
    }

    /**
     * Update game logic (called at fixed 25 FPS)
     */
    update(deltaTime) {
        this.ticks++;

        // Handle keyboard camera movement (always active)
        this.handleKeyboardMovement();

        switch (this.state) {
            case GameState.INIT:
                // Loading/initialization
                break;

            case GameState.GAME:
                // Main gameplay
                this.updateGameplay(deltaTime);
                break;

            case GameState.GAME_PAUSE:
                // Paused - still update camera
                this.camera.update(deltaTime);
                break;
        }

        // Clear per-frame input state
        this.input.endFrame();
    }

    /**
     * Handle keyboard camera movement
     */
    handleKeyboardMovement() {
        const speed = VISUAL.KEYBOARD_CAMERA_SPEED;

        if (this.input.isKeyDown('arrowleft')) {
            this.camera.pan(speed, 0);  // Move camera left (see content on left)
        }
        if (this.input.isKeyDown('arrowright')) {
            this.camera.pan(-speed, 0); // Move camera right (see content on right)
        }
        if (this.input.isKeyDown('arrowup')) {
            this.camera.pan(0, speed);  // Move camera up (see content above)
        }
        if (this.input.isKeyDown('arrowdown')) {
            this.camera.pan(0, -speed); // Move camera down (see content below)
        }

        // Test spawn: Press T to spawn a random enemy near center
        if (this.input.isKeyJustPressed('t')) {
            this.testSpawn();
        }

        // Show spawn status: Press Y to log spawn manager status
        if (this.input.isKeyJustPressed('y')) {
            console.log('Spawn Status:', this.spawnManager.getStatus());
            console.log('Spawn Points:', this.spawnManager.spawnPoints.length);
            console.log('Wave Spawns:', this.spawnManager.waveSpawns.length);
        }

        // Cheat: Press G to add gold (player + selected hero)
        if (this.input.isKeyJustPressed('g')) {
            this.gold += GAME_RULES.CHEAT_GOLD_AMOUNT;
            let msg = `+${GAME_RULES.CHEAT_GOLD_AMOUNT} Gold`;

            // Also give 100 gold to selected hero
            if (this.selectedUnit && this.selectedUnit.objectType === OBJECT_TYPE.HERO) {
                this.selectedUnit.gold = (this.selectedUnit.gold || 0) + 100;
                msg += ` (+100 to ${this.selectedUnit.unitType || 'hero'})`;
                console.log(`Cheat: Added 100 gold to hero. Hero gold:`, this.selectedUnit.gold);
            }

            this.showMessage(msg);
            console.log(`Cheat: Added ${GAME_RULES.CHEAT_GOLD_AMOUNT} gold. Total:`, this.gold);
        }

        // Cheat: Press X to give XP to selected unit
        if (this.input.isKeyJustPressed('x')) {
            if (this.selectedUnit && this.selectedUnit.gainExperience) {
                const prevLevel = this.selectedUnit.level;
                const xpAmount = GAME_RULES.CHEAT_XP_AMOUNT;
                this.selectedUnit.gainExperience(xpAmount);
                this.showMessage(`+${xpAmount} XP (${this.selectedUnit.experience} total)`);
                console.log(`Cheat: Added ${xpAmount} XP to`, this.selectedUnit.unitType,
                    '- Total:', this.selectedUnit.experience,
                    '- Level:', this.selectedUnit.level,
                    '- Next level at:', this.selectedUnit.prevExp + this.selectedUnit.levelUpXp);
                if (this.selectedUnit.level > prevLevel) {
                    this.showMessage(`Level Up! Now level ${this.selectedUnit.level}`);
                }
            } else {
                this.showMessage('Select a unit first');
            }
        }

        // Cheat: Press L to instantly level up selected unit
        if (this.input.isKeyJustPressed('l')) {
            if (this.selectedUnit && this.selectedUnit.levelUp) {
                if (this.selectedUnit.level < this.selectedUnit.maxLevel) {
                    this.selectedUnit.levelUp();
                    this.showMessage(`Level Up! Now level ${this.selectedUnit.level}`);
                    console.log('Cheat: Leveled up', this.selectedUnit.unitType, 'to level', this.selectedUnit.level);
                } else {
                    this.showMessage('Already at max level!');
                }
            } else {
                this.showMessage('Select a unit first');
            }
        }

    }

    /**
     * Test spawn - spawn a random enemy near the castle or center
     */
    testSpawn() {
        // Get spawn position near castle (or center if no castle)
        let spawnI, spawnJ;
        if (this.playerCastle) {
            spawnI = this.playerCastle.gridI + Math.floor(Math.random() * 8) - 2;
            spawnJ = this.playerCastle.gridJ + Math.floor(Math.random() * 8) - 2;
        } else {
            spawnI = Math.floor(this.gridWidth / 2) + Math.floor(Math.random() * 10) - 5;
            spawnJ = Math.floor(this.gridHeight / 2) + Math.floor(Math.random() * 10) - 5;
        }

        // Find walkable position
        if (!this.grid.isWalkable(spawnI, spawnJ)) {
            // Try nearby cells
            for (let di = -2; di <= 2; di++) {
                for (let dj = -2; dj <= 2; dj++) {
                    if (this.grid.isWalkable(spawnI + di, spawnJ + dj)) {
                        spawnI += di;
                        spawnJ += dj;
                        break;
                    }
                }
            }
        }

        // All rats for testing
        const enemy = this.spawnEnemy('GIANT_RAT', spawnI, spawnJ);
        if (enemy) {
            console.log(`Test spawn: GIANT_RAT at (${spawnI}, ${spawnJ})`);
        }
    }

    /**
     * Update main gameplay
     */
    updateGameplay(deltaTime) {
        // Update camera
        this.camera.update(deltaTime);

        // Update visible terrain tiles (viewport culling)
        if (this.grid && this.grid.mapLoader) {
            this.grid.updateVisibleTerrain(
                this.camera,
                this.grid.container.x,
                this.grid.container.y
            );
        }

        // Update hover highlight
        this.updateHoverTile();

        // Update building placement preview
        this.updatePlacementPreview();

        // Update path visualization
        this.updatePathVisualization();

        // Update all entities
        for (const entity of this.entities) {
            if (entity.update) {
                entity.update(deltaTime);
            }
        }

        // Update all buildings (for animations like flags, smoke, etc.)
        for (const building of this.buildings) {
            if (building.update) {
                building.update(deltaTime);
            }
        }

        // Update spawn system (disabled for now - causes lag with many enemies)
        // this.spawnManager.update(deltaTime);

        // Update missiles
        this.updateMissiles(deltaTime);

        // Update unit menu (real-time stats display)
        if (this.unitMenu) {
            this.unitMenu.update();
        }

        // Update building menu (training progress)
        if (this.buildingMenu) {
            this.buildingMenu.update();
        }

        // Check victory/defeat conditions
        this.checkGameEnd();
    }

    /**
     * Check if game has ended (defeat conditions)
     *
     * Defeat conditions:
     * - DEFEAT: Castle is destroyed (primary condition)
     * - DEFEAT: All player units dead (fallback if no castle)
     *
     * Note: Victory conditions will be mission-specific (questState system)
     * to be added later for individual mission goals.
     */
    checkGameEnd() {
        // Don't check if game already ended
        if (this.gameEnded) return;

        // Don't check during early game (allow spawning to complete)
        if (this.ticks < TIMERS.GRACE_PERIOD_TICKS) return;

        // Check castle destruction (primary defeat condition)
        if (this.playerCastle && !this.playerCastle.isAlive()) {
            this.onDefeat('Castle destroyed!');
            return;
        }

        let playerAlive = 0;
        let enemyAlive = 0;

        for (const entity of this.entities) {
            if (entity.isAlive()) {
                if (entity.team === 'player') {
                    playerAlive++;
                } else if (entity.team === 'enemy') {
                    enemyAlive++;
                }
            }
        }

        // Defeat - all player units dead (fallback if no castle)
        if (!this.playerCastle && playerAlive === 0 && this.state === GameState.GAME) {
            this.onDefeat('All allies lost!');
        }
    }

    /**
     * Handle defeat
     * @param {string} reason - Optional reason for defeat
     */
    onDefeat(reason = 'All allies lost!') {
        this.gameEnded = true;
        this.setState(GameState.GAME_PAUSE);

        // Play defeat sound
        this.playSound(SOUNDS.YOUR_BUILDING_DENIED);

        this.showMessage(`DEFEAT! ${reason}`);
        console.log(`Defeat! ${reason}`);
    }

    /**
     * Show a message using the external HTML UI
     * @param {string} text - Message to display
     * @param {number} duration - Duration in ms (default 1500)
     */
    showMessage(text, duration = 1500) {
        // Use external UI's showMessage if available
        if (window.showMessage) {
            window.showMessage(text, duration);
        } else {
            console.log(`[MESSAGE] ${text}`);
        }
    }

    /**
     * Render game (called as fast as possible)
     */
    render(alpha) {
        // HUD update removed - using external HTML UI instead

        // Update debug display
        if (this.debugText && this.debugText.visible) {
            const gridInfo = `Tile: (${this.hoverTile.i}, ${this.hoverTile.j})`;
            const aliveCount = this.entities.filter(e => e.isAlive()).length;

            this.debugText.text = [
                `FPS: ${this.gameLoop ? this.gameLoop.getFPS() : '?'}`,
                `State: ${this.getStateName(this.state)}`,
                gridInfo,
                `Entities: ${aliveCount} | Missiles: ${this.missiles.length}`
            ].join('\n');
        }
    }

    /**
     * Set reference to game loop (for FPS display)
     */
    setGameLoop(gameLoop) {
        this.gameLoop = gameLoop;
    }

    /**
     * Add entity to game
     */
    addEntity(entity) {
        this.entities.push(entity);
        if (entity.sprite) {
            this.worldContainer.addChild(entity.sprite);
        }
    }

    /**
     * Remove entity from game
     */
    removeEntity(entity) {
        const index = this.entities.indexOf(entity);
        if (index !== -1) {
            this.entities.splice(index, 1);
            if (entity.sprite) {
                this.worldContainer.removeChild(entity.sprite);
            }
        }
    }

    /**
     * Spawn an enemy unit at the given grid position
     * @param {string} configName - Name from UNIT_ANIMS (e.g., 'GIANT_RAT', 'TROLL')
     * @param {number} gridI - Grid column
     * @param {number} gridJ - Grid row
     * @returns {DynamicEntity|null} The spawned enemy or null if spawn failed
     */
    spawnEnemy(configName, gridI, gridJ) {
        // Get unit animation config
        const animConfig = UNIT_ANIMS[configName];
        if (!animConfig) {
            console.warn(`SpawnEnemy: Unknown config ${configName}`);
            return null;
        }

        // Map config name to UNIT_TYPE for stats
        const configToUnitType = {
            'GIANT_RAT': UNIT_TYPE.RAT,
            'TROLL': UNIT_TYPE.TROLL,
            'SKELETON': UNIT_TYPE.SKELETON,
            'ZOMBIE': UNIT_TYPE.ZOMBIE,
            'GOBLIN': UNIT_TYPE.GOBLIN,
            'VAMPIRE': UNIT_TYPE.VAMPIRE,
            'MINOTAUR': UNIT_TYPE.MINOTAUR,
            'DRAGON': UNIT_TYPE.DRAGON,
        };

        // Create the enemy entity
        const enemy = new DynamicEntity(gridI, gridJ);

        // Initialize stats from unit type (IMPORTANT - sets deadExp, expPerDmg, etc.)
        const unitTypeId = configToUnitType[configName];
        if (unitTypeId !== undefined) {
            enemy.initFromUnitType(unitTypeId);
        }

        enemy.initSprite();
        enemy.setBodyColor(0xff4444);  // Red for enemies
        enemy.setGrid(this.grid);
        enemy.game = this;
        enemy.team = 'enemy';
        enemy.autoPlay = true;
        enemy.sightRange = AI_CONFIG.ENEMY_SIGHT_RANGE;

        // Set unit type for sounds based on config name
        enemy.unitType = configName.toLowerCase().replace('_', '');

        // Apply animations if loaded
        if (this.animationsLoaded && this.animLoader.animationData[animConfig.package]) {
            enemy.setAnimations(this.animLoader, animConfig);
        }

        // Add to grid container and entities
        if (this.grid) {
            this.grid.container.addChild(enemy.sprite);
        }
        this.entities.push(enemy);

        console.log(`Spawned ${configName} at (${gridI}, ${gridJ}) - HP: ${enemy.maxHealth}, deadExp: ${enemy.deadExp}, expPerDmg: ${enemy.expPerDmg}`);
        return enemy;
    }

    /**
     * Spawn a missile from attacker to target
     * @param {DynamicEntity} attacker - The unit firing the missile
     * @param {DynamicEntity} target - The target to hit
     * @param {object} missileType - Missile visual type (default: ARROW)
     * @param {number} damage - Pre-rolled damage amount (if not provided, uses attacker.damage)
     */
    spawnMissile(attacker, target, missileType = MissileType.ARROW, damage = null) {
        const actualDamage = damage !== null ? damage : attacker.damage;
        const missile = createMissile(
            missileType,
            attacker.worldX,
            attacker.worldY + VISUAL.MISSILE_SPAWN_Y_OFFSET,
            target,
            actualDamage,
            attacker
        );
        missile.initSprite();

        // Add to grid container (same coordinate space as entities)
        if (this.grid) {
            this.grid.container.addChild(missile.sprite);
        }

        this.missiles.push(missile);
        return missile;
    }

    /**
     * Update all missiles
     */
    updateMissiles(deltaTime) {
        for (let i = this.missiles.length - 1; i >= 0; i--) {
            const missile = this.missiles[i];

            if (missile.active) {
                missile.update(deltaTime);
            }

            // Remove inactive missiles
            if (!missile.active) {
                this.missiles.splice(i, 1);
            }
        }
    }

    /**
     * Remove all missiles
     */
    clearMissiles() {
        for (const missile of this.missiles) {
            missile.destroy();
        }
        this.missiles = [];
    }

    /**
     * Pause game
     */
    pause() {
        if (this.state === GameState.GAME) {
            this.setState(GameState.GAME_PAUSE);
        }
    }

    /**
     * Resume game
     */
    resume() {
        if (this.state === GameState.GAME_PAUSE) {
            this.setState(GameState.GAME);
        }
    }

    /**
     * Toggle pause
     */
    togglePause() {
        if (this.state === GameState.GAME) {
            this.pause();
        } else if (this.state === GameState.GAME_PAUSE) {
            this.resume();
        }
    }
}
