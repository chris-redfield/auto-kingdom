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
- Defeat conditions (victory is mission-specific)

### In Progress:
- [x] **Milestone 1.5:** Visual & Audio Polish (sprites, textures, sounds) - COMPLETE
- [~] **Milestone 2:** First Mission (Map Loading + Game UI) - IN PROGRESS
  - [x] Phase 2.1-2.5: Map loading, terrain, objects, UI
  - [x] Phase 2.6: Building system with placement
  - [x] Phase 2.6.1: UI/UX improvements (Build button, building selection, debug tools)
  - [x] **Phase 2.7: Character Stats & Progression** ✅ COMPLETE
  - [x] **Phase 2.7.2: Building Construction Animation** ✅ COMPLETE
  - [x] **Phase 2.7.3: Unit Menu System** ✅ COMPLETE
  - [x] **Phase 2.7.4: Game Configuration File** ✅ COMPLETE
  - [x] **Phase 2.8: Unit Training Progress** ✅ COMPLETE
  - [x] **Phase 2.9.1: Blacksmith Building** ✅ COMPLETE
  - [~] **Phase 2.9.2: Marketplace** 🎯 NEXT
  - [ ] **Phase 2.9.3: Library (Enchantments)**
  - [ ] **Phase 2.10: Mission System** (objectives, victory conditions)

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

### Phase 1.13: Visual Effects (Future)
- [ ] Improved missile sprites (arrows, fireballs)
- [ ] Hit/damage effects from original assets
- [ ] Selection circle improvements

### Phase 1.14: Sound Effects ✅ MOSTLY COMPLETE
- [x] Copy 77 OGG sound files to assets/audio/
- [x] Create SoundManager for sound playback
- [x] Combat sounds (attack, hit, death)
- [x] Music playback (M key to toggle)
- [ ] UI sounds (click, select) - optional

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
- Terrain tiles: ✅ Viewport culling working, tiles from package 45/46/47
- Terrain overlays: ⚠️ Implemented but needs visual verification
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

### Phase 2.2: Terrain Rendering ✅ COMPLETE
- [x] Understand terrain data format (what do the short values mean?)
- [x] Identify terrain packages (GRASS=45, NECRO=46, SNOW=47)
- [x] Load terrain tileset from correct package
- [x] Implement terrain tile rendering from map data
- [x] Implement viewport culling for performance (only visible tiles rendered)
- [x] Sprite pooling (tiles added/removed dynamically as camera pans)
- [x] Proper tile positioning using AnimationLoader (130x68 tiles scaled to 64x32)

**Overlay System ✅ COMPLETE:**
- [x] Extract overlay frames from terrain data (bits 10-15)
- [x] Read overlays from 4 adjacent cells (current, right, bottom, diagonal)
- [x] Position overlays at seam positions to cover tile boundaries
- [x] Separate overlay container for proper z-ordering (overlays render on top of ALL base tiles)
- [x] Visual verification: overlays render correctly at transitions

**Note on "Hard Edges":** The tileset uses discrete tile-based transitions (full diamond tiles), not smooth alpha blending. This is authentic to the original game's visual style - isometric games from this era use tile transitions, not gradient blending.

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

### Phase 2.4: Map Object Spawning ✅ COMPLETE
- [x] Spawn buildings from map data (renderMapBuildings)
- [x] Spawn decorations (terrain-aware via Package 27)
- [x] SpawnManager.js parses spawn points from map data
- [x] Connect to existing Building.js entity
- [x] Test spawn via 'T' key works
- [x] Hero recruitment from guild buildings works

**Current Implementation:**
- `renderMapDecorations()`: 2,239 decorations rendered using Package 27
- `renderMapBuildings()`: 2 castles rendered using Package 1
- `SpawnManager.js`: Parses 9 respawn points + 3 wave spawns from map0
- Viewport culling: ~200-400 terrain tiles rendered (visible area only)

**Monster Spawning System:**
- SpawnManager implemented but **disabled by default** (performance concerns with many enemies)
- 'T' key: Test spawn random enemy near player
- 'Y' key: Show spawn manager status
- To enable auto-spawning: uncomment lines 716-718 and 1444-1445 in Game.js

**Terrain Tile System (WORKING):**

The map has a rich terrain tile system that we've fully reverse-engineered and implemented:

*Tileset (anims45/0.png):*
- 64 isometric tiles (8×8 grid), each 130×68 pixels (not 128×64!)
- Contains: grass variants, flower patches, water ponds, dirt paths, stone roads
- Frame 8 = base grass (57.2% of map)
- Frames 9-11 = water features
- Frames 32-55 = cobblestone roads and paths
- 50 unique frames used in map0

*Current Implementation (Viewport Culling):*
- Only renders tiles visible in camera viewport + margin
- ~200-400 tiles rendered at any time (not 40,000)
- Sprites pooled and recycled as camera pans
- Uses AnimationLoader for proper frame offsets
- Scale: 64/130 ≈ 0.492 (tiles are 130×68, grid is 64×32)

*Overlay System (for smooth transitions):*
- Each terrain value has overlay bits (10-15) for edge blending
- 4 overlays read from adjacent tiles and positioned at seams
- Helps smooth grass→road, road→water transitions
- See `TERRAIN-BUGS.md` for full technical details

### Phase 2.5: Game UI (External HTML/CSS) 🔄 IN PROGRESS
- [x] External HTML UI (outside canvas for max game screen space)
- [x] Header bar: Gold display, allies/enemies count, game status
- [x] Bottom action bar: Build dropdown, Recruit dropdown, Pause, Speed buttons
- [x] Selected unit panel (health bar, stats)
- [x] Minimap with isometric rendering
- [ ] Analyze original UI from Package 0 (portraits, buttons, icons)
- [ ] Building interaction menus (Build dropdown is placeholder)
- [ ] Full spell system UI

**External UI Implementation (2026-01-21):**
- Moved UI outside the game canvas to maximize game screen space
- Old canvas-based HUD.js disabled, replaced with HTML/CSS in index.html
- UI updates via polling game state every 100ms
- `window.showMessage()` exposed for in-game notifications

**Minimap Implementation (2026-01-21):**
- Created `src/ui/Minimap.js` - renders to separate canvas in HTML UI
- Isometric rendering to match game perspective (diamond shape)
- Click/drag to scroll camera to that position
- Viewport rectangle shows current camera view
- Red center marker for precise position reference

*Minimap Coordinate System:*
- `gridToMinimap(i, j)` - converts grid coords to isometric minimap pixels
- `minimapToGrid(mx, my)` - inverse for click handling
- Accounts for grid container offset in world coordinates

*Terrain Color Coding:*
- Grass: Green shades (#4a9c2d, #5db03e, etc.) - Frame 8 (base grass)
- Water: Blue (#4499ff) - Frames 32-55 (streams)
- Roads: Tan (#d4b896) - Frames 9-31, 56-63
- Unwalkable: Dark green (#2d4a2d) - Trees, rocks (non-walkable tiles)

**Known Issue:** Some cobblestone road tiles may use frame numbers in the 32-55 range (same as water), causing them to appear blue on the minimap. A future fix would require logging actual frame values to determine precise ranges, or using additional tile metadata to distinguish water from roads.

*Minimap Settings:*
- Scale: 0.975 pixels per tile
- Canvas size: (gridWidth + gridHeight) × scale (isometric diamond)
- Updates at 10 FPS (100ms interval)

*Files Modified:*
- `index.html`: External UI layout, minimap canvas, UI controller script
- `src/ui/Minimap.js`: New file for minimap rendering
- `src/core/Game.js`: Disabled old HUD, added showMessage() helper

**Session Summary (2026-01-21):**
1. Created external HTML/CSS UI outside the game canvas
2. Implemented isometric minimap matching game perspective
3. Added click-to-scroll functionality on minimap
4. Fixed coordinate alignment (grid container offset)
5. Terrain color coding (mostly working, minor water/road overlap issue)

**⚠️ MINIMAP STATUS: STILL UNDER INVESTIGATION**
The minimap is functional but terrain color detection needs refinement. Some road tiles incorrectly display as water due to overlapping frame number ranges.

**Next Steps for Minimap:**
- [ ] Debug frame values to fix water/road color overlap (log actual frame numbers)
- [ ] Investigate if overlay data can help distinguish water from roads
- [ ] Add unit markers (green dots for allies, red for enemies)
- [ ] Consider adding building markers
- [ ] Test click-to-scroll accuracy across entire map

### Phase 2.6: Building System ✅ COMPLETE
- [x] Castle (player HQ) - loads from map data at spawn point
- [x] Guild buildings (Warrior, Ranger, Wizard, Marketplace, Blacksmith, Temples, etc.)
- [x] Building placement from Castle UI with visual preview
- [x] All building types use real animated sprites

**Building Construction System (2026-01-27):**

*Building Menu (Left Panel):*
- Created `src/ui/BuildingMenu.js` with construction options
- Moved building menus to external HTML panel (outside game canvas)
- Castle shows build section with available buildings
- Each building has cost, icon, and requirements (castle level, exclusions)

*Constructible Buildings:*
| Building | Cost | Requirements |
|----------|------|--------------|
| Warrior Guild | 800g | Castle Lv1 |
| Ranger Guild | 700g | Castle Lv1 |
| Marketplace | 500g | Castle Lv1 |
| Blacksmith | 600g | Castle Lv1 |
| Wizard Guild | 1200g | Castle Lv1 |
| Temple of Agrela | 900g | Castle Lv1, excludes Krypta |
| Temple of Krypta | 900g | Castle Lv1, excludes Agrela |
| Temple of Krolm | 1000g | Castle Lv1, excludes others |
| Library | 800g | Castle Lv1 |
| Guard Tower | 400g | Castle Lv1 |
| Elf Bungalow | 600g | Castle Lv1 |
| Dwarf Settlement | 700g | Castle Lv1 |
| Gnome Hovel | 500g | Castle Lv1 |
| Inn | 300g | Castle Lv1 |

*Placement System:*
- `enterBuildingPlacementMode()` - starts placement mode
- `updatePlacementPreview()` - shows isometric preview cursor
- `tryPlaceBuilding()` - validates and places building
- `isValidPlacement()` - checks grid walkability
- Visual preview: 4 yellow tiles (2x2 footprint) surrounded by green tiles
- Red tiles shown when placement is invalid
- ESC or right-click cancels placement mode

*Building Animations:*
- All buildings now animate (flags waving, smoke effects, etc.)
- `Building.update(deltaTime)` cycles through animation frames
- Animation packages loaded: 1, 2, 3, 4, 5, 6, 7, 8, 9
- `BUILDING_ANIMS` in AnimationConstants.js maps all building types

*Castle from Map Data:*
- Castle now created as proper `Building` object from map spawn point
- Camera starts centered on castle position (not grid center)
- Player units spawn near castle instead of map center
- `playerCastle` reference set for victory/defeat conditions

*Files Modified:*
- `src/ui/BuildingMenu.js`: Added CONSTRUCTIBLE_BUILDINGS, addBuildSection(), startBuildingPlacement()
- `src/core/Game.js`: Added placement mode (enterBuildingPlacementMode, updatePlacementPreview, tryPlaceBuilding, isValidPlacement), loaded animation packages 2-9, modified renderMapBuildings() for proper castle creation, camera centers on castle, units spawn near castle
- `src/utils/AnimationConstants.js`: Added complete BUILDING_ANIMS mapping for all building types
- `src/entities/Building.js`: Added animation frame cycling in update()
- `index.html`: Restructured layout with left panel for building menu

*Bug Fixes:*
- Fixed invisible buildings (were added to wrong container - worldContainer instead of grid.container)
- Fixed placement cursor not showing (getMousePosition → getWorldPosition)
- Fixed placeholder graphics (copied missing animation packages from original game)

### Phase 2.6.1: UI/UX Improvements (2026-01-28) ✅ COMPLETE

*Build Button:*
- Build button in action bar now opens Castle building menu (same as clicking Castle)
- Fixed buildingMenu not initialized at startup (was only created on first building click)
- Fixed menu closing immediately when clicking Build button (added #action-bar to allowed click areas)

*Building Selection:*
- Clicking a building now deselects the current unit
- Added `selectedBuilding` property to track selected building
- Clicking a unit deselects the building and hides the building menu
- Building selection ellipse now consistent across all buildings (based on sizeI/sizeJ)
- Selection ellipse positioned lower (offsetY = 40) to appear at building base

*Building Menu:*
- Buildings can now be built multiple times (removed "already built" filter)
- BuildingMenu initialized at game startup for immediate availability

*Game Mechanics:*
- Removed automatic victory condition when all enemies killed
- Victory conditions will be mission-specific (to be implemented in Phase 2.9)
- Defeat conditions remain: Castle destroyed or all player units dead

*Debug Tools:*
- 'G' key now adds +500 gold (cheat for testing)
- Removed old 'G' key test guild creation (no longer needed)

### Phase 2.7: Character Stats & Progression ✅ COMPLETE
- [x] Research original game's stat system (analyzed DynamicObject.smali, Const.smali)
- [x] Implement character stats (Strength, Intelligence, Vitality, Willpower, Artifice)
- [x] Level-up system (XP from kills, stat increases with diminishing returns)
- [x] Gold acquisition (heroes earn personal gold + tax gold from kills)
- [x] Hero inventory/equipment (weapon/armor levels, enchantments, potions)
- [x] Display stats in unit selection panel
- [x] Stat effects on combat (damage, defense, hit/miss rolls)

**Implemented Files:**
- `src/config/GameConfig.js` - All unit stats, formulas, and constants
- `src/entities/Inventory.js` - Equipment and item management
- `src/entities/DynamicEntity.js` - Updated with full stat system

**Original Game Stats (from smali analysis):**

*Primary Stats:*
- `strength` - Affects melee damage
- `intelligence` - Affects magic damage and spells
- `artifice` - Crafting/ranged skill (elves)
- `vitality` - Affects HP gains on level up
- `willpower` - Affects magic resistance

*Combat Skills:*
- `H2H` - Hand-to-hand melee hit chance (0-95)
- `ranged` - Ranged attack hit chance (0-95)
- `parry` - Block melee attacks (0-95)
- `dodge` - Evade ranged attacks (0-95)
- `resist` - Magic resistance (0-95)
- `armor` - Reduces damage taken

*Hit Formula:*
```javascript
// Melee: rnd(200) + attacker.H2H >= defender.parry + 100
// Ranged: rnd(200) + attacker.ranged >= defender.dodge + 100
// Note: undefined parry/dodge (buildings) treated as 0
```

**Bug Fix (2026-02-02):** Buildings had `parry:undefined` which caused hit checks to return `false` (NaN comparison). Fixed `COMBAT.meleeHitCheck()` and `COMBAT.rangedHitCheck()` in GameConfig.js to treat undefined parry/dodge as 0.

*Damage Formula:*
```javascript
baseDamage = rnd(minDamage, maxDamage)
reduction = min(0.75, defenderArmor / 100)
finalDamage = max(1, baseDamage * (1 - reduction))
```

*XP System (from smali analysis 2026-01-29):*

**Key Discovery:** The original game gives XP **per damage dealt**, not just on kill!

The `getKickExp(damage)` method in DynamicObject.smali distributes XP fairly:
```javascript
// Fields on each enemy:
expPerDmg = deadExp / maxHealth  // XP per point of damage (e.g., 100 XP / 100 HP = 1)
leaveExp = 0                      // Tracks total XP already distributed from this enemy
deadExp = 100                     // Total XP this enemy is worth

// When damage is dealt:
function getKickExp(damage) {
    let xpGain = expPerDmg * damage;
    leaveExp += xpGain;

    // Cap at deadExp - can't give more XP than enemy is worth
    if (leaveExp > deadExp) {
        xpGain -= (leaveExp - deadExp);
        leaveExp = deadExp;
    }
    return xpGain;
}
```

**Fair Distribution Example:**
- Enemy has 100 HP, worth 100 XP (expPerDmg = 1)
- Knight deals 70 damage → gets 70 XP
- Ranger deals 30 damage → gets 30 XP
- Total distributed = 100 XP (exactly deadExp, no more)

**Level Up:**
- XP gained = baseXp / currentLevel (diminishing returns)
- Level up when: (exp - prevExp) >= levelUpXp
- On level up: Primary stat +1, combat skill +1, parry +1, dodge +1
- HP increase: rnd(1, vitality/2) + vitality/2
- Stat cap: 95

*Level Up XP Requirements:*
| Unit Type | XP per Level |
|-----------|-------------|
| Warrior | 1500 |
| Ranger | 1250 |
| Paladin | 2000 |
| Wizard | 2000 |
| Healer | 900 |
| Necromancer | 1200 |
| Barbarian | 1200 |
| Dwarf | 1500 |
| Elf | 1600 |

*Gold System (from smali analysis 2026-01-29):*

**Key Discovery:** Gold is awarded **only on kill**, not per damage (unlike XP).

```javascript
// When enemy dies:
Script.addGold(attacker, target.deadGold);  // Only the killer gets gold

// Gold goes to taxGold (not personal gold directly)
attacker.taxGold += amount;  // Collected gold to deliver to castle
```

**Gold Flow:**
1. Hero kills enemy → gains `deadGold` to their `taxGold`
2. Hero returns to castle → delivers `taxGold` to player treasury
3. Hero can spend personal `gold` at Marketplace/Blacksmith/Library

**Important:** Only the unit that lands the **killing blow** receives gold.
Multiple attackers do NOT share gold (unlike XP which is distributed by damage).

*Equipment Levels:*
- Weapon levels 1-6 (+2 damage per level)
- Armor levels 1-6 (+3 defense per level)
- Enchantments 0-3 (+3 weapon damage, +5 armor per level)

### Phase 2.7.1: Debug Tools ✅ COMPLETE
- [x] Keyboard shortcut: 'G' key adds +500 gold to treasury, +100 gold to selected hero
- [x] Keyboard shortcut: 'X' key adds +500 XP to selected unit
- [x] Keyboard shortcut: 'L' key instantly levels up selected unit
- [x] Console logging for XP gains (shows base XP, adjusted XP, level, progress)
- [x] Removed old 'G' key test guild creation (no longer needed)
- [ ] Consider other debug tools: spawn specific units, instant build, god mode (optional)

### Phase 2.7.2: Building Construction Animation ✅ COMPLETE
- [x] Buildings spawn in "under construction" state (not instant)
- [x] Play build animation during construction (BUILDING_ANIMS has `build` anim IDs)
- [x] Construction timer/progress (5 seconds default, configurable per building type)
- [x] Show construction progress bar above building (green fill bar)
- [x] Transition to `idle` animation when construction complete
- [x] Buildings non-functional until construction finishes (recruit buttons disabled)
- [x] Animation plays through once during construction (frame tied to progress)
- [x] Progress bar persists during animation frame updates

**Implementation details:**
- `Building.js`: Added `startConstruction()`, `completeConstruction()`, `createProgressBar()`, `updateProgressBar()`
- `Game.js`: `initBuildingAnimation()` now accepts `startConstruction` parameter
- `BuildingMenu.js`: Recruit buttons disabled and show "(building...)" text during construction
- Progress bar appears above building during construction, removed on completion
- Animation frame tied to `constructionProgress * frameCount` (plays once, not looping)
- Fixed progress bar vanishing by preserving it in `updateAnimationFrame()`

**Original Game Construction System (from smali analysis):**

The original game calculates construction time based on building HP (Stability):
- `waitingForBuild = HP * 8` (HP shifted left by 3)
- `BUILD_FILL_STACK_TICKTIME = 40` ticks between build point additions
- `BUILD_FILL_STACK_VALUE = 10` points added per cycle
- `BUILD_SPEED = 1` (speed multiplier)

**Building HP Values (Stability) from Const.smali:**

| Building | HP (Level 1) | HP (Level 2) | HP (Level 3) |
|----------|-------------|-------------|-------------|
| Castle | 550 | 700 | 1000 |
| Warrior Guild | 700 | - | - |
| Ranger Guild | 250 | - | - |
| Wizard Guild | 350 | 500 | 700 |
| Blacksmith | 250 | 300 | 400 |
| Marketplace | 200 | 250 | 300 |
| Agrela Temple | 250 | 300 | 400 |
| Crypta Temple | 350 | 425 | 475 |
| Krolm Temple | 800 | - | - |
| Guard Tower | 200 | - | - |
| Library | 100 | 200 | 300 |
| Inn (House) | 75 | - | - |
| Gnome Hovel | 75 | - | - |
| Elf Bungalow | 300 | - | - |
| Dwarf Windmill | 600 | - | - |
| Dwarf Tower | 350 | - | - |

Construction time is proportional to HP - lower HP buildings construct faster.
Based on typical gameplay, estimates are:
- Small buildings (75 HP): ~15-30 seconds
- Medium buildings (200-350 HP): ~45-90 seconds
- Large buildings (600-800 HP): ~90-150 seconds

**TODO (Future):** Implement per-building construction times based on HP values above.

### Phase 2.7.3: Unit Menu System ✅ COMPLETE (2026-02-02)
- [x] Created `src/ui/UnitMenu.js` - menu for hero unit interactions
- [x] Added unit menu HTML/CSS to `index.html` (left panel, same location as building menu)
- [x] Integrated UnitMenu with Game.js entity selection system
- [x] Menu shows when clicking on player heroes, hides when clicking buildings/enemies/ground
- [x] Fixed menu button click issues (stopPropagation to prevent menu closing)
- [x] Created `src/entities/Inventory.js` - equipment and item management for heroes
- [x] Heroes now have Inventory instance (created in `initFromUnitType()`)
- [x] `getTotalArmor()` and `rollDamage()` now use inventory values

**Unit Menu Features:**
- Stats display: STR, INT, VIT, ART, H2H, RNG, PAR, DOD
- Combat stats: Damage range, Armor, Resist
- Gold display (personal + tax gold)
- Equipment section: Weapon/Armor levels, enchantments
- Potions section: Healing potions, Cure potions (buy/use)
- Accessories section: Ring of Protection, Amulet of Teleportation, Poison Coating

**Contextual Options (appear when hero is near specific buildings):**
- Near Blacksmith: Upgrade Weapon, Upgrade Armor
- Near Library: Enchant Weapon, Enchant Armor
- Near Marketplace: Buy potions, Buy accessories

**Implementation Details:**
- `src/ui/UnitMenu.js`: Full menu class with stats display, equipment, potions, accessories
- `index.html`: Added `#unit-menu` HTML structure and CSS styles (green theme for heroes)
- `Game.js`: Import UnitMenu, initialize in `createTestContent()`, show/hide in `selectEntity()`
- Menu uses same pattern as BuildingMenu (left panel, close button, click-outside handling)

**Bug Fixes (2026-01-29):**
- Fixed building menu closing when clicking buttons (recruit, upgrade, build)
  - Root cause: `updateMenu()` rebuilds options, removing clicked element from DOM
  - Document click handler then thought click was outside menu
  - Fix: Added `e.stopPropagation()` to all option click handlers in BuildingMenu.js
- Applied same fix to UnitMenu.js for consistency
- Fixed building menu staying open during placement mode (removed `this.hide()` from `startBuildingPlacement()`)

**Files Modified:**
- `src/ui/UnitMenu.js` (NEW)
- `src/ui/BuildingMenu.js` (bug fixes)
- `src/core/Game.js` (UnitMenu integration)
- `index.html` (unit menu HTML/CSS)
- `src/entities/Inventory.js` (NEW - equipment/item management)
- `src/entities/DynamicEntity.js` (inventory creation, armor/damage calculations)

### Phase 2.7.4: Game Configuration File ✅ COMPLETE
- [x] Created `src/config/GameConfig.js` - centralized configuration for game parameters
- [x] Unit base stats (UNIT_BASE_STATS for all unit types)
- [x] Combat formulas (hit checks, damage calculation)
- [x] XP system - implemented `getKickExp()` matching original game (XP per damage, fair distribution)
- [x] Gold system - implemented kill-only gold rewards matching original game
- [x] Real-time UnitMenu updates during combat (XP bar, gold display)
- [x] Enemy stats initialization - `spawnEnemy()` and map enemies now use `initFromUnitType()`
- [ ] Equipment prices and bonuses (code written, needs testing)
- [x] Item definitions (potions, accessories)

**XP/Gold System Testing (2026-01-29):**
- Fixed enemies not giving proper XP - were using default values instead of `initFromUnitType()`
- Added debug tools: X key (+500 XP), L key (instant level up)
- Added console logging for XP gains during combat
- Verified XP distribution works correctly (damage-based, capped at deadExp)
- Monster stats now match original game (Rat: 12 HP, Troll: 80 HP, etc.)
- [ ] Move hardcoded values to config file:
  - Building HP values (per level)
  - Building construction times
  - Building costs
  - Unit HP values
  - Unit stats (attack, defense, speed, range)
  - Unit costs and training times
  - Combat formulas and multipliers
  - XP curves and level-up bonuses
- [ ] Allow easy tweaking of game balance without code changes
- [ ] Consider JSON format for potential external editing/modding

**Benefits:**
- Single source of truth for game balance
- Easy to compare with original game values
- Enables future modding support
- Cleaner code (no magic numbers scattered throughout)

---

## 📚 REVERSE ENGINEERING DOCUMENTATION

### Combat Damage System (from DynamicObject.smali)

The original game has **two separate damage calculation systems** based on entity type:

#### 1. HERO Damage (objectType = 1)

Heroes (player units like Warriors, Rangers, Wizards) use **weapon-based damage**:

```
damage = rnd(1, getWeaponDamage(weapon)) + enchantedWeaponLevel
```

- `weapon` field determines the weapon type (0-22)
- `getWeaponDamage()` returns the max damage for that weapon type
- `enchantedWeaponLevel` adds bonus damage from enchantments at the Library

**Weapon Damage Table (from Script.smali getWeaponDamage):**
| Weapon ID | Damage | Description |
|-----------|--------|-------------|
| 0 | 10 | Basic sword (Warrior/Paladin/Dwarf/Barbarian start) |
| 1 | 11 | Improved sword |
| 2 | 12 | Steel sword |
| 3 | 13 | Fine sword |
| 4 | 6 | Basic bow (Ranger/Elf start) |
| 5 | 7 | Improved bow |
| 6 | 8 | Elven bow |
| 7 | 9 | Master bow |
| 8-11 | 16-19 | Advanced melee weapons |
| 12-15 | 22-25 | Elite weapons |
| 16-19 | 12-15 | Special weapons |
| 22 | 12 | Magic staff (Wizard start) |

**How Heroes Get Better Weapons:**
- Buy from Marketplace (higher weapon tiers)
- Enchant at Library (+enchantedWeaponLevel bonus)

#### 2. MONSTER Damage (objectType = 2)

Monsters (enemies like Rats, Trolls, Goblins) use **stat-based damage**:

```
damage = rnd(minDamage, maxDamage)
```

- `minDamage` and `maxDamage` are fixed per monster type
- Defined in UNIT_BASE_STATS in GameConfig.js

**Example Monster Damage Values:**
| Monster | Min Damage | Max Damage |
|---------|------------|------------|
| Rat | 2 | 5 |
| Goblin | 5 | 12 |
| Troll | 10 | 20 |

#### Damage Formula (after type-specific calculation)

```javascript
// From COMBAT.calculateDamage
baseDamage = rnd(minDmg, maxDmg)
armorReduction = Math.floor(baseDamage * targetArmor / 100)
finalDamage = Math.max(1, baseDamage - armorReduction)
```

#### Files Modified for Damage System:
- `src/config/GameConfig.js`:
  - Added `WEAPON_DAMAGE` table with all 22 weapon types
  - Added `getWeaponDamage(weaponId)` helper function
  - Updated all hero configs: removed `minDamage/maxDamage`, added `weapon` field
  - Monster configs keep `minDamage/maxDamage`

- `src/entities/DynamicEntity.js`:
  - Updated `rollDamage()` to check `objectType`:
    - HERO: Use weapon damage
    - MONSTER: Use minDamage/maxDamage
  - Updated `initFromUnitType()` to initialize `weapon` field

#### Hero Starting Weapons:
| Hero Type | Weapon ID | Max Damage |
|-----------|-----------|------------|
| Warrior | 0 | 10 |
| Ranger | 4 | 6 |
| Paladin | 0 | 10 |
| Barbarian | 0 | 10 |
| Dwarf | 0 | 10 |
| Elf | 4 | 6 |
| Wizard | 22 | 12 |
| Healer | 22 | 12 |
| Necromancer | 21 | ? |

**Note:** Rangers and Elves have lower starting damage (1-6) but attack from range (8 tiles), making them safer. They improve significantly with better bows from the Marketplace.

---

### Movement Speed System (from DynamicObject.smali)

The original game uses **fixed-point math** for smooth sub-pixel movement:

#### Fixed-Point Coordinates

```java
// Internal position (high precision)
fp_x += speed;        // or -= depending on direction
fp_y += speed >> 1;   // Y moves at half speed (isometric perspective)

// Convert to screen pixels
x = fp_x >> 10;       // Right-shift by 10 = divide by 1024
y = fp_y >> 10;
```

#### Speed Conversion Formula

```
Screen pixels per tick = speed / 1024
```

| Unit Type | Speed Value | Pixels/Tick | Time to Cross Tile* |
|-----------|-------------|-------------|---------------------|
| Warrior | 0x800 (2048) | 2 | ~1.4 sec |
| Ranger | 0xC00 (3072) | 3 | ~0.95 sec |
| Elf | 0x1000 (4096) | 4 | ~0.7 sec |
| Troll | 0x800 (2048) | 2 | ~1.4 sec |

*Assuming 64-pixel tile width, 25 FPS

#### setVel() Resolution Scaling

The `setVel()` function in Script.smali adjusts speed for different screen resolutions:
- If cellWidth == 48: `speed = speed * 0.75`
- If cellWidth == 24: `speed = speed * 0.5`
- Otherwise: speed unchanged

Our game uses 64-pixel tiles, so no adjustment is needed.

#### Attack Timing

From smali: `attack_pause = 0x16` (22 ticks)
- Attack cooldown = 22 ticks / 25 FPS = **0.88 seconds**
- **UPDATE (2026-02-02):** Changed to 1760ms (44 ticks) to account for animation timing
  - Original game starts attack animation every 22 ticks, but damage is dealt at `fireFrame`
  - Our code deals damage immediately, so longer cooldown needed to match perceived speed
  - Config: `TIMERS.DEFAULT_ATTACK_COOLDOWN = 1760` in GameConfig.js

#### Files Modified:
- `src/config/GameConfig.js`:
  - Fixed `SPEED.SCALE` from `1/512` to `1/1024` (was 2x too fast!)
  - Added documentation explaining the fixed-point math

---

### Phase 2.7.5: Collision System Fixes ✅ COMPLETE

**Building Collision - DONE:**
- [x] Buildings now block pathfinding (tiles marked as FLD_LOCK)
- [x] Units spawn OUTSIDE building footprint using `findSpawnPositionNearBuilding()`
- [x] Buildings have 1-tile collision padding around their footprint
- [x] `lockMapBuildingCells()` called during map initialization
- [x] `Building.lockCells()` marks occupied + surrounding tiles

**Unit Stacking - PARTIALLY DONE:**
- [x] Added `isCellTargetedByOther()` to check if another unit is heading to a cell
- [x] Units now try to avoid cells that are targeted by other units
- [x] Fallback to first walkable cell if all cells are targeted (prevents freeze)
- [ ] Could still improve with formation/spacing for large groups

**Performance Optimizations - DONE:**
- [x] Pathfinding iteration limit (500 max) - prevents browser freeze
- [x] AI throttling (every 5-10 frames, staggered by entity ID) - O(n²) → O(n)
- [x] `findNearestEnemy()` limit (30 checks + early exit if distance < 3)
- [x] `isCellTargetedByOther()` limit (20 entity checks)
- [x] Game now handles 60+ units without freezing

**Other Fixes:**
- [x] Dead units no longer remain selected
- [x] Build button works when unit is selected (deselects unit first)
- [x] First knight now attacks enemies (autoPlay = true, sightRange from config)
- [x] Player units have correct speed (initFromUnitType called)

### Phase 2.7.6: Monster XP Values Fix ✅ COMPLETE (2026-02-03)

**Problem:** Heroes weren't leveling up from combat - monster XP values were ~10x too low.

**Root Cause:** `deadExp` values in `GameConfig.js` didn't match original game's `Const.smali`.

**Fixed Monster XP Values:**
| Monster | Old XP | New XP (from smali) |
|---------|--------|---------------------|
| RAT | 50-100 | **500-1,500** |
| TROLL | 200-400 | **3,000-4,000** |
| GOBLIN | 100-200 | **1,000-2,000** |
| GOBLIN_ARCHER | 100-200 | **1,000-2,000** |
| SKELETON | 75-150 | **1,000-2,000** |
| ZOMBIE | 100-200 | **1,500-2,500** |
| VAMPIRE | 300-600 | **3,000-7,000** |
| MINOTAUR | 400-800 | **2,000-6,000** |

**Added Missing Monster Definitions:**
- SPIDER: 2,000-5,000 XP (35 HP)
- GARPY (Harpy): 1,200-4,800 XP (35 HP)
- DUBOLOM (Tree Monster): 4,000-8,000 XP (90 HP)
- GOLEM: 5,000-10,000 XP (120 HP)
- GOBLIN_CHAMPION: 1,500-2,500 XP (35 HP)
- GOBLIN_SHAMAN: 1,000-2,000 XP (25 HP)
- RED_DRAGON: 7,000-12,000 XP (150 HP)
- BLACK_DRAGON: 10,000-15,000 XP (200 HP)

**Result:** Warriors (1,500 XP/level) now level up after 1-3 Rat kills instead of 15-30.

### Phase 2.7.7: Monster Gold Values Fix ✅ COMPLETE (2026-02-03)

**Problem:** Heroes weren't getting much gold from monster kills - values didn't match original.

**Root Cause:** `deadGold` values in `GameConfig.js` were random ranges but original game uses fixed values.

**Fixed Monster Gold Values (from DynamicObject.smali):**
| Monster | Old Gold | New Gold (from smali) |
|---------|----------|----------------------|
| RAT | [5, 15] | **25** |
| TROLL | [30, 75] | **12** |
| GOBLIN | [15, 40] | **10** |
| GOBLIN_ARCHER | [15, 40] | **11** |
| SKELETON | [10, 30] | **50** |
| ZOMBIE | [15, 35] | **12** |
| VAMPIRE | [75, 150] | **200** |
| MINOTAUR | [100, 200] | **200** |
| SPIDER | [25, 60] | **75** |
| GARPY | [30, 70] | **200** |
| DUBOLOM | [50, 120] | **400** |
| GOLEM | [80, 180] | **400** |
| GOBLIN_CHAMPION | [25, 60] | **20** |
| GOBLIN_SHAMAN | [20, 50] | **17** |
| RED_DRAGON | [200, 500] | **500** |
| BLACK_DRAGON | [300, 700] | **10,000** (boss reward!) |

**Key Findings:**
- Original game uses FIXED gold values (not random ranges)
- Tougher monsters (DUBOLOM, GOLEM, BLACK_DRAGON) were giving way too little gold
- BLACK_DRAGON is the ultimate boss reward: 10,000 gold
- Small monsters (GOBLIN, TROLL, ZOMBIE) actually give less gold in original

### Phase 2.8: Unit Training Progress ✅ COMPLETE (2026-02-02)
- [x] Recruit units from guild buildings (DONE in earlier phase)
- [x] Gold cost system (deduct from player gold) (DONE)
- [x] Recruitment queue/timer per guild (not instant spawn)
- [x] **Progress bar in building menu** showing hero training progress
- [x] Unit spawn at building location when training complete
- [x] Different unit types per guild (Warrior Guild → Warriors, etc.)
- [x] Training time varies by unit type (configured in TRAINING_TIMES)
- [x] **Menu auto-refresh** when training completes (shows recruit button again)

**Implementation Details:**
- `Building.js`: Added `isTraining`, `trainingProgress`, `trainingUnitType`, `startTraining()`, `completeTraining()`
- `BuildingMenu.js`: Shows progress bar during training, hides recruit button, auto-refreshes on completion
- `GameConfig.js`: Added `TRAINING_TIMES` with per-unit training durations
- `index.html`: Added CSS for `.training-progress`, `.training-bar-fill`, etc.
- `Game.js`: Calls `buildingMenu.update()` for real-time progress updates

**Bug Fix (2026-02-02):** Menu now tracks `_wasTraining` state to detect when training completes and automatically calls `updateMenu()` to show the recruit button again.

**Training Times:**
| Unit | Time |
|------|------|
| Warrior | 8s |
| Ranger | 7s |
| Wizard | 10s |
| Paladin | 12s |
| Healer | 9s |
| Gnome | 6s |
| Default | 8s |

### Phase 2.9: Shop Buildings (Blacksmith, Marketplace, Library) 🔄 IN PROGRESS

#### Phase 2.9.1: Blacksmith Building 🎯 CURRENT
The Blacksmith has TWO separate systems (from smali analysis):

**1. Player Unlocks (Building Menu):**
- Player pays to unlock weapon/armor upgrade TIERS at the building
- Unlocking increases `building.weaponLevel` / `building.armorLevel`
- These are GLOBAL maximums - all heroes can then upgrade to that tier

**2. Hero Upgrades (when hero visits):**
- Heroes pay personal gold to upgrade their `hero.weaponLevel` / `hero.armorLevel`
- Can only upgrade UP TO the building's unlocked tier
- Wizards (types 7,8,9) cannot use blacksmith (return -1)

**Costs from Const.smali:**

*Player costs to UNLOCK tiers (COST_BLACKSMITH_UPGRADE_WEAPON/ARMOR):*
| Tier | Unlock Cost | Required Blacksmith Level |
|------|-------------|---------------------------|
| 1→2 | 200 gold | Level 1 (default) |
| 2→3 | 300 gold | Level 2 |
| 3→4 | 400 gold | Level 3 |

*Hero costs to PURCHASE upgrades (WEAPON_UPGRADE_PRICES):*
| Level | Weapon Cost | Armor Cost |
|-------|-------------|------------|
| 1→2 | 100 gold | 300 gold |
| 2→3 | 300 gold | 900 gold |
| 3→4 | 600 gold | 1800 gold |

*Building upgrade costs (COST_BLACKSMITH_UPGRADE):*
| Level | Cost |
|-------|------|
| 1→2 | 570 gold |
| 2→3 | 760 gold |

**Tasks:** ✅ ALL COMPLETE (2026-02-03)
- [x] Add `weaponLevel` and `armorLevel` fields to Building.js (tracks unlocked tiers)
- [x] Add unlock buttons to BuildingMenu.js for Blacksmith
- [x] Display current unlocked tier in building menu
- [x] Hero auto-visit logic (RND_*_GO_BLACKSMITH chances from smali)
- [x] Hero upgrade logic (check building tier, deduct gold, update weaponLevel)
- [x] Visual feedback when upgrade happens (floating text + flash effect)
- [x] Blacksmith building upgrades (levels 1-3, unlock higher tiers)

**Implementation Summary:**
- `Building.js`: Added `weaponLevel`, `armorLevel` fields + unlock methods. Starting tier = 2 so level-1 heroes can buy.
- `GameConfig.js`: Added `BLACKSMITH_CONFIG` with all costs from smali
- `BuildingMenu.js`: Added tier unlock UI with level requirements
- `DynamicEntity.js`: Added hero AI to visit Blacksmith, purchase upgrades, visual effects
- `Inventory.js`: Fixed `upgradeWeapon()` to sync `owner.weapon` field and call `calculateDamageFromStats()`
- `UnitMenu.js`: Fixed UI refresh after manual upgrade with `showForUnit(unit)`

**Bug Fixes (2026-02-03):**
1. **Heroes standing near blacksmith but not buying:**
   - Root cause: `distanceTo(blacksmith)` measured to building's top-left corner, not center
   - For a 2x2 building, hero adjacent to building could still be > 2 tiles from corner
   - Fix: Calculate distance to building CENTER instead of corner
   - Also: Try 8 tiles around building instead of just one for pathfinding

2. **Heroes couldn't upgrade at level 1 blacksmith:**
   - Root cause: Hero weaponLevel=1, blacksmith weaponLevel=1, condition `hero >= blacksmith` was true
   - Original workaround: Changed blacksmith starting `weaponLevel`/`armorLevel` from 1 to 2
   - **REVERTED (2026-02-05):** This workaround broke the tier unlock system! Players couldn't unlock any tiers at a fresh blacksmith because next tier (3) required building level 2.
   - **Correct fix:** Blacksmith starts at weaponLevel=1/armorLevel=1. Player must spend 200g to unlock tier 2 (available at building level 1). This matches the original game where the blacksmith starts with no upgrades unlocked (+0) and the player pays to unlock each tier.
   - Confirmed by original game screenshot: blacksmith shows "+0" weapon/armor bonus with 200g unlock buttons active
   - Also fixed hero upgrade price display: `slice(0, weaponLevel-1)` instead of `slice(0, weaponLevel)` so it shows "None yet" when no tiers unlocked
   - Smali check (Dialog.smali:39716): `if armorLevel > building.level → blocked` — at level 1, one unlock available (tier 1→2); building upgrade needed for tier 3+

3. **Weapon damage not updating after blacksmith purchase:**
   - Root cause: `purchaseBlacksmithUpgrades()` updated weaponLevel but didn't call `calculateDamageFromStats()`
   - Fix: Added `this.calculateDamageFromStats()` after weapon upgrade in `purchaseBlacksmithUpgrades()`

4. **Weapon damage not updating for rangers (manual upgrade via UI):**
   - Root cause: UI wasn't refreshing after upgrade - showed old damage values
   - Fix: Added `this.showForUnit(unit)` after upgrade in UnitMenu.js

**Known Issues (TODO):**
- Heroes path to the SOUTH of the blacksmith instead of the correct entrance position. The pathfinding target tiles need adjustment to match the original game's building entry points.

5. **Manual upgrade buttons ignored blacksmith tier:**
   - Root cause: UnitMenu's upgrade buttons only checked if more levels existed, not the blacksmith's unlocked tier
   - Fix: Added `getNearestBlacksmith()` helper and check `blacksmith.weaponLevel`/`armorLevel` before showing upgrade buttons
   - Also shows helpful message when at max tier: "Max tier (X) - Upgrade blacksmith"

#### Phase 2.9.2: Marketplace (Future)
- [ ] Heroes can buy: Healing Potions, Cure Potions
- [ ] Accessories: Ring of Protection, Amulet of Teleportation, Poison Coating
- [ ] Auto-purchase behavior for AI heroes (buy potions when gold > threshold)

#### Phase 2.9.3: Library (Future)
- [ ] Enchant weapon (+1 to +3 damage bonus)
- [ ] Enchant armor (+1 to +3 defense bonus)
- [ ] Enchantment costs and limits

**Implementation Notes:**
- Buildings already placeable from Castle menu
- Need to implement: hero AI to seek out shops, automatic purchasing logic
- Inventory.js already has buy/upgrade methods ready

### Phase 2.10: Mission System
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
    │   ├── HUD.js          # Old canvas HUD (disabled, replaced by HTML UI)
    │   ├── Minimap.js      # Isometric minimap renderer
    │   └── BuildingMenu.js # Building selection and construction UI
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
- Left-click: Select unit / Select building / Move to tile / Place building (in placement mode)
- Right-click: Cancel building placement mode
- C: Center camera on selected unit
- S: Screen shake test
- D: Toggle debug overlay
- T: Spawn test enemy
- G: Add 500 gold to treasury + 100 gold to selected hero (cheat)
- X: Add 500 XP to selected unit (cheat)
- L: Instant level up selected unit (cheat)
- M: Toggle music
- N: Mute/unmute SFX
- ESC: Pause/Resume / Cancel placement mode
- Minimap: Click/drag to scroll camera
- Building Menu: Click building in Castle menu to enter placement mode

**UI Elements:**
- Header: Gold, allies/enemies count, game status
- Left panel: Building menu (shows when Castle/Guild selected) with build options
- Bottom bar: Build, Recruit, Pause, Speed buttons
- Minimap: Top-right corner (isometric diamond view)
- Selected unit panel: Bottom-left (when unit selected)
- Placement preview: Isometric cursor showing building footprint (yellow) with surrounding tiles (green)
