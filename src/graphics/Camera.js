/**
 * Camera - Viewport management for scrolling the game world
 *
 * Handles:
 * - Camera position (what part of the world is visible)
 * - Smooth camera movement and following
 * - Bounds limiting (don't scroll past world edges)
 * - Screen shake effects
 */

import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../utils/Constants.js';

export class Camera {
    constructor(worldContainer) {
        this.worldContainer = worldContainer;

        // Camera position (top-left corner of viewport in world coordinates)
        this.x = 0;
        this.y = 0;

        // Target position (for smooth movement)
        this.targetX = 0;
        this.targetY = 0;

        // Viewport size
        this.width = SCREEN_WIDTH;
        this.height = SCREEN_HEIGHT;

        // World bounds (set these based on map size)
        this.worldWidth = SCREEN_WIDTH * 2;   // Default: 2x screen
        this.worldHeight = SCREEN_HEIGHT * 2;

        // Movement settings
        this.smoothing = 0.1;        // 0 = instant, 1 = never reaches target
        this.edgeScrollSpeed = 10;   // Pixels per frame when edge scrolling
        this.edgeScrollMargin = 50;  // Pixels from edge to trigger scrolling

        // Shake effect
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;

        // Following target
        this.followTarget = null;
        this.followOffsetX = 0;
        this.followOffsetY = 0;
    }

    /**
     * Set the world bounds (map size)
     */
    setWorldBounds(width, height) {
        this.worldWidth = width;
        this.worldHeight = height;
    }

    /**
     * Move camera to position instantly
     */
    setPosition(x, y) {
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
        this.clampToBounds();
        this.applyToContainer();
    }

    /**
     * Move camera to position smoothly
     */
    moveTo(x, y) {
        this.targetX = x;
        this.targetY = y;
    }

    /**
     * Center camera on a point
     */
    centerOn(x, y, instant = false) {
        const newX = x - this.width / 2;
        const newY = y - this.height / 2;

        if (instant) {
            this.setPosition(newX, newY);
        } else {
            this.moveTo(newX, newY);
        }
    }

    /**
     * Follow an entity (must have x, y properties)
     */
    follow(target, offsetX = 0, offsetY = 0) {
        this.followTarget = target;
        this.followOffsetX = offsetX;
        this.followOffsetY = offsetY;
    }

    /**
     * Stop following
     */
    stopFollowing() {
        this.followTarget = null;
    }

    /**
     * Pan camera by delta (for drag scrolling)
     */
    pan(dx, dy) {
        this.targetX -= dx;
        this.targetY -= dy;
        this.x -= dx;
        this.y -= dy;
        this.clampToBounds();
        this.applyToContainer();
    }

    /**
     * Handle edge scrolling (when mouse is near screen edge)
     */
    handleEdgeScroll(mouseX, mouseY) {
        let dx = 0;
        let dy = 0;

        if (mouseX < this.edgeScrollMargin) {
            dx = -this.edgeScrollSpeed;
        } else if (mouseX > this.width - this.edgeScrollMargin) {
            dx = this.edgeScrollSpeed;
        }

        if (mouseY < this.edgeScrollMargin) {
            dy = -this.edgeScrollSpeed;
        } else if (mouseY > this.height - this.edgeScrollMargin) {
            dy = this.edgeScrollSpeed;
        }

        if (dx !== 0 || dy !== 0) {
            this.targetX += dx;
            this.targetY += dy;
        }
    }

    /**
     * Start screen shake effect
     */
    shake(intensity, duration) {
        this.shakeIntensity = intensity;
        this.shakeDuration = duration;
    }

    /**
     * Keep camera within world bounds
     */
    clampToBounds() {
        // Clamp X
        const maxX = Math.max(0, this.worldWidth - this.width);
        this.x = Math.max(0, Math.min(this.x, maxX));
        this.targetX = Math.max(0, Math.min(this.targetX, maxX));

        // Clamp Y
        const maxY = Math.max(0, this.worldHeight - this.height);
        this.y = Math.max(0, Math.min(this.y, maxY));
        this.targetY = Math.max(0, Math.min(this.targetY, maxY));
    }

    /**
     * Update camera (call each frame)
     */
    update(deltaTime) {
        // Follow target if set
        if (this.followTarget) {
            this.centerOn(
                this.followTarget.x + this.followOffsetX,
                this.followTarget.y + this.followOffsetY
            );
        }

        // Smooth movement towards target
        if (this.smoothing > 0 && this.smoothing < 1) {
            this.x += (this.targetX - this.x) * (1 - this.smoothing);
            this.y += (this.targetY - this.y) * (1 - this.smoothing);
        } else {
            this.x = this.targetX;
            this.y = this.targetY;
        }

        // Clamp to bounds
        this.clampToBounds();

        // Update shake
        if (this.shakeDuration > 0) {
            this.shakeDuration -= deltaTime;
            this.shakeOffsetX = (Math.random() - 0.5) * 2 * this.shakeIntensity;
            this.shakeOffsetY = (Math.random() - 0.5) * 2 * this.shakeIntensity;
        } else {
            this.shakeOffsetX = 0;
            this.shakeOffsetY = 0;
        }

        // Apply to container
        this.applyToContainer();
    }

    /**
     * Apply camera position to world container
     */
    applyToContainer() {
        if (this.worldContainer) {
            this.worldContainer.x = -this.x + this.shakeOffsetX;
            this.worldContainer.y = -this.y + this.shakeOffsetY;
        }
    }

    /**
     * Convert screen coordinates to world coordinates
     */
    screenToWorld(screenX, screenY) {
        return {
            x: screenX + this.x,
            y: screenY + this.y
        };
    }

    /**
     * Convert world coordinates to screen coordinates
     */
    worldToScreen(worldX, worldY) {
        return {
            x: worldX - this.x,
            y: worldY - this.y
        };
    }

    /**
     * Check if a world position is visible on screen
     */
    isVisible(worldX, worldY, margin = 0) {
        return (
            worldX >= this.x - margin &&
            worldX <= this.x + this.width + margin &&
            worldY >= this.y - margin &&
            worldY <= this.y + this.height + margin
        );
    }

    /**
     * Check if a rectangle (in world coords) is visible
     */
    isRectVisible(x, y, width, height) {
        return (
            x + width >= this.x &&
            x <= this.x + this.width &&
            y + height >= this.y &&
            y <= this.y + this.height
        );
    }

    /**
     * Get visible area as rectangle
     */
    getVisibleRect() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }
}
