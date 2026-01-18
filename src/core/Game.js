/**
 * Game - Main game state machine (ported from Game.smali)
 *
 * Manages game states, entities, and coordinates all systems
 */

import { GameState, SCREEN_WIDTH, SCREEN_HEIGHT } from '../utils/Constants.js';
import { Camera } from '../graphics/Camera.js';
import { Grid } from '../world/Grid.js';
import * as IsoMath from '../world/IsoMath.js';
import { DynamicEntity } from '../entities/DynamicEntity.js';
import { Missile, MissileType, createMissile } from '../entities/Missile.js';
import { HUD } from '../ui/HUD.js';
import { AnimationLoader } from '../graphics/AnimationLoader.js';
import { UNIT_ANIMS } from '../utils/AnimationConstants.js';
import { getSoundManager } from '../audio/SoundManager.js';
import { SOUNDS, MUSIC } from '../audio/SoundConstants.js';

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

        // Missiles (projectiles)
        this.missiles = [];

        // Game data
        this.gold = 100;
        this.ticks = 0;

        // Game end flag (prevent multiple victory/defeat triggers)
        this.gameEnded = false;

        // Grid/Map
        this.grid = null;
        this.gridWidth = 32;   // Grid size in tiles
        this.gridHeight = 32;

        // World size (calculated from grid)
        this.worldWidth = SCREEN_WIDTH * 2;
        this.worldHeight = SCREEN_HEIGHT * 2;

        // Debug
        this.debugMode = true;
        this.debugText = null;

        // Selected unit
        this.selectedUnit = null;

        // Hover highlight
        this.hoverHighlight = null;
        this.hoverTile = { i: -1, j: -1 };

        // Path visualization
        this.pathGraphics = null;

        // HUD
        this.hud = null;

        // Animation system
        this.animLoader = new AnimationLoader();
        this.animationsLoaded = false;

        // Sound system
        this.soundManager = getSoundManager();
        this.soundsLoaded = false;

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

        // Create HUD
        this.hud = new HUD(this.uiContainer, this);

        // Debug text (positioned after HUD elements)
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
            this.debugText.x = 220;  // Move right of HUD
            this.debugText.y = 10;
            this.uiContainer.addChild(this.debugText);
        }

        // Transition to game state (for prototype, skip menus)
        this.setState(GameState.GAME);

        // Create a test world (placeholder)
        this.createTestContent();
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

        if (button === 0 && this.grid) {  // Left click
            // Convert to grid-local coordinates
            const localX = worldX - this.grid.container.x;
            const localY = worldY - this.grid.container.y;

            // Convert to grid position
            const gridPos = IsoMath.worldToGridRounded(localX, localY);

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
            } else if (this.grid.isInBounds(gridPos.i, gridPos.j) &&
                       this.grid.isWalkable(gridPos.i, gridPos.j) &&
                       this.selectedUnit) {
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
        // Deselect previous
        if (this.selectedUnit && this.selectedUnit.setSelected) {
            this.selectedUnit.setSelected(false);
        }

        this.selectedUnit = entity;

        // Select new
        if (entity && entity.setSelected) {
            entity.setSelected(true);
        }
    }

    /**
     * Create placeholder content for testing
     */
    createTestContent() {
        // Create isometric grid
        this.grid = new Grid(this.gridWidth, this.gridHeight);
        this.grid.generateTestMap();
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

        // Create test unit on the grid
        this.createTestUnit();

        // Center camera on the grid center
        const center = this.grid.getCenter();
        this.camera.centerOn(
            center.x + this.grid.container.x,
            center.y + this.grid.container.y,
            true
        );

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

            this.animationsLoaded = true;

            // Update existing entities to use animations
            this.applyAnimationsToEntities();

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
                // Alternate between GIANT_RAT and TROLL for enemy variety
                const useRat = Math.random() < 0.5;
                entity.setAnimations(
                    this.animLoader,
                    useRat ? UNIT_ANIMS.GIANT_RAT : UNIT_ANIMS.TROLL
                );
            }
        }
    }

    /**
     * Create test units on the grid
     */
    createTestUnit() {
        // Create player unit at grid center
        const centerI = Math.floor(this.gridWidth / 2);
        const centerJ = Math.floor(this.gridHeight / 2);

        const playerUnit = new DynamicEntity(centerI, centerJ);
        playerUnit.initSprite();
        playerUnit.setBodyColor(0x4488ff);  // Blue for player
        playerUnit.setGrid(this.grid);  // Link to grid for cell occupancy
        playerUnit.game = this;  // Link to game for combat
        playerUnit.team = 'player';  // Team for combat targeting
        playerUnit.autoPlay = false;  // Player controls this unit manually
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
                enemy.initSprite();
                enemy.setBodyColor(0xff4444);  // Red for enemies
                enemy.autoPlay = true;
                enemy.sightRange = 10;  // Enemies can see further
                enemy.setGrid(this.grid);
                enemy.game = this;
                enemy.team = 'enemy';
                // Alternate between rat and troll for variety
                enemy.unitType = (idx % 2 === 0) ? 'rat' : 'troll';
                this.grid.container.addChild(enemy.sprite);
                this.entities.push(enemy);
            }
        }

        // Create some friendly units (green)
        const friendlyPositions = [
            { i: centerI - 2, j: centerJ },
            { i: centerI + 2, j: centerJ },
            { i: centerI, j: centerJ - 2 }
        ];

        for (const pos of friendlyPositions) {
            if (this.grid.isWalkable(pos.i, pos.j)) {
                const friendly = new DynamicEntity(pos.i, pos.j);
                friendly.initSprite();
                friendly.setBodyColor(0x44ff44);  // Green for friendlies
                friendly.setGrid(this.grid);
                friendly.game = this;
                friendly.team = 'player';  // Same team as player
                friendly.autoPlay = true;  // Autonomous behavior
                friendly.isRanged = true;  // Make friendlies ranged for variety
                friendly.rangedRange = 6;
                friendly.sightRange = 12;  // Friendlies can see even further
                friendly.unitType = 'ranger';  // For death sounds
                this.grid.container.addChild(friendly.sprite);
                this.entities.push(friendly);
            }
        }

        console.log(`Created ${this.entities.length} entities`);
    }

    /**
     * Draw path visualization for selected unit
     */
    updatePathVisualization() {
        if (!this.pathGraphics) return;

        this.pathGraphics.clear();

        // Draw path for selected unit if moving
        if (this.selectedUnit && this.selectedUnit.moving && this.selectedUnit.path.length > 0) {
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
        const speed = 15;

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
    }

    /**
     * Update main gameplay
     */
    updateGameplay(deltaTime) {
        // Update camera
        this.camera.update(deltaTime);

        // Update hover highlight
        this.updateHoverTile();

        // Update path visualization
        this.updatePathVisualization();

        // Update all entities
        for (const entity of this.entities) {
            if (entity.update) {
                entity.update(deltaTime);
            }
        }

        // Update missiles
        this.updateMissiles(deltaTime);

        // Check victory/defeat conditions
        this.checkGameEnd();
    }

    /**
     * Check if game has ended (victory or defeat)
     */
    checkGameEnd() {
        // Don't check if game already ended
        if (this.gameEnded) return;

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

        // Victory - all enemies dead
        if (enemyAlive === 0 && this.state === GameState.GAME) {
            this.onVictory();
        }

        // Defeat - all player units dead
        if (playerAlive === 0 && this.state === GameState.GAME) {
            this.onDefeat();
        }
    }

    /**
     * Handle victory
     */
    onVictory() {
        this.gameEnded = true;
        this.setState(GameState.GAME_PAUSE);
        this.gold += 100;  // Bonus gold

        // Play victory sound
        this.playSound(SOUNDS.GOLD);

        if (this.hud) {
            this.hud.showMessage('VICTORY! +100 Gold', 3000);
        }
        console.log('Victory! All enemies defeated.');
    }

    /**
     * Handle defeat
     */
    onDefeat() {
        this.gameEnded = true;
        this.setState(GameState.GAME_PAUSE);

        // Play defeat sound
        this.playSound(SOUNDS.YOUR_BUILDING_DENIED);

        if (this.hud) {
            this.hud.showMessage('DEFEAT!', 3000);
        }
        console.log('Defeat! All allies lost.');
    }

    /**
     * Render game (called as fast as possible)
     */
    render(alpha) {
        // Update HUD
        if (this.hud) {
            this.hud.update();
        }

        // Update debug display (simplified - HUD shows most info now)
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
     * Spawn a missile from attacker to target
     */
    spawnMissile(attacker, target, missileType = MissileType.ARROW) {
        const missile = createMissile(
            missileType,
            attacker.worldX,
            attacker.worldY - 15,  // Offset to spawn from "hand" height
            target,
            attacker.damage,
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
