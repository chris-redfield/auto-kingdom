/**
 * Inventory.js - Hero inventory and equipment system
 *
 * Manages:
 * - Equipment slots (weapon, armor)
 * - Consumable items (potions)
 * - Accessories (rings, amulets)
 */

import { EQUIPMENT, ITEMS, getWeaponID, BLACKSMITH_CONFIG, ENCHANT_CONFIG } from '../config/GameConfig.js';

/**
 * Inventory class for managing hero equipment and items
 */
export class Inventory {
    constructor(owner) {
        this.owner = owner;  // The DynamicEntity that owns this inventory

        // Equipment levels (1-6 typically, representing upgrade tiers)
        this.weaponLevel = 1;
        this.armorLevel = 1;

        // Enchantment levels (0-3 typically)
        this.enchantedWeaponLevel = 0;
        this.enchantedArmorLevel = 0;

        // Consumables
        this.healingPotions = 0;
        this.curePotions = 0;

        // Accessories (boolean flags for unique items)
        this.hasRingOfProtection = false;
        this.hasAmuletOfTeleportation = false;
        this.hasPoisonedWeapon = false;

        // Amulet cooldown (in ticks)
        this.amuletCooldown = 0;
        this.amuletMaxCooldown = 9999;  // ~400 seconds at 25 ticks/sec
    }

    // =========================================================================
    // WEAPON METHODS
    // =========================================================================

    /**
     * Get current weapon damage bonus
     */
    getWeaponDamageBonus() {
        const baseBonus = (this.weaponLevel - 1) * 2;
        const enchantBonus = this.enchantedWeaponLevel * EQUIPMENT.WEAPON_ENCHANT_DAMAGE_BONUS;
        return baseBonus + enchantBonus;
    }

    /**
     * Upgrade weapon to next level
     * @returns {boolean} Success
     */
    upgradeWeapon() {
        // HERO_WEAPON_PRICES is 0-indexed: [0]=lv1→2, [1]=lv2→3, [2]=lv3→4
        const priceIndex = this.weaponLevel - 1;
        if (priceIndex >= BLACKSMITH_CONFIG.HERO_WEAPON_PRICES.length) {
            return false;  // Already max level
        }

        const price = BLACKSMITH_CONFIG.HERO_WEAPON_PRICES[priceIndex];
        if (this.owner.gold >= price) {
            this.owner.gold -= price;
            this.weaponLevel++;
            // Sync weapon level to owner and update weapon ID for damage calculation
            this.owner.weaponLevel = this.weaponLevel;
            this.owner.weapon = getWeaponID(this.owner.unitTypeId, this.weaponLevel);
            this.owner.calculateDamageFromStats();
            return true;
        }
        return false;
    }

    /**
     * Enchant weapon at Wizard Guild
     * From smali getEnchantWeapon(): loops from guildLevel down to 1,
     * picks highest level hero can afford (level * 200g check), pays flat 200g.
     * @param {number} guildLevel - The Wizard Guild's building level (caps enchant)
     * @returns {boolean} Success
     */
    enchantWeapon(guildLevel) {
        const maxLevel = Math.min(guildLevel || 1, ENCHANT_CONFIG.MAX_LEVEL);
        if (this.enchantedWeaponLevel >= maxLevel) return false;

        const totalGold = (this.owner.gold || 0) + (this.owner.taxGold || 0);

        // Find highest affordable level (smali: loop from guildLevel down to 1, cost = level * 200)
        let targetLevel = -1;
        for (let lvl = maxLevel; lvl >= 1; lvl--) {
            if (lvl <= this.enchantedWeaponLevel) break; // No improvement possible
            if (totalGold >= lvl * ENCHANT_CONFIG.ENCHANT_PRICE) {
                targetLevel = lvl;
                break;
            }
        }
        if (targetLevel < 0) return false;

        this.owner.spendGold(ENCHANT_CONFIG.ENCHANT_PRICE);  // Always pays flat 200g
        this.enchantedWeaponLevel = targetLevel;
        this.owner.enchantedWeaponLevel = targetLevel;  // Sync to owner
        this.owner.calculateDamageFromStats();
        return true;
    }

    // =========================================================================
    // ARMOR METHODS
    // =========================================================================

    /**
     * Get current armor defense bonus
     */
    getArmorDefenseBonus() {
        const baseBonus = (this.armorLevel - 1) * 3;
        const enchantBonus = this.enchantedArmorLevel * EQUIPMENT.ARMOR_ENCHANT_DEFENSE_BONUS;
        return baseBonus + enchantBonus;
    }

    /**
     * Upgrade armor to next level
     * @returns {boolean} Success
     */
    upgradeArmor() {
        // HERO_ARMOR_PRICES is 0-indexed: [0]=lv1→2, [1]=lv2→3, [2]=lv3→4
        const priceIndex = this.armorLevel - 1;
        if (priceIndex >= BLACKSMITH_CONFIG.HERO_ARMOR_PRICES.length) {
            return false;
        }

        const price = BLACKSMITH_CONFIG.HERO_ARMOR_PRICES[priceIndex];
        if (this.owner.gold >= price) {
            this.owner.gold -= price;
            this.armorLevel++;
            // Sync armor level to owner for getTotalArmor calculation
            this.owner.armorLevel = this.armorLevel;
            return true;
        }
        return false;
    }

    /**
     * Enchant armor at Wizard Guild
     * From smali getEnchantArmor(): loops from guildLevel down to 1,
     * picks highest level hero can afford (level * 200g check), pays flat 200g.
     * Note: Wizards (type 4) cannot enchant armor (smali: getEnchantArmor returns -1)
     * @param {number} guildLevel - The Wizard Guild's building level (caps enchant)
     * @returns {boolean} Success
     */
    enchantArmor(guildLevel) {
        const maxLevel = Math.min(guildLevel || 1, ENCHANT_CONFIG.MAX_LEVEL);
        if (this.enchantedArmorLevel >= maxLevel) return false;

        const totalGold = (this.owner.gold || 0) + (this.owner.taxGold || 0);

        // Find highest affordable level (smali: loop from guildLevel down to 1, cost = level * 200)
        let targetLevel = -1;
        for (let lvl = maxLevel; lvl >= 1; lvl--) {
            if (lvl <= this.enchantedArmorLevel) break; // No improvement possible
            if (totalGold >= lvl * ENCHANT_CONFIG.ENCHANT_PRICE) {
                targetLevel = lvl;
                break;
            }
        }
        if (targetLevel < 0) return false;

        this.owner.spendGold(ENCHANT_CONFIG.ENCHANT_PRICE);  // Always pays flat 200g
        this.enchantedArmorLevel = targetLevel;
        this.owner.enchantedArmorLevel = targetLevel;  // Sync to owner
        return true;
    }

    // =========================================================================
    // POTION METHODS
    // =========================================================================

    /**
     * Buy healing potion
     * @returns {boolean} Success
     */
    buyHealingPotion() {
        if (this.healingPotions >= 5) return false; // Max 5 potions per hero
        const price = ITEMS.HEALING_POTION.price;
        const totalGold = (this.owner.gold || 0) + (this.owner.taxGold || 0);
        if (totalGold >= price) {
            this.owner.spendGold(price);
            this.healingPotions++;
            return true;
        }
        return false;
    }

    /**
     * Use healing potion
     * @returns {boolean} Success
     */
    useHealingPotion() {
        if (this.healingPotions <= 0) return false;
        if (this.owner.health >= this.owner.maxHealth) return false;

        this.healingPotions--;
        const healAmount = ITEMS.HEALING_POTION.healAmount;
        this.owner.health = Math.min(
            this.owner.maxHealth,
            this.owner.health + healAmount
        );
        return true;
    }

    /**
     * Buy cure potion (cures poison)
     */
    buyCurePotion() {
        const price = ITEMS.HEALING_POTION.price;  // Same price
        const totalGold = (this.owner.gold || 0) + (this.owner.taxGold || 0);
        if (totalGold >= price) {
            this.owner.spendGold(price);
            this.curePotions++;
            return true;
        }
        return false;
    }

    /**
     * Use cure potion
     */
    useCurePotion() {
        if (this.curePotions <= 0) return false;
        if (!this.owner.isPoisoned) return false;

        this.curePotions--;
        this.owner.isPoisoned = false;
        return true;
    }

    // =========================================================================
    // ACCESSORY METHODS
    // =========================================================================

    /**
     * Buy ring of protection from Marketplace
     */
    buyRingOfProtection() {
        if (this.hasRingOfProtection) return false;

        const price = ITEMS.RING_OF_PROTECTION.price;
        const totalGold = (this.owner.gold || 0) + (this.owner.taxGold || 0);
        if (totalGold >= price) {
            this.owner.spendGold(price);
            this.hasRingOfProtection = true;
            return true;
        }
        return false;
    }

    /**
     * Buy amulet of teleportation
     */
    buyAmuletOfTeleportation() {
        if (this.hasAmuletOfTeleportation) return false;

        const price = ITEMS.AMULET_OF_TELEPORTATION.price;
        const totalGold = (this.owner.gold || 0) + (this.owner.taxGold || 0);
        if (totalGold >= price) {
            this.owner.spendGold(price);
            this.hasAmuletOfTeleportation = true;
            this.amuletCooldown = 0;  // Ready to use
            return true;
        }
        return false;
    }

    /**
     * Use amulet of teleportation (teleport to castle)
     * @param {object} castle - Castle building reference
     */
    useAmuletOfTeleportation(castle) {
        if (!this.hasAmuletOfTeleportation) return false;
        if (this.amuletCooldown > 0) return false;
        if (!castle) return false;

        // Teleport owner to near castle
        const newI = castle.gridI + 2;
        const newJ = castle.gridJ + 2;

        // Vacate old cell
        this.owner.vacateCell(this.owner.gridI, this.owner.gridJ);

        // Move to new position using proper isometric conversion
        this.owner.setGridPosition(newI, newJ);

        // Clear any active path/movement so hero doesn't walk back
        this.owner.path = [];
        this.owner.moving = false;
        this.owner.targetI = newI;
        this.owner.targetJ = newJ;

        // Occupy new cell
        this.owner.occupyCell(newI, newJ);

        // Set cooldown
        this.amuletCooldown = this.amuletMaxCooldown;

        return true;
    }

    /**
     * Buy poisoned weapon coating
     */
    buyPoisonedWeapon() {
        if (this.hasPoisonedWeapon) return false;

        const price = ITEMS.POISONED_WEAPON.price;
        if (this.owner.gold >= price) {
            this.owner.gold -= price;
            this.hasPoisonedWeapon = true;
            return true;
        }
        return false;
    }

    // =========================================================================
    // UPDATE
    // =========================================================================

    /**
     * Update inventory (called each tick)
     */
    update(deltaTime) {
        // Tick down amulet cooldown
        if (this.amuletCooldown > 0) {
            this.amuletCooldown -= deltaTime / 40;  // Convert ms to ticks
        }

        // Auto-use healing potion if low health
        if (this.owner.autoPlay &&
            this.healingPotions > 0 &&
            this.owner.health < this.owner.maxHealth * 0.3) {
            this.useHealingPotion();
        }
    }

    // =========================================================================
    // SERIALIZATION
    // =========================================================================

    /**
     * Serialize inventory state
     */
    serialize() {
        return {
            weaponLevel: this.weaponLevel,
            armorLevel: this.armorLevel,
            enchantedWeaponLevel: this.enchantedWeaponLevel,
            enchantedArmorLevel: this.enchantedArmorLevel,
            healingPotions: this.healingPotions,
            curePotions: this.curePotions,
            hasRingOfProtection: this.hasRingOfProtection,
            hasAmuletOfTeleportation: this.hasAmuletOfTeleportation,
            hasPoisonedWeapon: this.hasPoisonedWeapon,
            amuletCooldown: this.amuletCooldown,
        };
    }

    /**
     * Deserialize inventory state
     */
    deserialize(data) {
        this.weaponLevel = data.weaponLevel || 1;
        this.armorLevel = data.armorLevel || 1;
        this.enchantedWeaponLevel = data.enchantedWeaponLevel || 0;
        this.enchantedArmorLevel = data.enchantedArmorLevel || 0;
        this.healingPotions = data.healingPotions || 0;
        this.curePotions = data.curePotions || 0;
        this.hasRingOfProtection = data.hasRingOfProtection || false;
        this.hasAmuletOfTeleportation = data.hasAmuletOfTeleportation || false;
        this.hasPoisonedWeapon = data.hasPoisonedWeapon || false;
        this.amuletCooldown = data.amuletCooldown || 0;
    }
}

/**
 * Get equipment display name for a weapon level
 */
export function getWeaponName(level, unitType) {
    const weaponNames = {
        1: 'Basic Weapon',
        2: 'Iron Weapon',
        3: 'Steel Weapon',
        4: 'Fine Steel',
        5: 'Mithril',
        6: 'Legendary',
    };
    return weaponNames[level] || 'Unknown';
}

/**
 * Get equipment display name for an armor level
 */
export function getArmorName(level, unitType) {
    // Different unit types have different armor
    const heavyArmor = {
        1: 'Cloth',
        2: 'Leather',
        3: 'Chain Mail',
        4: 'Plate',
        5: 'Heavy Plate',
        6: 'Mithril Plate',
    };

    const lightArmor = {
        1: 'Cloth',
        2: 'Soft Leather',
        3: 'Hard Leather',
        4: 'Studded Leather',
        5: 'Elven Mail',
        6: 'Shadow Cloak',
    };

    // Warriors, Paladins, Dwarves use heavy armor
    // Rangers, Elves, Wizards use light armor
    const useHeavy = ['warrior', 'paladin', 'dwarf', 'barbarian'].includes(unitType);
    const names = useHeavy ? heavyArmor : lightArmor;

    return names[level] || 'Unknown';
}
