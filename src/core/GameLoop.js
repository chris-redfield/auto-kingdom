/**
 * GameLoop - Fixed timestep game loop (ported from Main.smali)
 *
 * Runs at 25 FPS (40ms per tick) for game logic
 * Rendering happens as fast as possible via requestAnimationFrame
 */

import { TICK } from '../utils/Constants.js';

export class GameLoop {
    constructor(game) {
        this.game = game;
        this.running = false;
        this.lastTime = 0;
        this.accumulator = 0;
        this.frameId = null;

        // Debug stats
        this.fps = 0;
        this.ticks = 0;
        this.lastFpsUpdate = 0;
        this.frameCount = 0;
    }

    /**
     * Start the game loop
     */
    start() {
        if (this.running) return;

        this.running = true;
        this.lastTime = performance.now();
        this.lastFpsUpdate = this.lastTime;
        this.frameCount = 0;

        this.loop(this.lastTime);
    }

    /**
     * Stop the game loop
     */
    stop() {
        this.running = false;
        if (this.frameId) {
            cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }
    }

    /**
     * Main loop - called via requestAnimationFrame
     */
    loop(currentTime) {
        if (!this.running) return;

        // Schedule next frame
        this.frameId = requestAnimationFrame((time) => this.loop(time));

        // Calculate delta time
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // Accumulate time for fixed timestep updates
        this.accumulator += deltaTime;

        // Run fixed timestep updates (game logic at 25 FPS)
        while (this.accumulator >= TICK) {
            this.game.update(TICK);
            this.accumulator -= TICK;
            this.ticks++;
        }

        // Render (as fast as possible)
        const alpha = this.accumulator / TICK; // Interpolation factor
        this.game.render(alpha);

        // Update FPS counter
        this.frameCount++;
        if (currentTime - this.lastFpsUpdate >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsUpdate = currentTime;
        }
    }

    /**
     * Get current FPS
     */
    getFPS() {
        return this.fps;
    }

    /**
     * Get total ticks processed
     */
    getTicks() {
        return this.ticks;
    }
}
