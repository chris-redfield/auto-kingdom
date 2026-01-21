/**
 * Grid - Tile-based game map (ported from Location.smali)
 *
 * Manages:
 * - Tile data (terrain, buildings, occupancy)
 * - Cell flags (empty, busy, locked)
 * - Pathfinding grid
 * - Rendering of isometric tiles
 */

import * as IsoMath from './IsoMath.js';
import { FLD_EMPTY, FLD_BUSY, FLD_LOCK } from '../utils/Constants.js';
import { TileRenderer } from '../graphics/TileRenderer.js';

// Tile types
export const TileType = {
    GRASS: 0,
    DIRT: 1,
    WATER: 2,
    STONE: 3,
    SAND: 4,
    GRASS_DARK: 5,
    GRASS_LIGHT: 6
};

// Tile colors for rendering (fallback when no tileset loaded)
const TILE_COLORS = {
    [TileType.GRASS]: 0x4a7c3f,
    [TileType.DIRT]: 0x8b6b4a,
    [TileType.WATER]: 0x3a6ea5,
    [TileType.STONE]: 0x6b6b6b,
    [TileType.SAND]: 0xc4a84b,
    [TileType.GRASS_DARK]: 0x3d6b32,
    [TileType.GRASS_LIGHT]: 0x5a9c4f
};

// Background textures (from Import.smali DD_WINDOW_TILE = 0x42)
// Package 0, Animation 66 - tiled 84x84 textures (water, red, yellow terrain)
// NOTE: Green grass is NOT in Animation 66 - it's procedurally generated!
const GRASS_TILE_SIZE = 84;  // Each tile is 84x84 pixels

// Animation 66 frame mapping (from test_terrain.html):
// Frame 0: Water texture (blue)
// Frame 1: Red terrain
// Frame 2: Yellow terrain
const TILE_FRAME_WATER = 0;
const TILE_FRAME_RED = 1;
const TILE_FRAME_YELLOW = 2;

// Grass color palette from Buffer.smali grassColor array
// Used for procedural grass generation (original game approach)
const GRASS_COLORS = [
    0x596d29,  // Olive green
    0x617c1f,  // Green
    0x479d2d,  // Bright green
    // 0x5e8fd7 - Blue (skipped - for water)
    0x628a24,  // Green
    0x263b05,  // Dark green
    0x4e6d1d,  // Green
    0x54681e   // Green
];

export class Grid {
    /**
     * Create a new grid
     * @param {number} width - Grid width in tiles
     * @param {number} height - Grid height in tiles
     * @param {PIXI.Application} app - PixiJS application (for texture generation)
     */
    constructor(width, height, app = null) {
        this.width = width;
        this.height = height;
        this.app = app;

        // Tile data arrays
        this.tiles = new Array(width * height).fill(TileType.GRASS);
        this.flags = new Array(width * height).fill(FLD_EMPTY);

        // PixiJS container for rendering
        this.container = new PIXI.Container();
        this.tileGraphics = null;

        // Cached bounds
        this.bounds = IsoMath.getGridBounds(0, 0, width, height);

        // Tile renderer for textured tiles
        this.tileRenderer = null;
        if (app) {
            this.tileRenderer = new TileRenderer(app);
            this.tileRenderer.generateTextures();
        }

        // Tile sprites container
        this.tilesContainer = new PIXI.Container();
        this.container.addChild(this.tilesContainer);

        // Use textured rendering by default
        this.useTextures = true;

        // Grass background texture (tiled 84x84 texture)
        this.grassTexture = null;
        this.grassLoaded = false;

        // Background container for base terrain tiles (rendered first)
        this.backgroundContainer = new PIXI.Container();
        this.container.addChildAt(this.backgroundContainer, 0);  // Add behind everything

        // Overlay container for terrain transition overlays (rendered ON TOP of base tiles)
        // This ensures overlays from tile A aren't hidden by base tile B
        this.overlayContainer = new PIXI.Container();
        this.container.addChild(this.overlayContainer);  // Add after background

        // Decorations container (bushes, rocks, trees on top of terrain)
        this.decorationsContainer = new PIXI.Container();
        this.container.addChild(this.decorationsContainer);

        // Map data reference (for terrain rendering from map file)
        this.mapLoader = null;

        // Terrain tile textures (from tileset spritesheet) - DEPRECATED
        // Use terrainAnimLoader instead for proper offset handling
        this.terrainTiles = [];

        // Terrain animation data (with per-frame offsets)
        this.terrainAnimLoader = null;
        this.terrainPackageId = null;

        // Viewport-based terrain rendering
        this.terrainSprites = new Map();  // "i,j" -> { base, overlays[] } sprite pool
        this.lastCameraX = null;
        this.lastCameraY = null;
        this.visibleTileMargin = 3;  // Extra tiles beyond screen edge

        // Overlay statistics for debugging
        this.overlayStats = {
            tilesRendered: 0,
            overlaysAdded: 0,
            overlaysFailed: 0
        };
    }

    /**
     * Set terrain animation loader for proper offset handling
     * @param {AnimationLoader} animLoader - Loaded animation data
     * @param {number} packageId - Terrain package (45=grass, 46=necro, 47=snow)
     */
    setTerrainAnimations(animLoader, packageId) {
        this.terrainAnimLoader = animLoader;
        this.terrainPackageId = packageId;

        // Log some terrain frame data to verify offsets
        const anim0 = animLoader.getAnimation(packageId, 0);
        if (anim0) {
            console.log(`Terrain package ${packageId}: ${anim0.frameCount} frames in anim 0`);

            // Check first few frames for offset data
            for (let f = 0; f < Math.min(3, anim0.frameCount); f++) {
                const frame = animLoader.getFrame(packageId, 0, f);
                if (frame && frame.layers.length > 0) {
                    const layer = frame.layers[0];
                    console.log(`  Frame ${f}: offset=(${layer.xOffset}, ${layer.yOffset}), ` +
                        `rect=${frame.rects[0]?.width}x${frame.rects[0]?.height}`);
                }
            }
        }

        // Debug: Check overlay values in map data
        if (this.mapLoader) {
            let overlayCount = 0;
            let totalChecked = 0;
            const overlaySamples = [];

            for (let j = 0; j < Math.min(50, this.height); j++) {
                for (let i = 0; i < Math.min(50, this.width); i++) {
                    const overlay = this.mapLoader.getTerrainOverlay(i, j);
                    totalChecked++;
                    if (overlay > 0) {
                        overlayCount++;
                        if (overlaySamples.length < 5) {
                            overlaySamples.push(`(${i},${j})=${overlay}`);
                        }
                    }
                }
            }
            console.log(`Overlay check: ${overlayCount}/${totalChecked} tiles have overlays`);
            if (overlaySamples.length > 0) {
                console.log(`  Samples: ${overlaySamples.join(', ')}`);
            }
        }

        // Clear existing terrain and re-render with new system
        this.clearTerrainSprites();
        console.log('Terrain animations set - will use AnimationLoader for rendering');
    }

    /**
     * Set map data for terrain rendering
     * @param {MapLoader} mapLoader - Loaded map data
     * @param {PIXI.Texture[]} terrainTiles - Array of tile textures from tileset
     */
    setMapData(mapLoader, terrainTiles) {
        this.mapLoader = mapLoader;
        this.terrainTiles = terrainTiles || [];
        console.log(`Grid set map data: ${this.terrainTiles.length} terrain tiles available`);
    }

    /**
     * Generate grass texture
     * Original game has NO visible grid - just smooth continuous grass.
     * Use pure solid color - the "texture" comes from decorations on top.
     */
    generateGrassTexture() {
        if (!this.app) {
            console.warn('Cannot generate grass texture: missing app');
            return false;
        }

        const size = GRASS_TILE_SIZE;
        const graphics = new PIXI.Graphics();

        // Pure solid grass color - NO patterns, NO grid lines
        // Match original's yellowish-green hue
        const baseColor = 0x5a7828;
        graphics.rect(0, 0, size, size);
        graphics.fill(baseColor);

        // Generate texture from graphics
        this.grassTexture = this.app.renderer.generateTexture(graphics);
        this.grassLoaded = this.grassTexture !== null;

        if (this.grassLoaded) {
            console.log(`Solid grass texture generated: ${size}x${size}`);
        }

        return this.grassLoaded;
    }

    /**
     * Load grass texture from animation loader (legacy method)
     * Falls back to procedural generation
     * @param {AnimationLoader} animationLoader - Optional loader
     */
    loadTileset(animationLoader) {
        // Generate procedural grass instead of loading from animation
        // Original game also uses procedural approach with grassColor palette
        return this.generateGrassTexture();
    }

    /**
     * Get array index for grid position
     */
    getIndex(i, j) {
        if (!this.isInBounds(i, j)) return -1;
        return j * this.width + i;
    }

    /**
     * Check if position is within grid bounds
     */
    isInBounds(i, j) {
        return i >= 0 && i < this.width && j >= 0 && j < this.height;
    }

    /**
     * Get tile type at position
     */
    getTile(i, j) {
        const idx = this.getIndex(i, j);
        return idx >= 0 ? this.tiles[idx] : -1;
    }

    /**
     * Set tile type at position
     */
    setTile(i, j, tileType) {
        const idx = this.getIndex(i, j);
        if (idx >= 0) {
            this.tiles[idx] = tileType;
        }
    }

    /**
     * Get cell flags at position
     */
    getFlags(i, j) {
        const idx = this.getIndex(i, j);
        return idx >= 0 ? this.flags[idx] : FLD_LOCK;
    }

    /**
     * Set cell flags at position
     */
    setFlags(i, j, flags) {
        const idx = this.getIndex(i, j);
        if (idx >= 0) {
            this.flags[idx] = flags;
        }
    }

    /**
     * Check if cell is walkable
     */
    isWalkable(i, j) {
        const flags = this.getFlags(i, j);
        return flags === FLD_EMPTY;
    }

    /**
     * Check if cell is occupied
     */
    isOccupied(i, j) {
        const flags = this.getFlags(i, j);
        return flags === FLD_BUSY || flags === FLD_LOCK;
    }

    /**
     * Mark cell as occupied
     */
    occupy(i, j) {
        this.setFlags(i, j, FLD_BUSY);
    }

    /**
     * Mark cell as empty
     */
    vacate(i, j) {
        this.setFlags(i, j, FLD_EMPTY);
    }

    /**
     * Lock a cell (permanently blocked)
     */
    lock(i, j) {
        this.setFlags(i, j, FLD_LOCK);
    }

    /**
     * Fill a rectangular area with a tile type
     */
    fillRect(startI, startJ, width, height, tileType) {
        for (let j = startJ; j < startJ + height; j++) {
            for (let i = startI; i < startI + width; i++) {
                this.setTile(i, j, tileType);
            }
        }
    }

    /**
     * Generate a simple test map
     */
    generateTestMap() {
        // Fill with grass
        this.tiles.fill(TileType.GRASS);

        // Add some dirt paths
        for (let i = 5; i < this.width - 5; i++) {
            this.setTile(i, Math.floor(this.height / 2), TileType.DIRT);
            this.setTile(Math.floor(this.width / 2), i, TileType.DIRT);
        }

        // Add water in corners
        this.fillRect(0, 0, 3, 3, TileType.WATER);
        this.fillRect(this.width - 3, 0, 3, 3, TileType.WATER);
        this.fillRect(0, this.height - 3, 3, 3, TileType.WATER);
        this.fillRect(this.width - 3, this.height - 3, 3, 3, TileType.WATER);

        // Lock water tiles
        for (let j = 0; j < this.height; j++) {
            for (let i = 0; i < this.width; i++) {
                if (this.getTile(i, j) === TileType.WATER) {
                    this.lock(i, j);
                }
            }
        }

        // Add some stone
        this.fillRect(10, 10, 4, 4, TileType.STONE);

        // Add sand
        this.fillRect(this.width - 10, this.height - 10, 5, 5, TileType.SAND);
    }

    /**
     * Render the grid
     */
    render() {
        if (this.useTextures && this.tileRenderer) {
            this.renderTextured();
        } else {
            this.renderColored();
        }
    }

    /**
     * Render using textured sprites
     * Called once during initialization - sets up background
     * Terrain tiles are updated dynamically via updateVisibleTerrain()
     */
    renderTextured() {
        // Clear previous
        this.tilesContainer.removeChildren();
        this.backgroundContainer.removeChildren();

        // Check if we can render terrain (either via AnimationLoader or old tile array)
        const canRenderTerrain = this.mapLoader && (
            this.terrainAnimLoader !== null ||
            this.terrainTiles.length > 0
        );

        if (canRenderTerrain) {
            // Terrain tiles will be rendered by updateVisibleTerrain()
            // No static background needed - tiles cover everything
            console.log('Viewport-based terrain rendering enabled');
        } else {
            // Fallback: solid green background until terrain loads
            this.renderGrassBackground();
        }
    }

    /**
     * Update visible terrain tiles based on camera viewport
     * Call this each frame (or when camera moves significantly)
     *
     * @param {Camera} camera - Camera with x, y, width, height
     * @param {number} gridOffsetX - Grid container's X offset in world
     * @param {number} gridOffsetY - Grid container's Y offset in world
     */
    updateVisibleTerrain(camera, gridOffsetX = 0, gridOffsetY = 0) {
        // Need mapLoader and either AnimationLoader or old tile array
        const canRender = this.mapLoader && (
            this.terrainAnimLoader !== null ||
            this.terrainTiles.length > 0
        );
        if (!canRender) return;

        // Check if camera moved enough to warrant update
        const cameraMoveThreshold = IsoMath.TILE_HALF_HEIGHT;
        if (this.lastCameraX !== null &&
            Math.abs(camera.x - this.lastCameraX) < cameraMoveThreshold &&
            Math.abs(camera.y - this.lastCameraY) < cameraMoveThreshold) {
            return;  // Camera hasn't moved enough
        }

        this.lastCameraX = camera.x;
        this.lastCameraY = camera.y;

        // Calculate visible area in grid-local coordinates
        // Camera coordinates are world coordinates; grid has an offset
        const viewLeft = camera.x - gridOffsetX;
        const viewTop = camera.y - gridOffsetY;
        const viewRight = viewLeft + camera.width;
        const viewBottom = viewTop + camera.height;

        // Convert viewport corners to grid coordinates
        // Add margin for tiles that partially overlap viewport
        const margin = this.visibleTileMargin;

        // Get grid bounds for all corners of the viewport (isometric means we need all 4)
        const topLeftGrid = IsoMath.worldToGrid(viewLeft, viewTop);
        const topRightGrid = IsoMath.worldToGrid(viewRight, viewTop);
        const bottomLeftGrid = IsoMath.worldToGrid(viewLeft, viewBottom);
        const bottomRightGrid = IsoMath.worldToGrid(viewRight, viewBottom);

        // Find the bounding box of visible tiles
        // In isometric view, the visible diamond is rotated 45°
        const minI = Math.floor(Math.min(topLeftGrid.i, topRightGrid.i, bottomLeftGrid.i, bottomRightGrid.i)) - margin;
        const maxI = Math.ceil(Math.max(topLeftGrid.i, topRightGrid.i, bottomLeftGrid.i, bottomRightGrid.i)) + margin;
        const minJ = Math.floor(Math.min(topLeftGrid.j, topRightGrid.j, bottomLeftGrid.j, bottomRightGrid.j)) - margin;
        const maxJ = Math.ceil(Math.max(topLeftGrid.j, topRightGrid.j, bottomLeftGrid.j, bottomRightGrid.j)) + margin;

        // Clamp to map bounds
        const startI = Math.max(0, minI);
        const endI = Math.min(this.width, maxI);
        const startJ = Math.max(0, minJ);
        const endJ = Math.min(this.height, maxJ);

        // Track which tiles should be visible
        const visibleKeys = new Set();

        // Add/update visible tiles
        for (let j = startJ; j < endJ; j++) {
            for (let i = startI; i < endI; i++) {
                const key = `${i},${j}`;
                visibleKeys.add(key);

                // Skip if already rendered
                if (this.terrainSprites.has(key)) continue;

                // Create sprites for this tile (base + overlays separate)
                const tileData = this.createTerrainSprite(i, j);
                if (tileData) {
                    this.terrainSprites.set(key, tileData);

                    // Add base tile to background container (rendered first)
                    if (tileData.base) {
                        this.backgroundContainer.addChild(tileData.base);
                    }

                    // Add overlays to overlay container (rendered ON TOP of all base tiles)
                    for (const overlay of tileData.overlays) {
                        this.overlayContainer.addChild(overlay);
                    }
                }
            }
        }

        // Remove tiles that are no longer visible
        for (const [key, tileData] of this.terrainSprites) {
            if (!visibleKeys.has(key)) {
                // Remove base tile
                if (tileData.base) {
                    this.backgroundContainer.removeChild(tileData.base);
                }
                // Remove all overlays
                for (const overlay of tileData.overlays) {
                    this.overlayContainer.removeChild(overlay);
                }
                this.terrainSprites.delete(key);
            }
        }
    }

    /**
     * Create terrain sprites for a tile position
     * Returns separate base tile and overlay sprites for proper z-ordering
     *
     * IMPORTANT: Base tiles go in backgroundContainer, overlays go in overlayContainer
     * This ensures ALL base tiles render first, then ALL overlays render on top.
     * Otherwise, a later tile's base could cover an earlier tile's overlay.
     *
     * @returns {object|null} { base: Container, overlays: Container[] } or null
     */
    createTerrainSprite(i, j) {
        // Get frame index from map data
        const frameIndex = this.mapLoader.getTerrainFrame(i, j);

        // Use AnimationLoader if available (preferred - has offset data)
        if (this.terrainAnimLoader && this.terrainPackageId !== null) {
            // Get the TOP point of the tile for positioning
            const topPos = IsoMath.getTileTop(i, j);
            const tileX = Math.round(topPos.x);
            const tileY = Math.round(topPos.y);

            // Scale factors: tiles are 130x68, scale to 64x32 grid cells
            const scaleX = 64 / 130;
            const scaleY = 32 / 68;

            const halfWidth = IsoMath.TILE_HALF_WIDTH;
            const halfHeight = IsoMath.TILE_HALF_HEIGHT;

            // Result object to track sprites for this tile
            const result = { base: null, overlays: [] };

            // Create base terrain tile
            const baseTile = this.terrainAnimLoader.createFrameContainer(
                this.terrainPackageId,
                0,  // Animation 0 contains the terrain tiles
                frameIndex
            );

            if (baseTile) {
                baseTile.scale.set(scaleX, scaleY);
                baseTile.x = tileX - halfWidth;  // Center the diamond
                baseTile.y = tileY;
                result.base = baseTile;
            }

            // Read overlay frames from 4 adjacent cells
            const overlay1 = this.mapLoader.getTerrainOverlay(i, j);
            const overlay2 = this.mapLoader.getTerrainOverlay(i + 1, j);
            const overlay3 = this.mapLoader.getTerrainOverlay(i, j + 1);
            const overlay4 = this.mapLoader.getTerrainOverlay(i + 1, j + 1);

            // Track stats
            this.overlayStats.tilesRendered++;

            // Debug logging (first few tiles only)
            const hasOverlays = overlay1 > 0 || overlay2 > 0 || overlay3 > 0 || overlay4 > 0;
            if (!this._overlayLogDone && hasOverlays) {
                console.log(`Tile (${i},${j}) base=${frameIndex} overlays: o1=${overlay1}, o2=${overlay2}, o3=${overlay3}, o4=${overlay4}`);
                this._overlayLogCount = (this._overlayLogCount || 0) + 1;
                if (this._overlayLogCount >= 10) {
                    this._overlayLogDone = true;
                    console.log('(further overlay logs suppressed - run grid.logOverlayStats() for summary)');
                }
            }

            // Helper to create positioned overlay sprite
            const createOverlay = (overlayFrame, offsetX, offsetY) => {
                if (overlayFrame <= 0) return null;

                const overlay = this.createOverlaySprite(overlayFrame, scaleX, scaleY);
                if (overlay) {
                    // Position: tile position + base offset (-halfWidth) + specific offset
                    overlay.x = tileX - halfWidth + offsetX;
                    overlay.y = tileY + offsetY;
                    this.overlayStats.overlaysAdded++;
                    return overlay;
                } else {
                    this.overlayStats.overlaysFailed++;
                    return null;
                }
            };

            // Create overlays at their world positions
            // Positions from Location.smali lines 4133-4174:
            // - overlay1: (x, y) - same as base
            // - overlay2: (x + halfWidth, y + halfHeight) - right+down
            // - overlay3: (x - halfWidth, y + halfHeight) - left+down
            // - overlay4: (x, y + cellHeight) - down (full height)
            const o1 = createOverlay(overlay1, 0, 0);
            const o2 = createOverlay(overlay2, halfWidth, halfHeight);
            const o3 = createOverlay(overlay3, -halfWidth, halfHeight);
            const o4 = createOverlay(overlay4, 0, IsoMath.TILE_HEIGHT);

            if (o1) result.overlays.push(o1);
            if (o2) result.overlays.push(o2);
            if (o3) result.overlays.push(o3);
            if (o4) result.overlays.push(o4);

            return result;
        }

        // Fallback: use old tile texture array (without offsets)
        const tileIndex = Math.min(frameIndex, this.terrainTiles.length - 1);
        if (tileIndex < 0 || tileIndex >= this.terrainTiles.length) {
            return null;
        }

        const tileTexture = this.terrainTiles[tileIndex];
        if (!tileTexture) return null;

        const sprite = new PIXI.Sprite(tileTexture);
        sprite.scale.set(0.5, 0.5);
        sprite.anchor.set(0.5, 0);

        const topPos = IsoMath.getTileTop(i, j);
        sprite.x = topPos.x;
        sprite.y = topPos.y;

        return { base: sprite, overlays: [] };
    }

    /**
     * Log overlay statistics (call from console for debugging)
     */
    logOverlayStats() {
        console.log('=== OVERLAY RENDERING STATS ===');
        console.log(`Tiles rendered: ${this.overlayStats.tilesRendered}`);
        console.log(`Overlays added: ${this.overlayStats.overlaysAdded}`);
        console.log(`Overlays failed: ${this.overlayStats.overlaysFailed}`);
        if (this.overlayStats.tilesRendered > 0) {
            const avgOverlays = this.overlayStats.overlaysAdded / this.overlayStats.tilesRendered;
            console.log(`Avg overlays per tile: ${avgOverlays.toFixed(2)}`);
        }
        console.log('===============================');
        return this.overlayStats;
    }

    /**
     * Create an overlay sprite for terrain transitions
     * Overlays are semi-transparent tiles that blend terrain edges
     * @param {number} frameIndex - Overlay frame index from terrain data
     * @param {number} scaleX - X scale factor (64/130 for width)
     * @param {number} scaleY - Y scale factor (32/68 for height)
     * @returns {PIXI.Container|null} Overlay sprite container
     */
    createOverlaySprite(frameIndex, scaleX, scaleY) {
        if (!this.terrainAnimLoader || this.terrainPackageId === null) {
            return null;
        }

        // Overlays use the same animation (0) as base terrain tiles
        const overlay = this.terrainAnimLoader.createFrameContainer(
            this.terrainPackageId,
            0,
            frameIndex
        );

        if (overlay) {
            overlay.scale.set(scaleX, scaleY);
        }

        return overlay;
    }

    /**
     * Clear all terrain sprites (call when changing maps)
     */
    clearTerrainSprites() {
        for (const tileData of this.terrainSprites.values()) {
            // Remove base tile
            if (tileData.base) {
                this.backgroundContainer.removeChild(tileData.base);
            }
            // Remove all overlays
            if (tileData.overlays) {
                for (const overlay of tileData.overlays) {
                    this.overlayContainer.removeChild(overlay);
                }
            }
        }
        this.terrainSprites.clear();
        this.lastCameraX = null;
        this.lastCameraY = null;
    }

    /**
     * Log terrain frame distribution for debugging
     * Call this after map loading to analyze terrain variety
     */
    logTerrainDistribution() {
        if (!this.mapLoader) return;

        const frameCounts = {};
        for (let j = 0; j < this.height; j++) {
            for (let i = 0; i < this.width; i++) {
                const frame = this.mapLoader.getTerrainFrame(i, j);
                frameCounts[frame] = (frameCounts[frame] || 0) + 1;
            }
        }

        const total = this.width * this.height;
        const sortedFrames = Object.entries(frameCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15);

        console.log('Terrain frame distribution (top 15):');
        sortedFrames.forEach(([frame, count]) => {
            const pct = ((count / total) * 100).toFixed(1);
            console.log(`  Frame ${frame}: ${count} tiles (${pct}%)`);
        });
        console.log(`Total unique frames: ${Object.keys(frameCounts).length}`);
    }

    /**
     * Render grass background as a SINGLE solid rectangle
     * NO tiling - avoids the square grid pattern problem
     */
    renderGrassBackground() {
        // Get the world bounds
        const bounds = this.getWorldBounds();

        // Add padding around the world
        const padding = 200;
        const x = bounds.minX - padding;
        const y = bounds.minY - padding;
        const width = (bounds.maxX - bounds.minX) + padding * 2;
        const height = (bounds.maxY - bounds.minY) + padding * 2;

        // Draw ONE solid rectangle - no tiling, no seams
        const graphics = new PIXI.Graphics();
        graphics.rect(x, y, width, height);
        graphics.fill(0x5a7828);  // Grass green color

        this.backgroundContainer.addChild(graphics);
    }

    /**
     * Add grass decorations from Package 27
     *
     * NOTE: The original game does NOT scatter random decorations on grass.
     * The grass is a solid green background. DECOR_GRASS_* items (BIGROCK, WALL,
     * KOLONNA, etc.) are LARGE map decorations placed by level design, not grass texture.
     *
     * Previous implementation was broken - it used animations 21-30 which are
     * SHADOW sprites (dark silhouettes), not actual decorations (0-15).
     *
     * This method is now disabled. Decorations should be loaded from map data.
     *
     * @param {AnimationLoader} animLoader - Animation loader with Package 27 loaded
     */
    addGrassDecorations(animLoader) {
        // Clear existing decorations
        this.decorationsContainer.removeChildren();

        // DISABLED: The original game uses solid green grass without random decorations.
        // Grass decorations (DECOR_GRASS_*) are large map objects placed by level design.
        // They are NOT meant to be scattered randomly for grass texture.
        //
        // Package 27 animation mapping (from Import.smali):
        // - Anim 0-15: DECOR_GRASS_* (BIGROCK, HOLM, IDOL, KOLONNA, LAKE, UKOZATEL, WALL)
        // - Anim 16-20: RUINS_GRASS_PART*
        // - Anim 21-35: SHADOW_DECOR_GRASS_* (shadow sprites - what was being loaded before!)
        //
        // TODO: Load decorations from actual map data when map loading is implemented.

        console.log('Grass decorations disabled - original game uses solid green background');
    }

    /**
     * Add a single decoration sprite at a grid position
     */
    addDecorationSprite(animLoader, packageId, animId, gridI, gridJ, offsetSeed) {
        const frame = animLoader.getFrame(packageId, animId, 0);
        if (!frame || frame.layers.length === 0) return;

        const layer = frame.layers[0];
        const rect = frame.rects[0];
        const spriteTexture = animLoader.getSprite(packageId, layer.spriteIndex);

        if (!spriteTexture) return;

        // Create sub-texture for this decoration
        const subTexture = new PIXI.Texture({
            source: spriteTexture.source,
            frame: new PIXI.Rectangle(rect.x, rect.y, rect.width, rect.height)
        });

        const sprite = new PIXI.Sprite(subTexture);

        // Convert grid position to world position
        const worldPos = IsoMath.gridToWorld(gridI, gridJ);

        // Add small random offset within the cell for natural look
        const offsetX = (offsetSeed - 0.5) * 20;
        const offsetY = (Math.sin(offsetSeed * 100) * 0.5) * 20;

        // Position sprite (center on the tile, account for sprite size)
        sprite.x = worldPos.x + offsetX - rect.width / 2;
        sprite.y = worldPos.y + offsetY - rect.height + 10;  // Offset up so base sits on ground

        // Slight alpha variation for depth
        sprite.alpha = 0.85 + offsetSeed * 0.15;

        this.decorationsContainer.addChild(sprite);
    }

    /**
     * Render using colored graphics (fallback)
     */
    renderColored() {
        // Clear previous graphics
        if (this.tileGraphics) {
            this.container.removeChild(this.tileGraphics);
            this.tileGraphics.destroy();
        }

        this.tileGraphics = new PIXI.Graphics();

        // Draw tiles in correct order (back to front)
        for (let j = 0; j < this.height; j++) {
            for (let i = 0; i < this.width; i++) {
                this.drawTileColored(i, j);
            }
        }

        this.container.addChild(this.tileGraphics);
    }

    /**
     * Draw a single colored tile (fallback)
     */
    drawTileColored(i, j) {
        const tileType = this.getTile(i, j);
        const color = TILE_COLORS[tileType] || 0x888888;
        const corners = IsoMath.getTileCorners(i, j);

        // Draw filled diamond
        this.tileGraphics.moveTo(corners[0].x, corners[0].y);
        this.tileGraphics.lineTo(corners[1].x, corners[1].y);
        this.tileGraphics.lineTo(corners[2].x, corners[2].y);
        this.tileGraphics.lineTo(corners[3].x, corners[3].y);
        this.tileGraphics.lineTo(corners[0].x, corners[0].y);
        this.tileGraphics.fill(color);

        // Draw outline
        this.tileGraphics.setStrokeStyle({ width: 1, color: 0x000000, alpha: 0.3 });
        this.tileGraphics.moveTo(corners[0].x, corners[0].y);
        this.tileGraphics.lineTo(corners[1].x, corners[1].y);
        this.tileGraphics.lineTo(corners[2].x, corners[2].y);
        this.tileGraphics.lineTo(corners[3].x, corners[3].y);
        this.tileGraphics.lineTo(corners[0].x, corners[0].y);
        this.tileGraphics.stroke();
    }

    /**
     * Highlight a tile (for debugging or selection)
     */
    highlightTile(i, j, color = 0xffff00, alpha = 0.5) {
        if (!this.isInBounds(i, j)) return null;

        const corners = IsoMath.getTileCorners(i, j);
        const highlight = new PIXI.Graphics();

        highlight.moveTo(corners[0].x, corners[0].y);
        highlight.lineTo(corners[1].x, corners[1].y);
        highlight.lineTo(corners[2].x, corners[2].y);
        highlight.lineTo(corners[3].x, corners[3].y);
        highlight.lineTo(corners[0].x, corners[0].y);
        highlight.fill({ color: color, alpha: alpha });

        return highlight;
    }

    /**
     * Get world bounds of the grid
     */
    getWorldBounds() {
        return this.bounds;
    }

    /**
     * Get world size
     */
    getWorldSize() {
        return {
            width: this.bounds.maxX - this.bounds.minX,
            height: this.bounds.maxY - this.bounds.minY
        };
    }

    /**
     * Get center of grid in world coordinates
     */
    getCenter() {
        return IsoMath.gridToWorld(this.width / 2, this.height / 2);
    }

    /**
     * Find path between two grid positions (simple A* implementation)
     * Returns array of {i, j} positions or empty array if no path
     */
    findPath(startI, startJ, endI, endJ) {
        if (!this.isInBounds(startI, startJ) || !this.isInBounds(endI, endJ)) {
            return [];
        }

        if (!this.isWalkable(endI, endJ)) {
            return [];
        }

        // A* pathfinding
        const openSet = [];
        const closedSet = new Set();
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();

        const key = (i, j) => `${i},${j}`;

        const start = { i: startI, j: startJ };
        const end = { i: endI, j: endJ };

        openSet.push(start);
        gScore.set(key(startI, startJ), 0);
        fScore.set(key(startI, startJ), IsoMath.gridDistanceEuclidean(startI, startJ, endI, endJ));

        while (openSet.length > 0) {
            // Get node with lowest fScore
            openSet.sort((a, b) => {
                return (fScore.get(key(a.i, a.j)) || Infinity) - (fScore.get(key(b.i, b.j)) || Infinity);
            });
            const current = openSet.shift();
            const currentKey = key(current.i, current.j);

            // Check if we reached the goal
            if (current.i === endI && current.j === endJ) {
                // Reconstruct path
                const path = [];
                let node = current;
                while (node) {
                    path.unshift({ i: node.i, j: node.j });
                    node = cameFrom.get(key(node.i, node.j));
                }
                return path;
            }

            closedSet.add(currentKey);

            // Check all neighbors
            const neighbors = IsoMath.getAllNeighbors(current.i, current.j);
            for (const neighbor of neighbors) {
                const neighborKey = key(neighbor.i, neighbor.j);

                if (closedSet.has(neighborKey)) continue;
                if (!this.isInBounds(neighbor.i, neighbor.j)) continue;
                if (!this.isWalkable(neighbor.i, neighbor.j)) continue;

                const tentativeG = (gScore.get(currentKey) || 0) + 1;

                const inOpenSet = openSet.some(n => n.i === neighbor.i && n.j === neighbor.j);
                if (!inOpenSet) {
                    openSet.push(neighbor);
                } else if (tentativeG >= (gScore.get(neighborKey) || Infinity)) {
                    continue;
                }

                cameFrom.set(neighborKey, current);
                gScore.set(neighborKey, tentativeG);
                fScore.set(neighborKey, tentativeG + IsoMath.gridDistanceEuclidean(neighbor.i, neighbor.j, endI, endJ));
            }
        }

        return []; // No path found
    }
}
