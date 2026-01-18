/**
 * AnimationLoader - Parses .dat animation files from the original game
 *
 * Format reverse-engineered from Animation.smali:
 * - Animations are composed of frames
 * - Each frame has multiple layers (sprite parts)
 * - Layers reference sprite sheet indices with position offsets
 * - Transform flags handle rotation/flipping
 */

export class AnimationLoader {
    constructor() {
        // Animation data: packages[packageId][animId][frameId] = [layers]
        this.animationData = [];
        this.animationRects = [];
        this.delays = [];
        this.sprites = [];  // Will hold PIXI textures
        this.numPackages = 0;
    }

    /**
     * Load animation package from .dat file
     * @param {string} basePath - Base path to animation files (e.g., "assets/sprites/anims")
     * @param {number} packageId - Package index (0, 1, 2, etc.)
     * @returns {Promise} Resolves when loaded
     */
    async loadPackage(basePath, packageId) {
        const datPath = `${basePath}${packageId}.dat`;

        try {
            const response = await fetch(datPath);
            if (!response.ok) {
                throw new Error(`Failed to load ${datPath}: ${response.status}`);
            }

            const buffer = await response.arrayBuffer();
            const data = new DataView(buffer);

            await this.parsePackage(data, packageId, basePath);
            console.log(`Loaded animation package ${packageId}`);
        } catch (error) {
            console.error(`Error loading animation package ${packageId}:`, error);
            throw error;
        }
    }

    /**
     * Parse animation data from DataView
     */
    async parsePackage(data, packageId, basePath) {
        let offset = 0;

        // First package contains the total number of packages
        if (packageId === 0) {
            this.numPackages = data.getUint8(offset);
            offset += 1;

            // Initialize arrays
            this.animationData = new Array(this.numPackages);
            this.animationRects = new Array(this.numPackages);
            this.delays = new Array(this.numPackages);
            this.sprites = new Array(this.numPackages);
        }

        // Number of animations in this package
        const numAnimations = data.getInt16(offset, false);  // Big-endian
        offset += 2;

        // Initialize arrays for this package
        this.animationData[packageId] = new Array(numAnimations);
        this.animationRects[packageId] = new Array(numAnimations);
        this.delays[packageId] = new Array(numAnimations);

        let maxSpriteIndex = 0;

        // Parse each animation
        for (let animId = 0; animId < numAnimations; animId++) {
            // Number of frames in this animation
            const numFrames = data.getUint8(offset) & 0xFF;
            offset += 1;

            this.animationData[packageId][animId] = new Array(numFrames);
            this.animationRects[packageId][animId] = new Array(numFrames);
            this.delays[packageId][animId] = new Array(numFrames);

            // Parse each frame
            for (let frameId = 0; frameId < numFrames; frameId++) {
                // Frame delay
                const delay = data.getInt8(offset);
                this.delays[packageId][animId][frameId] = delay;
                offset += 1;

                // Number of layers in this frame
                const numLayers = data.getUint8(offset) & 0xFF;
                offset += 1;

                this.animationData[packageId][animId][frameId] = new Array(numLayers);
                this.animationRects[packageId][animId][frameId] = new Array(numLayers);

                // Parse each layer
                for (let layerId = 0; layerId < numLayers; layerId++) {
                    // Read rect data (4 big-endian unsigned shorts)
                    const rectX = data.getUint16(offset, false);  // Big-endian
                    offset += 2;
                    const rectY = data.getUint16(offset, false);
                    offset += 2;
                    const rectW = data.getUint16(offset, false);
                    offset += 2;
                    const rectH = data.getUint16(offset, false);
                    offset += 2;

                    // Store rect as object
                    this.animationRects[packageId][animId][frameId][layerId] = {
                        x: rectX,
                        y: rectY,
                        width: rectW,
                        height: rectH
                    };

                    // Read packed layer data (big-endian unsigned int)
                    const packedData = data.getUint32(offset, false);
                    offset += 4;

                    // Unpack the data
                    const spriteIndex = (packedData >>> 23) & 0x1FF;
                    const xOffset = ((packedData >>> 13) & 0x3FF) - 512;
                    const yOffset = ((packedData >>> 3) & 0x3FF) - 512;
                    const transform = packedData & 0x7;

                    this.animationData[packageId][animId][frameId][layerId] = {
                        spriteIndex,
                        xOffset,
                        yOffset,
                        transform,
                        packedData
                    };

                    if (spriteIndex > maxSpriteIndex) {
                        maxSpriteIndex = spriteIndex;
                    }
                }
            }
        }

        // Load sprite sheet images
        await this.loadSprites(basePath, packageId, maxSpriteIndex);
    }

    /**
     * Load sprite images for a package
     */
    async loadSprites(basePath, packageId, maxIndex) {
        this.sprites[packageId] = new Array(maxIndex + 1);

        const loadPromises = [];

        for (let i = 0; i <= maxIndex; i++) {
            const spritePath = `${basePath}${packageId}/${i}.png`;
            loadPromises.push(
                this.loadSpriteImage(spritePath, packageId, i)
            );
        }

        await Promise.all(loadPromises);
    }

    /**
     * Load a single sprite image
     */
    async loadSpriteImage(path, packageId, index) {
        try {
            const texture = await PIXI.Assets.load(path);
            this.sprites[packageId][index] = texture;
        } catch (error) {
            console.warn(`Failed to load sprite: ${path}`);
            this.sprites[packageId][index] = null;
        }
    }

    /**
     * Get animation info
     */
    getAnimation(packageId, animId) {
        if (!this.animationData[packageId] || !this.animationData[packageId][animId]) {
            return null;
        }

        return {
            packageId,
            animId,
            frameCount: this.animationData[packageId][animId].length,
            frames: this.animationData[packageId][animId],
            rects: this.animationRects[packageId][animId],
            delays: this.delays[packageId][animId]
        };
    }

    /**
     * Get frame data
     */
    getFrame(packageId, animId, frameId) {
        const anim = this.getAnimation(packageId, animId);
        if (!anim || frameId >= anim.frameCount) {
            return null;
        }

        return {
            layers: anim.frames[frameId],
            rects: anim.rects[frameId],
            delay: anim.delays[frameId]
        };
    }

    /**
     * Get sprite texture
     */
    getSprite(packageId, spriteIndex) {
        if (!this.sprites[packageId]) return null;
        return this.sprites[packageId][spriteIndex];
    }

    /**
     * Create a PIXI Container for rendering an animation frame
     */
    createFrameContainer(packageId, animId, frameId) {
        const frame = this.getFrame(packageId, animId, frameId);
        if (!frame) return null;

        const container = new PIXI.Container();

        for (let i = 0; i < frame.layers.length; i++) {
            const layer = frame.layers[i];
            const rect = frame.rects[i];
            const texture = this.getSprite(packageId, layer.spriteIndex);

            if (!texture) continue;

            // Create sprite from texture region
            let sprite;

            if (rect && rect.width > 0 && rect.height > 0) {
                // Use the rect data to create a sub-texture
                const frame = new PIXI.Rectangle(rect.x, rect.y, rect.width, rect.height);
                const subTexture = new PIXI.Texture({
                    source: texture.source,
                    frame: frame
                });
                sprite = new PIXI.Sprite(subTexture);
            } else {
                // Use full texture
                sprite = new PIXI.Sprite(texture);
            }

            // Apply position offset
            sprite.x = layer.xOffset;
            sprite.y = layer.yOffset;

            // Apply transform
            this.applyTransform(sprite, layer.transform);

            container.addChild(sprite);
        }

        return container;
    }

    /**
     * Apply transform to sprite based on transform code
     *
     * Based on original game's Utils.fillTransformMatrix():
     * - Transform 1: scaleX(-1) + rotate 180°
     * - Transform 2: scaleX(-1) only
     * - Transform 3: rotate 180° only
     * - Transform 4: scaleX(-1) + rotate 270°
     * - Transform 5: rotate 90° only
     * - Transform 6: rotate 270° only
     * - Transform 7: scaleX(-1) + rotate 90°
     */
    applyTransform(sprite, transform) {
        const w = sprite.width;
        const h = sprite.height;

        switch (transform) {
            case 1: // scaleX(-1) + rotate 180° = vertical flip
                sprite.scale.y = -1;
                sprite.anchor.y = 1;
                break;
            case 2: // scaleX(-1) = horizontal flip
                sprite.scale.x = -1;
                sprite.anchor.x = 1;
                break;
            case 3: // rotate 180° = flip both
                sprite.rotation = Math.PI;
                sprite.anchor.set(1, 1);
                break;
            case 4: // scaleX(-1) + rotate 270°
                sprite.scale.x = -1;
                sprite.rotation = -Math.PI / 2;  // 270° = -90°
                sprite.anchor.set(0, 1);
                break;
            case 5: // rotate 90°
                sprite.rotation = Math.PI / 2;
                sprite.anchor.set(0, 1);
                break;
            case 6: // rotate 270°
                sprite.rotation = -Math.PI / 2;
                sprite.anchor.set(1, 0);
                break;
            case 7: // scaleX(-1) + rotate 90°
                sprite.scale.x = -1;
                sprite.rotation = Math.PI / 2;
                sprite.anchor.set(1, 1);
                break;
            default:
                // No transform
                break;
        }
    }

    /**
     * Get animation ID from packed format (used in original game)
     * ID format: (packageId << 10) | animId
     */
    static unpackId(id) {
        const packageId = (id >> 10) & 0x3FF;
        const animId = id & 0x3FF;
        return { packageId, animId };
    }

    /**
     * Create packed ID
     */
    static packId(packageId, animId) {
        return (packageId << 10) | animId;
    }
}

/**
 * AnimatedSprite - Manages playback of loaded animations
 */
export class AnimatedSprite {
    constructor(loader, packageId, animId) {
        this.loader = loader;
        this.packageId = packageId;
        this.animId = animId;

        this.container = new PIXI.Container();
        this.currentFrame = 0;
        this.frameDelay = 0;
        this.delayCounter = 0;
        this.playing = true;
        this.loop = true;

        // Load first frame
        this.updateFrame();
    }

    /**
     * Get total frame count
     */
    getFrameCount() {
        const anim = this.loader.getAnimation(this.packageId, this.animId);
        return anim ? anim.frameCount : 0;
    }

    /**
     * Update animation (call each game tick)
     */
    update() {
        if (!this.playing) return;

        this.delayCounter++;

        if (this.delayCounter >= this.frameDelay) {
            this.delayCounter = 0;
            this.nextFrame();
        }
    }

    /**
     * Advance to next frame
     */
    nextFrame() {
        const frameCount = this.getFrameCount();
        if (frameCount === 0) return;

        this.currentFrame++;

        if (this.currentFrame >= frameCount) {
            if (this.loop) {
                this.currentFrame = 0;
            } else {
                this.currentFrame = frameCount - 1;
                this.playing = false;
            }
        }

        this.updateFrame();
    }

    /**
     * Update the displayed frame
     */
    updateFrame() {
        // Remove old children
        this.container.removeChildren();

        // Create new frame container
        const frameContainer = this.loader.createFrameContainer(
            this.packageId,
            this.animId,
            this.currentFrame
        );

        if (frameContainer) {
            this.container.addChild(frameContainer);
        }

        // Update delay
        const frame = this.loader.getFrame(this.packageId, this.animId, this.currentFrame);
        if (frame) {
            this.frameDelay = Math.max(1, frame.delay);
        }
    }

    /**
     * Set animation
     */
    setAnimation(packageId, animId) {
        this.packageId = packageId;
        this.animId = animId;
        this.currentFrame = 0;
        this.delayCounter = 0;
        this.updateFrame();
    }

    /**
     * Play animation
     */
    play() {
        this.playing = true;
    }

    /**
     * Stop animation
     */
    stop() {
        this.playing = false;
    }

    /**
     * Reset to first frame
     */
    reset() {
        this.currentFrame = 0;
        this.delayCounter = 0;
        this.updateFrame();
    }
}
