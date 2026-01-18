/**
 * Input - Handles all input (mouse, touch, keyboard)
 *
 * Provides a unified interface for:
 * - Mouse position and clicks
 * - Touch events (mapped to mouse)
 * - Keyboard state tracking
 * - Camera-aware world coordinates
 */

export class Input {
    constructor(app) {
        this.app = app;

        // Mouse/touch state
        this.mouseX = 0;
        this.mouseY = 0;
        this.mouseDown = false;
        this.mouseButton = -1;  // 0=left, 1=middle, 2=right

        // For detecting clicks vs drags
        this.mouseDownX = 0;
        this.mouseDownY = 0;
        this.isDragging = false;
        this.dragThreshold = 5;  // pixels before considered a drag

        // Keyboard state
        this.keys = {};          // Currently pressed keys
        this.keysJustPressed = {};  // Keys pressed this frame
        this.keysJustReleased = {}; // Keys released this frame

        // Callbacks
        this.onClickCallbacks = [];
        this.onDragCallbacks = [];
        this.onKeyCallbacks = [];

        // Camera reference (set later for world coordinate conversion)
        this.camera = null;

        this.setupEventListeners();
    }

    /**
     * Set up all event listeners
     */
    setupEventListeners() {
        const canvas = this.app.canvas;

        // Make stage interactive for PixiJS events
        this.app.stage.eventMode = 'static';
        this.app.stage.hitArea = this.app.screen;

        // Mouse events
        canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        canvas.addEventListener('mouseleave', (e) => this.handleMouseLeave(e));

        // Touch events (map to mouse)
        canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));

        // Keyboard events (on window to capture when canvas isn't focused)
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // Prevent context menu
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // Prevent default touch behaviors (scrolling, zooming)
        canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
        canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    }

    /**
     * Get mouse position relative to canvas
     */
    getCanvasPosition(e) {
        const rect = this.app.canvas.getBoundingClientRect();
        const scaleX = this.app.canvas.width / rect.width;
        const scaleY = this.app.canvas.height / rect.height;

        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    /**
     * Convert screen coordinates to world coordinates
     */
    screenToWorld(screenX, screenY) {
        if (this.camera) {
            return {
                x: screenX + this.camera.x,
                y: screenY + this.camera.y
            };
        }
        return { x: screenX, y: screenY };
    }

    /**
     * Get current mouse position in world coordinates
     */
    getWorldPosition() {
        return this.screenToWorld(this.mouseX, this.mouseY);
    }

    // ==================== Mouse Handlers ====================

    handleMouseDown(e) {
        const pos = this.getCanvasPosition(e);
        this.mouseX = pos.x;
        this.mouseY = pos.y;
        this.mouseDownX = pos.x;
        this.mouseDownY = pos.y;
        this.mouseDown = true;
        this.mouseButton = e.button;
        this.isDragging = false;
    }

    handleMouseUp(e) {
        const pos = this.getCanvasPosition(e);
        this.mouseX = pos.x;
        this.mouseY = pos.y;

        // Check if it was a click (not a drag)
        const dx = pos.x - this.mouseDownX;
        const dy = pos.y - this.mouseDownY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.dragThreshold) {
            // It's a click
            this.fireClickCallbacks(pos.x, pos.y, this.mouseButton);
        }

        this.mouseDown = false;
        this.mouseButton = -1;
        this.isDragging = false;
    }

    handleMouseMove(e) {
        const pos = this.getCanvasPosition(e);
        const oldX = this.mouseX;
        const oldY = this.mouseY;
        this.mouseX = pos.x;
        this.mouseY = pos.y;

        if (this.mouseDown) {
            const dx = pos.x - this.mouseDownX;
            const dy = pos.y - this.mouseDownY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance >= this.dragThreshold) {
                this.isDragging = true;
                this.fireDragCallbacks(pos.x - oldX, pos.y - oldY, this.mouseButton);
            }
        }
    }

    handleMouseLeave(e) {
        // Reset mouse state when leaving canvas
        this.mouseDown = false;
        this.isDragging = false;
    }

    // ==================== Touch Handlers ====================

    handleTouchStart(e) {
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            const fakeEvent = {
                clientX: touch.clientX,
                clientY: touch.clientY,
                button: 0
            };
            this.handleMouseDown(fakeEvent);
        }
    }

    handleTouchEnd(e) {
        const fakeEvent = {
            clientX: this.mouseX,
            clientY: this.mouseY,
            button: 0
        };
        // Need to use changedTouches for touchend
        if (e.changedTouches.length > 0) {
            const touch = e.changedTouches[0];
            const rect = this.app.canvas.getBoundingClientRect();
            fakeEvent.clientX = touch.clientX;
            fakeEvent.clientY = touch.clientY;
        }
        this.handleMouseUp(fakeEvent);
    }

    handleTouchMove(e) {
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            const fakeEvent = {
                clientX: touch.clientX,
                clientY: touch.clientY
            };
            this.handleMouseMove(fakeEvent);
        }
    }

    // ==================== Keyboard Handlers ====================

    handleKeyDown(e) {
        const key = e.key.toLowerCase();

        if (!this.keys[key]) {
            this.keysJustPressed[key] = true;
        }
        this.keys[key] = true;

        // Fire callbacks
        this.fireKeyCallbacks(key, true);

        // Prevent default for game keys (arrows, space, etc.)
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
            e.preventDefault();
        }
    }

    handleKeyUp(e) {
        const key = e.key.toLowerCase();
        this.keys[key] = false;
        this.keysJustReleased[key] = true;

        // Fire callbacks
        this.fireKeyCallbacks(key, false);
    }

    // ==================== State Queries ====================

    /**
     * Check if a key is currently held down
     */
    isKeyDown(key) {
        return this.keys[key.toLowerCase()] === true;
    }

    /**
     * Check if a key was just pressed this frame
     */
    isKeyJustPressed(key) {
        return this.keysJustPressed[key.toLowerCase()] === true;
    }

    /**
     * Check if a key was just released this frame
     */
    isKeyJustReleased(key) {
        return this.keysJustReleased[key.toLowerCase()] === true;
    }

    /**
     * Check if mouse button is down
     */
    isMouseDown(button = 0) {
        return this.mouseDown && this.mouseButton === button;
    }

    // ==================== Callbacks ====================

    /**
     * Register a click callback
     * callback(x, y, button)
     */
    onClick(callback) {
        this.onClickCallbacks.push(callback);
    }

    /**
     * Register a drag callback
     * callback(deltaX, deltaY, button)
     */
    onDrag(callback) {
        this.onDragCallbacks.push(callback);
    }

    /**
     * Register a key callback
     * callback(key, isDown)
     */
    onKey(callback) {
        this.onKeyCallbacks.push(callback);
    }

    fireClickCallbacks(x, y, button) {
        const worldPos = this.screenToWorld(x, y);
        for (const cb of this.onClickCallbacks) {
            cb(x, y, button, worldPos.x, worldPos.y);
        }
    }

    fireDragCallbacks(dx, dy, button) {
        for (const cb of this.onDragCallbacks) {
            cb(dx, dy, button);
        }
    }

    fireKeyCallbacks(key, isDown) {
        for (const cb of this.onKeyCallbacks) {
            cb(key, isDown);
        }
    }

    // ==================== Frame Update ====================

    /**
     * Call at end of each frame to reset per-frame state
     */
    endFrame() {
        this.keysJustPressed = {};
        this.keysJustReleased = {};
    }

    /**
     * Set camera reference for world coordinate conversion
     */
    setCamera(camera) {
        this.camera = camera;
    }
}
