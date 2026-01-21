/**
 * Minimap - Renders a minimap outside the main game canvas
 *
 * Based on original game's Buffer.smali minimap implementation:
 * - Shows terrain with color-coded tiles
 * - Displays buildings and units as colored rectangles
 * - Shows viewport frame indicating current camera view
 * - Click/drag to scroll the camera
 */

import * as IsoMath from '../world/IsoMath.js';

export class Minimap {
    constructor(canvas, game) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.game = game;

        // Minimap scale: how many game tiles per minimap pixel
        this.scale = 2;  // 1 minimap pixel = 2x2 game tiles

        // Terrain colors (improved visibility)
        this.terrainColors = {
            grass: ['#4a9c2d', '#5db03e', '#3d8825', '#4a9030', '#398020'],
            water: '#4499ff',       // Bright blue for water
            road: '#d4b896',        // Light tan for roads
            unwalkable: '#2d4a2d',  // Dark forest green for trees/rocks
            border: '#1a1a2e'       // Dark edge
        };

        // Object colors
        this.colors = {
            playerBuilding: '#4488ff',
            enemyBuilding: '#ff4444',
            playerUnit: '#44ff44',
            enemyUnit: '#ff6666',
            castle: '#ffd700',
            viewport: '#ffffff'
        };

        // Cached terrain image (regenerated when map loads)
        this.terrainImage = null;
        this.terrainDirty = true;

        // Initialization flag
        this.initialized = false;

        // Interaction state
        this.isDragging = false;

        // Set up event listeners
        this.setupEvents();
    }

    /**
     * Set up mouse/touch events for click-to-scroll
     */
    setupEvents() {
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.onMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.onMouseUp());

        // Touch support
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.onMouseDown({ offsetX: touch.clientX - this.canvas.getBoundingClientRect().left,
                              offsetY: touch.clientY - this.canvas.getBoundingClientRect().top });
        });
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.onMouseMove({ offsetX: touch.clientX - this.canvas.getBoundingClientRect().left,
                              offsetY: touch.clientY - this.canvas.getBoundingClientRect().top });
        });
        this.canvas.addEventListener('touchend', () => this.onMouseUp());
    }

    /**
     * Handle mouse down - start dragging
     */
    onMouseDown(e) {
        this.isDragging = true;
        this.scrollToPosition(e.offsetX, e.offsetY);
    }

    /**
     * Handle mouse move - continue dragging
     */
    onMouseMove(e) {
        if (this.isDragging) {
            this.scrollToPosition(e.offsetX, e.offsetY);
        }
    }

    /**
     * Handle mouse up - stop dragging
     */
    onMouseUp() {
        this.isDragging = false;
    }

    /**
     * Scroll camera to minimap position
     */
    scrollToPosition(cssX, cssY) {
        if (!this.game || !this.game.camera || !this.game.grid) return;

        const camera = this.game.camera;
        const grid = this.game.grid;

        // Convert CSS click coordinates to canvas coordinates
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        const minimapX = cssX * scaleX;
        const minimapY = cssY * scaleY;

        // Convert minimap coordinates to grid coordinates (inverse isometric)
        const { gridI, gridJ } = this.minimapToGrid(minimapX, minimapY);

        // Convert grid to world coordinates using IsoMath
        const { x: localX, y: localY } = IsoMath.gridToWorld(gridI, gridJ);

        // Add grid container offset to get actual world coordinates
        const worldX = localX + grid.container.x;
        const worldY = localY + grid.container.y;

        // Center camera on this position
        camera.centerOn(worldX, worldY);
    }

    /**
     * Initialize minimap size based on map dimensions
     * Minimap is rendered in isometric style to match game view
     */
    init() {
        if (!this.game.grid) return;

        const mapWidth = this.game.gridWidth;
        const mapHeight = this.game.gridHeight;

        // Scale: pixels per tile (0.975 = 30% bigger than 0.75)
        this.scale = 0.975;

        // For isometric rendering, the map forms a diamond
        // Width = (mapWidth + mapHeight) * scale (horizontal span)
        // Height = (mapWidth + mapHeight) * scale / 2 (vertical span, 2:1 ratio)
        const isoWidth = Math.ceil((mapWidth + mapHeight) * this.scale);
        const isoHeight = Math.ceil((mapWidth + mapHeight) * this.scale / 2);

        // Update canvas size
        this.canvas.width = isoWidth;
        this.canvas.height = isoHeight;

        // Display size (no additional scaling needed)
        this.canvas.style.width = isoWidth + 'px';
        this.canvas.style.height = isoHeight + 'px';

        // Mark terrain as needing redraw
        this.terrainDirty = true;
        this.initialized = true;

        console.log(`Minimap initialized: ${isoWidth}x${isoHeight}px (isometric view of ${mapWidth}x${mapHeight} grid)`);
    }

    /**
     * Convert grid coordinates to minimap pixel coordinates (isometric style)
     */
    gridToMinimap(gridI, gridJ) {
        const centerX = this.canvas.width / 2;
        const mx = centerX + (gridI - gridJ) * this.scale;
        const my = (gridI + gridJ) * this.scale / 2;
        return { mx, my };
    }

    /**
     * Convert minimap pixel coordinates to grid coordinates (inverse of isometric)
     */
    minimapToGrid(mx, my) {
        const centerX = this.canvas.width / 2;
        const relX = mx - centerX;
        const relY = my;
        // Inverse of isometric: i = (x/scale + 2*y/scale) / 2, j = (2*y/scale - x/scale) / 2
        const gridI = (relX / this.scale + 2 * relY / this.scale) / 2;
        const gridJ = (2 * relY / this.scale - relX / this.scale) / 2;
        return { gridI, gridJ };
    }

    /**
     * Render terrain to cached image (isometric style)
     */
    renderTerrain() {
        if (!this.game.grid || !this.game.mapLoader) return;

        const mapLoader = this.game.mapLoader;
        const grid = this.game.grid;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Create offscreen canvas for terrain
        const offscreen = document.createElement('canvas');
        offscreen.width = width;
        offscreen.height = height;
        const octx = offscreen.getContext('2d');

        // Fill with transparent/border color
        octx.fillStyle = this.terrainColors.border;
        octx.fillRect(0, 0, width, height);

        // Draw each tile in isometric style
        for (let j = 0; j < this.game.gridHeight; j++) {
            for (let i = 0; i < this.game.gridWidth; i++) {
                // Convert grid to minimap coordinates
                const { mx, my } = this.gridToMinimap(i, j);

                // Get terrain info
                const walkable = grid.isWalkable(i, j);
                const frame = mapLoader.getTerrainFrame(i, j);
                const overlay = mapLoader.getTerrainOverlay(i, j);

                // Determine color based on terrain type
                // Frames 32-55 = water/streams (blue curvy paths in game)
                // Other special frames = roads/paths
                let color;

                // Water streams use frames 32-55
                const isWater = (frame >= 32 && frame <= 55);

                // Roads use other non-grass frames
                const isRoad = (frame >= 9 && frame <= 31) || (frame >= 56 && frame <= 63);

                if (isWater) {
                    color = this.terrainColors.water;
                } else if (isRoad) {
                    color = this.terrainColors.road;
                } else if (!walkable) {
                    // Unwalkable terrain (trees, rocks, etc.)
                    color = this.terrainColors.unwalkable;
                } else {
                    // Grass with slight variation
                    const colorIndex = (i + j) % this.terrainColors.grass.length;
                    color = this.terrainColors.grass[colorIndex];
                }

                // Draw a small rectangle for this tile
                octx.fillStyle = color;
                const tileW = Math.max(1, Math.ceil(this.scale));
                const tileH = Math.max(1, Math.ceil(this.scale / 2));
                octx.fillRect(Math.floor(mx), Math.floor(my), tileW, tileH);
            }
        }

        this.terrainImage = offscreen;
        this.terrainDirty = false;
    }

    /**
     * Update and render minimap
     */
    render() {
        if (!this.game.grid) return;

        // Initialize if needed
        if (!this.initialized) {
            this.init();
        }

        // Render terrain if dirty
        if (this.terrainDirty || !this.terrainImage) {
            this.renderTerrain();
        }

        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Clear
        ctx.clearRect(0, 0, width, height);

        // Draw cached terrain
        if (this.terrainImage) {
            ctx.drawImage(this.terrainImage, 0, 0);
        }

        // Draw buildings
        this.drawBuildings(ctx);

        // Draw units
        this.drawUnits(ctx);

        // Draw viewport frame
        this.drawViewport(ctx);
    }

    /**
     * Draw buildings on minimap
     */
    drawBuildings(ctx) {
        for (const building of this.game.buildings) {
            if (!building.isAlive || !building.isAlive()) continue;

            const { mx, my } = this.gridToMinimap(building.gridI, building.gridJ);

            // Size based on building type
            let size = 3;
            let color = this.colors.playerBuilding;

            if (building.team === 'enemy') {
                color = this.colors.enemyBuilding;
            }

            // Castle is larger and gold
            if (building.buildingType === 'castle' || building.type === 0x20) {
                size = 5;
                color = this.colors.castle;
            }

            ctx.fillStyle = color;
            ctx.fillRect(mx - size/2, my - size/4, size, size/2);
        }
    }

    /**
     * Draw units on minimap
     */
    drawUnits(ctx) {
        for (const entity of this.game.entities) {
            if (!entity.isAlive || !entity.isAlive()) continue;

            const { mx, my } = this.gridToMinimap(entity.gridI, entity.gridJ);

            // Color based on team
            const color = entity.team === 'player'
                ? this.colors.playerUnit
                : this.colors.enemyUnit;

            ctx.fillStyle = color;
            ctx.fillRect(mx - 1, my - 1, 3, 2);
        }
    }

    /**
     * Draw viewport frame showing current camera view
     */
    drawViewport(ctx) {
        if (!this.game.camera || !this.game.grid) return;

        const camera = this.game.camera;
        const grid = this.game.grid;

        // Get center of viewport in world coordinates
        const centerWorldX = camera.x + this.game.app.screen.width / 2;
        const centerWorldY = camera.y + this.game.app.screen.height / 2;

        // Convert to grid-local coordinates (remove grid container offset)
        const localX = centerWorldX - grid.container.x;
        const localY = centerWorldY - grid.container.y;

        // Convert to grid coordinates
        const centerGrid = IsoMath.worldToGrid(localX, localY);

        // Convert grid center to minimap coordinates
        const { mx: cx, my: cy } = this.gridToMinimap(centerGrid.i, centerGrid.j);

        // Viewport size in minimap pixels (approximate)
        const viewW = this.game.app.screen.width / IsoMath.TILE_WIDTH * this.scale * 1.5;
        const viewH = this.game.app.screen.height / IsoMath.TILE_HEIGHT * this.scale * 0.75;

        // Draw viewport as a rectangle
        ctx.strokeStyle = this.colors.viewport;
        ctx.lineWidth = 2;
        ctx.strokeRect(cx - viewW/2, cy - viewH/2, viewW, viewH);

        // Draw center marker
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(cx - 2, cy - 1, 4, 2);
    }

    /**
     * Force terrain redraw (call after map changes)
     */
    invalidateTerrain() {
        this.terrainDirty = true;
    }
}
