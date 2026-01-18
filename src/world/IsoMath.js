/**
 * IsoMath - Isometric coordinate math utilities
 *
 * Handles conversions between:
 * - Grid coordinates (i, j) - tile position in the game world
 * - World coordinates (x, y) - pixel position for rendering
 * - Screen coordinates - after camera offset
 *
 * Uses standard 2:1 isometric projection (tiles are 2x wide as tall)
 */

// Tile dimensions (standard isometric 2:1 ratio)
export const TILE_WIDTH = 64;   // Width of a tile in pixels
export const TILE_HEIGHT = 32;  // Height of a tile in pixels (half of width)

// Half dimensions for calculations
export const TILE_HALF_WIDTH = TILE_WIDTH / 2;
export const TILE_HALF_HEIGHT = TILE_HEIGHT / 2;

/**
 * Convert grid coordinates (i, j) to world pixel coordinates (x, y)
 *
 * In isometric view:
 * - i increases to the right and down
 * - j increases to the left and down
 *
 * @param {number} i - Grid column
 * @param {number} j - Grid row
 * @returns {{x: number, y: number}} World pixel coordinates
 */
export function gridToWorld(i, j) {
    const x = (i - j) * TILE_HALF_WIDTH;
    const y = (i + j) * TILE_HALF_HEIGHT;
    return { x, y };
}

/**
 * Convert world pixel coordinates (x, y) to grid coordinates (i, j)
 *
 * @param {number} x - World X coordinate
 * @param {number} y - World Y coordinate
 * @returns {{i: number, j: number}} Grid coordinates (may be fractional)
 */
export function worldToGrid(x, y) {
    const i = (x / TILE_HALF_WIDTH + y / TILE_HALF_HEIGHT) / 2;
    const j = (y / TILE_HALF_HEIGHT - x / TILE_HALF_WIDTH) / 2;
    return { i, j };
}

/**
 * Convert world coordinates to grid coordinates (rounded to nearest tile)
 *
 * @param {number} x - World X coordinate
 * @param {number} y - World Y coordinate
 * @returns {{i: number, j: number}} Grid coordinates (integers)
 */
export function worldToGridRounded(x, y) {
    const { i, j } = worldToGrid(x, y);
    return {
        i: Math.round(i),
        j: Math.round(j)
    };
}

/**
 * Convert world coordinates to grid coordinates (floored for tile lookup)
 *
 * @param {number} x - World X coordinate
 * @param {number} y - World Y coordinate
 * @returns {{i: number, j: number}} Grid coordinates (integers)
 */
export function worldToGridFloored(x, y) {
    const { i, j } = worldToGrid(x, y);
    return {
        i: Math.floor(i),
        j: Math.floor(j)
    };
}

/**
 * Get the center point of a tile in world coordinates
 *
 * @param {number} i - Grid column
 * @param {number} j - Grid row
 * @returns {{x: number, y: number}} Center of tile in world coordinates
 */
export function getTileCenter(i, j) {
    return gridToWorld(i, j);
}

/**
 * Get the top corner of a tile (for drawing diamond tiles)
 *
 * @param {number} i - Grid column
 * @param {number} j - Grid row
 * @returns {{x: number, y: number}} Top corner position
 */
export function getTileTop(i, j) {
    const center = gridToWorld(i, j);
    return {
        x: center.x,
        y: center.y - TILE_HALF_HEIGHT
    };
}

/**
 * Get all four corners of a tile (for drawing)
 * Returns points in order: top, right, bottom, left
 *
 * @param {number} i - Grid column
 * @param {number} j - Grid row
 * @returns {Array<{x: number, y: number}>} Array of 4 corner points
 */
export function getTileCorners(i, j) {
    const center = gridToWorld(i, j);
    return [
        { x: center.x, y: center.y - TILE_HALF_HEIGHT },                    // Top
        { x: center.x + TILE_HALF_WIDTH, y: center.y },                     // Right
        { x: center.x, y: center.y + TILE_HALF_HEIGHT },                    // Bottom
        { x: center.x - TILE_HALF_WIDTH, y: center.y }                      // Left
    ];
}

/**
 * Calculate the depth/draw order for a tile
 * Higher values should be drawn later (on top)
 *
 * @param {number} i - Grid column
 * @param {number} j - Grid row
 * @returns {number} Depth value for sorting
 */
export function getTileDepth(i, j) {
    return i + j;
}

/**
 * Calculate depth for an entity at world position
 *
 * @param {number} x - World X coordinate
 * @param {number} y - World Y coordinate
 * @returns {number} Depth value for sorting
 */
export function getDepthAtWorld(x, y) {
    const { i, j } = worldToGrid(x, y);
    return i + j;
}

/**
 * Get the bounding box of a grid area in world coordinates
 *
 * @param {number} startI - Starting grid column
 * @param {number} startJ - Starting grid row
 * @param {number} width - Grid width
 * @param {number} height - Grid height
 * @returns {{minX: number, minY: number, maxX: number, maxY: number}} Bounding box
 */
export function getGridBounds(startI, startJ, width, height) {
    // Get all four corners of the grid rectangle
    const topLeft = gridToWorld(startI, startJ);
    const topRight = gridToWorld(startI + width, startJ);
    const bottomLeft = gridToWorld(startI, startJ + height);
    const bottomRight = gridToWorld(startI + width, startJ + height);

    return {
        minX: Math.min(topLeft.x, bottomLeft.x) - TILE_HALF_WIDTH,
        minY: topLeft.y - TILE_HALF_HEIGHT,
        maxX: Math.max(topRight.x, bottomRight.x) + TILE_HALF_WIDTH,
        maxY: bottomRight.y + TILE_HALF_HEIGHT
    };
}

/**
 * Check if a grid position is within bounds
 *
 * @param {number} i - Grid column
 * @param {number} j - Grid row
 * @param {number} width - Grid width
 * @param {number} height - Grid height
 * @returns {boolean} True if within bounds
 */
export function isInBounds(i, j, width, height) {
    return i >= 0 && i < width && j >= 0 && j < height;
}

/**
 * Get Manhattan distance between two grid positions
 *
 * @param {number} i1 - First column
 * @param {number} j1 - First row
 * @param {number} i2 - Second column
 * @param {number} j2 - Second row
 * @returns {number} Manhattan distance
 */
export function gridDistance(i1, j1, i2, j2) {
    return Math.abs(i2 - i1) + Math.abs(j2 - j1);
}

/**
 * Get Euclidean distance between two grid positions
 *
 * @param {number} i1 - First column
 * @param {number} j1 - First row
 * @param {number} i2 - Second column
 * @param {number} j2 - Second row
 * @returns {number} Euclidean distance
 */
export function gridDistanceEuclidean(i1, j1, i2, j2) {
    const di = i2 - i1;
    const dj = j2 - j1;
    return Math.sqrt(di * di + dj * dj);
}

/**
 * Get direction from one grid position to another (8-directional)
 * Returns direction index 0-7 or -1 if same position
 *
 * Directions:
 * 0 = Up (i--, j--)
 * 1 = Up-Right (i, j--)
 * 2 = Right (i++, j--)
 * 3 = Down-Right (i++, j)
 * 4 = Down (i++, j++)
 * 5 = Down-Left (i, j++)
 * 6 = Left (i--, j++)
 * 7 = Up-Left (i--, j)
 *
 * @param {number} fromI - Starting column
 * @param {number} fromJ - Starting row
 * @param {number} toI - Target column
 * @param {number} toJ - Target row
 * @returns {number} Direction index (0-7) or -1
 */
export function getDirection(fromI, fromJ, toI, toJ) {
    const di = Math.sign(toI - fromI);  // -1, 0, or 1
    const dj = Math.sign(toJ - fromJ);  // -1, 0, or 1

    if (di === 0 && dj === 0) return -1;

    // Map (di, dj) to direction index
    const dirMap = {
        '-1,-1': 0,  // Up
        '0,-1': 1,   // Up-Right
        '1,-1': 2,   // Right
        '1,0': 3,    // Down-Right
        '1,1': 4,    // Down
        '0,1': 5,    // Down-Left
        '-1,1': 6,   // Left
        '-1,0': 7    // Up-Left
    };

    return dirMap[`${di},${dj}`] ?? -1;
}

/**
 * Direction deltas for 8-directional movement
 * Index matches getDirection() output
 */
export const DIR_DELTA = [
    { di: -1, dj: -1 },  // 0: Up
    { di: 0, dj: -1 },   // 1: Up-Right
    { di: 1, dj: -1 },   // 2: Right
    { di: 1, dj: 0 },    // 3: Down-Right
    { di: 1, dj: 1 },    // 4: Down
    { di: 0, dj: 1 },    // 5: Down-Left
    { di: -1, dj: 1 },   // 6: Left
    { di: -1, dj: 0 }    // 7: Up-Left
];

/**
 * Get neighboring grid position in a direction
 *
 * @param {number} i - Current column
 * @param {number} j - Current row
 * @param {number} direction - Direction index (0-7)
 * @returns {{i: number, j: number}} Neighboring position
 */
export function getNeighbor(i, j, direction) {
    if (direction < 0 || direction > 7) {
        return { i, j };
    }
    const delta = DIR_DELTA[direction];
    return {
        i: i + delta.di,
        j: j + delta.dj
    };
}

/**
 * Get all 8 neighboring positions
 *
 * @param {number} i - Current column
 * @param {number} j - Current row
 * @returns {Array<{i: number, j: number, dir: number}>} Array of neighbors with direction
 */
export function getAllNeighbors(i, j) {
    return DIR_DELTA.map((delta, dir) => ({
        i: i + delta.di,
        j: j + delta.dj,
        dir: dir
    }));
}
