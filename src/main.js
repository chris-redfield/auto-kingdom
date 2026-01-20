/**
 * Majesty JS - Main Entry Point
 *
 * A JavaScript port of the Android strategy game Majesty
 * Uses PixiJS for rendering, pure ES6 modules, no build tools required
 */

import { Game } from './core/Game.js';
import { GameLoop } from './core/GameLoop.js';
import { Input } from './core/Input.js';
import { assetLoader } from './utils/AssetLoader.js';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from './utils/Constants.js';

// Global references (for debugging in console)
let app = null;
let game = null;
let gameLoop = null;
let input = null;

/**
 * Initialize the game
 */
async function init() {
    console.log('Majesty JS - Initializing...');

    // Get loading element
    const loadingEl = document.getElementById('loading');

    try {
        // Create PixiJS Application
        app = new PIXI.Application();

        await app.init({
            width: SCREEN_WIDTH,
            height: SCREEN_HEIGHT,
            backgroundColor: 0x1a1a2e,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
            antialias: true
        });

        // Add canvas to DOM
        const container = document.getElementById('game-container');
        container.appendChild(app.canvas);

        // Update loading text
        if (loadingEl) {
            loadingEl.textContent = 'Loading assets...';
        }

        // Set up asset loading progress
        assetLoader.onProgress((progress, loaded, total) => {
            if (loadingEl) {
                loadingEl.textContent = `Loading assets... ${Math.floor(progress * 100)}%`;
            }
            console.log(`Loading: ${loaded}/${total} (${Math.floor(progress * 100)}%)`);
        });

        // Load assets
        await loadAssets();

        // Hide loading
        if (loadingEl) {
            loadingEl.classList.add('hidden');
        }

        // Create input handler
        input = new Input(app);

        // Create game instance (pass input handler and asset loader)
        game = new Game(app, input, assetLoader);

        // Create and start game loop
        gameLoop = new GameLoop(game);
        game.setGameLoop(gameLoop);
        gameLoop.start();

        // Expose to window for debugging
        window.game = game;
        window.gameLoop = gameLoop;
        window.input = input;
        window.app = app;
        window.assetLoader = assetLoader;
        window.spawnManager = game.spawnManager;

        console.log('Majesty JS - Ready!');
        console.log('Game running at', SCREEN_WIDTH, 'x', SCREEN_HEIGHT);
        console.log('Controls:');
        console.log('  - Right-drag: Pan camera');
        console.log('  - Arrow keys: Move camera');
        console.log('  - C: Center camera on unit');
        console.log('  - S: Test screen shake');
        console.log('  - D: Toggle debug info');
        console.log('  - T: Test spawn enemy');
        console.log('  - Y: Show spawn status');
        console.log('  - G: Create test guilds');
        console.log('  - ESC: Pause/Resume');
        console.log('');
        console.log('Gameplay:');
        console.log('  - Click guild to recruit hero (costs gold)');
        console.log('  - Kill enemies to earn gold');

    } catch (error) {
        console.error('Failed to initialize game:', error);
        if (loadingEl) {
            loadingEl.textContent = 'Error loading game: ' + error.message;
            loadingEl.style.color = '#ff4444';
        }
    }
}

/**
 * Load game assets
 */
async function loadAssets() {
    // Load the manifest first
    const manifestResponse = await fetch('assets/data/manifest.json');
    const manifest = await manifestResponse.json();

    // Load textures
    if (manifest.textures) {
        for (const [key, path] of Object.entries(manifest.textures)) {
            await assetLoader.loadTexture(key, path);
        }
    }

    // Load spritesheets
    if (manifest.spritesheets) {
        for (const [key, config] of Object.entries(manifest.spritesheets)) {
            await assetLoader.loadSpritesheet(key, config.image, config.frames);
        }
    }

    // Store animation definitions for later use
    if (manifest.animations) {
        assetLoader.data['animations'] = manifest.animations;
    }

    console.log('Assets loaded:', {
        textures: Object.keys(assetLoader.textures),
        spritesheets: Object.keys(assetLoader.spritesheets)
    });
}

// Start the game when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
