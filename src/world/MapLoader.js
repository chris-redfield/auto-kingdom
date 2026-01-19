/**
 * MapLoader - Loads and parses .m map files
 *
 * Map file format (reverse-engineered from Location.smali):
 * - Byte 0: Version byte
 * - Bytes 1-2: animId (terrain theme, big-endian short)
 * - Bytes 3-4: mapWidth (big-endian short)
 * - Bytes 5-6: mapHeight (big-endian short)
 * - Bytes 7-8: cellWidth in pixels (big-endian short)
 * - Bytes 9-10: cellHeight in pixels (big-endian short)
 * - Then: animation packages to load (count + package IDs)
 * - Then: terrain grid data (mapWidth * mapHeight shorts)
 * - Then: object data (buildings, decorations, spawn points)
 */

export class MapLoader {
    constructor() {
        this.version = 0;
        this.animId = 0;
        this.mapWidth = 0;
        this.mapHeight = 0;
        this.cellWidth = 0;
        this.cellHeight = 0;
        this.terrainData = null;  // 2D array of terrain values
        this.objects = [];        // List of map objects
        this.packagesToLoad = []; // Animation packages needed
    }

    /**
     * Load a map file from URL
     * @param {string} url - Path to .m file
     * @returns {Promise<MapLoader>} This loader with parsed data
     */
    async load(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load map: ${response.status}`);
        }

        const buffer = await response.arrayBuffer();
        this.parse(buffer);
        return this;
    }

    /**
     * Parse map data from ArrayBuffer
     * @param {ArrayBuffer} buffer - Raw map file data
     */
    parse(buffer) {
        const view = new DataView(buffer);
        let offset = 0;

        // Byte 0: Version
        this.version = view.getUint8(offset);
        offset += 1;
        console.log(`Map version: ${this.version}`);

        // Bytes 1-2: animId (terrain theme) - big-endian
        this.animId = view.getUint16(offset, false);  // false = big-endian
        offset += 2;
        const packageId = (this.animId >> 10) & 0x3FF;
        const animIndex = this.animId & 0x3FF;
        console.log(`Terrain animId: ${this.animId} (package ${packageId}, anim ${animIndex})`);

        // Bytes 3-4: mapWidth
        this.mapWidth = view.getInt16(offset, false);
        offset += 2;
        console.log(`Map width: ${this.mapWidth}`);

        // Bytes 5-6: mapHeight
        this.mapHeight = view.getInt16(offset, false);
        offset += 2;
        console.log(`Map height: ${this.mapHeight}`);

        // Bytes 7-8: cellWidth
        this.cellWidth = view.getInt16(offset, false);
        offset += 2;
        console.log(`Cell width: ${this.cellWidth}px`);

        // Bytes 9-10: cellHeight
        this.cellHeight = view.getInt16(offset, false);
        offset += 2;
        console.log(`Cell height: ${this.cellHeight}px`);

        // Next: number of animation packages to load
        const numPackages = view.getInt16(offset, false);
        offset += 2;
        console.log(`Packages to load: ${numPackages}`);

        // Read package IDs
        this.packagesToLoad = [];
        for (let i = 0; i < numPackages; i++) {
            const pkgId = view.getUint8(offset);
            offset += 1;
            this.packagesToLoad.push(pkgId);
        }
        console.log(`Package IDs: ${this.packagesToLoad.join(', ')}`);

        // Read terrain grid data
        // Format: map[x][y] = short value
        // Loop: for j in mapHeight, for i in mapWidth
        this.terrainData = [];
        for (let i = 0; i < this.mapWidth; i++) {
            this.terrainData[i] = [];
        }

        for (let j = 0; j < this.mapHeight; j++) {
            for (let i = 0; i < this.mapWidth; i++) {
                const value = view.getInt16(offset, false);
                offset += 2;

                // Transform value as per Location.smali line 12840-12856
                // ((value << 2) & 0xFFF8) | ((value & 1) << 1) | 4
                const transformed = ((value << 2) & 0xFFF8) | ((value & 1) << 1) | 4;
                this.terrainData[i][j] = transformed;
            }
        }
        console.log(`Loaded ${this.mapWidth}x${this.mapHeight} terrain grid`);

        // Read objects (remaining data)
        this.objects = [];
        offset = this.parseObjects(view, offset);

        console.log(`Loaded ${this.objects.length} map objects`);
        console.log(`Parsed ${offset} of ${buffer.byteLength} bytes`);
    }

    /**
     * Parse map objects (buildings, decorations, units, etc.)
     * @param {DataView} view - Data view
     * @param {number} offset - Current offset
     * @returns {number} New offset after parsing
     */
    parseObjects(view, offset) {
        // Object parsing is complex - there are multiple object types
        // For now, just log how much data remains
        const remaining = view.byteLength - offset;
        console.log(`Object data: ${remaining} bytes remaining`);

        // TODO: Parse object data based on Location.smali lines 12984+
        // Each object has: type, position, flags, etc.

        return offset;
    }

    /**
     * Get terrain value at grid position
     * @param {number} i - Grid column
     * @param {number} j - Grid row
     * @returns {number} Terrain value
     */
    getTerrain(i, j) {
        if (i < 0 || i >= this.mapWidth || j < 0 || j >= this.mapHeight) {
            return 0;
        }
        return this.terrainData[i][j];
    }

    /**
     * Unpack animation ID
     * @param {number} packedId - Packed ID (packageId << 10 | animId)
     * @returns {object} { packageId, animId }
     */
    static unpackAnimId(packedId) {
        return {
            packageId: (packedId >> 10) & 0x3FF,
            animId: packedId & 0x3FF
        };
    }
}
