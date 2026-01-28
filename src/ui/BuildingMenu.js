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

// Buildings that can be constructed from the Castle
// Based on original game's getTypeFromMenuBuildings() in GameDialog.smali
const CONSTRUCTIBLE_BUILDINGS = [
    { type: BuildingType.WARRIOR_GUILD, name: 'Warrior Guild', cost: 800, icon: '⚔️', requiresCastleLevel: 1 },
    { type: BuildingType.RANGER_GUILD, name: 'Ranger Guild', cost: 700, icon: '🏹', requiresCastleLevel: 1 },
    { type: BuildingType.WIZARD_GUILD, name: 'Wizard Guild', cost: 1500, icon: '🔮', requiresCastleLevel: 1 },
    { type: BuildingType.BLACKSMITH, name: 'Blacksmith', cost: 500, icon: '🔨', requiresCastleLevel: 2 },
    { type: BuildingType.MARKETPLACE, name: 'Marketplace', cost: 1500, icon: '🏪', requiresCastleLevel: 1 },
    { type: BuildingType.GUARD_TOWER, name: 'Guard Tower', cost: 600, icon: '🗼', requiresCastleLevel: 1 },
    { type: BuildingType.AGRELLA_TEMPLE, name: 'Temple of Agrela', cost: 1500, icon: '☀️', requiresCastleLevel: 2, excludes: ['CRYPTA_TEMPLE', 'KROLM_TEMPLE'] },
    { type: BuildingType.CRYPTA_TEMPLE, name: 'Temple of Krypta', cost: 1000, icon: '💀', requiresCastleLevel: 2, excludes: ['AGRELLA_TEMPLE', 'KROLM_TEMPLE'] },
    { type: BuildingType.KROLM_TEMPLE, name: 'Temple of Krolm', cost: 1500, icon: '⚡', requiresCastleLevel: 2, excludes: ['AGRELLA_TEMPLE', 'CRYPTA_TEMPLE'] },
    { type: BuildingType.ELF_BUNGALOW, name: 'Elven Bungalow', cost: 750, icon: '🌿', requiresCastleLevel: 2, excludes: ['GNOME_HOVEL', 'DWARF_WINDMILL'] },
    { type: BuildingType.DWARF_WINDMILL, name: 'Dwarven Settlement', cost: 1250, icon: '⛏️', requiresCastleLevel: 2, excludes: ['GNOME_HOVEL', 'ELF_BUNGALOW'] },
    { type: BuildingType.GNOME_HOVEL, name: 'Gnome Hovel', cost: 100, icon: '🍄', requiresCastleLevel: 1, excludes: ['ELF_BUNGALOW', 'DWARF_WINDMILL'] },
    { type: BuildingType.LIBRARY, name: 'Library', cost: 600, icon: '📚', requiresCastleLevel: 2 },
    { type: BuildingType.INN, name: 'Inn', cost: 500, icon: '🍺', requiresCastleLevel: 1 },
];

// Building configuration - costs and options
// Using BuildingType hex values (0x20 = Castle, 0x21 = Warrior Guild, etc.)
const BUILDING_CONFIG = {
    // Castle (0x20)
    [BuildingType.CASTLE]: {
        name: 'Castle',
        canUpgrade: true,
        upgradeCost: [600, 1200, 2400],  // Cost per level
        maxLevel: 3,
        canBuild: true  // Castle can construct other buildings
    },
    // Warrior Guild (0x21)
    [BuildingType.WARRIOR_GUILD]: {
        name: 'Warrior Guild',
        canRecruit: true,
        recruitCost: 350,
        recruitUnit: 'WARRIOR',
        recruitName: 'Warrior',
        canUpgrade: true,
        upgradeCost: [800, 1600, 3200],
        maxLevel: 3,
        // Alternative hero (Paladin) available with Agrella Temple
        altRecruit: {
            name: 'Paladin',
            cost: 1000,
            unit: 'PALADIN',
            requires: 'AGRELLA_TEMPLE'
        }
    },
    // Ranger Guild (0x22)
    [BuildingType.RANGER_GUILD]: {
        name: 'Ranger Guild',
        canRecruit: true,
        recruitCost: 400,
        recruitUnit: 'RANGER',
        recruitName: 'Ranger',
        canUpgrade: true,
        upgradeCost: [700, 1400, 2800],
        maxLevel: 3
    },
    // Wizard Guild (0x23)
    [BuildingType.WIZARD_GUILD]: {
        name: 'Wizard Guild',
        canRecruit: true,
        recruitCost: 300,
        recruitUnit: 'WIZARD',
        recruitName: 'Wizard',
        canUpgrade: true,
        upgradeCost: [1500, 3000, 6000],
        maxLevel: 3,
        // Alternative heroes with temples
        altRecruit: {
            name: 'Healer',
            cost: 800,
            unit: 'HEALER',
            requires: 'AGRELLA_TEMPLE'
        },
        altRecruit2: {
            name: 'Necromancer',
            cost: 900,
            unit: 'NECROMANCER',
            requires: 'CRYPTA_TEMPLE'
        }
    },
    // Agrella Temple (0x24) - for healers
    [BuildingType.AGRELLA_TEMPLE]: {
        name: 'Temple of Agrela',
        canUpgrade: true,
        upgradeCost: [1000, 2000, 4000],
        maxLevel: 3
    },
    // Crypta Temple (0x25) - for necromancers
    [BuildingType.CRYPTA_TEMPLE]: {
        name: 'Temple of Krypta',
        canUpgrade: true,
        upgradeCost: [1000, 2000, 4000],
        maxLevel: 3
    },
    // Krolm Temple (0x26) - for barbarians
    [BuildingType.KROLM_TEMPLE]: {
        name: 'Temple of Krolm',
        canUpgrade: true,
        upgradeCost: [1000, 2000, 4000],
        maxLevel: 3
    },
    // Blacksmith (0x27)
    [BuildingType.BLACKSMITH]: {
        name: 'Blacksmith',
        canUpgradeWeapons: true,
        canUpgradeArmor: true,
        weaponUpgradeCost: [500, 1000, 2000],
        armorUpgradeCost: [500, 1000, 2000],
        maxWeaponLevel: 3,
        maxArmorLevel: 3
    },
    // Guard Tower (0x28)
    [BuildingType.GUARD_TOWER]: {
        name: 'Guard Tower',
        canUpgrade: true,
        upgradeCost: [400, 800, 1600],
        maxLevel: 3
    },
    // Marketplace (0x29)
    [BuildingType.MARKETPLACE]: {
        name: 'Marketplace',
        canUpgrade: true,
        upgradeCost: [1500, 3000, 6000],
        maxLevel: 3,
        // Generates tax income
        incomeBonus: [10, 20, 30]  // % bonus per level
    },
    // Elf Bungalow (0x2b)
    [BuildingType.ELF_BUNGALOW]: {
        name: 'Elven Bungalow',
        canRecruit: true,
        recruitCost: 450,
        recruitUnit: 'ELF',
        recruitName: 'Elf',
        canUpgrade: true,
        upgradeCost: [800, 1600],
        maxLevel: 2
    },
    // Dwarf Windmill (0x2c)
    [BuildingType.DWARF_WINDMILL]: {
        name: 'Dwarven Settlement',
        canRecruit: true,
        recruitCost: 500,
        recruitUnit: 'DWARF',
        recruitName: 'Dwarf',
        canUpgrade: true,
        upgradeCost: [1000, 2000],
        maxLevel: 2
    },
    // Gnome Hovel (0x2e)
    [BuildingType.GNOME_HOVEL]: {
        name: 'Gnome Hovel',
        canRecruit: true,
        recruitCost: 450,
        recruitUnit: 'GNOME',
        recruitName: 'Gnome',
        canUpgrade: true,
        upgradeCost: [800, 1600],
        maxLevel: 2
    },
    // Inn (0x30)
    [BuildingType.INN]: {
        name: 'Inn',
        canUpgrade: true,
        upgradeCost: [500, 1000],
        maxLevel: 2
    },
    // Library (0x31)
    [BuildingType.LIBRARY]: {
        name: 'Library',
        canUpgrade: true,
        upgradeCost: [1500, 3000],
        maxLevel: 2
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

        // Close on click outside (but not when clicking in the left panel or game)
        document.addEventListener('click', (e) => {
            if (this.visible && this.menuElement &&
                !this.menuElement.contains(e.target) &&
                !e.target.closest('#game-container') &&
                !e.target.closest('#left-panel')) {
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

        // Recruit option
        if (config.canRecruit) {
            this.addOption({
                icon: '⚔️',
                text: `Recruit ${config.recruitName}`,
                cost: config.recruitCost,
                enabled: this.game.gold >= config.recruitCost,
                onClick: () => this.recruitHero(config.recruitUnit, config.recruitCost)
            });

            // Alternative recruit (e.g., Paladin from Warrior Guild)
            if (config.altRecruit && this.hasBuilding(config.altRecruit.requires)) {
                this.addOption({
                    icon: '🛡️',
                    text: `Recruit ${config.altRecruit.name}`,
                    cost: config.altRecruit.cost,
                    enabled: this.game.gold >= config.altRecruit.cost,
                    onClick: () => this.recruitHero(config.altRecruit.unit, config.altRecruit.cost)
                });
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

        // Blacksmith special options
        if (config.canUpgradeWeapons) {
            const weaponLevel = this.game.weaponUpgradeLevel || 0;
            if (weaponLevel < config.maxWeaponLevel) {
                const cost = config.weaponUpgradeCost[weaponLevel];
                this.addOption({
                    icon: '🗡️',
                    text: `Upgrade Weapons (Lv${weaponLevel + 1})`,
                    cost: cost,
                    enabled: this.game.gold >= cost,
                    onClick: () => this.upgradeWeapons(cost)
                });
            }
        }

        if (config.canUpgradeArmor) {
            const armorLevel = this.game.armorUpgradeLevel || 0;
            if (armorLevel < config.maxArmorLevel) {
                const cost = config.armorUpgradeCost[armorLevel];
                this.addOption({
                    icon: '🛡️',
                    text: `Upgrade Armor (Lv${armorLevel + 1})`,
                    cost: cost,
                    enabled: this.game.gold >= cost,
                    onClick: () => this.upgradeArmor(cost)
                });
            }
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
            option.addEventListener('click', () => {
                onClick();
                this.updateMenu();
            });
        }

        this.optionsContainer.appendChild(option);
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

        // Filter available buildings based on castle level and exclusions
        const availableBuildings = CONSTRUCTIBLE_BUILDINGS.filter(bldg => {
            // Check castle level requirement
            if (castle.level < bldg.requiresCastleLevel) {
                return false;
            }

            // Check if already built (most buildings can only be built once)
            const alreadyBuilt = this.game.buildings.some(b =>
                b.buildingType === bldg.type && b.team === 0
            );
            if (alreadyBuilt) {
                return false;
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
                option.addEventListener('click', () => {
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
        // Hide the menu
        this.hide();

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
     * Recruit a hero from the building
     */
    recruitHero(unitType, cost) {
        if (this.game.gold < cost) {
            this.game.showMessage(`Need ${cost} gold!`);
            if (this.game.playSound) {
                this.game.playSound(SOUNDS.CLICK_DENY);
            }
            return;
        }

        // Find spawn position near building
        const spawnPos = this.game.findSpawnPositionNearBuilding(this.currentBuilding);

        if (spawnPos) {
            this.game.gold -= cost;
            this.game.spawnHero(unitType, spawnPos.i, spawnPos.j);

            const config = BUILDING_CONFIG[this.currentBuilding.buildingType];
            const heroName = config ? config.recruitName : unitType;
            this.game.showMessage(`${heroName} recruited!`);

            // Play sound
            if (this.game.playSound) {
                this.game.playSound(SOUNDS.GOLD);
            }

            console.log(`Recruited ${unitType} for ${cost} gold`);
        } else {
            this.game.showMessage('No space to spawn hero!');
        }
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

        // Increase building stats
        this.currentBuilding.maxHealth += 100;
        this.currentBuilding.health = this.currentBuilding.maxHealth;

        this.game.showMessage(`${this.currentBuilding.getName()} upgraded to level ${this.currentBuilding.level}!`);

        // Play upgrade sound
        if (this.game.playSound) {
            this.game.playSound(SOUNDS.BUILDING_UPGRADED);
        }

        console.log(`Upgraded ${this.currentBuilding.getName()} to level ${this.currentBuilding.level}`);
    }

    /**
     * Upgrade weapons (Blacksmith)
     */
    upgradeWeapons(cost) {
        if (this.game.gold < cost) {
            this.game.showMessage(`Need ${cost} gold!`);
            if (this.game.playSound) {
                this.game.playSound(SOUNDS.CLICK_DENY);
            }
            return;
        }

        this.game.gold -= cost;
        this.game.weaponUpgradeLevel = (this.game.weaponUpgradeLevel || 0) + 1;

        // Apply damage bonus to all heroes
        const damageBonus = 3;  // +3 damage per level
        for (const entity of this.game.entities) {
            if (entity.team === 'player') {
                entity.damage = (entity.baseDamage || entity.damage) + (this.game.weaponUpgradeLevel * damageBonus);
            }
        }

        this.game.showMessage(`Weapons upgraded! All heroes +${damageBonus} damage`);

        // Play upgrade sound
        if (this.game.playSound) {
            this.game.playSound(SOUNDS.UPGRADE_COMPLETE);
        }

        console.log(`Weapon upgrade level ${this.game.weaponUpgradeLevel}`);
    }

    /**
     * Upgrade armor (Blacksmith)
     */
    upgradeArmor(cost) {
        if (this.game.gold < cost) {
            this.game.showMessage(`Need ${cost} gold!`);
            if (this.game.playSound) {
                this.game.playSound(SOUNDS.CLICK_DENY);
            }
            return;
        }

        this.game.gold -= cost;
        this.game.armorUpgradeLevel = (this.game.armorUpgradeLevel || 0) + 1;

        // Apply armor bonus to all heroes
        const armorBonus = 2;  // +2 armor per level
        for (const entity of this.game.entities) {
            if (entity.team === 'player') {
                entity.armor = (entity.baseArmor || entity.armor || 0) + (this.game.armorUpgradeLevel * armorBonus);
            }
        }

        this.game.showMessage(`Armor upgraded! All heroes +${armorBonus} armor`);

        // Play upgrade sound
        if (this.game.playSound) {
            this.game.playSound(SOUNDS.UPGRADE_COMPLETE);
        }

        console.log(`Armor upgrade level ${this.game.armorUpgradeLevel}`);
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
