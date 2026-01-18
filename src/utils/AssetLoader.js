/**
 * AssetLoader - Loads and manages game assets (sprites, sounds, data)
 *
 * Uses PixiJS Assets system for loading
 * Provides progress tracking and caching
 */

export class AssetLoader {
    constructor() {
        // Loaded assets cache
        this.textures = {};
        this.spritesheets = {};
        this.sounds = {};
        this.data = {};

        // Loading state
        this.totalAssets = 0;
        this.loadedAssets = 0;
        this.isLoading = false;

        // Callbacks
        this.onProgressCallbacks = [];
        this.onCompleteCallbacks = [];
    }

    /**
     * Load a single texture
     */
    async loadTexture(key, path) {
        try {
            const texture = await PIXI.Assets.load(path);
            this.textures[key] = texture;
            this.loadedAssets++;
            this.fireProgress();
            return texture;
        } catch (error) {
            console.error(`Failed to load texture: ${path}`, error);
            throw error;
        }
    }

    /**
     * Load a spritesheet with frame data
     */
    async loadSpritesheet(key, imagePath, frameData) {
        try {
            // Load the base texture
            const texture = await PIXI.Assets.load(imagePath);

            // Create frame textures from the frame data
            const frames = {};
            for (const [frameName, frame] of Object.entries(frameData)) {
                const rect = new PIXI.Rectangle(
                    frame.x,
                    frame.y,
                    frame.width,
                    frame.height
                );
                frames[frameName] = new PIXI.Texture({
                    source: texture.source,
                    frame: rect
                });

                // Store anchor/pivot if provided
                if (frame.anchorX !== undefined) {
                    frames[frameName].defaultAnchor = {
                        x: frame.anchorX,
                        y: frame.anchorY
                    };
                }
            }

            this.spritesheets[key] = {
                texture: texture,
                frames: frames,
                frameData: frameData
            };

            this.loadedAssets++;
            this.fireProgress();
            return this.spritesheets[key];
        } catch (error) {
            console.error(`Failed to load spritesheet: ${imagePath}`, error);
            throw error;
        }
    }

    /**
     * Load JSON data file
     */
    async loadJSON(key, path) {
        try {
            const response = await fetch(path);
            const data = await response.json();
            this.data[key] = data;
            this.loadedAssets++;
            this.fireProgress();
            return data;
        } catch (error) {
            console.error(`Failed to load JSON: ${path}`, error);
            throw error;
        }
    }

    /**
     * Load multiple assets at once
     * manifest format: { textures: {...}, spritesheets: {...}, data: {...} }
     */
    async loadManifest(manifest) {
        this.isLoading = true;
        this.loadedAssets = 0;
        this.totalAssets = 0;

        // Count total assets
        if (manifest.textures) this.totalAssets += Object.keys(manifest.textures).length;
        if (manifest.spritesheets) this.totalAssets += Object.keys(manifest.spritesheets).length;
        if (manifest.data) this.totalAssets += Object.keys(manifest.data).length;

        const promises = [];

        // Load textures
        if (manifest.textures) {
            for (const [key, path] of Object.entries(manifest.textures)) {
                promises.push(this.loadTexture(key, path));
            }
        }

        // Load spritesheets
        if (manifest.spritesheets) {
            for (const [key, config] of Object.entries(manifest.spritesheets)) {
                promises.push(this.loadSpritesheet(key, config.image, config.frames));
            }
        }

        // Load data files
        if (manifest.data) {
            for (const [key, path] of Object.entries(manifest.data)) {
                promises.push(this.loadJSON(key, path));
            }
        }

        await Promise.all(promises);

        this.isLoading = false;
        this.fireComplete();
    }

    /**
     * Get a loaded texture
     */
    getTexture(key) {
        return this.textures[key];
    }

    /**
     * Get a frame from a spritesheet
     */
    getFrame(sheetKey, frameName) {
        const sheet = this.spritesheets[sheetKey];
        if (sheet && sheet.frames[frameName]) {
            return sheet.frames[frameName];
        }
        return null;
    }

    /**
     * Get all frames from a spritesheet
     */
    getFrames(sheetKey) {
        const sheet = this.spritesheets[sheetKey];
        return sheet ? sheet.frames : null;
    }

    /**
     * Get loaded data
     */
    getData(key) {
        return this.data[key];
    }

    /**
     * Get loading progress (0-1)
     */
    getProgress() {
        if (this.totalAssets === 0) return 1;
        return this.loadedAssets / this.totalAssets;
    }

    /**
     * Register progress callback
     */
    onProgress(callback) {
        this.onProgressCallbacks.push(callback);
    }

    /**
     * Register complete callback
     */
    onComplete(callback) {
        this.onCompleteCallbacks.push(callback);
    }

    fireProgress() {
        const progress = this.getProgress();
        for (const cb of this.onProgressCallbacks) {
            cb(progress, this.loadedAssets, this.totalAssets);
        }
    }

    fireComplete() {
        for (const cb of this.onCompleteCallbacks) {
            cb();
        }
    }

    /**
     * Create a sprite from a loaded texture
     */
    createSprite(textureKey) {
        const texture = this.textures[textureKey];
        if (texture) {
            return new PIXI.Sprite(texture);
        }
        return null;
    }

    /**
     * Create a sprite from a spritesheet frame
     */
    createSpriteFromFrame(sheetKey, frameName) {
        const frame = this.getFrame(sheetKey, frameName);
        if (frame) {
            return new PIXI.Sprite(frame);
        }
        return null;
    }
}

// Singleton instance
export const assetLoader = new AssetLoader();
