# Majesty Animation Asset Format

Documentation of the original game's animation system, reverse-engineered from `Animation.smali`.

## Overview

The game uses a **body part assembly system** where characters are composed of multiple small sprite pieces (layers) that are positioned and transformed each frame. This allows:
- Memory efficiency (reuse body parts across animations)
- Easy mirroring for different directions
- Smooth animation with minimal asset duplication

## File Structure

```
assets/sprites/
├── anims/
│   ├── anims{N}.dat     # Animation data (binary)
│   └── anims{N}/        # Sprite sheets folder
│       ├── 0.png        # Primary sprite atlas (512x512 or 1024x1024)
│       ├── 1.png        # Additional atlas (if needed)
│       └── ...
```

## Animation Package Contents

| Package | Contents | Theme |
|---------|----------|-------|
| 0 | UI elements (portraits, buttons, icons, spell icons) | UI |
| 1 | Buildings (churches, towers, houses, marketplace, fountain) | Buildings |
| 2 | Ice/water effects, wizard body parts, ice platforms | Ice Magic |
| 3 | Fire effects, warrior body parts (red armor, axes) | Fire/Warriors |
| 4 | Orc/troll body parts (green, horned helmets), waterfalls | Orcs |
| 5 | Elven temple, bard, humanoid body parts (tan) | Elves |
| 6 | Dragon parts, barbarian/dwarf body parts (furry, axes), lair | Dragons/Dwarves |
| 7 | Nature (trees, huts) + ranger body parts (green/red) | Nature/Rangers |
| 8 | Castle/fort buildings, knight body parts (metal armor, shields) | Castle/Knights |
| ... | (More packages to be explored) | ... |

### Unit Type to Package Mapping (Estimated)
- **Warriors/Fighters**: Package 3 (red armor)
- **Rangers/Archers**: Package 7 (green units)
- **Knights/Guards**: Package 8 (metal armor)
- **Wizards**: Package 2 (ice magic)
- **Orcs/Trolls**: Package 4 (green monsters)
- **Dwarves/Barbarians**: Package 6 (furry, axes)
- **Elves/Bards**: Package 5 (tan humanoids)

## .dat File Format (Binary)

All multi-byte values are **big-endian** (Java default).

### Header (Package 0 only)
```
Offset  Size  Description
0       1     Number of packages (only in package 0)
```

### Package Data
```
Offset  Size  Description
0       2     Number of animations (uint16 big-endian)
```

### Animation Data (repeated for each animation)
```
Offset  Size  Description
0       1     Number of frames (uint8)
```

### Frame Data (repeated for each frame)
```
Offset  Size  Description
0       1     Frame delay in ticks (int8)
1       1     Number of layers (uint8)
```

### Layer Data (repeated for each layer, 12 bytes each)
```
Offset  Size  Description
0       2     Rect X position in sprite sheet (uint16)
2       2     Rect Y position in sprite sheet (uint16)
4       2     Rect width (uint16)
6       2     Rect height (uint16)
8       4     Packed data (uint32) containing:
              - Bits 23-31: Sprite sheet index (0-511)
              - Bits 13-22: X offset - 512 (signed, -512 to +511)
              - Bits 3-12:  Y offset - 512 (signed, -512 to +511)
              - Bits 0-2:   Transform code (0-7)
```

### Transform Codes

**IMPORTANT:** These were reverse-engineered from `Utils.fillTransformMatrix()` in the original game's smali code. The original game applies `preScale(-1, 1)` (horizontal flip) combined with rotation, NOT simple flip operations.

```
Code  Matrix Operations                    Visual Effect
0     (none)                               No transform
1     scaleX(-1) + rotate 180°             Vertical flip (flip Y)
2     scaleX(-1)                           Horizontal flip (flip X)
3     rotate 180°                          Rotate 180° (flip both axes)
4     scaleX(-1) + rotate 270°             Rotate 90° CW + flip X
5     rotate 90°                           Rotate 90° CW
6     rotate 270°                          Rotate 90° CCW (270° CW)
7     scaleX(-1) + rotate 90°              Rotate 90° CCW + flip X
```

**Implementation Note (PixiJS):**
When applying transforms, we adjust the sprite anchor to keep positioning correct:
```javascript
case 1: // scaleX(-1) + rotate 180° = vertical flip
    sprite.scale.y = -1;
    sprite.anchor.y = 1;
    break;
case 2: // scaleX(-1) = horizontal flip
    sprite.scale.x = -1;
    sprite.anchor.x = 1;
    break;
case 3: // rotate 180°
    sprite.rotation = Math.PI;
    sprite.anchor.set(1, 1);
    break;
case 4: // scaleX(-1) + rotate 270°
    sprite.scale.x = -1;
    sprite.rotation = -Math.PI / 2;
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
```

## Packed Animation ID Format

The game uses packed IDs to reference animations:
```javascript
packedId = (packageId << 10) | animId

// Unpack:
packageId = (packedId >> 10) & 0x3FF  // Max 1023 packages
animId = packedId & 0x3FF              // Max 1023 animations per package
```

## Example: Parsing Layer Data

```javascript
// Read packed 32-bit value (big-endian)
const packed = dataView.getUint32(offset, false);

// Unpack
const spriteIndex = (packed >>> 23) & 0x1FF;      // 9 bits
const xOffset = ((packed >>> 13) & 0x3FF) - 512;  // 10 bits, signed
const yOffset = ((packed >>> 3) & 0x3FF) - 512;   // 10 bits, signed
const transform = packed & 0x7;                    // 3 bits
```

## Rendering Process

1. Load the `.dat` file and parse all animation/frame/layer data
2. Load the corresponding sprite sheet PNG(s)
3. For each frame to render:
   - Create a container
   - For each layer in the frame:
     - Extract the rectangle region from the sprite sheet
     - Position at (xOffset, yOffset)
     - Apply transform (flip/rotate)
     - Add to container
4. Layers are rendered in order (first layer = back, last layer = front)

## Tools

- `tools/parse_anim_dat.py` - Python script to parse and dump .dat files to JSON
- `test_anim.html` - Browser test page to preview animations

## Direction Order for Unit Animations

Unit animations (walk, attack, idle, death) come in sets of 8, one for each facing direction.
The base animation ID + direction offset gives the specific animation.

**Animation Direction Offsets (CORRECTED - verified in-game):**
```
Offset  Direction (Visual)
0       SE (Southeast)
1       NE (Northeast)
2       E  (East)
3       N  (North)
4       SW (Southwest)
5       S  (South)
6       W  (West)
7       NW (Northwest)
```

**Note:** The original Import.smali documentation listed a different order (E, N, NE, NW, S, SE, SW, W),
but testing revealed the actual sprites are rotated +45° clockwise from that documentation.

**Example:** For a Warrior with walk base ID 17:
- Walk North = 17 + 3 = animation 20
- Walk East = 17 + 2 = animation 19
- Walk South = 17 + 5 = animation 22

## Terrain / Background Textures

### DD_WINDOW_TILE (Package 0, Animation 66)

From `Import.smali`: `DD_WINDOW_TILE = 0x42` (decimal 66)

This animation contains **84x84 pixel tiled textures** used for backgrounds:

| Frame | Content | Rect |
|-------|---------|------|
| 0 | Water (blue) | (836, 329, 84, 84) |
| 1 | Red terrain | (426, 331, 84, 84) |
| 2 | Yellow terrain | (510, 332, 84, 84) |

**Note:** Green grass texture is NOT in Animation 66. Still searching for it.

### Isometric Tiles (Package 25, Animation 59)

`TILESET_COMMON` - Simple 66x36 isometric diamond tiles for minimap/UI (NOT detailed terrain):

| Frame | Content |
|-------|---------|
| 0 | Empty/transparent |
| 1 | Dirt (red/brown) |
| 2 | Water (blue) |
| 3 | Stone (purple/gray) |
| 4 | Sand (yellow) |
| 5 | Grass (green) |
| 6 | Light grass |

### Grass Background (PROCEDURAL)

**Discovery:** The original game does NOT have a pre-made grass texture!

**Key Findings:**
1. `GRASS_ID` (Animation 45) sprites are **BLUE**, not green - they're used for
   patterns/masks, not as the actual grass color
2. The grass background is likely a **solid color fill**
3. The "textured" look comes from **decorations** (DECOR_GRASS_* items from Package 27)
   layered on top, not from a complex grass texture

From `Buffer.smali` - grassColor array (8 colors, for minimap coloring):
```
0x596d29  - Olive green
0x617c1f  - Green (base color)
0x479d2d  - Bright green
0x5e8fd7  - Blue (water, not grass)
0x628a24  - Green
0x263b05  - Dark green (shadows)
0x4e6d1d  - Green
0x54681e  - Green
```

**Implementation:** Our port generates an 84x84 procedural grass texture with:
- Solid yellowish-green base (0x5d7a28)
- Subtle circular color variations
- Very light diagonal grain
- Tiny light specks

**Future enhancement:** Add DECOR_GRASS_* decorations from Package 27 for more visual richness.

## Map Object Type → Animation Mapping

Map files (.m) contain objects with TYPE codes that map to animation IDs.
The mapping is done in `Script.getAnimID(type, terrainType)`.

### Decoration Types (Package 27 - Grass Terrain)

| Type Hex | Type Dec | Animation ID | Constant |
|----------|----------|--------------|----------|
| 0x60 | 96 | 45 | TREE_GREEN1 |
| 0x61 | 97 | 49 | TREE_GREEN2 |
| 0x62 | 98 | 52 | TREE_GREEN3 |
| 0x63 | 99 | 56 | TREE_GREEN4 |
| 0x64 | 100 | 60 | TREE_GREEN5 |
| 0x65 | 101 | 17 | RUINS_GRASS_PART1 |
| 0x66 | 102 | 18 | RUINS_GRASS_PART2 |
| 0x67 | 103 | 19 | RUINS_GRASS_PART3 |
| 0x68 | 104 | 20 | RUINS_GRASS_PART4 |
| 0x69 | 105 | 21 | RUINS_GRASS_PART5 |
| 0x6a | 106 | 22 | RUINS_GRASS_GRAVE1 |
| 0x70 | 112 | 0 | DECOR_GRASS_BIGROCK |
| 0x71 | 113 | 1 | DECOR_GRASS_BIGROCK2 |
| 0x72 | 114 | 2 | DECOR_GRASS_HOLM |
| 0x73 | 115 | 3 | DECOR_GRASS_HOLM2 |
| 0x74 | 116 | 4 | DECOR_GRASS_IDOL |
| 0x75 | 117 | 5 | DECOR_GRASS_KOLONNA1 |
| 0x76 | 118 | 6 | DECOR_GRASS_KOLONNA2 |

Trees have 5 layers each and must be rendered using `createFrameContainer()`.

### Building Types (Package 1)

| Type Hex | Type Dec | Animation ID | Name |
|----------|----------|--------------|------|
| 0x20 | 32 | 17 | Castle (level 1) |
| 0x21 | 33 | 24 | Warrior Guild |
| 0x22 | 34 | 1 | Blacksmith |
| 0x23 | 35 | 32 | Ranger Guild |
| 0x24 | 36 | 40 | Wizard Guild |
| 0x25 | 37 | 48 | Marketplace |
| 0x26 | 38 | 56 | Guardtower |

### Unit Types (NOT decorations)

| Type Hex | Type Dec | Constant | Notes |
|----------|----------|----------|-------|
| 0x57 | 87 | TYPE_TROLL | Enemy unit, spawn as DynamicEntity |

These are dynamic entities, not static decorations. They should be spawned
as game entities (DynamicEntity) using the appropriate animation package.

### Static Object Ranges

Types in these ranges have NO extra data (team/level/flags) in map files:
- 0x60-0x7b (96-123): Main decorations
- 0x83-0x88 (131-136): Additional decorations
- 0xe0-0xe4, 0xe7 (224-228, 231): Special decorations

All other types are "regular objects" with 3 extra bytes: team, level, flags.

## Notes

- Sprite sheet sizes vary (512x512 or 1024x1024)
- Some packages have multiple sprite sheets (0.png, 1.png, etc.)
- Rect coordinates must stay within sprite sheet bounds
- Frame delays are in game ticks (40ms per tick = 25 FPS)
