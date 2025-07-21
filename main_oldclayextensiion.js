/**
 * Clay Extension for APS Viewer
 * Fixed material application strategy - single source of truth approach
 */
console.log('🎯 ClayExtension script loaded!');

class ClayExtension extends Autodesk.Viewing.Extension {
    constructor(viewer, options) {
        super(viewer, options);

        this.extensionName = 'ClayExtension';
        this.isClayMode = false;
        this.originalMaterials = new Map(); // fragId -> original material
        this.clayMaterial = null;
        this.clayMaterialName = null;

        this.clayOptions = options?.clayTypes || [
            { name: 'Beige Clay', color: '#DDCCAA' },
            { name: 'White Clay', color: '#F5F5F5' },
            { name: 'Terracotta', color: '#CD853F' },
            { name: 'Gray Clay', color: '#999999' }
        ];

        this.defaultClayColor = options?.defaultClayColor || '#DDCCAA';

        // Bind methods
        this.onToolbarCreatedBinded = null;
        this.onObjectTreeCreatedBinded = null;
        this.toggleClayModeBinded = null;
        this.showClayPanelBinded = null;

        console.log(`🔧 ${this.extensionName} constructor completed`);
    }

    load() {
        console.log(`🚀 ${this.extensionName} load() called`);

        // Bind event handlers
        this.onObjectTreeCreatedBinded = this.onObjectTreeCreated.bind(this);
        this.toggleClayModeBinded = this.toggleClayMode.bind(this);
        this.showClayPanelBinded = this.showClayPanel.bind(this);

        // Toolbar creation
        if (this.viewer.toolbar) {
            this.createUI();
        } else {
            this.onToolbarCreatedBinded = this.onToolbarCreated.bind(this);
            this.viewer.addEventListener(Autodesk.Viewing.TOOLBAR_CREATED_EVENT, this.onToolbarCreatedBinded);
        }

        // Object tree creation
        if (this.viewer.model && this.viewer.model.getInstanceTree()) {
            this.onObjectTreeCreated();
        } else {
            this.viewer.addEventListener(Autodesk.Viewing.OBJECT_TREE_CREATED_EVENT, this.onObjectTreeCreatedBinded);
        }

        return true;
    }

    unload() {
        console.log(`🔄 ${this.extensionName} unload() called`);

        if (this.isClayMode) {
            this.disableClayMode();
        }

        this.removeUI();
        this.removeEventListeners();
        this.cleanupBindings();
        this.cleanupMaterials();

        return true;
    }

    onToolbarCreated() {
        this.viewer.removeEventListener(Autodesk.Viewing.TOOLBAR_CREATED_EVENT, this.onToolbarCreatedBinded);
        this.onToolbarCreatedBinded = null;
        this.createUI();
    }

    onObjectTreeCreated() {
        console.log(`🎉 ${this.extensionName}: Object tree ready`);
        this.updateUIState();
    }

    createUI() {
        console.log(`🎨 ${this.extensionName}: Creating UI`);
        
        try {
            var clayToggleButton = new Autodesk.Viewing.UI.Button('clay-toggle-button');
            clayToggleButton.onClick = this.toggleClayModeBinded;
            clayToggleButton.addClass('clay-toggle-button');
            clayToggleButton.setToolTip('Toggle Clay Rendering');

            var claySettingsButton = new Autodesk.Viewing.UI.Button('clay-settings-button');
            claySettingsButton.onClick = this.showClayPanelBinded;
            claySettingsButton.addClass('clay-settings-button');
            claySettingsButton.setToolTip('Clay Settings');

            this.clayToolbar = new Autodesk.Viewing.UI.ControlGroup('clay-toolbar');
            this.clayToolbar.addControl(clayToggleButton);
            this.clayToolbar.addControl(claySettingsButton);

            this.viewer.toolbar.addControl(this.clayToolbar);
            console.log(`🎨 ${this.extensionName}: UI created successfully`);
        } catch (error) {
            console.error(`❌ Error creating UI:`, error);
        }
    }

    removeUI() {
        if (this.clayToolbar) {
            this.viewer.toolbar.removeControl(this.clayToolbar);
            this.clayToolbar = null;
        }
        if (this.clayPanel) {
            this.clayPanel.uninitialize();
            this.clayPanel = null;
        }
    }

    removeEventListeners() {
        if (this.onObjectTreeCreatedBinded) {
            this.viewer.removeEventListener(Autodesk.Viewing.OBJECT_TREE_CREATED_EVENT, this.onObjectTreeCreatedBinded);
        }
        if (this.onToolbarCreatedBinded) {
            this.viewer.removeEventListener(Autodesk.Viewing.TOOLBAR_CREATED_EVENT, this.onToolbarCreatedBinded);
        }
    }

    cleanupBindings() {
        this.onObjectTreeCreatedBinded = null;
        this.onToolbarCreatedBinded = null;
        this.toggleClayModeBinded = null;
        this.showClayPanelBinded = null;
    }

    cleanupMaterials() {
        // Clean up clay material from material manager
        if (this.clayMaterialName) {
            const materials = this.viewer.impl.matman();
            if (materials && materials.removeMaterial) {
                try {
                    materials.removeMaterial(this.clayMaterialName);
                    console.log(`🧹 Removed clay material: ${this.clayMaterialName}`);
                } catch (error) {
                    console.warn(`⚠️ Failed to remove clay material:`, error);
                }
            }
        }
        
        this.originalMaterials.clear();
        this.clayMaterial = null;
        this.clayMaterialName = null;
    }

    toggleClayMode() {
        console.log(`🎭 ${this.extensionName}: toggleClayMode() called (current: ${this.isClayMode})`);
        
        if (!this.viewer.model) {
            console.warn(`❌ ${this.extensionName}: No model loaded`);
            return;
        }

        if (this.isClayMode) {
            this.disableClayMode();
        } else {
            this.enableClayMode();
        }
    }

    showClayPanel() {
        if (!this.clayPanel) {
            this.createClayPanel();
        }
        const isCurrentlyVisible = this.clayPanel.isVisible();
        this.clayPanel.setVisible(!isCurrentlyVisible);
    }

    enableClayMode() {
        console.log(`🎭 ${this.extensionName}: Enabling clay mode`);
        
        try {
            // Always store original materials first (only if not already stored)
            if (this.originalMaterials.size === 0) {
                this.storeOriginalMaterials();
            }
            
            this.createClayMaterial();
            this.applyClayToAllFragments();

            this.isClayMode = true;
            this.updateUIState();

            // Single, targeted refresh
            this.refreshViewer();

            console.log(`✅ ${this.extensionName}: Clay mode enabled`);
        } catch (error) {
            console.error(`❌ ${this.extensionName}: Error enabling clay mode:`, error);
        }
    }

    disableClayMode() {
        console.log(`🎭 ${this.extensionName}: Disabling clay mode`);
        
        try {
            this.restoreOriginalMaterials();

            this.isClayMode = false;
            this.updateUIState();

            // Single, targeted refresh
            this.refreshViewer();

            console.log(`✅ ${this.extensionName}: Clay mode disabled`);
        } catch (error) {
            console.error(`❌ ${this.extensionName}: Error disabling clay mode:`, error);
        }
    }

    createClayMaterial(color = this.defaultClayColor) {
        console.log(`🧱 ${this.extensionName}: Creating clay material with color ${color}`);
        
        if (!window.THREE) {
            console.error(`❌ ${this.extensionName}: THREE.js not available`);
            return null;
        }

        const THREE = window.THREE;
        const colorHex = typeof color === 'string' ? parseInt(color.replace('#', '0x')) : color;

        // Remove old clay material if it exists
        this.cleanupOldClayMaterial();

        // Create new clay material - simple and effective
        this.clayMaterial = new THREE.MeshLambertMaterial({
            color: colorHex,
            transparent: false,
            opacity: 1.0,
            side: THREE.FrontSide, // Changed back to FrontSide to avoid z-fighting
            flatShading: false
        });

        this.clayMaterialName = `ClayMaterial_${Date.now()}`;
        this.clayMaterial.name = this.clayMaterialName;
        this.clayMaterial.needsUpdate = true;

        // Register with Material Manager (optional but recommended)
        const materials = this.viewer.impl.matman();
        if (materials) {
            try {
                materials.addMaterial(this.clayMaterialName, this.clayMaterial, true);
                console.log(`✅ Clay material registered: ${this.clayMaterialName}`);
            } catch (error) {
                console.warn(`⚠️ Material registration failed:`, error);
            }
        }

        return this.clayMaterial;
    }

    cleanupOldClayMaterial() {
        if (this.clayMaterialName) {
            const materials = this.viewer.impl.matman();
            if (materials && materials.removeMaterial) {
                try {
                    materials.removeMaterial(this.clayMaterialName);
                } catch (error) {
                    // Ignore cleanup errors
                }
            }
        }
    }

    storeOriginalMaterials() {
        if (!this.viewer.model) return;

        console.log(`💾 ${this.extensionName}: Storing original materials`);
        this.originalMaterials.clear();

        const fragList = this.viewer.model.getFragmentList();
        if (!fragList) return;

        const fragCount = fragList.getCount();
        let storedCount = 0;

        for (let fragId = 0; fragId < fragCount; fragId++) {
            try {
                const originalMaterial = fragList.getMaterial(fragId);
                if (originalMaterial) {
                    this.originalMaterials.set(fragId, originalMaterial);
                    storedCount++;
                }
            } catch (error) {
                console.warn(`⚠️ Failed to store material for fragment ${fragId}`);
            }
        }

        console.log(`✅ Stored ${storedCount} original materials`);
    }

    applyClayToAllFragments() {
        if (!this.viewer.model || !this.clayMaterial) return;

        console.log(`🎨 ${this.extensionName}: Applying clay material`);

        const fragList = this.viewer.model.getFragmentList();
        if (!fragList) return;

        const fragCount = fragList.getCount();
        let appliedCount = 0;

        // SINGLE METHOD APPROACH - only use fragList.setMaterial()
        // This avoids conflicts and z-fighting issues
        for (let fragId = 0; fragId < fragCount; fragId++) {
            try {
                fragList.setMaterial(fragId, this.clayMaterial);
                appliedCount++;
            } catch (error) {
                console.warn(`⚠️ Failed to apply clay to fragment ${fragId}`);
            }
        }

        console.log(`✅ Applied clay to ${appliedCount}/${fragCount} fragments`);
    }

    restoreOriginalMaterials() {
        if (!this.viewer.model || this.originalMaterials.size === 0) {
            console.warn(`⚠️ No original materials to restore`);
            return;
        }

        console.log(`🔄 ${this.extensionName}: Restoring original materials`);

        const fragList = this.viewer.model.getFragmentList();
        if (!fragList) return;

        let restoredCount = 0;

        // SINGLE METHOD APPROACH - only use fragList.setMaterial()
        for (const [fragId, originalMaterial] of this.originalMaterials) {
            try {
                fragList.setMaterial(fragId, originalMaterial);
                restoredCount++;
            } catch (error) {
                console.warn(`⚠️ Failed to restore material for fragment ${fragId}`);
            }
        }

        console.log(`✅ Restored ${restoredCount} original materials`);
        
        // Clear stored materials after successful restore
        this.originalMaterials.clear();
    }

    refreshViewer() {
        // Single, targeted refresh approach
        console.log(`🔄 ${this.extensionName}: Refreshing viewer`);
        this.viewer.impl.invalidate(false, false, true); // Material refresh only
    }

    applyClayVariant(colorHex) {
        console.log(`🎨 ${this.extensionName}: Applying clay variant: ${colorHex}`);
        
        if (!this.isClayMode) {
            // If not in clay mode, enable it first
            this.enableClayMode();
            // Wait a bit then apply the color
            setTimeout(() => {
                this.changeClayColor(colorHex);
            }, 100);
        } else {
            // Already in clay mode, just change color
            this.changeClayColor(colorHex);
        }
    }

    changeClayColor(colorHex) {
        console.log(`🌈 ${this.extensionName}: Changing clay color to: ${colorHex}`);
        
        // Create new material with new color
        this.createClayMaterial(colorHex);
        
        // Apply to all fragments (no need to store materials again)
        this.applyClayToAllFragments();
        
        // Refresh viewer
        this.refreshViewer();
    }

    createClayPanel() {
        try {
            this.clayPanel = new ClayControlPanel(this.viewer, this.viewer.container, 'clay-control-panel', this);
            this.clayPanel.setVisible(true);
        } catch (error) {
            console.error(`❌ Error creating clay panel:`, error);
        }
    }

    updateUIState() {
        if (this.clayToolbar) {
            const toggleButton = this.clayToolbar.getControl('clay-toggle-button');
            if (toggleButton) {
                if (this.isClayMode) {
                    toggleButton.addClass('active');
                    toggleButton.setToolTip('Disable Clay Rendering');
                } else {
                    toggleButton.removeClass('active');
                    toggleButton.setToolTip('Enable Clay Rendering');
                }
            }
        }
    }
}

class ClayControlPanel extends Autodesk.Viewing.UI.DockingPanel {
    constructor(viewer, parentContainer, id, clayExtension) {
        super(parentContainer, id, 'Clay Controls');

        this.viewer = viewer;
        this.clayExtension = clayExtension;
        this.container.style.top = '10px';
        this.container.style.right = '10px';
        this.container.style.width = '200px';
        this.container.style.height = 'auto';
        this.container.style.resize = 'none';

        this.createContent();
    }

    createContent() {
        const content = document.createElement('div');
        content.className = 'clay-panel-content';

        const typeLabel = document.createElement('label');
        typeLabel.textContent = 'Clay Type:';
        content.appendChild(typeLabel);

        this.clayExtension.clayOptions.forEach(option => {
            const typeButton = document.createElement('button');
            typeButton.className = 'clay-type-btn';
            typeButton.textContent = option.name;
            typeButton.style.backgroundColor = option.color;

            typeButton.addEventListener('click', () => {
                console.log(`🎨 Clay type selected: ${option.name} (${option.color})`);
                this.clayExtension.applyClayVariant(option.color);
            });
            content.appendChild(typeButton);
        });

        this.container.appendChild(content);
    }

    initialize() {
        this.title = this.createTitleBar('Clay Controls');
        this.container.appendChild(this.title);
        this.initializeMoveHandlers(this.title);
    }
}

Autodesk.Viewing.theExtensionManager.registerExtension('ClayExtension', ClayExtension);
console.log('✅ ClayExtension registered successfully');
