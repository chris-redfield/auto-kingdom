/**
 * TileRenderer - Generates and caches isometric tile textures
 *
 * Creates textured tiles programmatically since the original game
 * doesn't have simple tile sprites (uses complex terrain system)
 */

import { TileType } from '../world/Grid.js';
import { TILE_WIDTH, TILE_HEIGHT } from '../world/IsoMath.js';

export class TileRenderer {
    constructor(app) {
        this.app = app;
        this.textures = {};
        this.tileWidth = TILE_WIDTH;   // Isometric tile width (66)
        this.tileHeight = TILE_HEIGHT; // Isometric tile height (36)
    }

    /**
     * Generate all tile textures
     */
    generateTextures() {
        this.textures[TileType.GRASS] = this.createGrassTexture();
        this.textures[TileType.DIRT] = this.createDirtTexture();
        this.textures[TileType.WATER] = this.createWaterTexture();
        this.textures[TileType.STONE] = this.createStoneTexture();
        this.textures[TileType.SAND] = this.createSandTexture();

        console.log('Tile textures generated');
    }

    /**
     * Get texture for tile type
     */
    getTexture(tileType) {
        return this.textures[tileType] || this.textures[TileType.GRASS];
    }

    /**
     * Create base isometric diamond shape
     */
    createBaseTile(baseColor, variation = 0.1) {
        const graphics = new PIXI.Graphics();
        const w = this.tileWidth;
        const h = this.tileHeight;

        // Draw isometric diamond
        graphics.moveTo(w / 2, 0);        // Top
        graphics.lineTo(w, h / 2);        // Right
        graphics.lineTo(w / 2, h);        // Bottom
        graphics.lineTo(0, h / 2);        // Left
        graphics.lineTo(w / 2, 0);        // Back to top
        graphics.fill(baseColor);

        return graphics;
    }

    /**
     * Add noise/texture pattern to a tile
     */
    addNoisePattern(graphics, baseColor, count = 15, sizeRange = [1, 3]) {
        const w = this.tileWidth;
        const h = this.tileHeight;

        for (let i = 0; i < count; i++) {
            // Random position within diamond bounds
            const t = Math.random();
            const s = Math.random();

            // Convert to isometric coordinates
            const x = (t * w / 2) + (s * w / 2);
            const y = (t * h / 2) + ((1 - s) * h / 2);

            // Check if inside diamond
            const centerX = w / 2;
            const centerY = h / 2;
            const dx = Math.abs(x - centerX) / (w / 2);
            const dy = Math.abs(y - centerY) / (h / 2);

            if (dx + dy <= 0.9) {  // Inside diamond with margin
                const size = sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]);
                const shade = this.shadeColor(baseColor, (Math.random() - 0.5) * 0.3);

                graphics.circle(x, y, size);
                graphics.fill(shade);
            }
        }
    }

    /**
     * Create grass tile texture
     */
    createGrassTexture() {
        const baseColor = 0x4a8c3f;
        const graphics = this.createBaseTile(baseColor);

        // Add grass texture dots
        this.addNoisePattern(graphics, 0x3d7a32, 20, [1, 2]);  // Dark green spots
        this.addNoisePattern(graphics, 0x5ca04a, 15, [1, 2]);  // Light green spots

        // Add subtle highlights on top edge
        graphics.moveTo(this.tileWidth / 2, 2);
        graphics.lineTo(this.tileWidth - 8, this.tileHeight / 2 - 2);
        graphics.stroke({ width: 2, color: 0x6ab85a, alpha: 0.5 });

        // Add shadow on bottom edge
        graphics.moveTo(8, this.tileHeight / 2 + 2);
        graphics.lineTo(this.tileWidth / 2, this.tileHeight - 2);
        graphics.stroke({ width: 2, color: 0x2d6622, alpha: 0.5 });

        return this.app.renderer.generateTexture(graphics);
    }

    /**
     * Create dirt tile texture
     */
    createDirtTexture() {
        const baseColor = 0x8b6b4a;
        const graphics = this.createBaseTile(baseColor);

        // Add dirt texture
        this.addNoisePattern(graphics, 0x7a5a3a, 25, [1, 3]);  // Dark brown spots
        this.addNoisePattern(graphics, 0x9c7c5a, 15, [1, 2]);  // Light brown spots

        // Add small pebbles
        for (let i = 0; i < 5; i++) {
            const x = 15 + Math.random() * (this.tileWidth - 30);
            const y = 8 + Math.random() * (this.tileHeight - 16);
            graphics.ellipse(x, y, 2 + Math.random() * 2, 1 + Math.random());
            graphics.fill(0x666666);
        }

        // Highlight and shadow
        graphics.moveTo(this.tileWidth / 2, 2);
        graphics.lineTo(this.tileWidth - 8, this.tileHeight / 2 - 2);
        graphics.stroke({ width: 2, color: 0xa08060, alpha: 0.4 });

        return this.app.renderer.generateTexture(graphics);
    }

    /**
     * Create water tile texture
     */
    createWaterTexture() {
        const baseColor = 0x3a6ea5;
        const graphics = this.createBaseTile(baseColor);

        // Add wave patterns
        for (let i = 0; i < 4; i++) {
            const y = 8 + i * 6;
            graphics.moveTo(10, y);
            graphics.bezierCurveTo(
                20, y - 3,
                35, y + 3,
                this.tileWidth - 10, y
            );
            graphics.stroke({ width: 1, color: 0x5a9ed5, alpha: 0.6 });
        }

        // Add shimmer highlights
        this.addNoisePattern(graphics, 0x6abed5, 8, [1, 2]);

        // Deeper color at edges
        graphics.moveTo(8, this.tileHeight / 2 + 2);
        graphics.lineTo(this.tileWidth / 2, this.tileHeight - 2);
        graphics.lineTo(this.tileWidth - 8, this.tileHeight / 2 + 2);
        graphics.stroke({ width: 3, color: 0x2a5080, alpha: 0.5 });

        return this.app.renderer.generateTexture(graphics);
    }

    /**
     * Create stone tile texture
     */
    createStoneTexture() {
        const baseColor = 0x6b6b6b;
        const graphics = this.createBaseTile(baseColor);

        // Add stone texture
        this.addNoisePattern(graphics, 0x5a5a5a, 20, [2, 4]);  // Dark spots
        this.addNoisePattern(graphics, 0x808080, 15, [1, 3]);  // Light spots

        // Add crack lines
        graphics.moveTo(20, 10);
        graphics.lineTo(30, 18);
        graphics.lineTo(25, 22);
        graphics.stroke({ width: 1, color: 0x4a4a4a, alpha: 0.6 });

        graphics.moveTo(40, 8);
        graphics.lineTo(45, 16);
        graphics.stroke({ width: 1, color: 0x4a4a4a, alpha: 0.6 });

        // Highlight
        graphics.moveTo(this.tileWidth / 2, 2);
        graphics.lineTo(this.tileWidth - 8, this.tileHeight / 2 - 2);
        graphics.stroke({ width: 2, color: 0x888888, alpha: 0.4 });

        return this.app.renderer.generateTexture(graphics);
    }

    /**
     * Create sand tile texture
     */
    createSandTexture() {
        const baseColor = 0xc4a84b;
        const graphics = this.createBaseTile(baseColor);

        // Add sand grain texture
        this.addNoisePattern(graphics, 0xb09840, 30, [1, 1.5]);  // Dark grains
        this.addNoisePattern(graphics, 0xd4b85b, 20, [1, 1.5]);  // Light grains

        // Add subtle dune lines
        graphics.moveTo(15, 12);
        graphics.bezierCurveTo(25, 10, 40, 14, 50, 12);
        graphics.stroke({ width: 1, color: 0xb09840, alpha: 0.4 });

        // Highlight
        graphics.moveTo(this.tileWidth / 2, 2);
        graphics.lineTo(this.tileWidth - 8, this.tileHeight / 2 - 2);
        graphics.stroke({ width: 2, color: 0xd4c86b, alpha: 0.5 });

        return this.app.renderer.generateTexture(graphics);
    }

    /**
     * Shade a color lighter or darker
     */
    shadeColor(color, percent) {
        const r = (color >> 16) & 0xFF;
        const g = (color >> 8) & 0xFF;
        const b = color & 0xFF;

        const newR = Math.min(255, Math.max(0, Math.round(r * (1 + percent))));
        const newG = Math.min(255, Math.max(0, Math.round(g * (1 + percent))));
        const newB = Math.min(255, Math.max(0, Math.round(b * (1 + percent))));

        return (newR << 16) | (newG << 8) | newB;
    }
}
