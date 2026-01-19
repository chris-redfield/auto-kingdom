# Majesty Android → JavaScript Port Plan

## Project Overview
Port the Android strategy game "Majesty" (decompiled from APK) to JavaScript for web/browser play.

**Game Characteristics:**
- 2D top-down isometric strategy/tower defense
- Auto-play AI system for units
- Grid-based movement (8-directional)
- Building construction and unit recruitment
- Magic/spell system with 20+ spells
- Combat with missiles and melee
- 25 FPS game loop (40ms ticks)

**Source Analysis:**
- 187 Java/Smali classes
- 48 animation sprite sets
- 77 sound effects (OGG format)
- Multi-resolution assets (s0-s3)

---

## Current Progress

### Completed Phases:
- [x] **Phase 1.1:** Project Setup (index.html, folder structure, PixiJS from CDN)
- [x] **Phase 1.2:** Game Loop & Core (GameLoop.js, Input.js, Camera.js)
- [x] **Phase 1.3:** Asset Pipeline (AssetLoader.js, Animator.js, sprite loading)
- [x] **Phase 1.4:** Isometric Grid & Map (IsoMath.js, Grid.js, pathfinding)
- [x] **Phase 1.5:** Entity System (Entity.js, DynamicEntity.js, Game.js integration)
- [x] **Phase 1.6:** Movement System (cell occupancy, path visualization)
- [x] **Phase 1.7:** Basic Combat (melee, ranged, missiles, teams)
- [x] **Phase 1.8:** Auto-Play AI (enemy + friendly autonomous behavior)
- [x] **Phase 1.9:** Prototype Polish (HUD, selection UI, victory/defeat)

### 🎉 MILESTONE 1 COMPLETE! 🎉

All phases of the Playable Prototype are done:
- Core game loop and rendering
- Isometric grid with pathfinding
- Entity system with movement
- Combat (melee + ranged with missiles)
- Auto-play AI for all units
- HUD with unit selection panel
- Victory/defeat conditions

### In Progress:
- [x] **Milestone 1.5:** Visual & Audio Polish (sprites, textures, sounds) - COMPLETE
- [ ] **Milestone 2:** First Mission (Map Loading + Game UI)

---

## Technical Decisions

| Decision | Choice |
|----------|--------|
| **Rendering** | PixiJS (WebGL with Canvas fallback) |
| **Language** | JavaScript (ES6+, native modules) |
| **Platform** | Browser only |
| **Build Tool** | None! Pure static files |
| **PixiJS** | Loaded from CDN (unpkg/cdnjs) |
| **Approach** | Incremental: Prototype → Mission 1 → Expand |

**No npm/node required** - Just open index.html in a browser!

---

## Porting Strategy

**Milestone 1:** Playable Prototype (core gameplay loop)
**Milestone 2:** First complete mission
**Milestone 3:** Additional missions and polish
**Milestone 4:** Full game feature parity

---

## MILESTONE 1: Playable Prototype

Goal: A running game with map, units that move and fight, and basic auto-play.

### Phase 1.1: Project Setup ✅
- [x] Create folder structure
- [x] Create index.html with PixiJS from CDN
- [x] Create main.js entry point using ES6 modules
- [x] Test by opening in browser

### Phase 1.2: Game Loop & Core ✅
- [x] Port game loop timing (40ms ticks, 25 FPS logic)
- [x] Create Game class (state machine)
- [x] Set up PixiJS Application and stage
- [x] Implement fixed timestep update loop
- [x] Add basic input handling (mouse/touch)
- [x] Create Camera.js for viewport/panning
- [x] Create Input.js for unified input handling

### Phase 1.3: Asset Pipeline ✅
- [x] Copy sprite sheets from s3 folder
- [x] Create asset loader with progress tracking
- [x] Create Animator.js for sprite animations
- [x] Load and display test sprite sheet

### Phase 1.4: Isometric Grid & Map ✅
- [x] Port isometric coordinate math (IsoMath.js)
- [x] Create grid system (Grid.js)
- [x] Implement screen ↔ grid coordinate conversion
- [x] Render isometric tilemap with different terrain
- [x] Add hover highlighting
- [x] Implement A* pathfinding

### Phase 1.5: Entity System ✅
- [x] Create base Entity class (from GameObject)
- [x] Create DynamicEntity class with movement
- [x] Integrate entities with Game.js
- [x] Unit selection and movement

### Phase 1.6: Movement System ✅
- [x] Port 8-directional movement logic
- [x] Implement smooth movement
- [x] Handle cell collision (FLD_BUSY, FLD_LOCK)
- [x] Click-to-move with pathfinding
- [x] Path visualization (green fading tiles)
- [x] Units block each other's paths

### Phase 1.7: Basic Combat ✅
- [x] Implement attack range detection (melee + ranged)
- [x] Create Missile class for projectiles
- [x] Port damage calculation
- [x] Add death state and visual effects (melee slash, missile impact)
- [x] Health bar display
- [x] Team-based targeting (player vs enemy)
- [x] Click-to-attack enemies
- [x] Continuous combat when target in range

### Phase 1.8: Auto-Play AI (Core Feature) ✅
- [x] Port process() tick method for entities (processAI)
- [x] Implement hero auto-play behavior (friendly units)
- [x] Add enemy/monster AI (red units)
- [x] Target acquisition and pursuit (findNearestEnemy)
- [x] Attack execution when in range
- [x] Idle wandering behavior (wanderRandomly)
- [x] Configurable sight range per unit
- [x] Dynamic path rerouting when target moves (checkTargetMoved)

### Phase 1.9: Prototype Polish ✅
- [x] Add simple HUD (gold, unit count) - HUD.js created
- [x] Unit selection UI - Selection panel with portrait, stats, health bar
- [x] Debug overlay improvements - Simplified, moved to not overlap HUD
- [x] Victory/defeat detection - Game pauses and shows message
- [x] Gold bonus on victory (+100)

---

## MILESTONE 1.5: Visual & Audio Polish

Goal: Replace placeholder graphics with proper sprites and add sound effects.

### Phase 1.10: Animation System ✅
- [x] Reverse-engineer .dat animation format (see `assets/sprites/ASSET_FORMAT.md`)
- [x] Create AnimationLoader.js to parse .dat files
- [x] Create AnimatedSprite class for playback
- [x] Create test page (test_anim.html)
- [x] Test and verify animations render correctly
- [x] Identify which packages contain unit animations

**Known Issues (to fix later):**
- Some sprite transforms appear incorrect (e.g., upside-down heads, reversed arrows)
- Affects: Package 3 Anim 71 (warrior head), Package 7 Anim 1 (ranger arrow)
- Root cause: Transform code interpretation may differ from original OpenGL renderer
- Workaround: Most animations work correctly; edge cases need investigation

### Phase 1.11: Unit Sprites ✅
- [x] Map unit types to animation packages (see AnimationConstants.js UNIT_ANIMS)
- [x] Integrate AnimationLoader with DynamicEntity (setAnimations method)
- [x] Direction-based sprite facing - **FIXED:** Animation direction offsets were +45° from docs
- [x] State-based animations (idle, walk, attack, death)
- [x] Immediate direction update on movement start (no delay bug)

**Direction Fix Notes:**
- Original Import.smali docs claimed order: E, N, NE, NW, S, SE, SW, W
- Actual sprite file order: SE, NE, E, N, SW, S, W, NW (+45° rotation)
- Fixed in AnimationConstants.js GAME_DIR_TO_ANIM_DIR mapping
- Documented in assets/sprites/ASSET_FORMAT.md

### Phase 1.12: Tile & Building Textures
- [x] Identify tile/terrain assets in animation packages (Package 25, Animation 59 = TILESET_COMMON)
- [x] Update Grid.js to use proper terrain sprites from original tileset
- [x] Added loadTileset() method to Grid.js for loading from AnimationLoader
- [x] Updated IsoMath.js tile dimensions to match original (66x36 pixels)
- [x] **FIXED terrain decoration bug** - was loading shadow sprites (anims 21-30) instead of decorations (0-15)
- [x] Created Building.js entity class for static buildings
- [x] Loaded Package 1 (buildings) in Game.js
- [x] Added BUILDING_ANIMS to AnimationConstants.js
- [x] Test building (Castle) renders with real sprites

**Tileset Implementation Notes:**
- TILESET_COMMON = Package 25, Animation 59 (7 frames, each 66x36 pixels)
- Frame mapping (IMPORTANT - Frame 0 is empty/transparent!):
  - Frame 0: Empty/transparent (unused)
  - Frame 1: Dirt (red/brown paths)
  - Frame 2: Water (blue)
  - Frame 3: Stone (purple/gray)
  - Frame 4: Sand (yellow)
  - Frame 5: Grass (green) - used as main grass
  - Frame 6: Light grass (lighter green)
- All tiles from sprite sheet 3.png in anims25/
- Tiles load asynchronously; fallback to TileRenderer until loaded
- Tile dimensions: 66x36 pixels (updated IsoMath.js to match)

**Terrain Background (Fixed 2026-01-18):**
- Original game uses **solid green background** (0x5a7828), not textured tiles
- DECOR_GRASS_* items are **large map decorations** (rocks, walls, columns), NOT grass texture
- Decorations should be loaded from map data, not scattered randomly
- See `TERRAIN-BUGS.md` for full investigation details

### Phase 1.13: Visual Effects
- [ ] Improved missile sprites (arrows, fireballs)
- [ ] Hit/damage effects from original assets
- [ ] Selection circle improvements

### Phase 1.14: Sound Effects
- [x] Copy 77 OGG sound files to assets/audio/
- [x] Create SoundManager for sound playback
- [x] Combat sounds (attack, hit, death)
- [ ] UI sounds (click, select)

### Phase 1.15: Code Quality & Bug Fixes (2026-01-18)
- [x] Replaced setInterval with PIXI.Ticker in Missile.js (hit effect fade)
- [x] Replaced setInterval with PIXI.Ticker in DynamicEntity.js (melee effect fade)
- [x] **FIXED:** Enemies kept attacking dead units - clearAttackTarget() now resets state to IDLE
- [x] **FIXED:** Dead entities no longer process AI (early return in update())
- [x] Removed unnecessary sprite transparency on death

### Current Status:
- Animation format: ✅ Reverse-engineered and documented
- AnimationLoader: ✅ Created, parses .dat files correctly
- Unit sprites: ✅ Integrated with DynamicEntity, direction mapping fixed
- Direction system: ✅ Corrected +45° offset in animation files (see ASSET_FORMAT.md)
- Tiles: ✅ Real tileset from package 25 (TILESET_COMMON, anim 59)
- Effects: Basic graphics (slash lines, circle missiles)
- Sound: ✅ SoundManager created, OGG files ready

### Animation Package Contents (Discovered):
| Package | Contents | Use For |
|---------|----------|---------|
| 0 | UI (portraits, buttons, spell icons) | HUD/Menus |
| 1 | Buildings (churches, towers, marketplace) | Structures |
| 2 | Ice effects, wizard body parts | Wizards |
| 3 | Fire effects, warrior body parts (red armor) | Warriors |
| 4 | Orc/troll body parts (green, horned) | Enemies |
| 5 | Elven temple, bard, humanoid parts | Elves |
| 6 | Dragon parts, dwarf/barbarian body parts | Dwarves |
| 7 | Nature (trees, huts) + ranger body parts | Rangers |
| 8 | Castle/fort, knight body parts (armor) | Knights |
| 25 | Terrain tilesets (grass, water, dirt, etc.) | Map tiles |
| 27 | Map decorations (see detailed breakdown below) | Props |

### Package 27 Detailed Breakdown (Map Decorations):

**IMPORTANT:** Animation IDs 21+ are SHADOW sprites, not actual decorations!

| Anim ID | Constant | Description |
|---------|----------|-------------|
| 0-15 | DECOR_GRASS_* | Grass terrain decorations (rocks, walls, columns, lakes) |
| 16-20 | RUINS_GRASS_PART* | Ruin pieces for grass terrain |
| 21-35 | SHADOW_DECOR_GRASS_* | **SHADOWS** of grass decorations |
| 36+ | DECOR_SNOW_*, DECOR_NECRO_* | Snow/necro terrain decorations + shadows |

**Grass Decorations (Anims 0-15):**
- 0-1: BIGROCK, BIGROCK2 (large rocks)
- 2-3: HOLM, HOLM2 (hills/mounds)
- 4: IDOL (stone statue)
- 5-6: KOLONNA1-2 (columns)
- 7-9: LAKE1-3 (water features)
- 10-11: UKOZATEL1-2 (signposts)
- 12-15: WALL1-4 (stone walls)

These are **large map decorations** placed by level design, NOT small grass texture elements.

See `TERRAIN-BUGS.md` for full terrain rendering documentation.
See `assets/sprites/ASSET_FORMAT.md` for animation format documentation.

### Decoration System Architecture (from smali analysis)

The original game's decoration system is **map-driven, not procedural**:

1. **Map Files** (`map0.m` - `map29.m`) contain object positions with TYPE codes
2. **Type → Animation Mapping** (`Script.getAnimID(type, terrainType)`):
   - Same TYPE code maps to different animations based on terrain
   - Example: `TYPE_BIGROCK` → `DECOR_GRASS_BIGROCK` (grass) or `DECOR_SNOW_BIGROCK` (snow)
3. **Terrain-Aware Packages**:
   - Package 27: Grass decorations (DECOR_GRASS_*)
   - Package 28: Snow decorations (DECOR_SNOW_*)
   - Package 29: Necro decorations (DECOR_NECRO_*)
4. **Decoration Objects** have `GO_FLAG_IS_DECOR` (0x10) flag

This means decorations should be loaded from map data, not scattered randomly.

### Available Assets (from original game):
- 48 animation packages (.dat + sprite sheets)
- 77 sound effects (OGG) copied to assets/audio/
- Multi-resolution assets (using s3 for highest quality)

---

## MILESTONE 2: First Mission (IN PROGRESS)

### 🎯 Current Focus: Map Loading → Terrain Rendering → Objects → UI

Taking it step by step - walk before run!

### Phase 2.1: Map File Parsing ✅ COMPLETE
- [x] Reverse-engineer .m file format (binary analysis)
- [x] Create MapLoader.js to parse map files
- [x] Extract: dimensions, terrain types, animation packages
- [x] Load map0.m successfully (200x200 grid)
- [x] Grid now uses map dimensions for hover cursor

**Map File Format (Discovered 2024-01-18):**
```
Byte 0:      Version byte (0x2D = 45)
Bytes 1-2:   animId (terrain theme, big-endian) - e.g., 46080 = pkg 45, anim 0
Bytes 3-4:   mapWidth (big-endian) - e.g., 200
Bytes 5-6:   mapHeight (big-endian) - e.g., 200
Bytes 7-8:   cellWidth in pixels (big-endian) - e.g., 64
Bytes 9-10:  cellHeight in pixels (big-endian) - e.g., 32
Bytes 11-12: numPackages (count of animation packages to load)
Next N bytes: package IDs (1 byte each)
Then:        Terrain grid (mapWidth * mapHeight * 2 bytes, shorts)
Then:        Object data (buildings, decorations, spawn points)
```

**map0.m parsed values:**
- Version: 45
- Terrain theme: package 45, animation 0
- Dimensions: 200x200 tiles
- Cell size: 64x32 pixels
- Packages needed: 1 (buildings), 11 (unknown)
- Terrain grid: 80,000 bytes (200*200*2)
- Object data: 11,921 bytes remaining

### Phase 2.2: Terrain Rendering (IN PROGRESS)
- [x] Understand terrain data format (what do the short values mean?)
- [x] Identify terrain packages (GRASS=45, NECRO=46, SNOW=47)
- [x] Load terrain tileset from correct package
- [x] Implement terrain tile rendering from map data
- [ ] Test terrain rendering and verify frame indices
- [ ] Implement viewport culling for performance

**Terrain System (Discovered 2026-01-18):**

The map's VERSION BYTE is actually the terrain theme ID:
- Version 0x2D (45) = GRASS_ID → Package 45 (green grass terrain)
- Version 0x2E (46) = NECRO_ID → Package 46 (volcanic/necro terrain)
- Version 0x2F (47) = SNOW_ID → Package 47 (snow/ice terrain)

**Terrain Tilesets:**
- Package 45: Grass (green grass, water, dirt, stone paths)
- Package 46: Necro (dark volcanic, lava cracks, dead ground)
- Package 47: Snow (ice, snow, frozen water)

Each package has a main tileset image (0.png) with isometric tiles:
- Tile size: 128x64 pixels (before scaling to grid)
- Arranged in 8x8 grid = 64 main tiles
- Small decorations on the right side

**Frame Index Extraction:**
```javascript
// Raw value from map file
const raw = view.getInt16(offset, false);  // big-endian

// Transform (Location.smali lines 12840-12856)
const transformed = ((raw << 2) & 0xFFF8) | ((raw & 1) << 1) | 4;

// Frame index (Location.smali lines 4085-4087)
const frame = (transformed >> 3) & 0x7F;  // 0-127
```

**Files Modified:**
- `src/world/MapLoader.js`: Added getTerrainFrame() and getTerrainPackage()
- `src/world/Grid.js`: Added setMapData() and renderTerrainFromMap()
- `src/core/Game.js`: Added loadTerrainTileset() and createTerrainTileTextures()

### Phase 2.3: Map Object Parsing ✅ COMPLETE
- [x] Parse the 11,921 bytes of object data
- [x] Identify object types (buildings, decorations, spawn points)
- [x] Extract positions and properties
- [x] Document object format

**Object Parsing Results (map0.m):**
- Total objects: 2,276
- Object breakdown: 2,237 category 1 + 27 category 2 + 12 category 3
- Type distribution: Trees (96-100): 2,182 | DECOR_GRASS (112-118): ~30 | RUINS (104-105): 13 | Buildings (32): 2 | Spawns (255): 9 | Waves (254): 3 | Trolls (87): 4

**Object Types Discovered:**
| Type Hex | Type Dec | Name | Category |
|----------|----------|------|----------|
| 0x20 | 32 | Castle | Building |
| 0x57 | 87 | TYPE_TROLL | Unit (enemy) |
| 0x60-0x64 | 96-100 | TREE_GREEN 1-5 | Static decoration |
| 0x65-0x69 | 101-105 | RUINS_GRASS 1-5 | Static decoration |
| 0x6a-0x6f | 106-111 | RUINS_GRASS_GRAVE 1-6 | Static decoration |
| 0x70-0x7b | 112-123 | DECOR_GRASS_* | Static decoration |
| 0x83-0x88 | 131-136 | Additional decorations | Static decoration |
| 0xFE | 254 | Wave spawn point | Spawn |
| 0xFF | 255 | Border respawn point | Spawn |

**Static Object Ranges (no team/level/flags data):**
- 0x60-0x7b (96-123): Main decorations
- 0x83-0x88 (131-136): Additional decorations
- 0xe0-0xe4, 0xe7 (224-228, 231): Special decorations

### Phase 2.4: Map Object Spawning ✅ PARTIALLY COMPLETE
- [x] Spawn buildings from map data (renderMapBuildings)
- [x] Spawn decorations (terrain-aware via Package 27)
- [ ] Spawn units/monsters at spawn points (TYPE_TROLL etc.)
- [x] Connect to existing Building.js entity

**Current Implementation:**
- `renderMapDecorations()`: 2,239 decorations rendered using Package 27
- `renderMapBuildings()`: 2 castles rendered using Package 1
- `renderTerrainFromMap()`: 6,400 terrain tiles rendered (80x80 area)

**Monster Spawning System (Discovered):**
- Type 87 (TYPE_TROLL) objects in map data have invalid coordinates - these are NOT pre-placed units
- Enemies spawn from **respawn points** (type 0xFF/255) and **wave spawns** (type 0xFE/254)
- Respawn points contain: position, time window, pause, monster type list
- Map0 has 9 respawn points and 3 wave spawns
- TODO: Implement spawn point system to create enemies dynamically

**Terrain Tile System (Discovered & Documented):**

The map has a rich terrain tile system that we've fully reverse-engineered:

*Tileset (anims45/0.png):*
- 64 isometric tiles (8×8 grid), each 128×64 pixels
- Contains: grass variants, flower patches, water ponds, dirt paths, stone roads
- Frame 8 = base grass (57.2% of map)
- Frames 9-11 = water features
- Frames 32-55 = cobblestone roads and paths
- 50 unique frames used in map0

*Why tiles are currently DISABLED:*
- 200×200 map = 40,000 tiles (performance concern)
- Partial rendering (80×80 area) creates visible diagonal boundary
- Tiles have textured patterns; background is solid green → color mismatch at boundary
- See `TERRAIN-BUGS.md` for full visual explanation

*Current approach:*
- Solid green background (0x5a7828)
- Decorations from map data (trees, rocks, ruins, etc.)
- Consistent, clean appearance

*Future: Viewport culling*
- Only render tiles visible in camera viewport
- Update on camera pan
- Would enable roads, paths, water features
- Tile dimensions ready: 64×32 (exact 0.5× scale from 128×64)

### Phase 2.5: Game UI (Original Style)
- [ ] Analyze original UI from Package 0 (portraits, buttons, icons)
- [ ] Bottom action bar (build, recruit, spells)
- [ ] Building interaction menus
- [ ] Unit recruitment dialogs
- [ ] Resource display (gold, mana)
- [ ] Minimap

### Phase 2.6: Building System
- [ ] Castle (player HQ)
- [ ] Guild buildings (Warrior, Ranger, Wizard)
- [ ] Marketplace, Blacksmith
- [ ] Building placement from UI

### Phase 2.7: Unit Recruitment
- [ ] Recruit units from guild buildings
- [ ] Gold cost system
- [ ] Unit spawn at building location

### Phase 2.8: Mission System
- [ ] Mission objectives (defeat enemies, protect castle)
- [ ] Win/lose conditions
- [ ] Mission complete screen

---

## MILESTONE 3: Expansion (Future)

- Additional missions
- Magic/spell system
- All unit types
- Save/load game
- Sound effects
- Full polish

---

## Project Structure

```
/majesty-js
├── index.html              # Entry HTML (loads PixiJS from CDN)
├── test_anim.html          # Animation test/preview page
├── PLAN.md                 # This file
├── /assets
│   ├── /sprites
│   │   ├── ASSET_FORMAT.md # Animation format documentation
│   │   └── /anims          # Animation packages
│   │       ├── anims{N}.dat    # Animation data (binary)
│   │       └── anims{N}/       # Sprite sheets (PNG)
│   ├── /audio              # OGG sound files (77 files)
│   └── /data               # JSON game data (manifest.json)
├── /tools
│   └── parse_anim_dat.py   # Python script to parse .dat files
└── /src
    ├── main.js             # Entry point (type="module")
    ├── /core
    │   ├── Game.js         # Game state machine
    │   ├── GameLoop.js     # Fixed timestep loop
    │   └── Input.js        # Mouse/touch/keyboard handling
    ├── /graphics
    │   ├── Camera.js       # Viewport/panning
    │   ├── Animator.js     # Simple sprite animation
    │   ├── AnimationLoader.js  # Parses .dat animation files
    │   └── TileRenderer.js # Programmatic tile textures
    ├── /entities
    │   ├── Entity.js       # Base entity (GameObject)
    │   ├── DynamicEntity.js# Moving entity (DynamicObject)
    │   ├── Building.js     # Static building entity
    │   └── Missile.js      # Projectile entity
    ├── /world
    │   ├── Grid.js         # Isometric grid system
    │   ├── IsoMath.js      # Coordinate conversions
    │   └── MapLoader.js    # Parses .m map files
    ├── /ui
    │   └── HUD.js          # Heads-up display
    ├── /audio
    │   ├── SoundManager.js     # Audio playback system
    │   └── SoundConstants.js   # Sound effect mappings
    └── /utils
        ├── AssetLoader.js      # Asset management
        ├── Constants.js        # Game constants
        └── AnimationConstants.js # Unit animation IDs & direction mapping
```

---

## Key Smali → JavaScript Mappings

| Smali File | JS File | Purpose |
|------------|---------|---------|
| `Main.smali` | `GameLoop.js` | 40ms tick loop |
| `Game.smali` | `Game.js` | State machine |
| `GameObject.smali` | `Entity.js` | Base entity |
| `DynamicObject.smali` | `DynamicEntity.js` | Moving entities |
| `Missile.smali` | `Missile.js` | Projectiles |
| `Building.smali` | `Building.js` | Static buildings |
| `Location.smali` | `Grid.js` | Map/grid |
| `Animation.smali` | `Animator.js` | Sprite playback |

---

## Critical Constants

From smali analysis (in Constants.js):
```javascript
const TICK = 40;           // ms per game tick (25 FPS logic)
const CELL_SIZE = 8;       // Grid cell size
const FLD_EMPTY = 0x7e;    // Empty cell flag
const FLD_BUSY = 0x7f;     // Occupied cell
const FLD_LOCK = 0x80;     // Locked cell
const ATTACK_RANGE = 15;   // Cells for combat detection
```

## Animation ID Format

Animation IDs in Import.smali are packed as: `(packageId << 10) | animId`

```javascript
// Example: DECOR_GRASS_BIGROCK = 0x6c00
// Unpacking:
const packageId = (0x6c00 >> 10) & 0x3FF;  // = 27
const animId = 0x6c00 & 0x3FF;              // = 0
// Result: Package 27, Animation 0

// Helper functions in AnimationLoader.js:
AnimationLoader.unpackId(id)  // Returns { packageId, animId }
AnimationLoader.packId(packageId, animId)  // Returns packed ID
```

**Common ID ranges:**
- `0x0000-0x03FF`: Package 0 (UI, icons)
- `0x0400-0x07FF`: Package 1 (Buildings)
- `0x6C00-0x6FFF`: Package 27 (Decorations)
- `0x7000-0x73FF`: Package 28 (Snow decorations)
- `0x7400-0x77FF`: Package 29 (Necro decorations)

---

## How to Run

No build tools needed! Just:

1. Start a local server:
```bash
cd majesty-js
python -m http.server 8080
```

2. Open `http://localhost:8080` in your browser

**Controls:**
- Right-drag: Pan camera
- Arrow keys: Move camera
- Left-click: Select unit / Move to tile
- C: Center camera on selected unit
- S: Screen shake test
- D: Toggle debug overlay
- ESC: Pause/Resume
