/**
 * HUD - Heads Up Display for game information
 *
 * Displays:
 * - Gold/resources
 * - Unit counts
 * - Selected unit info
 * - Mini status bar
 */

export class HUD {
    constructor(container, game) {
        this.container = container;
        this.game = game;

        // UI elements
        this.topBar = null;
        this.bottomBar = null;
        this.selectionPanel = null;

        // Text elements
        this.goldText = null;
        this.unitCountText = null;
        this.selectedUnitText = null;

        this.init();
    }

    /**
     * Initialize HUD elements
     */
    init() {
        this.createTopBar();
        this.createSelectionPanel();
    }

    /**
     * Create top resource bar
     */
    createTopBar() {
        this.topBar = new PIXI.Container();
        this.topBar.x = 10;
        this.topBar.y = 10;

        // Background panel
        const bg = new PIXI.Graphics();
        bg.roundRect(0, 0, 200, 60, 8);
        bg.fill({ color: 0x000000, alpha: 0.7 });
        bg.stroke({ width: 2, color: 0x446688 });
        this.topBar.addChild(bg);

        // Gold icon (yellow circle)
        const goldIcon = new PIXI.Graphics();
        goldIcon.circle(20, 20, 10);
        goldIcon.fill(0xffd700);
        goldIcon.stroke({ width: 2, color: 0xaa8800 });
        this.topBar.addChild(goldIcon);

        // Gold text
        this.goldText = new PIXI.Text({
            text: '100',
            style: {
                fontFamily: 'Arial',
                fontSize: 18,
                fontWeight: 'bold',
                fill: 0xffd700
            }
        });
        this.goldText.x = 40;
        this.goldText.y = 10;
        this.topBar.addChild(this.goldText);

        // Unit count icon (person silhouette)
        const unitIcon = new PIXI.Graphics();
        unitIcon.circle(20, 45, 6);
        unitIcon.fill(0x44ff44);
        unitIcon.ellipse(20, 55, 8, 4);
        unitIcon.fill(0x44ff44);
        this.topBar.addChild(unitIcon);

        // Unit count text
        this.unitCountText = new PIXI.Text({
            text: 'Units: 0/0',
            style: {
                fontFamily: 'Arial',
                fontSize: 14,
                fill: 0x88ff88
            }
        });
        this.unitCountText.x = 40;
        this.unitCountText.y = 38;
        this.topBar.addChild(this.unitCountText);

        this.container.addChild(this.topBar);
    }

    /**
     * Create selection panel (bottom left)
     */
    createSelectionPanel() {
        this.selectionPanel = new PIXI.Container();
        this.selectionPanel.x = 10;
        this.selectionPanel.y = this.game.app.screen.height - 100;

        // Background
        const bg = new PIXI.Graphics();
        bg.roundRect(0, 0, 250, 90, 8);
        bg.fill({ color: 0x000000, alpha: 0.7 });
        bg.stroke({ width: 2, color: 0x446688 });
        this.selectionPanel.addChild(bg);

        // Selected unit portrait placeholder
        this.portrait = new PIXI.Graphics();
        this.portrait.roundRect(8, 8, 50, 50, 4);
        this.portrait.fill(0x333333);
        this.selectionPanel.addChild(this.portrait);

        // Selected unit text
        this.selectedUnitText = new PIXI.Text({
            text: 'No unit selected',
            style: {
                fontFamily: 'Arial',
                fontSize: 12,
                fill: 0xcccccc,
                wordWrap: true,
                wordWrapWidth: 175
            }
        });
        this.selectedUnitText.x = 65;
        this.selectedUnitText.y = 8;
        this.selectionPanel.addChild(this.selectedUnitText);

        // Health bar background
        this.healthBarBg = new PIXI.Graphics();
        this.healthBarBg.rect(65, 65, 175, 12);
        this.healthBarBg.fill(0x333333);
        this.selectionPanel.addChild(this.healthBarBg);

        // Health bar fill
        this.healthBarFill = new PIXI.Graphics();
        this.selectionPanel.addChild(this.healthBarFill);

        // Health text
        this.healthText = new PIXI.Text({
            text: '',
            style: {
                fontFamily: 'Arial',
                fontSize: 10,
                fill: 0xffffff
            }
        });
        this.healthText.x = 130;
        this.healthText.y = 66;
        this.selectionPanel.addChild(this.healthText);

        this.container.addChild(this.selectionPanel);
    }

    /**
     * Update HUD every frame
     */
    update() {
        this.updateResourceDisplay();
        this.updateSelectionPanel();
    }

    /**
     * Update resource display
     */
    updateResourceDisplay() {
        // Update gold
        this.goldText.text = this.game.gold.toString();

        // Count units by team
        let playerUnits = 0;
        let enemyUnits = 0;

        for (const entity of this.game.entities) {
            if (entity.isAlive()) {
                if (entity.team === 'player') {
                    playerUnits++;
                } else if (entity.team === 'enemy') {
                    enemyUnits++;
                }
            }
        }

        this.unitCountText.text = `Allies: ${playerUnits}  Enemies: ${enemyUnits}`;
    }

    /**
     * Update selection panel
     */
    updateSelectionPanel() {
        const unit = this.game.selectedUnit;

        if (!unit) {
            this.selectedUnitText.text = 'No unit selected\n\nClick a unit to select';
            this.healthBarFill.clear();
            this.healthText.text = '';
            this.updatePortrait(null);
            return;
        }

        // Unit info
        const typeStr = unit.isRanged ? 'Ranged' : 'Melee';
        const stateStr = unit.moving ? 'Moving' :
                        unit.attackTarget ? 'Combat' : 'Idle';
        const teamStr = unit.team === 'player' ? 'Ally' : 'Enemy';

        this.selectedUnitText.text =
            `${teamStr} ${typeStr} Unit\n` +
            `Level ${unit.level} | ${stateStr}\n` +
            `ATK: ${unit.damage} | Range: ${unit.getAttackRange().toFixed(1)}`;

        // Health bar
        const healthPct = unit.health / unit.maxHealth;
        const barWidth = 175 * healthPct;

        this.healthBarFill.clear();
        this.healthBarFill.rect(65, 65, barWidth, 12);

        // Color based on health
        let color = 0x44ff44;  // Green
        if (healthPct < 0.3) {
            color = 0xff4444;  // Red
        } else if (healthPct < 0.6) {
            color = 0xffff44;  // Yellow
        }
        this.healthBarFill.fill(color);

        this.healthText.text = `${unit.health}/${unit.maxHealth}`;

        // Update portrait color
        this.updatePortrait(unit);
    }

    /**
     * Update portrait based on selected unit
     */
    updatePortrait(unit) {
        this.portrait.clear();
        this.portrait.roundRect(8, 8, 50, 50, 4);

        if (unit) {
            // Draw mini version of unit
            this.portrait.fill(0x222222);

            // Body color
            this.portrait.circle(33, 38, 12);
            this.portrait.fill(unit.bodyColor || 0x4488ff);

            // Head
            this.portrait.circle(33, 22, 8);
            this.portrait.fill(unit.headColor || 0xffcc88);
        } else {
            this.portrait.fill(0x333333);
        }
    }

    /**
     * Show a temporary message
     */
    showMessage(text, duration = 2000) {
        const msg = new PIXI.Text({
            text: text,
            style: {
                fontFamily: 'Arial',
                fontSize: 24,
                fontWeight: 'bold',
                fill: 0xffffff,
                stroke: { color: 0x000000, width: 3 }
            }
        });

        msg.anchor.set(0.5);
        msg.x = this.game.app.screen.width / 2;
        msg.y = this.game.app.screen.height / 2;

        this.container.addChild(msg);

        // Fade out and remove
        setTimeout(() => {
            const fadeOut = setInterval(() => {
                msg.alpha -= 0.05;
                if (msg.alpha <= 0) {
                    clearInterval(fadeOut);
                    this.container.removeChild(msg);
                    msg.destroy();
                }
            }, 30);
        }, duration);
    }
}
