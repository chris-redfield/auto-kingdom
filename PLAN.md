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
- [ ] **Milestone 1.5:** Visual & Audio Polish (sprites, textures, sounds)

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
- [ ] Identify tile/terrain assets in animation packages
- [ ] Update Grid.js to use proper terrain sprites
- [ ] Add building placeholders from anims1 package

### Phase 1.13: Visual Effects
- [ ] Improved missile sprites (arrows, fireballs)
- [ ] Hit/damage effects from original assets
- [ ] Selection circle improvements

### Phase 1.14: Sound Effects
- [x] Copy 77 OGG sound files to assets/audio/
- [ ] Create AudioManager for sound playback
- [ ] Combat sounds (attack, hit, death)
- [ ] UI sounds (click, select)

### Current Status:
- Animation format: ✅ Reverse-engineered and documented
- AnimationLoader: ✅ Created, parses .dat files correctly
- Unit sprites: ✅ Integrated with DynamicEntity, direction mapping fixed
- Direction system: ✅ Corrected +45° offset in animation files (see ASSET_FORMAT.md)
- Tiles: Programmatic textures (TileRenderer.js) - working placeholder
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

See `assets/sprites/ASSET_FORMAT.md` for full documentation.

### Available Assets (from original game):
- 48 animation packages (.dat + sprite sheets)
- 77 sound effects (OGG) copied to assets/audio/
- Multi-resolution assets (using s3 for highest quality)

---

## MILESTONE 2: First Mission (Future)

After visual polish is done:
- Building system (Castle, Guilds)
- Unit recruitment
- Resource management (gold, taxes)
- Mission objectives
- Win/lose conditions
- Full UI dialogs

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
    │   └── DynamicEntity.js# Moving entity (DynamicObject)
    ├── /world
    │   ├── Grid.js         # Isometric grid system
    │   └── IsoMath.js      # Coordinate conversions
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
| `Missile.smali` | `Missile.js` | Projectiles (TODO) |
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
