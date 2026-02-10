/**
 * BuildingMenu - Popup menu for building interactions
 *
 * Shows options when clicking on player buildings:
 * - Castle: Upgrade
 * - Guilds: Recruit hero, Upgrade
 * - Blacksmith: Upgrade Weapons, Upgrade Armor
 * - Marketplace: Upgrade
 */

import { BuildingType } from '../utils/Constants.js';
import { SOUNDS } from '../audio/SoundConstants.js';
import {
    BUILDING_COSTS,
    BUILDING_UPGRADE_COSTS,
    BUILDING_MAX_LEVEL,
    RECRUIT_COSTS,
    TRAINING_TIMES,
    COMBAT_CONSTANTS,
    BLACKSMITH_CONFIG,
    MARKETPLACE_CONFIG,
    ITEMS,
} from '../config/GameConfig.js';

// Buildings that can be constructed from the Castle
// Based on original game's getTypeFromMenuBuildings() in GameDialog.smali
// Costs are pulled from GameConfig.BUILDING_COSTS
const CONSTRUCTIBLE_BUILDINGS = [
    // Castle Level 1 buildings (from smali isPosibleBuild)
    { type: BuildingType.WARRIOR_GUILD, name: 'Warrior Guild', get cost() { return BUILDING_COSTS[BuildingType.WARRIOR_GUILD]; }, icon: '⚔️', requiresCastleLevel: 1 },
    { type: BuildingType.RANGER_GUILD, name: 'Ranger Guild', get cost() { return BUILDING_COSTS[BuildingType.RANGER_GUILD]; }, icon: '🏹', requiresCastleLevel: 1 },
    { type: BuildingType.BLACKSMITH, name: 'Blacksmith', get cost() { return BUILDING_COSTS[BuildingType.BLACKSMITH]; }, icon: '🔨', requiresCastleLevel: 1 },
    { type: BuildingType.GUARD_TOWER, name: 'Guard Tower', get cost() { return BUILDING_COSTS[BuildingType.GUARD_TOWER]; }, icon: '🗼', requiresCastleLevel: 1 },
    { type: BuildingType.MARKETPLACE, name: 'Marketplace', get cost() { return BUILDING_COSTS[BuildingType.MARKETPLACE]; }, icon: '🏪', requiresCastleLevel: 1 },
    { type: BuildingType.INN, name: 'Inn', get cost() { return BUILDING_COSTS[BuildingType.INN]; }, icon: '🍺', requiresCastleLevel: 1 },
    // Castle Level 2 buildings (from smali isPosibleBuild)
    { type: BuildingType.WIZARD_GUILD, name: 'Wizard Guild', get cost() { return BUILDING_COSTS[BuildingType.WIZARD_GUILD]; }, icon: '🔮', requiresCastleLevel: 2 },
    { type: BuildingType.AGRELLA_TEMPLE, name: 'Temple of Agrela', get cost() { return BUILDING_COSTS[BuildingType.AGRELLA_TEMPLE]; }, icon: '☀️', requiresCastleLevel: 2, excludes: ['CRYPTA_TEMPLE'] },
    { type: BuildingType.CRYPTA_TEMPLE, name: 'Temple of Krypta', get cost() { return BUILDING_COSTS[BuildingType.CRYPTA_TEMPLE]; }, icon: '💀', requiresCastleLevel: 2, excludes: ['AGRELLA_TEMPLE', 'KROLM_TEMPLE'] },
    { type: BuildingType.KROLM_TEMPLE, name: 'Temple of Krolm', get cost() { return BUILDING_COSTS[BuildingType.KROLM_TEMPLE]; }, icon: '⚡', requiresCastleLevel: 2, excludes: ['CRYPTA_TEMPLE'] },
    { type: BuildingType.ELF_BUNGALOW, name: 'Elven Bungalow', get cost() { return BUILDING_COSTS[BuildingType.ELF_BUNGALOW]; }, icon: '🌿', requiresCastleLevel: 2, excludes: ['GNOME_HOVEL', 'DWARF_WINDMILL'] },
    { type: BuildingType.DWARF_WINDMILL, name: 'Dwarven Settlement', get cost() { return BUILDING_COSTS[BuildingType.DWARF_WINDMILL]; }, icon: '⛏️', requiresCastleLevel: 2, excludes: ['GNOME_HOVEL', 'ELF_BUNGALOW'] },
    { type: BuildingType.DWARF_TOWER, name: 'Dwarf Tower', get cost() { return BUILDING_COSTS[BuildingType.DWARF_TOWER]; }, icon: '🏰', requiresCastleLevel: 2, requires: 'DWARF_WINDMILL' },
    { type: BuildingType.GNOME_HOVEL, name: 'Gnome Hovel', get cost() { return BUILDING_COSTS[BuildingType.GNOME_HOVEL]; }, icon: '🍄', requiresCastleLevel: 2, excludes: ['ELF_BUNGALOW', 'DWARF_WINDMILL'] },
    { type: BuildingType.LIBRARY, name: 'Library', get cost() { return BUILDING_COSTS[BuildingType.LIBRARY]; }, icon: '📚', requiresCastleLevel: 2 },
];

// Building configuration - costs and options
// Using BuildingType hex values (0x20 = Castle, 0x21 = Warrior Guild, etc.)
// Costs and max levels now pulled from GameConfig
const BUILDING_CONFIG = {
    // Castle (0x20)
    [BuildingType.CASTLE]: {
        name: 'Castle',
        canUpgrade: true,
        get upgradeCost() { return BUILDING_UPGRADE_COSTS[BuildingType.CASTLE]; },
        get maxLevel() { return BUILDING_MAX_LEVEL[BuildingType.CASTLE]; },
        canBuild: true  // Castle can construct other buildings
    },
    // Warrior Guild (0x21)
    [BuildingType.WARRIOR_GUILD]: {
        name: 'Warrior Guild',
        canRecruit: true,
        get recruitCost() { return RECRUIT_COSTS.WARRIOR; },
        recruitUnit: 'WARRIOR',
        recruitName: 'Warrior',
        canUpgrade: true,
        get upgradeCost() { return BUILDING_UPGRADE_COSTS[BuildingType.WARRIOR_GUILD]; },
        get maxLevel() { return BUILDING_MAX_LEVEL[BuildingType.WARRIOR_GUILD]; },
        // Alternative hero (Paladin) available with Agrella Temple
        altRecruit: {
            name: 'Paladin',
            get cost() { return RECRUIT_COSTS.PALADIN; },
            unit: 'PALADIN',
            requires: 'AGRELLA_TEMPLE'
        }
    },
    // Ranger Guild (0x22)
    [BuildingType.RANGER_GUILD]: {
        name: 'Ranger Guild',
        canRecruit: true,
        get recruitCost() { return RECRUIT_COSTS.RANGER; },
        recruitUnit: 'RANGER',
        recruitName: 'Ranger',
        canUpgrade: true,
        get upgradeCost() { return BUILDING_UPGRADE_COSTS[BuildingType.RANGER_GUILD]; },
        get maxLevel() { return BUILDING_MAX_LEVEL[BuildingType.RANGER_GUILD]; }
    },
    // Wizard Guild (0x23)
    [BuildingType.WIZARD_GUILD]: {
        name: 'Wizard Guild',
        canRecruit: true,
        get recruitCost() { return RECRUIT_COSTS.WIZARD; },
        recruitUnit: 'WIZARD',
        recruitName: 'Wizard',
        canUpgrade: true,
        get upgradeCost() { return BUILDING_UPGRADE_COSTS[BuildingType.WIZARD_GUILD]; },
        get maxLevel() { return BUILDING_MAX_LEVEL[BuildingType.WIZARD_GUILD]; },
        // Alternative heroes with temples
        altRecruit: {
            name: 'Healer',
            get cost() { return RECRUIT_COSTS.HEALER; },
            unit: 'HEALER',
            requires: 'AGRELLA_TEMPLE'
        },
        altRecruit2: {
            name: 'Necromancer',
            get cost() { return RECRUIT_COSTS.NECROMANCER; },
            unit: 'NECROMANCER',
            requires: 'CRYPTA_TEMPLE'
        }
    },
    // Agrella Temple (0x24) - for healers
    [BuildingType.AGRELLA_TEMPLE]: {
        name: 'Temple of Agrela',
        canUpgrade: true,
        get upgradeCost() { return BUILDING_UPGRADE_COSTS[BuildingType.AGRELLA_TEMPLE]; },
        get maxLevel() { return BUILDING_MAX_LEVEL[BuildingType.AGRELLA_TEMPLE]; }
    },
    // Crypta Temple (0x25) - for necromancers
    [BuildingType.CRYPTA_TEMPLE]: {
        name: 'Temple of Krypta',
        canUpgrade: true,
        get upgradeCost() { return BUILDING_UPGRADE_COSTS[BuildingType.CRYPTA_TEMPLE]; },
        get maxLevel() { return BUILDING_MAX_LEVEL[BuildingType.CRYPTA_TEMPLE]; }
    },
    // Krolm Temple (0x26) - for barbarians
    [BuildingType.KROLM_TEMPLE]: {
        name: 'Temple of Krolm',
        canUpgrade: true,
        get upgradeCost() { return BUILDING_UPGRADE_COSTS[BuildingType.KROLM_TEMPLE]; },
        get maxLevel() { return BUILDING_MAX_LEVEL[BuildingType.KROLM_TEMPLE]; }
    },
    // Blacksmith (0x27)
    // Uses two-tier system:
    // 1. Player UNLOCKS weapon/armor tiers (costs TIER_UNLOCK_*)
    // 2. Heroes then visit and PURCHASE upgrades (costs HERO_*_PRICES)
    [BuildingType.BLACKSMITH]: {
        name: 'Blacksmith',
        isBlacksmith: true,
        canUpgrade: true,
        get upgradeCost() { return BLACKSMITH_CONFIG.BUILDING_UPGRADE_COSTS; },
        maxLevel: 3,
        // Unlock costs (player pays to make tier available)
        get tierUnlockWeaponCost() { return BLACKSMITH_CONFIG.TIER_UNLOCK_WEAPON; },
        get tierUnlockArmorCost() { return BLACKSMITH_CONFIG.TIER_UNLOCK_ARMOR; },
        get maxWeaponTier() { return BLACKSMITH_CONFIG.MAX_WEAPON_TIER; },
        get maxArmorTier() { return BLACKSMITH_CONFIG.MAX_ARMOR_TIER; },
        // Hero upgrade prices (for display in unit menu)
        get heroWeaponPrices() { return BLACKSMITH_CONFIG.HERO_WEAPON_PRICES; },
        get heroArmorPrices() { return BLACKSMITH_CONFIG.HERO_ARMOR_PRICES; }
    },
    // Guard Tower (0x28)
    [BuildingType.GUARD_TOWER]: {
        name: 'Guard Tower',
        canUpgrade: true,
        get upgradeCost() { return BUILDING_UPGRADE_COSTS[BuildingType.GUARD_TOWER]; },
        get maxLevel() { return BUILDING_MAX_LEVEL[BuildingType.GUARD_TOWER]; }
    },
    // Marketplace (0x29)
    [BuildingType.MARKETPLACE]: {
        name: 'Marketplace',
        isMarketplace: true,
        canUpgrade: true,
        get upgradeCost() { return BUILDING_UPGRADE_COSTS[BuildingType.MARKETPLACE]; },
        get maxLevel() { return BUILDING_MAX_LEVEL[BuildingType.MARKETPLACE]; },
    },
    // Elf Bungalow (0x2b)
    [BuildingType.ELF_BUNGALOW]: {
        name: 'Elven Bungalow',
        canRecruit: true,
        get recruitCost() { return RECRUIT_COSTS.ELF; },
        recruitUnit: 'ELF',
        recruitName: 'Elf',
        canUpgrade: true,
        get upgradeCost() { return BUILDING_UPGRADE_COSTS[BuildingType.ELF_BUNGALOW]; },
        get maxLevel() { return BUILDING_MAX_LEVEL[BuildingType.ELF_BUNGALOW]; }
    },
    // Dwarf Windmill (0x2c)
    [BuildingType.DWARF_WINDMILL]: {
        name: 'Dwarven Settlement',
        canRecruit: true,
        get recruitCost() { return RECRUIT_COSTS.DWARF; },
        recruitUnit: 'DWARF',
        recruitName: 'Dwarf',
        canUpgrade: true,
        get upgradeCost() { return BUILDING_UPGRADE_COSTS[BuildingType.DWARF_WINDMILL]; },
        get maxLevel() { return BUILDING_MAX_LEVEL[BuildingType.DWARF_WINDMILL]; }
    },
    // Dwarf Tower (0x2d) - requires Dwarf Windmill
    [BuildingType.DWARF_TOWER]: {
        name: 'Dwarf Tower',
        canUpgrade: true,
        get upgradeCost() { return BUILDING_UPGRADE_COSTS[BuildingType.DWARF_TOWER]; },
        get maxLevel() { return BUILDING_MAX_LEVEL[BuildingType.DWARF_TOWER]; }
    },
    // Gnome Hovel (0x2e)
    [BuildingType.GNOME_HOVEL]: {
        name: 'Gnome Hovel',
        canRecruit: true,
        get recruitCost() { return RECRUIT_COSTS.GNOME; },
        recruitUnit: 'GNOME',
        recruitName: 'Gnome',
        canUpgrade: true,
        get upgradeCost() { return BUILDING_UPGRADE_COSTS[BuildingType.GNOME_HOVEL]; },
        get maxLevel() { return BUILDING_MAX_LEVEL[BuildingType.GNOME_HOVEL]; }
    },
    // Inn (0x30)
    [BuildingType.INN]: {
        name: 'Inn',
        canUpgrade: true,
        get upgradeCost() { return BUILDING_UPGRADE_COSTS[BuildingType.INN]; },
        get maxLevel() { return BUILDING_MAX_LEVEL[BuildingType.INN]; }
    },
    // Library (0x31)
    [BuildingType.LIBRARY]: {
        name: 'Library',
        canUpgrade: true,
        get upgradeCost() { return BUILDING_UPGRADE_COSTS[BuildingType.LIBRARY]; },
        get maxLevel() { return BUILDING_MAX_LEVEL[BuildingType.LIBRARY]; }
    }
};

export class BuildingMenu {
    constructor(game) {
        this.game = game;
        this.currentBuilding = null;
        this.visible = false;

        // Get DOM elements
        this.menuElement = document.getElementById('building-menu');
        this.titleElement = document.getElementById('building-menu-title');
        this.healthBar = document.getElementById('building-health-fill');
        this.healthText = document.getElementById('building-health-text');
        this.levelText = document.getElementById('building-level');
        this.optionsContainer = document.getElementById('building-options');

        // Create menu if it doesn't exist yet (for backwards compatibility)
        if (!this.menuElement) {
            console.warn('Building menu HTML not found, menu will not display');
            return;
        }

        // Close button handler
        const closeBtn = document.getElementById('building-menu-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }

        // Close on click outside (but not when clicking in allowed areas)
        document.addEventListener('click', (e) => {
            if (this.visible && this.menuElement &&
                !this.menuElement.contains(e.target) &&
                !e.target.closest('#game-container') &&
                !e.target.closest('#left-panel') &&
                !e.target.closest('#action-bar')) {
                this.hide();
            }
        });
    }

    /**
     * Show menu for a building
     */
    show(building, screenX, screenY) {
        if (!this.menuElement) return;

        this.currentBuilding = building;
        this.visible = true;

        // Get building config
        const config = BUILDING_CONFIG[building.buildingType];
        const buildingName = config ? config.name : building.getName();

        // Update title
        this.titleElement.textContent = buildingName;

        // Update health bar
        const healthPct = (building.health / building.maxHealth) * 100;
        this.healthBar.style.width = `${healthPct}%`;
        this.healthText.textContent = `${Math.ceil(building.health)}/${building.maxHealth}`;

        // Update level
        this.levelText.textContent = `Level ${building.level}`;

        // Clear and rebuild options
        this.optionsContainer.innerHTML = '';

        if (config) {
            this.buildMenuOptions(config, building);
        }

        // Show menu (now in fixed left panel, no positioning needed)
        this.menuElement.classList.add('visible');
    }

    /**
     * Hide the menu
     */
    hide() {
        if (!this.menuElement) return;

        this.visible = false;
        this.currentBuilding = null;
        this.menuElement.classList.remove('visible');
    }

    /**
     * Build menu options based on building config
     */
    buildMenuOptions(config, building) {
        // Castle can build other buildings
        if (config.canBuild) {
            this.addBuildSection(building);
        }

        // Recruit option (only if building is fully constructed)
        if (config.canRecruit) {
            // Check if currently training
            if (building.isTraining) {
                // Show training progress instead of recruit button
                this.addTrainingProgress(building, config);
            } else {
                const canRecruit = building.constructed && this.game.gold >= config.recruitCost;
                this.addOption({
                    icon: '⚔️',
                    text: building.constructed ? `Recruit ${config.recruitName}` : `Recruit ${config.recruitName} (building...)`,
                    cost: config.recruitCost,
                    enabled: canRecruit,
                    onClick: () => this.recruitHero(config.recruitUnit, config.recruitCost)
                });

                // Alternative recruit (e.g., Paladin from Warrior Guild)
                if (config.altRecruit && this.hasBuilding(config.altRecruit.requires)) {
                    const canAltRecruit = building.constructed && this.game.gold >= config.altRecruit.cost;
                    this.addOption({
                        icon: '🛡️',
                        text: building.constructed ? `Recruit ${config.altRecruit.name}` : `Recruit ${config.altRecruit.name} (building...)`,
                        cost: config.altRecruit.cost,
                        enabled: canAltRecruit,
                        onClick: () => this.recruitHero(config.altRecruit.unit, config.altRecruit.cost)
                    });
                }
            }
        }

        // Upgrade building option
        if (config.canUpgrade && building.level < config.maxLevel) {
            const upgradeCost = config.upgradeCost[building.level - 1] || config.upgradeCost[0];
            this.addOption({
                icon: '⬆️',
                text: 'Upgrade Building',
                cost: upgradeCost,
                enabled: this.game.gold >= upgradeCost,
                onClick: () => this.upgradeBuilding(upgradeCost)
            });
        }

        // Blacksmith special options - unlock weapon/armor tiers
        if (config.isBlacksmith) {
            this.addBlacksmithOptions(config, building);
        }

        // Marketplace special options - Market Day + item info
        if (config.isMarketplace) {
            this.addMarketplaceOptions(config, building);
        }

        // Info section
        this.addInfoSection(config, building);
    }

    /**
     * Add an option button to the menu
     */
    addOption({ icon, text, cost, enabled, onClick }) {
        const option = document.createElement('div');
        option.className = `building-option ${enabled ? '' : 'disabled'}`;

        option.innerHTML = `
            <span class="option-icon">${icon}</span>
            <span class="option-text">${text}</span>
            <span class="option-cost">${cost}g</span>
        `;

        if (enabled) {
            option.addEventListener('click', (e) => {
                e.stopPropagation();  // Prevent document click handler from closing menu
                onClick();
                this.updateMenu();
            });
        }

        this.optionsContainer.appendChild(option);
    }

    /**
     * Add training progress display to menu
     */
    addTrainingProgress(building, config) {
        const progressContainer = document.createElement('div');
        progressContainer.className = 'training-progress';

        const unitName = building.trainingUnitType ?
            building.trainingUnitType.charAt(0).toUpperCase() + building.trainingUnitType.slice(1).toLowerCase() :
            config.recruitName;

        const progressPct = Math.floor(building.trainingProgress * 100);

        progressContainer.innerHTML = `
            <div class="training-header">
                <span class="training-icon">⏳</span>
                <span class="training-text">Training ${unitName}...</span>
            </div>
            <div class="training-bar-container">
                <div class="training-bar-fill" style="width: ${progressPct}%"></div>
            </div>
            <div class="training-percent">${progressPct}%</div>
        `;

        this.optionsContainer.appendChild(progressContainer);
    }

    /**
     * Add info section showing building stats
     */
    addInfoSection(config, building) {
        const info = document.createElement('div');
        info.className = 'building-info';

        let infoText = '';

        if (config.canRecruit) {
            // Show how many heroes have been recruited
            const heroCount = this.countHeroesOfType(config.recruitUnit);
            infoText += `<div>Heroes: ${heroCount}</div>`;
        }

        if (config.incomeBonus) {
            const bonus = config.incomeBonus[building.level - 1] || 0;
            infoText += `<div>Tax Bonus: +${bonus}%</div>`;
        }

        if (infoText) {
            info.innerHTML = infoText;
            this.optionsContainer.appendChild(info);
        }
    }

    /**
     * Add build section for Castle - shows constructible buildings
     */
    addBuildSection(castle) {
        // Add section header
        const header = document.createElement('div');
        header.className = 'build-section-header';
        header.textContent = 'Build';
        this.optionsContainer.appendChild(header);

        // Filter available buildings based on castle level, exclusions, and requirements
        const availableBuildings = CONSTRUCTIBLE_BUILDINGS.filter(bldg => {
            // Check castle level requirement
            if (castle.level < bldg.requiresCastleLevel) {
                return false;
            }

            // Check prerequisite building (e.g., Dwarf Tower requires Dwarf Windmill)
            if (bldg.requires) {
                const requireType = BuildingType[bldg.requires];
                const hasRequired = this.game.buildings.some(b =>
                    b.buildingType === requireType && b.team === 0 && b.constructed
                );
                if (!hasRequired) {
                    return false;
                }
            }

            // Check exclusions (e.g., can't have both Elf Bungalow and Gnome Hovel)
            if (bldg.excludes) {
                for (const excludeName of bldg.excludes) {
                    const excludeType = BuildingType[excludeName];
                    const hasExcluded = this.game.buildings.some(b =>
                        b.buildingType === excludeType && b.team === 0
                    );
                    if (hasExcluded) {
                        return false;
                    }
                }
            }

            return true;
        });

        if (availableBuildings.length === 0) {
            const noBuildings = document.createElement('div');
            noBuildings.className = 'building-info';
            noBuildings.textContent = 'No buildings available';
            this.optionsContainer.appendChild(noBuildings);
            return;
        }

        // Add build options
        for (const bldg of availableBuildings) {
            const canAfford = this.game.gold >= bldg.cost;

            const option = document.createElement('div');
            option.className = `building-option ${canAfford ? '' : 'disabled'}`;

            option.innerHTML = `
                <span class="option-icon">${bldg.icon}</span>
                <span class="option-text">${bldg.name}</span>
                <span class="option-cost">${bldg.cost}g</span>
            `;

            if (canAfford) {
                option.addEventListener('click', (e) => {
                    e.stopPropagation();  // Prevent document click handler from closing menu
                    this.startBuildingPlacement(bldg);
                });
            }

            this.optionsContainer.appendChild(option);
        }
    }

    /**
     * Start building placement mode
     */
    startBuildingPlacement(buildingInfo) {
        // Keep menu open - user can continue browsing while placing
        // Tell the game to enter building placement mode
        this.game.enterBuildingPlacementMode(buildingInfo);
    }

    /**
     * Update menu after an action
     */
    updateMenu() {
        if (this.currentBuilding) {
            // Re-render options with updated state
            const config = BUILDING_CONFIG[this.currentBuilding.buildingType];
            if (config) {
                // Update health
                const healthPct = (this.currentBuilding.health / this.currentBuilding.maxHealth) * 100;
                this.healthBar.style.width = `${healthPct}%`;
                this.healthText.textContent = `${Math.ceil(this.currentBuilding.health)}/${this.currentBuilding.maxHealth}`;

                // Update level
                this.levelText.textContent = `Level ${this.currentBuilding.level}`;

                // Rebuild options
                this.optionsContainer.innerHTML = '';
                this.buildMenuOptions(config, this.currentBuilding);
            }
        }
    }

    /**
     * Light update - just refresh training progress without rebuilding entire menu
     * Called periodically from game loop
     */
    update() {
        if (!this.visible || !this.currentBuilding) return;

        // Check if training is in progress
        if (this.currentBuilding.isTraining) {
            // Find and update the training progress bar
            const progressFill = this.optionsContainer.querySelector('.training-bar-fill');
            const progressPercent = this.optionsContainer.querySelector('.training-percent');

            if (progressFill && progressPercent) {
                const pct = Math.floor(this.currentBuilding.trainingProgress * 100);
                progressFill.style.width = `${pct}%`;
                progressPercent.textContent = `${pct}%`;
            } else {
                // Progress bar not found, rebuild menu to show it
                this.updateMenu();
            }
            // Track that we were training (to detect completion)
            this._wasTraining = true;
        } else if (this._wasTraining) {
            // Training just completed - refresh menu to show recruit button again
            this._wasTraining = false;
            this.updateMenu();
        }

        // Update research progress bar
        if (this.currentBuilding.researchActive) {
            const progressFill = this.optionsContainer.querySelector('.research-fill');
            const progressPercent = this.optionsContainer.querySelector('.training-percent');

            if (progressFill && progressPercent) {
                const pct = this.currentBuilding.researchTotal > 0
                    ? Math.floor((this.currentBuilding.researchProgress / this.currentBuilding.researchTotal) * 100)
                    : 0;
                progressFill.style.width = `${pct}%`;
                progressPercent.textContent = `${pct}%`;
            }
            this._wasResearch = true;
        } else if (this._wasResearch) {
            this._wasResearch = false;
            this.updateMenu();
        }

        // Update Market Day progress bar
        if (this.currentBuilding.marketDayActive) {
            const progressFill = this.optionsContainer.querySelector('.market-day-fill');
            // Use last .training-percent if multiple exist (market day comes after research)
            const percentElements = this.optionsContainer.querySelectorAll('.training-percent');
            const progressPercent = percentElements.length > 0 ? percentElements[percentElements.length - 1] : null;

            if (progressFill && progressPercent) {
                const pct = this.currentBuilding.marketDayTotal > 0
                    ? Math.floor((1 - this.currentBuilding.marketDayProgress / this.currentBuilding.marketDayTotal) * 100)
                    : 0;
                progressFill.style.width = `${pct}%`;
                progressPercent.textContent = `${pct}%`;
            }
            this._wasMarketDay = true;
        } else if (this._wasMarketDay) {
            this._wasMarketDay = false;
            this.updateMenu();
        }
    }

    /**
     * Recruit a hero from the building (starts training)
     */
    recruitHero(unitType, cost) {
        // Check if building is under construction
        if (this.currentBuilding && !this.currentBuilding.constructed) {
            this.game.showMessage('Building under construction!');
            if (this.game.playSound) {
                this.game.playSound(SOUNDS.CLICK_DENY);
            }
            return;
        }

        // Check if already training
        if (this.currentBuilding && this.currentBuilding.isTraining) {
            this.game.showMessage('Already training a hero!');
            if (this.game.playSound) {
                this.game.playSound(SOUNDS.CLICK_DENY);
            }
            return;
        }

        if (this.game.gold < cost) {
            this.game.showMessage(`Need ${cost} gold!`);
            if (this.game.playSound) {
                this.game.playSound(SOUNDS.CLICK_DENY);
            }
            return;
        }

        // Deduct gold and start training
        this.game.gold -= cost;

        // Get training time for this unit type
        const trainingTime = TRAINING_TIMES[unitType] || TRAINING_TIMES.DEFAULT;

        // Store reference to building for callback
        const building = this.currentBuilding;
        const game = this.game;

        // Start training with callback to spawn hero when done
        building.startTraining(unitType, trainingTime, (completedUnitType) => {
            // Find spawn position near building
            const spawnPos = game.findSpawnPositionNearBuilding(building);

            if (spawnPos) {
                game.spawnHero(completedUnitType, spawnPos.i, spawnPos.j);

                const config = BUILDING_CONFIG[building.buildingType];
                const heroName = config ? config.recruitName : completedUnitType;
                game.showMessage(`${heroName} ready!`);

                // Play sound
                if (game.playSound) {
                    game.playSound(SOUNDS.HERO_READY || SOUNDS.GOLD);
                }

                console.log(`Training complete: ${completedUnitType}`);
            } else {
                game.showMessage('No space to spawn hero!');
                // Refund gold if can't spawn
                game.gold += cost;
            }
        });

        const config = BUILDING_CONFIG[this.currentBuilding.buildingType];
        const heroName = config ? config.recruitName : unitType;
        this.game.showMessage(`Training ${heroName}...`);

        // Play sound
        if (this.game.playSound) {
            this.game.playSound(SOUNDS.GOLD);
        }

        console.log(`Started training ${unitType} for ${cost} gold (${trainingTime}ms)`);
    }

    /**
     * Upgrade the building
     */
    upgradeBuilding(cost) {
        if (this.game.gold < cost) {
            this.game.showMessage(`Need ${cost} gold!`);
            if (this.game.playSound) {
                this.game.playSound(SOUNDS.CLICK_DENY);
            }
            return;
        }

        this.game.gold -= cost;
        this.currentBuilding.level++;

        // Increase building stats - use GameConfig value
        this.currentBuilding.maxHealth += COMBAT_CONSTANTS.BUILDING_UPGRADE_HP_BONUS;
        this.currentBuilding.health = this.currentBuilding.maxHealth;

        this.game.showMessage(`${this.currentBuilding.getName()} upgraded to level ${this.currentBuilding.level}!`);

        // Play upgrade sound
        if (this.game.playSound) {
            this.game.playSound(SOUNDS.BUILDING_UPGRADED);
        }

        console.log(`Upgraded ${this.currentBuilding.getName()} to level ${this.currentBuilding.level}`);
    }

    /**
     * Add Blacksmith-specific options (unlock weapon/armor tiers)
     *
     * Tier requirements:
     * - Tier 2: Blacksmith level 1 (default)
     * - Tier 3: Blacksmith level 2 required
     * - Tier 4: Blacksmith level 3 required
     */
    addBlacksmithOptions(config, building) {
        // Section header
        const header = document.createElement('div');
        header.className = 'build-section-header';
        header.textContent = 'Unlock Upgrades';
        this.optionsContainer.appendChild(header);

        // Current tiers info
        const tierInfo = document.createElement('div');
        tierInfo.className = 'building-info';
        tierInfo.innerHTML = `
            <div>Weapon Tier: ${building.weaponLevel}/${config.maxWeaponTier}</div>
            <div>Armor Tier: ${building.armorLevel}/${config.maxArmorTier}</div>
        `;
        this.optionsContainer.appendChild(tierInfo);

        // Get required building level for next tier
        // Tier 2 = level 1, Tier 3 = level 2, Tier 4 = level 3
        const getRequiredLevel = (nextTier) => Math.max(1, nextTier - 1);

        // Unlock Weapon Tier button
        if (building.weaponLevel < config.maxWeaponTier) {
            const nextTier = building.weaponLevel + 1;
            const requiredLevel = getRequiredLevel(nextTier);
            const meetsLevelReq = building.level >= requiredLevel;
            const cost = config.tierUnlockWeaponCost[building.weaponLevel - 1];
            const canAfford = this.game.gold >= cost;

            if (!meetsLevelReq) {
                // Show requirement message
                const reqInfo = document.createElement('div');
                reqInfo.className = 'building-option disabled';
                reqInfo.innerHTML = `<span class="option-icon">🗡️</span><span class="option-text">Weapon Tier ${nextTier} (needs Lv${requiredLevel})</span>`;
                this.optionsContainer.appendChild(reqInfo);
            } else {
                this.addOption({
                    icon: '🗡️',
                    text: `Unlock Weapon Tier ${nextTier}`,
                    cost: cost,
                    enabled: canAfford && building.constructed,
                    onClick: () => this.unlockWeaponTier(building, cost)
                });
            }
        } else {
            // Max tier reached
            const maxInfo = document.createElement('div');
            maxInfo.className = 'building-option disabled';
            maxInfo.innerHTML = `<span class="option-icon">🗡️</span><span class="option-text">Weapons: Max Tier</span>`;
            this.optionsContainer.appendChild(maxInfo);
        }

        // Unlock Armor Tier button
        if (building.armorLevel < config.maxArmorTier) {
            const nextTier = building.armorLevel + 1;
            const requiredLevel = getRequiredLevel(nextTier);
            const meetsLevelReq = building.level >= requiredLevel;
            const cost = config.tierUnlockArmorCost[building.armorLevel - 1];
            const canAfford = this.game.gold >= cost;

            if (!meetsLevelReq) {
                // Show requirement message
                const reqInfo = document.createElement('div');
                reqInfo.className = 'building-option disabled';
                reqInfo.innerHTML = `<span class="option-icon">🛡️</span><span class="option-text">Armor Tier ${nextTier} (needs Lv${requiredLevel})</span>`;
                this.optionsContainer.appendChild(reqInfo);
            } else {
                this.addOption({
                    icon: '🛡️',
                    text: `Unlock Armor Tier ${nextTier}`,
                    cost: cost,
                    enabled: canAfford && building.constructed,
                    onClick: () => this.unlockArmorTier(building, cost)
                });
            }
        } else {
            // Max tier reached
            const maxInfo = document.createElement('div');
            maxInfo.className = 'building-option disabled';
            maxInfo.innerHTML = `<span class="option-icon">🛡️</span><span class="option-text">Armor: Max Tier</span>`;
            this.optionsContainer.appendChild(maxInfo);
        }

        // Hero upgrade prices info
        const pricesHeader = document.createElement('div');
        pricesHeader.className = 'build-section-header';
        pricesHeader.style.marginTop = '10px';
        pricesHeader.textContent = 'Hero Upgrade Costs';
        this.optionsContainer.appendChild(pricesHeader);

        const pricesInfo = document.createElement('div');
        pricesInfo.className = 'building-info';
        pricesInfo.innerHTML = `
            <div style="font-size: 11px; color: #aaa;">Heroes visit to buy upgrades:</div>
            <div>Weapons: ${config.heroWeaponPrices.slice(0, building.weaponLevel - 1).map((p, i) => `Lv${i+2}:${p}g`).join(', ') || 'None yet - unlock a tier!'}</div>
            <div>Armor: ${config.heroArmorPrices.slice(0, building.armorLevel - 1).map((p, i) => `Lv${i+2}:${p}g`).join(', ') || 'None yet - unlock a tier!'}</div>
        `;
        this.optionsContainer.appendChild(pricesInfo);
    }

    /**
     * Unlock next weapon tier at Blacksmith (player pays)
     */
    unlockWeaponTier(building, cost) {
        if (this.game.gold < cost) {
            this.game.showMessage(`Need ${cost} gold!`);
            if (this.game.playSound) {
                this.game.playSound(SOUNDS.CLICK_DENY);
            }
            return;
        }

        this.game.gold -= cost;
        building.unlockWeaponTier();

        this.game.showMessage(`Weapon Tier ${building.weaponLevel} unlocked! Heroes can now upgrade.`);

        // Play upgrade sound
        if (this.game.playSound) {
            this.game.playSound(SOUNDS.UPGRADE_COMPLETE);
        }

        console.log(`Blacksmith weapon tier unlocked: ${building.weaponLevel}`);
    }

    /**
     * Unlock next armor tier at Blacksmith (player pays)
     */
    unlockArmorTier(building, cost) {
        if (this.game.gold < cost) {
            this.game.showMessage(`Need ${cost} gold!`);
            if (this.game.playSound) {
                this.game.playSound(SOUNDS.CLICK_DENY);
            }
            return;
        }

        this.game.gold -= cost;
        building.unlockArmorTier();

        this.game.showMessage(`Armor Tier ${building.armorLevel} unlocked! Heroes can now upgrade.`);

        // Play upgrade sound
        if (this.game.playSound) {
            this.game.playSound(SOUNDS.UPGRADE_COMPLETE);
        }

        console.log(`Blacksmith armor tier unlocked: ${building.armorLevel}`);
    }

    // =========================================================================
    // MARKETPLACE
    // =========================================================================

    /**
     * Add Marketplace-specific options (research buttons, Market Day, item info)
     * Each item must be researched (player pays treasury gold + wait) before heroes can buy it.
     */
    addMarketplaceOptions(config, building) {
        // If a research is currently in progress, show it at the top
        if (building.researchActive) {
            const researchConfig = MARKETPLACE_CONFIG.RESEARCH[building.researchType];
            const pct = building.researchTotal > 0
                ? Math.floor((building.researchProgress / building.researchTotal) * 100)
                : 0;

            const progressContainer = document.createElement('div');
            progressContainer.className = 'training-progress';
            progressContainer.innerHTML = `
                <div class="training-header">
                    <span class="training-icon">${researchConfig ? researchConfig.icon : '🔬'}</span>
                    <span class="training-text">Researching ${researchConfig ? researchConfig.name : ''}...</span>
                </div>
                <div class="training-bar-container">
                    <div class="training-bar-fill research-fill" style="width: ${pct}%"></div>
                </div>
                <div class="training-percent">${pct}%</div>
            `;
            this.optionsContainer.appendChild(progressContainer);
        }

        // Research section header
        const header = document.createElement('div');
        header.className = 'build-section-header';
        header.textContent = 'Research';
        this.optionsContainer.appendChild(header);

        const busy = building.researchActive || building.marketDayActive;

        // Show each research item
        for (const [key, researchDef] of Object.entries(MARKETPLACE_CONFIG.RESEARCH)) {
            const researched = building.isResearched(key);
            const meetsLevel = building.level >= researchDef.requiredLevel;

            if (researched) {
                // Already researched - show as completed
                const done = document.createElement('div');
                done.className = 'building-option disabled';
                done.innerHTML = `<span class="option-icon">${researchDef.icon}</span><span class="option-text">${researchDef.name}</span><span class="option-cost" style="color: #4a4;">Done</span>`;
                this.optionsContainer.appendChild(done);
            } else if (building.researchActive && building.researchType === key) {
                // Currently being researched - skip (shown as progress bar above)
            } else if (!meetsLevel) {
                // Requires higher building level
                const locked = document.createElement('div');
                locked.className = 'building-option disabled';
                locked.innerHTML = `<span class="option-icon">${researchDef.icon}</span><span class="option-text">${researchDef.name} (needs Lv${researchDef.requiredLevel})</span>`;
                this.optionsContainer.appendChild(locked);
            } else {
                // Available to research
                this.addOption({
                    icon: researchDef.icon,
                    text: `Research ${researchDef.name}`,
                    cost: researchDef.cost,
                    enabled: !busy && building.constructed && this.game.gold >= researchDef.cost,
                    onClick: () => this.startResearch(building, key)
                });
            }
        }

        // Market Day section (only if researched)
        if (building.researchedMarketDay) {
            const mdHeader = document.createElement('div');
            mdHeader.className = 'build-section-header';
            mdHeader.style.marginTop = '10px';
            mdHeader.textContent = 'Market Day';
            this.optionsContainer.appendChild(mdHeader);

            if (building.marketDayActive) {
                // Show Market Day progress bar
                const pct = building.marketDayTotal > 0
                    ? Math.floor((1 - building.marketDayProgress / building.marketDayTotal) * 100)
                    : 0;

                const progressContainer = document.createElement('div');
                progressContainer.className = 'training-progress';
                progressContainer.innerHTML = `
                    <div class="training-header">
                        <span class="training-icon">📈</span>
                        <span class="training-text">Market Day in progress...</span>
                    </div>
                    <div class="training-bar-container">
                        <div class="training-bar-fill market-day-fill" style="width: ${pct}%"></div>
                    </div>
                    <div class="training-percent">${pct}%</div>
                `;
                this.optionsContainer.appendChild(progressContainer);
            } else {
                // Show Market Day start button (free to run once researched)
                const goldReward = MARKETPLACE_CONFIG.getMarketDayGold(building.level);

                // Check for Elf Bungalow double bonus
                let hasElfBungalow = false;
                if (this.game.buildings) {
                    hasElfBungalow = this.game.buildings.some(
                        b => b.buildingType === BuildingType.ELF_BUNGALOW && b.team === 0 && b.constructed
                    );
                }
                const displayReward = hasElfBungalow ? goldReward * 2 : goldReward;
                const bonusText = hasElfBungalow ? ' (Elf x2!)' : '';

                const mdOption = document.createElement('div');
                mdOption.className = `building-option`;
                mdOption.innerHTML = `
                    <span class="option-icon">📈</span>
                    <span class="option-text">Start Market Day</span>
                    <span class="option-cost" style="color: #4a4;">+${displayReward}g${bonusText}</span>
                `;

                if (!busy && building.constructed) {
                    mdOption.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.startMarketDay(building);
                        this.updateMenu();
                    });
                } else {
                    mdOption.classList.add('disabled');
                }

                this.optionsContainer.appendChild(mdOption);
            }
        }

        // Items info section (show what's available after research)
        const hasAnyItem = building.researchedPotion || building.researchedRing || building.researchedAmulet;
        if (hasAnyItem) {
            const itemsHeader = document.createElement('div');
            itemsHeader.className = 'build-section-header';
            itemsHeader.style.marginTop = '10px';
            itemsHeader.textContent = 'Hero Shop Items';
            this.optionsContainer.appendChild(itemsHeader);

            const itemsInfo = document.createElement('div');
            itemsInfo.className = 'building-info';
            let html = '<div style="font-size: 11px; color: #aaa;">Heroes visit to buy:</div>';

            if (building.researchedPotion) {
                html += `<div>Cure Potion: ${ITEMS.HEALING_POTION.price}g (heals ${ITEMS.HEALING_POTION.healAmount} HP)</div>`;
            }
            if (building.researchedRing) {
                html += `<div>Ring of Protection: ${ITEMS.RING_OF_PROTECTION.price}g (+${ITEMS.RING_OF_PROTECTION.bonus} def)</div>`;
            }
            if (building.researchedAmulet) {
                html += `<div>Amulet of Teleport: ${ITEMS.AMULET_OF_TELEPORTATION.price}g</div>`;
            }

            itemsInfo.innerHTML = html;
            this.optionsContainer.appendChild(itemsInfo);
        }
    }

    /**
     * Start research at Marketplace (player pays treasury gold)
     */
    startResearch(building, researchType) {
        const config = MARKETPLACE_CONFIG.RESEARCH[researchType];
        if (!config) return;

        if (building.researchActive || building.marketDayActive) {
            this.game.showMessage('Marketplace is busy!');
            return;
        }

        if (this.game.gold < config.cost) {
            this.game.showMessage(`Need ${config.cost} gold!`);
            if (this.game.playSound) {
                this.game.playSound(SOUNDS.CLICK_DENY);
            }
            return;
        }

        if (building.startResearch(researchType)) {
            this.game.showMessage(`Researching ${config.name}...`);
            if (this.game.playSound) {
                this.game.playSound(SOUNDS.GOLD);
            }
            this.updateMenu();
        }
    }

    /**
     * Start Market Day at Marketplace (free once researched)
     */
    startMarketDay(building) {
        if (building.marketDayActive || building.researchActive) {
            this.game.showMessage('Marketplace is busy!');
            return;
        }

        if (building.startMarketDay()) {
            this.game.showMessage('Market Day started!');
            if (this.game.playSound) {
                this.game.playSound(SOUNDS.GOLD);
            }
            this.updateMenu();
        }
    }

    /**
     * Check if player has a specific building type
     */
    hasBuilding(buildingTypeName) {
        const typeMap = {
            'AGRELLA_TEMPLE': 0x24,  // TYPE_AGRELLA_TEMPLE from Const.smali
            'CRYPTA_TEMPLE': 0x25,
            'KROLM_TEMPLE': 0x26
        };

        const typeId = typeMap[buildingTypeName];
        if (!typeId) return false;

        return this.game.buildings.some(b => b.buildingType === typeId && b.team === 0);
    }

    /**
     * Count heroes of a specific type
     */
    countHeroesOfType(unitType) {
        return this.game.entities.filter(e =>
            e.team === 'player' &&
            e.unitType?.toUpperCase() === unitType &&
            e.isAlive?.()
        ).length;
    }
}

export { BUILDING_CONFIG };
