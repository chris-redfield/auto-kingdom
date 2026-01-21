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
     * Based on Location.smali lines 12984+
     *
     * @param {DataView} view - Data view
     * @param {number} offset - Current offset
     * @returns {number} New offset after parsing
     */
    parseObjects(view, offset) {
        const remaining = view.byteLength - offset;
        console.log(`Object data: ${remaining} bytes remaining`);

        try {
            // Read objectsOnLevel count (byte)
            const objectsOnLevelCount = view.getUint8(offset);
            offset += 1;

            // Skip objectsOnLevel entries (2 bytes each)
            offset += objectsOnLevelCount * 2;

            // Read 3 shorts: counts for different object categories
            const count1 = view.getInt16(offset, false); offset += 2;
            const count2 = view.getInt16(offset, false); offset += 2;
            const count3 = view.getInt16(offset, false); offset += 2;
            const totalObjects = count1 + count2 + count3;
            console.log(`Object counts: ${count1} + ${count2} + ${count3} = ${totalObjects}`);

            // Parse objects
            const typeCounts = {};

            for (let i = 0; i < totalObjects && offset < view.byteLength - 4; i++) {
                const type = view.getUint8(offset); offset += 1;
                const gridI = view.getInt16(offset, false); offset += 2;
                const gridJ = view.getInt16(offset, false); offset += 2;

                // Count types
                typeCounts[type] = (typeCounts[type] || 0) + 1;

                // Create object entry
                const obj = { type, gridI, gridJ };

                // Type 0xFF (255) = border respawn point
                if (type === 0xFF) {
                    obj.isRespawn = true;
                    obj.startTime = view.getUint8(offset); offset += 1;
                    obj.endTime = view.getUint8(offset); offset += 1;
                    obj.pause = view.getUint8(offset); offset += 1;
                    const numMonsters = view.getUint8(offset); offset += 1;
                    obj.monsterTypes = [];
                    for (let m = 0; m < numMonsters && offset < view.byteLength; m++) {
                        obj.monsterTypes.push(view.getUint8(offset)); offset += 1;
                    }
                    obj.group = view.getUint8(offset); offset += 1;
                }
                // Type 0xFE (254) = wave spawn point
                else if (type === 0xFE) {
                    obj.isWaveSpawn = true;
                    const numWaves = view.getUint8(offset); offset += 1;
                    obj.waves = [];
                    for (let w = 0; w < numWaves && offset < view.byteLength - 1; w++) {
                        const wavePause = view.getUint8(offset); offset += 1;
                        const numInWave = view.getUint8(offset); offset += 1;
                        const types = [];
                        for (let t = 0; t < numInWave && offset < view.byteLength; t++) {
                            types.push(view.getUint8(offset)); offset += 1;
                        }
                        obj.waves.push({ pause: wavePause, types });
                    }
                    obj.group = view.getUint8(offset); offset += 1;
                }
                // Check if this is a "static object" (decoration) - no extra data
                else if (this.isStaticObject(type)) {
                    obj.isDecoration = true;
                    // Static objects have NO extra data - just type + position
                }
                // Regular objects (buildings, etc.) - have team, level, flags
                else {
                    obj.team = view.getUint8(offset); offset += 1;
                    obj.level = view.getUint8(offset); offset += 1;
                    obj.flags = view.getUint8(offset); offset += 1;

                    // Type 0x20 (32) = Castle - has extra gold data
                    if (type === 0x20 && offset + 5 <= view.byteLength) {
                        obj.gold = view.getInt32(offset, false); offset += 4;
                        obj.numBuildings = view.getUint8(offset); offset += 1;
                        obj.taxLevel = view.getUint8(offset); offset += 1;
                    }
                }

                this.objects.push(obj);
            }

            // Log type distribution
            this.logObjectTypes(typeCounts);

        } catch (e) {
            console.warn('Error parsing objects:', e.message);
            // Still log what we found before the error
            console.log(`Parsed ${this.objects.length} objects before error`);
        }

        // Log summary of what we parsed
        this.logObjectSummary();

        return offset;
    }

    /**
     * Log object type distribution
     */
    logObjectTypes(typeCounts) {
        const sortedTypes = Object.entries(typeCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15);  // Top 15 types
        console.log('Object types:', sortedTypes.map(([t, c]) => `type${t}:${c}`).join(', '));
    }

    /**
     * Log summary of parsed objects
     */
    logObjectSummary() {
        // Count by category
        let buildings = 0, decorations = 0, spawns = 0, waves = 0, other = 0;

        const typeCounts = {};
        for (const obj of this.objects) {
            typeCounts[obj.type] = (typeCounts[obj.type] || 0) + 1;

            if (obj.isRespawn) spawns++;
            else if (obj.isWaveSpawn) waves++;
            else if (obj.type === 0x20) buildings++;  // Castle
            else if (obj.type >= 0x01 && obj.type <= 0x1F) decorations++;  // Decoration types
            else buildings++;
        }

        console.log(`Objects summary: ${buildings} buildings, ${decorations} decorations, ${spawns} spawns, ${waves} waves`);

        // Log top types
        const sorted = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
        console.log('Top object types:', sorted.map(([t, c]) => `${t}:${c}`).join(', '));
    }

    /**
     * Get terrain value at grid position
     * @param {number} i - Grid column
     * @param {number} j - Grid row
     * @returns {number} Terrain value (transformed)
     */
    getTerrain(i, j) {
        if (i < 0 || i >= this.mapWidth || j < 0 || j >= this.mapHeight) {
            return 0;
        }
        return this.terrainData[i][j];
    }

    /**
     * Get terrain frame index at grid position
     * Frame index is used to select which tile to draw from the tileset
     * @param {number} i - Grid column
     * @param {number} j - Grid row
     * @returns {number} Frame index (0-127)
     */
    getTerrainFrame(i, j) {
        const terrainValue = this.getTerrain(i, j);
        // Extract frame: (value >> 3) & 0x7F as per Location.smali line 4085-4087
        return (terrainValue >> 3) & 0x7F;
    }

    /**
     * Get terrain overlay frame at grid position
     * Overlay frames are used for smooth transitions between terrain types
     * @param {number} i - Grid column
     * @param {number} j - Grid row
     * @returns {number} Overlay frame index (0-63), 0 means no overlay
     */
    getTerrainOverlay(i, j) {
        const terrainValue = this.getTerrain(i, j);
        // Extract overlay: (value >> 10) & 0x3F as per Location.smali line 4091-4105
        return (terrainValue >> 10) & 0x3F;
    }

    /**
     * Get terrain package ID (theme)
     * The map version byte indicates which terrain package to use
     * @returns {number} Package ID (45=grass, 46=necro, 47=snow)
     */
    getTerrainPackage() {
        return this.version;  // version byte = terrain theme = package ID
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

    /**
     * Analyze overlay data in the map for debugging
     * @returns {object} Statistics about overlay values
     */
    analyzeOverlays() {
        const stats = {
            total: 0,
            withOverlay: 0,
            overlayValues: {},
            frameValues: {},
            sampleTiles: []
        };

        for (let j = 0; j < this.mapHeight; j++) {
            for (let i = 0; i < this.mapWidth; i++) {
                stats.total++;
                const frame = this.getTerrainFrame(i, j);
                const overlay = this.getTerrainOverlay(i, j);

                // Count frame distribution
                stats.frameValues[frame] = (stats.frameValues[frame] || 0) + 1;

                if (overlay > 0) {
                    stats.withOverlay++;
                    stats.overlayValues[overlay] = (stats.overlayValues[overlay] || 0) + 1;

                    // Save first 10 samples
                    if (stats.sampleTiles.length < 10) {
                        stats.sampleTiles.push({ i, j, frame, overlay });
                    }
                }
            }
        }

        // Sort overlay values by count
        stats.overlayDistribution = Object.entries(stats.overlayValues)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20);

        console.log('=== OVERLAY ANALYSIS ===');
        console.log(`Total tiles: ${stats.total}`);
        console.log(`Tiles with overlay: ${stats.withOverlay} (${(stats.withOverlay / stats.total * 100).toFixed(2)}%)`);
        console.log(`Unique overlay values: ${Object.keys(stats.overlayValues).length}`);
        console.log('Top overlay values:', stats.overlayDistribution);
        console.log('Sample tiles with overlays:', stats.sampleTiles);
        console.log('========================');

        return stats;
    }

    /**
     * Check if type is a "static object" (decoration with no extra data)
     * Based on Location.typeIsStaticObject() - these types have NO team/level/flags
     * @param {number} type - Object type byte
     * @returns {boolean} True if static object
     */
    isStaticObject(type) {
        // Types 0x60-0x7b (96-123) - decorations
        if (type >= 0x60 && type <= 0x7b) return true;
        // Types 0x83-0x88 (131-136) - more decorations
        if (type >= 0x83 && type <= 0x88) return true;
        // Types 0xe0-0xe4, 0xe7 (224-228, 231) - special decorations
        if (type >= 0xe0 && type <= 0xe4) return true;
        if (type === 0xe7) return true;
        return false;
    }
}
