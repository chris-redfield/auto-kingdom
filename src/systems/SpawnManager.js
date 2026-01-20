/**
 * SpawnManager - Handles enemy spawning from map spawn points
 *
 * Spawn types:
 * - Respawn (0xFF): Continuous spawning at intervals
 * - Wave Spawn (0xFE): Wave-based spawning with pauses between waves
 */

export class SpawnManager {
    constructor(game) {
        this.game = game;
        this.spawnPoints = [];      // Respawn points (continuous)
        this.waveSpawns = [];       // Wave spawn points
        this.activeWaves = [];      // Currently active wave spawners
        this.gameTime = 0;          // Game time in seconds
        this.enabled = true;

        // Monster type to unit config mapping
        this.monsterConfigs = {
            0x52: 'GOBLIN_ARCHER',  // Goblin Archer - not implemented yet
            0x56: 'GIANT_RAT',      // Rat
            0x57: 'GIANT_RAT',      // Giant Rat (use same as rat for now)
            0x59: 'TROLL',          // Troll
        };
    }

    /**
     * Initialize spawn points from map data
     */
    initFromMap(mapLoader) {
        if (!mapLoader || !mapLoader.objects) return;

        for (const obj of mapLoader.objects) {
            if (obj.isRespawn) {
                this.spawnPoints.push({
                    gridI: obj.gridI,
                    gridJ: obj.gridJ,
                    startTime: obj.startTime || 0,
                    endTime: obj.endTime || 999,
                    pause: obj.pause || 10,
                    monsterTypes: obj.monsterTypes || [],
                    group: obj.group || 0,
                    lastSpawnTime: 0,
                    active: false
                });
            } else if (obj.isWaveSpawn) {
                this.waveSpawns.push({
                    gridI: obj.gridI,
                    gridJ: obj.gridJ,
                    waves: obj.waves || [],
                    group: obj.group || 0,
                    currentWave: 0,
                    waveStartTime: 0,
                    active: false,
                    completed: false
                });
            }
        }

        console.log(`SpawnManager: ${this.spawnPoints.length} respawn points, ${this.waveSpawns.length} wave spawns`);
    }

    /**
     * Start spawning (call when game/mission starts)
     */
    start() {
        this.gameTime = 0;
        this.enabled = true;

        // Activate all spawn points
        for (const sp of this.spawnPoints) {
            sp.active = true;
            sp.lastSpawnTime = -sp.pause; // Spawn immediately on first tick
        }

        // Activate wave spawns
        for (const ws of this.waveSpawns) {
            ws.active = true;
            ws.currentWave = 0;
            ws.waveStartTime = 0;
            ws.completed = false;
        }

        console.log('SpawnManager: Started');
    }

    /**
     * Stop all spawning
     */
    stop() {
        this.enabled = false;
    }

    /**
     * Update spawn system (call every frame)
     * @param {number} deltaTime - Time since last update in ms
     */
    update(deltaTime) {
        if (!this.enabled) return;

        this.gameTime += deltaTime / 1000; // Convert to seconds

        // Update continuous spawn points
        for (const sp of this.spawnPoints) {
            if (!sp.active) continue;
            if (this.gameTime < sp.startTime) continue;
            if (this.gameTime > sp.endTime) {
                sp.active = false;
                continue;
            }

            // Check if it's time to spawn
            if (this.gameTime - sp.lastSpawnTime >= sp.pause) {
                this.spawnFromPoint(sp);
                sp.lastSpawnTime = this.gameTime;
            }
        }

        // Update wave spawns
        for (const ws of this.waveSpawns) {
            if (!ws.active || ws.completed) continue;

            const wave = ws.waves[ws.currentWave];
            if (!wave) {
                ws.completed = true;
                continue;
            }

            // Check if it's time for this wave
            if (this.gameTime >= ws.waveStartTime + wave.pause) {
                this.spawnWave(ws, wave);
                ws.currentWave++;
                ws.waveStartTime = this.gameTime;

                if (ws.currentWave >= ws.waves.length) {
                    ws.completed = true;
                    console.log(`Wave spawn at (${ws.gridI}, ${ws.gridJ}) completed all waves`);
                }
            }
        }
    }

    /**
     * Spawn enemies from a respawn point
     */
    spawnFromPoint(spawnPoint) {
        if (!spawnPoint.monsterTypes || spawnPoint.monsterTypes.length === 0) return;

        for (const monsterType of spawnPoint.monsterTypes) {
            this.spawnEnemy(monsterType, spawnPoint.gridI, spawnPoint.gridJ);
        }
    }

    /**
     * Spawn a wave of enemies
     */
    spawnWave(waveSpawn, wave) {
        if (!wave.types || wave.types.length === 0) return;

        console.log(`Spawning wave ${waveSpawn.currentWave + 1} at (${waveSpawn.gridI}, ${waveSpawn.gridJ}): ${wave.types.length} enemies`);

        for (const monsterType of wave.types) {
            this.spawnEnemy(monsterType, waveSpawn.gridI, waveSpawn.gridJ);
        }
    }

    /**
     * Spawn a single enemy
     */
    spawnEnemy(monsterType, gridI, gridJ) {
        const configName = this.monsterConfigs[monsterType];
        if (!configName) {
            // console.warn(`Unknown monster type: 0x${monsterType.toString(16)}`);
            return;
        }

        // Find a walkable position near the spawn point
        const spawnPos = this.findSpawnPosition(gridI, gridJ);
        if (!spawnPos) {
            console.warn(`No valid spawn position near (${gridI}, ${gridJ})`);
            return;
        }

        // Create the enemy using Game's method
        this.game.spawnEnemy(configName, spawnPos.i, spawnPos.j);
    }

    /**
     * Find a valid spawn position near the target
     */
    findSpawnPosition(gridI, gridJ) {
        // Check the target position first
        if (this.game.grid.isWalkable(gridI, gridJ)) {
            return { i: gridI, j: gridJ };
        }

        // Search nearby cells in a spiral pattern
        const offsets = [
            [0, 1], [1, 0], [0, -1], [-1, 0],
            [1, 1], [1, -1], [-1, 1], [-1, -1],
            [0, 2], [2, 0], [0, -2], [-2, 0]
        ];

        for (const [di, dj] of offsets) {
            const ni = gridI + di;
            const nj = gridJ + dj;
            if (this.game.grid.isWalkable(ni, nj)) {
                return { i: ni, j: nj };
            }
        }

        return null;
    }

    /**
     * Check if all waves are completed
     */
    allWavesCompleted() {
        return this.waveSpawns.every(ws => ws.completed);
    }

    /**
     * Get spawn status for debugging
     */
    getStatus() {
        const activeRespawns = this.spawnPoints.filter(sp => sp.active).length;
        const completedWaves = this.waveSpawns.filter(ws => ws.completed).length;
        return {
            gameTime: Math.floor(this.gameTime),
            activeRespawns,
            completedWaves,
            totalWaves: this.waveSpawns.length
        };
    }
}
