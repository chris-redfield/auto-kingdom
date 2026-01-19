# Terrain Rendering - Problems and Challenges

## Current Status: FIXED (2026-01-18)

The terrain now renders as solid green background, matching the original game.

---

## Problem History

**Previous Bug:** Dark weapon/tool silhouettes (axes, swords, hammers) scattered across grass.

**Root Cause:** Code was loading SHADOW sprites (animations 21-30) instead of decorations (0-15).

**Solution:** Disabled random decoration scattering; use solid green background like original.

---

## What We Tried (Historical)

### Attempt 1: Load texture from Animation 66 (DD_WINDOW_TILE)
- **Result:** Frame 0 = water, Frame 1 = red, Frame 2 = yellow
- **Problem:** No green grass texture exists in Animation 66

### Attempt 2: Search for grass texture in all packages
- **Result:** Searched packages 0, 1, 7, 9, 10, 11, 24, 25, 26, 27, 28, 29
- **Problem:** No standalone grass background texture found anywhere

### Attempt 3: Check GRASS_ID (Animation 45)
- **Result:** Animation 45 has small sprites (14x14, 28x28) that are BLUE, not green
- **Problem:** These are pattern/mask sprites, not grass textures

### Attempt 4-7: Various procedural approaches
- All failed to match original's clean look

### Attempt 8: Random decoration scattering (BROKEN)
- Used Package 27, animations 21-30
- **BUG:** These are SHADOW sprites, not decorations!
- Result: Dark weapon silhouettes on grass

---

## Key Discoveries

### 1. Animation ID Packing Format

From `AnimationLoader.js`:
```javascript
// ID format: (packageId << 10) | animId
// Example: 0x6c00 = (27 << 10) | 0 = Package 27, Animation 0
```

### 2. Package 27 Animation Mapping (from Import.smali)

| Animation IDs | Constant Name | Content |
|---------------|---------------|---------|
| 0 | DECOR_GRASS_BIGROCK | Large rock |
| 1 | DECOR_GRASS_BIGROCK2 | Large rock variant |
| 2 | DECOR_GRASS_HOLM | Hill/mound |
| 3 | DECOR_GRASS_HOLM2 | Hill variant |
| 4 | DECOR_GRASS_IDOL | Stone idol/statue |
| 5 | DECOR_GRASS_KOLONNA1 | Column |
| 6 | DECOR_GRASS_KOLONNA2 | Column variant |
| 7 | DECOR_GRASS_LAKE1 | Small lake |
| 8 | DECOR_GRASS_LAKE2 | Medium lake |
| 9 | DECOR_GRASS_LAKE3 | Large lake |
| 10 | DECOR_GRASS_UKOZATEL | Signpost |
| 11 | DECOR_GRASS_UKOZATEL2 | Signpost variant |
| 12 | DECOR_GRASS_WALL1 | Stone wall |
| 13 | DECOR_GRASS_WALL2 | Stone wall variant |
| 14 | DECOR_GRASS_WALL3 | Stone wall variant |
| 15 | DECOR_GRASS_WALL4 | Stone wall variant |
| 16-20 | RUINS_GRASS_PART1-5 | Ruin pieces |
| **21-35** | **SHADOW_DECOR_GRASS_*** | **Shadow sprites!** |

**Critical:** Animations 21-35 are SHADOW versions of decorations (dark silhouettes).
The previous code loaded these by mistake, causing the weapon silhouette bug.

### 3. grassColor Palette (Buffer.smali)

```javascript
// Used for MINIMAP coloring, NOT terrain rendering
grassColor = [
    0x596d29,  // Olive green
    0x617c1f,  // Green
    0x479d2d,  // Bright green
    0x5e8fd7,  // Blue (water)
    0x628a24,  // Green
    0x263b05,  // Dark green
    0x4e6d1d,  // Green
    0x54681e   // Green
];
```

### 4. Original Game's Terrain Approach

After analyzing original.png and the smali code:

1. **Background:** Solid green color fill (no tile pattern)
2. **Decorations:** LARGE map objects (rocks, walls, columns) placed by level designer
3. **NOT random:** Decorations come from map data, not procedural scattering
4. **Sparse placement:** Very few decorations visible, mostly solid grass

### 5. GRASS_ID (Animation 45) Purpose

- `GRASS_ID = 0x2d = 45` (Package 0, Animation 45)
- Contains BLUE pattern sprites (14x14, 28x28 pixels)
- Used as masks/patterns, NOT as visible grass texture
- May be color-tinted at runtime for different terrain types

---

## Current Implementation

### Solid Grass Background (`Grid.renderGrassBackground()`)
```javascript
// Single large green rectangle - no tiling, no seams
const graphics = new PIXI.Graphics();
graphics.rect(x, y, width, height);
graphics.fill(0x5a7828);  // Grass green color
```

### Decorations (`Grid.addGrassDecorations()`)
- **DISABLED** - Original game doesn't scatter random decorations
- Preserved for future map-based decoration loading
- When map loading is implemented, load decorations from map data

---

## Original Game's Decoration Architecture

### How It Works (from smali analysis)

The original game does NOT randomly scatter decorations. Instead:

1. **Map Files (.m)** contain object data:
   - Located at `assets/s3/map0.m` through `map29.m`
   - Each object has a TYPE code (e.g., `TYPE_BIGROCK = 0x70`, `TYPE_GRASS_TREE1 = 0x60`)
   - Objects are placed at specific X,Y coordinates by level designer

2. **Type → Animation Mapping** (`Script.getAnimID(type, terrainType)`):
   ```
   TYPE_BIGROCK (0x70)  + GRASS terrain → DECOR_GRASS_BIGROCK (0x6c00)
   TYPE_BIGROCK (0x70)  + SNOW terrain  → DECOR_SNOW_BIGROCK
   TYPE_BIGROCK (0x70)  + NECRO terrain → DECOR_NECRO_BIGROCK
   ```

3. **Object Creation** (`Location.addObject()`):
   - Creates `GameObject` with `GO_FLAG_IS_DECOR` flag (0x10)
   - Decorations are treated as game objects, not just sprites
   - Shadow sprites (SHADOW_DECOR_GRASS_*) drawn separately for each decoration

4. **Terrain Types** affect decoration appearance:
   - **Grass** (default): Green terrain, DECOR_GRASS_* animations (Package 27, anims 0-15)
   - **Snow**: White terrain, DECOR_SNOW_* animations (Package 28)
   - **Necro**: Dark terrain, DECOR_NECRO_* animations (Package 29)

### Decoration Type Constants (Const.smali)

| Type Code | Constant | Description |
|-----------|----------|-------------|
| 0x60 | TYPE_GRASS_TREE1 | Tree variant 1 |
| 0x61 | TYPE_GRASS_TREE2 | Tree variant 2 |
| 0x62 | TYPE_GRASS_TREE3 | Tree variant 3 |
| 0x63 | TYPE_GRASS_TREE4 | Tree variant 4 |
| 0x64 | TYPE_GRASS_TREE5 | Tree variant 5 |
| 0x65 | TYPE_GRASS_RUINS_PART1 | Ruin piece 1 |
| 0x66-0x69 | TYPE_GRASS_RUINS_PART2-5 | Ruin pieces 2-5 |
| 0x70 | TYPE_BIGROCK | Large rock |
| 0x71 | TYPE_BIGROCK2 | Large rock variant |
| 0x74 | TYPE_GRASS_IDOL | Stone idol |

### Key Insight: Modular by Design

The system IS modular - the same `getAnimID()` function handles ALL terrain types:
- Pass terrain type as second parameter
- Returns appropriate animation for that terrain
- Same TYPE_BIGROCK object shows different sprites on grass/snow/necro terrain

---

## Recommended JS Implementation

### Option A: Integrate with Map Loading (Recommended)

When implementing map loading:

```javascript
// In MapLoader.js (future)
class MapLoader {
    loadMap(mapId) {
        // 1. Load map file (mapN.m)
        // 2. Parse object data (type, x, y, etc.)
        // 3. For each object with decoration type:
        //    - Call getAnimId(type, terrainType)
        //    - Create decoration sprite at position
    }

    getAnimId(type, terrainType) {
        // Map TYPE_BIGROCK → DECOR_GRASS_BIGROCK based on terrain
        const decorMap = {
            [TYPE_BIGROCK]: {
                grass: 0x6c00,  // DECOR_GRASS_BIGROCK
                snow: 0x7000,   // DECOR_SNOW_BIGROCK
                necro: 0x7400   // DECOR_NECRO_BIGROCK
            },
            // ... etc
        };
        return decorMap[type]?.[terrainType] || -1;
    }
}
```

### Option B: Standalone Decoration System

If you want decorations WITHOUT full map loading:

```javascript
// In TerrainDecorator.js
class TerrainDecorator {
    constructor(grid, terrainType = 'grass') {
        this.grid = grid;
        this.terrainType = terrainType;
        this.packageId = this.getPackageForTerrain(terrainType);
    }

    getPackageForTerrain(type) {
        return { grass: 27, snow: 28, necro: 29 }[type];
    }

    // Add specific decorations at positions (not random!)
    addDecoration(type, gridX, gridY) {
        const animId = this.getAnimId(type);
        // Create sprite at grid position
    }
}
```

---

## Future Work

### When Map Loading is Implemented:
1. Parse map files (map0.m - map29.m) - binary format, needs reverse engineering
2. Extract object data (type, position, flags)
3. Use `getAnimId()` mapping for terrain-appropriate decorations
4. Create decoration GameObjects with proper flags

### Map File Format (Needs Investigation):
- Binary format, ~20KB - 96KB per map
- First bytes appear to be header (map dimensions?)
- Object data follows with type codes and positions
- See `map0.m` hex dump for structure hints

### Optional Enhancements:
- Add subtle color variation to grass (very slight noise)
- Implement terrain type switching (grass ↔ snow ↔ necro)
- Add shadow sprites for decorations (SHADOW_DECOR_GRASS_*)

---

## Files Involved

| File | Purpose |
|------|---------|
| `/src/world/Grid.js` | Terrain rendering, decoration system |
| `/src/world/IsoMath.js` | Isometric coordinate math |
| `/src/graphics/TileRenderer.js` | Tile texture generation |
| `/src/graphics/AnimationLoader.js` | Animation ID unpacking |
| Original: `Import.smali` | Animation ID constants |
| Original: `Buffer.smali` | grassColor palette |
| Original: `Location.smali` | Terrain/map rendering |

---

## Lessons Learned

1. **Always verify animation IDs** - The original code has separate DECOR_* and SHADOW_DECOR_* animations
2. **Check original visuals first** - The original game uses simpler rendering than we assumed
3. **Map data matters** - Decorations are level design, not procedural
4. **ID format is packed** - `(packageId << 10) | animId` - easy to misread hex values

---

## Current Bug: Terrain Tile Misalignment (2026-01-18)

### Problem
Terrain tiles render with visible rectangular seams/patterns instead of seamless isometric terrain.

### Visual Symptoms
- Visible rectangular grid pattern on terrain
- Tiles don't blend together seamlessly
- Color variations between adjacent tiles create "patchwork" look

### Root Cause Analysis

**Multiple tile size definitions in conflict:**

| Source | Width | Height | Notes |
|--------|-------|--------|-------|
| Map file (map0.m) | 64px | 32px | "Cell width: 64px, Cell height: 32px" |
| IsoMath.js | 66px | 36px | TILE_WIDTH, TILE_HEIGHT constants |
| Tileset (anims45/0.png) | 128px | 64px | Actual tile sprites |

**The mismatch causes:**
1. Grid coordinate calculations use 66x36
2. Tile positioning uses 66x36 (from IsoMath)
3. Tile scaling tries to fit 128x64 → 66x36 (0.515x, 0.5625x scale - non-integer!)
4. Map expects 64x32 cells but we use 66x36

### Current Rendering Code (Grid.js)

```javascript
renderTerrainTile(i, j) {
    // Scaling 128x64 to 66x36 (non-integer scale factors!)
    const tileTextureWidth = 128;
    const tileTextureHeight = 64;
    const scaleX = IsoMath.TILE_WIDTH / tileTextureWidth;  // 66/128 = 0.515625
    const scaleY = IsoMath.TILE_HEIGHT / tileTextureHeight; // 36/64 = 0.5625
    sprite.scale.set(scaleX, scaleY);

    // Position based on IsoMath (66x36 grid)
    sprite.x = worldPos.x - IsoMath.TILE_HALF_WIDTH;
    sprite.y = worldPos.y - IsoMath.TILE_HALF_HEIGHT;
}
```

### Frame Distribution (map0.m)
```
Frame 8: 22876 tiles (57.2%) - Base grass
Frame 3: 3224 tiles (8.1%)
Frame 1: 2372 tiles (5.9%)
Frame 56: 1028 tiles (2.6%)
... 50 unique frames total
```

### Tileset Analysis (anims45/0.png)
- 1024x512 image
- 8x8 grid of 128x64 isometric tiles
- 64 total tiles
- Tiles are isometric diamonds with transparent corners
- Frame 8 = Row 1, Col 0 = Base grass tile

### Possible Fixes

**Option A: Use Map's Cell Size (64x32)**
- Change IsoMath.js to use 64x32 instead of 66x36
- Scale tiles 128x64 → 64x32 (exactly 0.5x scale)
- Requires updating all coordinate calculations

**Option B: Use Tileset Native Size (128x64)**
- Change IsoMath.js to use 128x64
- No scaling needed, tiles render at native size
- World will be 2x larger, affects camera and entity positioning

**Option C: Keep 66x36 but Fix Positioning**
- Accept the slight visual mismatch
- Adjust tile overlap to hide seams
- May need sub-pixel positioning

**Option D: Don't render terrain tiles**
- Use solid green background (current fallback)
- Rely on decorations for visual variety
- Simpler but loses road/path/water detail

### Questions to Investigate
1. Why does the original game use 64x32 cells but 128x64 tiles?
2. How does the original handle the 2x size difference?
3. Are tiles meant to overlap? By how much?
4. Does the original render every tile or just non-grass ones?

### Related Files
- `src/world/IsoMath.js` - Tile dimension constants (now 64x32)
- `src/world/Grid.js` - Terrain rendering
- `src/world/MapLoader.js` - Reads map cell dimensions (64x32)
- `src/core/Game.js` - Creates tileset textures from spritesheet

### Resolution (2026-01-18)

**Decision: Disable terrain tiles for now**

The partial rendering (80x80 area) creates a visible diagonal boundary between:
- Textured tiles (grass with flowers pattern)
- Solid green background

This boundary looks jarring (see current2.png - clear diagonal line).

---

## What Are Terrain Tiles? (Explanation)

### The Tileset (anims45/0.png)

The terrain tileset is a **1024×512 PNG** containing **64 isometric tiles** (8×8 grid):
- Each tile: **128×64 pixels** (isometric diamond with transparent corners)
- Scaled to **64×32** when rendered (0.5× scale)

### Tile Contents by Row

| Row | Indices | Content |
|-----|---------|---------|
| 0 | 0-7 | Grass with flowers, yellow flower patches |
| 1 | 8-15 | **Frame 8 = base grass (57%)**, water ponds (9-11) |
| 2 | 16-23 | Grass variants, dirt/mud transition edges |
| 3 | 24-31 | Grass-to-dirt paths, stone path corners |
| 4 | 32-39 | Stone cobblestone road sections |
| 5 | 40-47 | More road pieces, path intersections |
| 6 | 48-55 | Road with grass edges, intersections |
| 7 | 56-63 | Grass variants, additional road pieces |

### Map0 Tile Distribution

```
Frame 8:  22,876 tiles (57.2%) - Base grass
Frame 3:   3,224 tiles (8.1%)  - Grass with flowers
Frame 1:   2,372 tiles (5.9%)  - Grass variant
Frame 56:  1,028 tiles (2.6%)  - Stone road
Frame 14:    540 tiles (1.4%)  - Path piece
Frame 15:    540 tiles (1.4%)  - Path piece
Frame 59:    536 tiles (1.3%)  - Road variant
Frame 53:    484 tiles (1.2%)  - Road intersection
Frame 10:    476 tiles (1.2%)  - Water edge
Frame 5:     472 tiles (1.2%)  - Grass with flowers
... (50 unique frames total)
```

### Why Partial Rendering Caused Visual Artifacts

**The Problem:**
1. Map is 200×200 = **40,000 tiles** (too many sprites for good performance)
2. We rendered only 80×80 = **6,400 tiles** around map center
3. Outside that area: **solid green background** (0x5a7828)
4. Terrain tiles have **textured appearance** (grass patterns, flowers)
5. **Color mismatch** between tile texture and solid background
6. Result: **Sharp diagonal boundary** visible where tiles end

```
  ┌─────────────────────┐
  │  Textured tiles     │
  │  (patterns, flowers)│
  │         ╲           │
  │          ╲ ← VISIBLE│
  │           ╲  SEAM   │
  │  Solid green        │
  │  background         │
  └─────────────────────┘
```

**Key insight:** The tiles rendered correctly! The "glitch" was the **transition boundary** between two different rendering approaches, not broken tiles.

---

**Current approach:**
- Solid green background (0x5a7828) for entire map
- Decorations (trees, rocks, ruins, signs, lakes) from map object data
- Buildings (castles) from map object data
- This gives consistent, clean appearance

**Future implementation: Viewport culling**
To properly render terrain tiles, implement:
1. Track camera viewport bounds
2. Only render tiles within visible area (+margin)
3. Update rendered tiles when camera pans
4. Cull tiles that move off-screen
5. This enables roads, paths, water without performance hit

**Tile dimensions updated:**
- Changed IsoMath.js from 66x36 to 64x32 (matches map cell size)
- Exact 0.5x scale: 128x64 tileset → 64x32 grid cells
- Ready for when viewport culling is implemented
