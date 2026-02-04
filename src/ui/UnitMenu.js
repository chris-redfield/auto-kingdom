/**
 * UnitMenu - Popup menu for hero unit interactions
 *
 * Shows when clicking on player heroes:
 * - Stats display (STR, INT, VIT, etc.)
 * - Equipment levels and upgrades
 * - Inventory items (potions, accessories)
 * - XP and level progress
 */

import { EQUIPMENT, ITEMS, ATTACK_TYPE, getWeaponID } from '../config/GameConfig.js';
import { SOUNDS } from '../audio/SoundConstants.js';
import { getWeaponName, getArmorName } from '../entities/Inventory.js';

export class UnitMenu {
    constructor(game) {
        this.game = game;
        this.currentUnit = null;
        this.visible = false;

        // Get DOM elements
        this.menuElement = document.getElementById('unit-menu');
        this.titleElement = document.getElementById('unit-menu-title');
        this.healthBar = document.getElementById('unit-health-fill');
        this.healthText = document.getElementById('unit-health-text');
        this.xpBar = document.getElementById('unit-xp-fill');
        this.levelText = document.getElementById('unit-level');
        this.statsContainer = document.getElementById('unit-stats-display');
        this.optionsContainer = document.getElementById('unit-options');

        // Create menu if it doesn't exist yet
        if (!this.menuElement) {
            console.warn('Unit menu HTML not found, menu will not display');
            return;
        }

        // Close button handler
        const closeBtn = document.getElementById('unit-menu-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }

        // Close on click outside
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
     * Show menu for a unit
     */
    show(unit) {
        if (!this.menuElement) return;

        this.currentUnit = unit;
        this.visible = true;

        // Get unit name
        const unitName = unit.unitType ?
            unit.unitType.charAt(0).toUpperCase() + unit.unitType.slice(1) : 'Hero';

        // Update title
        this.titleElement.textContent = unitName;

        // Update health bar
        const healthPct = (unit.health / unit.maxHealth) * 100;
        this.healthBar.style.width = `${healthPct}%`;
        this.healthText.textContent = `${Math.ceil(unit.health)}/${unit.maxHealth}`;

        // Update XP bar
        if (unit.levelUpXp && unit.levelUpXp > 0) {
            const currentXp = (unit.experience || 0) - (unit.prevExp || 0);
            const xpPct = Math.min(100, (currentXp / unit.levelUpXp) * 100);
            this.xpBar.style.width = `${xpPct}%`;
        } else {
            this.xpBar.style.width = '0%';
        }

        // Update level
        this.levelText.textContent = `Level ${unit.level || 1}`;

        // Update stats display
        this.updateStatsDisplay(unit);

        // Clear and rebuild options
        this.optionsContainer.innerHTML = '';
        this.buildMenuOptions(unit);

        // Show menu
        this.menuElement.classList.add('visible');
    }

    /**
     * Hide the menu
     */
    hide() {
        if (!this.menuElement) return;

        this.visible = false;
        this.currentUnit = null;
        this.menuElement.classList.remove('visible');
    }

    /**
     * Update stats display section
     */
    updateStatsDisplay(unit) {
        if (!this.statsContainer) return;

        let html = '<div class="stats-grid">';

        // Combat stats row 1
        html += '<div class="stat-item"><span class="stat-label">STR</span><span class="stat-value">' + (unit.strength || 10) + '</span></div>';
        html += '<div class="stat-item"><span class="stat-label">INT</span><span class="stat-value">' + (unit.intelligence || 10) + '</span></div>';
        html += '<div class="stat-item"><span class="stat-label">VIT</span><span class="stat-value">' + (unit.vitality || 10) + '</span></div>';
        html += '<div class="stat-item"><span class="stat-label">ART</span><span class="stat-value">' + (unit.artifice || 10) + '</span></div>';

        // Combat stats row 2
        html += '<div class="stat-item"><span class="stat-label">H2H</span><span class="stat-value">' + (unit.H2H || 0) + '</span></div>';
        html += '<div class="stat-item"><span class="stat-label">RNG</span><span class="stat-value">' + (unit.ranged || 0) + '</span></div>';
        html += '<div class="stat-item"><span class="stat-label">PAR</span><span class="stat-value">' + (unit.parry || 0) + '</span></div>';
        html += '<div class="stat-item"><span class="stat-label">DOD</span><span class="stat-value">' + (unit.dodge || 0) + '</span></div>';

        html += '</div>';

        // Combat values
        html += '<div class="combat-stats">';
        html += '<div class="combat-row"><span>Damage:</span><span class="damage">' + (unit.minDamage || 5) + '-' + (unit.maxDamage || 15) + '</span></div>';
        html += '<div class="combat-row"><span>Armor:</span><span class="defense">' + (unit.getTotalArmor ? unit.getTotalArmor() : (unit.armor || 0)) + '</span></div>';
        html += '<div class="combat-row"><span>Resist:</span><span>' + (unit.resist || 0) + '</span></div>';
        html += '</div>';

        // Gold
        const totalGold = (unit.gold || 0) + (unit.taxGold || 0);
        html += '<div class="gold-display"><span>Gold:</span><span class="gold-value">' + totalGold + '</span></div>';

        this.statsContainer.innerHTML = html;
    }

    /**
     * Build menu options based on unit state
     */
    buildMenuOptions(unit) {
        // Equipment section
        this.addEquipmentSection(unit);

        // Potions section
        this.addPotionsSection(unit);

        // Accessories section
        this.addAccessoriesSection(unit);

        // Info section
        this.addInfoSection(unit);
    }

    /**
     * Add equipment section (weapon/armor)
     */
    addEquipmentSection(unit) {
        const header = document.createElement('div');
        header.className = 'unit-section-header';
        header.textContent = 'Equipment';
        this.optionsContainer.appendChild(header);

        const inventory = unit.inventory;
        const weaponLevel = inventory ? inventory.weaponLevel : (unit.weaponLevel || 1);
        const armorLevel = inventory ? inventory.armorLevel : (unit.armorLevel || 1);
        const enchantW = inventory ? inventory.enchantedWeaponLevel : 0;
        const enchantA = inventory ? inventory.enchantedArmorLevel : 0;

        // Current weapon
        const weaponName = getWeaponName(weaponLevel, unit.unitType);
        const enchantWText = enchantW > 0 ? ` +${enchantW}` : '';
        this.addInfoRow('Weapon', `${weaponName}${enchantWText}`, 'weapon-icon');

        // Current armor
        const armorName = getArmorName(armorLevel, unit.unitType);
        const enchantAText = enchantA > 0 ? ` +${enchantA}` : '';
        this.addInfoRow('Armor', `${armorName}${enchantAText}`, 'armor-icon');

        // Upgrade options (if near blacksmith)
        if (this.isNearBlacksmith(unit)) {
            const canUpgradeWeapon = weaponLevel < EQUIPMENT.WEAPON_UPGRADE_PRICES.length;
            const canUpgradeArmor = armorLevel < EQUIPMENT.ARMOR_UPGRADE_PRICES.length;

            if (canUpgradeWeapon) {
                const cost = EQUIPMENT.WEAPON_UPGRADE_PRICES[weaponLevel];
                const canAfford = (unit.gold || 0) >= cost;
                this.addOption({
                    icon: '🗡️',
                    text: 'Upgrade Weapon',
                    cost: cost,
                    enabled: canAfford,
                    onClick: () => this.upgradeWeapon(unit, cost)
                });
            }

            if (canUpgradeArmor) {
                const cost = EQUIPMENT.ARMOR_UPGRADE_PRICES[armorLevel];
                const canAfford = (unit.gold || 0) >= cost;
                this.addOption({
                    icon: '🛡️',
                    text: 'Upgrade Armor',
                    cost: cost,
                    enabled: canAfford,
                    onClick: () => this.upgradeArmor(unit, cost)
                });
            }
        }

        // Enchant options (if near library)
        if (this.isNearLibrary(unit)) {
            if (enchantW < 3) {
                const cost = 200;
                const canAfford = (unit.gold || 0) >= cost;
                this.addOption({
                    icon: '✨',
                    text: `Enchant Weapon (+${enchantW + 1})`,
                    cost: cost,
                    enabled: canAfford,
                    onClick: () => this.enchantWeapon(unit, cost)
                });
            }

            if (enchantA < 3) {
                const cost = 200;
                const canAfford = (unit.gold || 0) >= cost;
                this.addOption({
                    icon: '🔮',
                    text: `Enchant Armor (+${enchantA + 1})`,
                    cost: cost,
                    enabled: canAfford,
                    onClick: () => this.enchantArmor(unit, cost)
                });
            }
        }
    }

    /**
     * Add potions section
     */
    addPotionsSection(unit) {
        const header = document.createElement('div');
        header.className = 'unit-section-header';
        header.textContent = 'Potions';
        this.optionsContainer.appendChild(header);

        const inventory = unit.inventory;
        const healingPotions = inventory ? inventory.healingPotions : 0;
        const curePotions = inventory ? inventory.curePotions : 0;

        // Current potions
        this.addInfoRow('Healing', healingPotions.toString(), 'potion-icon');
        this.addInfoRow('Cure', curePotions.toString(), 'potion-icon');

        // Buy options (if near marketplace)
        if (this.isNearMarketplace(unit)) {
            const potionCost = ITEMS.HEALING_POTION.price;
            const canAfford = (unit.gold || 0) >= potionCost;

            this.addOption({
                icon: '❤️',
                text: 'Buy Healing Potion',
                cost: potionCost,
                enabled: canAfford,
                onClick: () => this.buyHealingPotion(unit, potionCost)
            });

            this.addOption({
                icon: '💚',
                text: 'Buy Cure Potion',
                cost: potionCost,
                enabled: canAfford,
                onClick: () => this.buyCurePotion(unit, potionCost)
            });
        }

        // Use options (always available if has potions)
        if (healingPotions > 0 && unit.health < unit.maxHealth) {
            this.addOption({
                icon: '🧪',
                text: 'Use Healing Potion',
                cost: 0,
                enabled: true,
                onClick: () => this.useHealingPotion(unit)
            });
        }

        if (curePotions > 0 && unit.isPoisoned) {
            this.addOption({
                icon: '💊',
                text: 'Use Cure Potion',
                cost: 0,
                enabled: true,
                onClick: () => this.useCurePotion(unit)
            });
        }
    }

    /**
     * Add accessories section
     */
    addAccessoriesSection(unit) {
        const header = document.createElement('div');
        header.className = 'unit-section-header';
        header.textContent = 'Accessories';
        this.optionsContainer.appendChild(header);

        const inventory = unit.inventory;
        const hasRing = inventory ? inventory.hasRingOfProtection : false;
        const hasAmulet = inventory ? inventory.hasAmuletOfTeleportation : false;
        const hasPoison = inventory ? inventory.hasPoisonedWeapon : false;

        // Show owned accessories
        if (hasRing) {
            this.addInfoRow('Ring', 'Ring of Protection', 'ring-icon');
        }
        if (hasAmulet) {
            const cooldown = inventory ? inventory.amuletCooldown : 0;
            const cooldownText = cooldown > 0 ? ` (${Math.ceil(cooldown / 25)}s)` : ' (Ready)';
            this.addInfoRow('Amulet', `Teleportation${cooldownText}`, 'amulet-icon');
        }
        if (hasPoison) {
            this.addInfoRow('Coating', 'Poison Weapon', 'poison-icon');
        }

        // Buy options (if near marketplace)
        if (this.isNearMarketplace(unit)) {
            if (!hasRing) {
                const cost = ITEMS.RING_OF_PROTECTION.price;
                const canAfford = (unit.gold || 0) >= cost;
                this.addOption({
                    icon: '💍',
                    text: 'Buy Ring of Protection',
                    cost: cost,
                    enabled: canAfford,
                    onClick: () => this.buyRingOfProtection(unit, cost)
                });
            }

            if (!hasAmulet) {
                const cost = ITEMS.AMULET_OF_TELEPORTATION.price;
                const canAfford = (unit.gold || 0) >= cost;
                this.addOption({
                    icon: '📿',
                    text: 'Buy Amulet of Teleportation',
                    cost: cost,
                    enabled: canAfford,
                    onClick: () => this.buyAmuletOfTeleportation(unit, cost)
                });
            }

            if (!hasPoison) {
                const cost = ITEMS.POISONED_WEAPON.price;
                const canAfford = (unit.gold || 0) >= cost;
                this.addOption({
                    icon: '☠️',
                    text: 'Buy Poison Coating',
                    cost: cost,
                    enabled: canAfford,
                    onClick: () => this.buyPoisonedWeapon(unit, cost)
                });
            }
        }

        // Use amulet (if owned and ready)
        if (hasAmulet && inventory && inventory.amuletCooldown <= 0) {
            this.addOption({
                icon: '🌀',
                text: 'Teleport to Castle',
                cost: 0,
                enabled: true,
                onClick: () => this.useTeleportAmulet(unit)
            });
        }
    }

    /**
     * Add info section
     */
    addInfoSection(unit) {
        const info = document.createElement('div');
        info.className = 'unit-info';

        // Attack type
        let attackType = 'Melee';
        if (unit.attackType === ATTACK_TYPE.RANGED) attackType = 'Ranged';
        else if (unit.attackType === ATTACK_TYPE.MAGIC) attackType = 'Magic';

        // Kills
        const kills = unit.kills || 0;

        info.innerHTML = `
            <div>Attack Type: ${attackType}</div>
            <div>Total Kills: ${kills}</div>
        `;

        this.optionsContainer.appendChild(info);
    }

    /**
     * Add an info row (non-interactive)
     */
    addInfoRow(label, value, iconClass) {
        const row = document.createElement('div');
        row.className = 'unit-info-row';
        row.innerHTML = `
            <span class="info-label">${label}:</span>
            <span class="info-value">${value}</span>
        `;
        this.optionsContainer.appendChild(row);
    }

    /**
     * Add an option button to the menu
     */
    addOption({ icon, text, cost, enabled, onClick }) {
        const option = document.createElement('div');
        option.className = `unit-option ${enabled ? '' : 'disabled'}`;

        const costText = cost > 0 ? `${cost}g` : 'Free';
        option.innerHTML = `
            <span class="option-icon">${icon}</span>
            <span class="option-text">${text}</span>
            <span class="option-cost">${costText}</span>
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
     * Update menu after an action
     */
    updateMenu() {
        if (this.currentUnit && this.currentUnit.isAlive && this.currentUnit.isAlive()) {
            this.show(this.currentUnit);
        } else {
            this.hide();
        }
    }

    /**
     * Light update - just refresh bars and stats without rebuilding options
     * Called periodically from game loop for real-time updates
     */
    update() {
        if (!this.visible || !this.currentUnit) return;

        const unit = this.currentUnit;

        // Check if unit is still alive
        if (!unit.isAlive || !unit.isAlive()) {
            this.hide();
            return;
        }

        // Update health bar
        const healthPct = (unit.health / unit.maxHealth) * 100;
        if (this.healthBar) {
            this.healthBar.style.width = `${healthPct}%`;
        }
        if (this.healthText) {
            this.healthText.textContent = `${Math.ceil(unit.health)}/${unit.maxHealth}`;
        }

        // Update XP bar
        if (this.xpBar && unit.levelUpXp && unit.levelUpXp > 0) {
            const currentXp = (unit.experience || 0) - (unit.prevExp || 0);
            const xpPct = Math.min(100, (currentXp / unit.levelUpXp) * 100);
            this.xpBar.style.width = `${xpPct}%`;
        }

        // Update level
        if (this.levelText) {
            this.levelText.textContent = `Level ${unit.level || 1}`;
        }

        // Update stats display (includes gold)
        this.updateStatsDisplay(unit);
    }

    // =========================================================================
    // PROXIMITY CHECKS
    // =========================================================================

    isNearBlacksmith(unit) {
        return this.isNearBuildingType(unit, 0x27);  // TYPE_BLACKSMITH
    }

    isNearMarketplace(unit) {
        return this.isNearBuildingType(unit, 0x29);  // TYPE_MARKETPLACE
    }

    isNearLibrary(unit) {
        return this.isNearBuildingType(unit, 0x31);  // TYPE_LIBRARY
    }

    isNearBuildingType(unit, buildingType) {
        if (!this.game.buildings) return false;

        const range = 5;  // Grid cells
        for (const building of this.game.buildings) {
            if (building.buildingType === buildingType && building.team === 0) {
                const di = Math.abs(unit.gridI - building.gridI);
                const dj = Math.abs(unit.gridJ - building.gridJ);
                if (di <= range && dj <= range) {
                    return true;
                }
            }
        }
        return false;
    }

    // =========================================================================
    // ACTIONS
    // =========================================================================

    upgradeWeapon(unit, cost) {
        let upgraded = false;
        if (unit.inventory) {
            if (unit.inventory.upgradeWeapon()) {
                upgraded = true;
            }
        } else if (unit.gold >= cost) {
            unit.gold -= cost;
            unit.weaponLevel = (unit.weaponLevel || 1) + 1;
            // Update weapon ID for damage calculation (like inventory does)
            unit.weapon = getWeaponID(unit.unitTypeId, unit.weaponLevel);
            unit.calculateDamageFromStats();
            upgraded = true;
        }

        if (upgraded) {
            this.game.showMessage('Weapon upgraded!');
            this.playSound(SOUNDS.UPGRADE_COMPLETE);
            // Refresh display to show new stats
            this.showForUnit(unit);
        }
    }

    upgradeArmor(unit, cost) {
        let upgraded = false;
        if (unit.inventory) {
            if (unit.inventory.upgradeArmor()) {
                upgraded = true;
            }
        } else if (unit.gold >= cost) {
            unit.gold -= cost;
            unit.armorLevel = (unit.armorLevel || 1) + 1;
            upgraded = true;
        }

        if (upgraded) {
            this.game.showMessage('Armor upgraded!');
            this.playSound(SOUNDS.UPGRADE_COMPLETE);
            // Refresh display to show new stats
            this.showForUnit(unit);
        }
    }

    enchantWeapon(unit, cost) {
        if (unit.inventory && unit.inventory.enchantWeapon()) {
            this.game.showMessage('Weapon enchanted!');
            this.playSound(SOUNDS.UPGRADE_COMPLETE);
        }
    }

    enchantArmor(unit, cost) {
        if (unit.inventory && unit.inventory.enchantArmor()) {
            this.game.showMessage('Armor enchanted!');
            this.playSound(SOUNDS.UPGRADE_COMPLETE);
        }
    }

    buyHealingPotion(unit, cost) {
        if (unit.inventory && unit.inventory.buyHealingPotion()) {
            this.game.showMessage('Bought healing potion!');
            this.playSound(SOUNDS.GOLD);
        }
    }

    buyCurePotion(unit, cost) {
        if (unit.inventory && unit.inventory.buyCurePotion()) {
            this.game.showMessage('Bought cure potion!');
            this.playSound(SOUNDS.GOLD);
        }
    }

    useHealingPotion(unit) {
        if (unit.inventory && unit.inventory.useHealingPotion()) {
            this.game.showMessage('Used healing potion!');
            this.playSound(SOUNDS.HEAL);
        }
    }

    useCurePotion(unit) {
        if (unit.inventory && unit.inventory.useCurePotion()) {
            this.game.showMessage('Poison cured!');
            this.playSound(SOUNDS.HEAL);
        }
    }

    buyRingOfProtection(unit, cost) {
        if (unit.inventory && unit.inventory.buyRingOfProtection()) {
            this.game.showMessage('Bought Ring of Protection!');
            this.playSound(SOUNDS.GOLD);
        }
    }

    buyAmuletOfTeleportation(unit, cost) {
        if (unit.inventory && unit.inventory.buyAmuletOfTeleportation()) {
            this.game.showMessage('Bought Amulet of Teleportation!');
            this.playSound(SOUNDS.GOLD);
        }
    }

    buyPoisonedWeapon(unit, cost) {
        if (unit.inventory && unit.inventory.buyPoisonedWeapon()) {
            this.game.showMessage('Weapon coated with poison!');
            this.playSound(SOUNDS.GOLD);
        }
    }

    useTeleportAmulet(unit) {
        if (unit.inventory) {
            const castle = this.game.playerCastle ||
                this.game.buildings?.find(b => b.buildingType === 0x20 && b.team === 0);

            if (unit.inventory.useAmuletOfTeleportation(castle)) {
                this.game.showMessage('Teleported to castle!');
                this.playSound(SOUNDS.TELEPORT);
            }
        }
    }

    playSound(soundId) {
        if (this.game.playSound) {
            this.game.playSound(soundId);
        }
    }
}
