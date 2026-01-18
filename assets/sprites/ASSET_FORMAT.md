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

## Notes

- Sprite sheet sizes vary (512x512 or 1024x1024)
- Some packages have multiple sprite sheets (0.png, 1.png, etc.)
- Rect coordinates must stay within sprite sheet bounds
- Frame delays are in game ticks (40ms per tick = 25 FPS)
