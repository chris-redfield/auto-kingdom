/**
 * Animator - Sprite animation playback (ported from Animation.smali)
 *
 * Handles frame-based animation with:
 * - Multiple animation sequences
 * - Per-frame timing
 * - Looping and one-shot playback
 * - Animation events/callbacks
 */

export class Animator {
    constructor(sprite) {
        this.sprite = sprite;  // PIXI.Sprite to animate

        // Animation data
        this.animations = {};   // { name: { frames: [], frameDurations: [], loop: bool } }
        this.currentAnimation = null;
        this.currentFrame = 0;
        this.frameTime = 0;     // Time spent on current frame

        // Playback state
        this.playing = false;
        this.paused = false;
        this.speed = 1.0;       // Playback speed multiplier

        // Callbacks
        this.onFrameChange = null;
        this.onAnimationEnd = null;
        this.onLoop = null;
    }

    /**
     * Add an animation sequence
     * @param {string} name - Animation name
     * @param {PIXI.Texture[]} frames - Array of frame textures
     * @param {number|number[]} durations - Frame duration(s) in ms
     * @param {boolean} loop - Whether to loop
     */
    addAnimation(name, frames, durations = 100, loop = true) {
        // Convert single duration to array
        let frameDurations;
        if (typeof durations === 'number') {
            frameDurations = new Array(frames.length).fill(durations);
        } else {
            frameDurations = durations;
        }

        this.animations[name] = {
            frames: frames,
            frameDurations: frameDurations,
            loop: loop
        };
    }

    /**
     * Add animation from spritesheet frames
     * @param {string} name - Animation name
     * @param {object} spritesheet - Spritesheet object with frames
     * @param {string[]} frameNames - Array of frame names
     * @param {number|number[]} durations - Frame duration(s) in ms
     * @param {boolean} loop - Whether to loop
     */
    addAnimationFromSheet(name, spritesheet, frameNames, durations = 100, loop = true) {
        const frames = frameNames.map(frameName => spritesheet.frames[frameName]);
        this.addAnimation(name, frames, durations, loop);
    }

    /**
     * Play an animation
     * @param {string} name - Animation name
     * @param {boolean} restart - Restart if already playing this animation
     */
    play(name, restart = false) {
        if (!this.animations[name]) {
            console.warn(`Animation not found: ${name}`);
            return;
        }

        // If already playing this animation and not restarting, continue
        if (this.currentAnimation === name && this.playing && !restart) {
            return;
        }

        this.currentAnimation = name;
        this.currentFrame = 0;
        this.frameTime = 0;
        this.playing = true;
        this.paused = false;

        // Set initial frame
        this.updateSprite();
    }

    /**
     * Stop animation
     */
    stop() {
        this.playing = false;
    }

    /**
     * Pause animation
     */
    pause() {
        this.paused = true;
    }

    /**
     * Resume animation
     */
    resume() {
        this.paused = false;
    }

    /**
     * Set current frame directly
     */
    setFrame(frameIndex) {
        const anim = this.animations[this.currentAnimation];
        if (!anim) return;

        this.currentFrame = Math.max(0, Math.min(frameIndex, anim.frames.length - 1));
        this.frameTime = 0;
        this.updateSprite();
    }

    /**
     * Update animation (call each frame)
     * @param {number} deltaTime - Time since last update in ms
     */
    update(deltaTime) {
        if (!this.playing || this.paused || !this.currentAnimation) {
            return;
        }

        const anim = this.animations[this.currentAnimation];
        if (!anim || anim.frames.length === 0) {
            return;
        }

        // Accumulate time
        this.frameTime += deltaTime * this.speed;

        // Check if we need to advance frame
        const frameDuration = anim.frameDurations[this.currentFrame];
        while (this.frameTime >= frameDuration) {
            this.frameTime -= frameDuration;
            this.advanceFrame();

            // Re-check in case animation ended
            if (!this.playing) break;
        }
    }

    /**
     * Advance to next frame
     */
    advanceFrame() {
        const anim = this.animations[this.currentAnimation];
        if (!anim) return;

        const previousFrame = this.currentFrame;
        this.currentFrame++;

        // Check for end of animation
        if (this.currentFrame >= anim.frames.length) {
            if (anim.loop) {
                this.currentFrame = 0;
                if (this.onLoop) {
                    this.onLoop(this.currentAnimation);
                }
            } else {
                this.currentFrame = anim.frames.length - 1;
                this.playing = false;
                if (this.onAnimationEnd) {
                    this.onAnimationEnd(this.currentAnimation);
                }
                return;
            }
        }

        // Update sprite texture
        this.updateSprite();

        // Fire frame change callback
        if (this.onFrameChange && this.currentFrame !== previousFrame) {
            this.onFrameChange(this.currentAnimation, this.currentFrame);
        }
    }

    /**
     * Update sprite to current frame
     */
    updateSprite() {
        const anim = this.animations[this.currentAnimation];
        if (!anim || !this.sprite) return;

        const frame = anim.frames[this.currentFrame];
        if (frame) {
            this.sprite.texture = frame;
        }
    }

    /**
     * Get current animation info
     */
    getInfo() {
        const anim = this.animations[this.currentAnimation];
        return {
            animation: this.currentAnimation,
            frame: this.currentFrame,
            totalFrames: anim ? anim.frames.length : 0,
            playing: this.playing,
            paused: this.paused
        };
    }

    /**
     * Check if specific animation is playing
     */
    isPlaying(name = null) {
        if (name === null) {
            return this.playing;
        }
        return this.playing && this.currentAnimation === name;
    }

    /**
     * Get list of animation names
     */
    getAnimationNames() {
        return Object.keys(this.animations);
    }

    /**
     * Check if animation exists
     */
    hasAnimation(name) {
        return name in this.animations;
    }
}
