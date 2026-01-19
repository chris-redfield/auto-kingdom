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
