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
    SAND: 4
};

// Tile colors for rendering (temporary until we have sprites)
const TILE_COLORS = {
    [TileType.GRASS]: 0x4a7c3f,
    [TileType.DIRT]: 0x8b6b4a,
    [TileType.WATER]: 0x3a6ea5,
    [TileType.STONE]: 0x6b6b6b,
    [TileType.SAND]: 0xc4a84b
};

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
     */
    renderTextured() {
        // Clear previous sprites
        this.tilesContainer.removeChildren();

        // Draw tiles in correct order (back to front)
        for (let j = 0; j < this.height; j++) {
            for (let i = 0; i < this.width; i++) {
                const tileType = this.getTile(i, j);
                const texture = this.tileRenderer.getTexture(tileType);
                const pos = IsoMath.gridToWorld(i, j);

                const sprite = new PIXI.Sprite(texture);
                sprite.anchor.set(0.5, 0.5);
                sprite.x = pos.x;
                sprite.y = pos.y;

                this.tilesContainer.addChild(sprite);
            }
        }
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
