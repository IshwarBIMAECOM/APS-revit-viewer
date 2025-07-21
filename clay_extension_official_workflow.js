/**
 * Clay Extension - Following Official Autodesk Workflow
 * Based on official APS documentation using MeshPhongMaterial
 */

class ClayExtension extends Autodesk.Viewing.Extension {
    constructor(viewer, options) {
        super(viewer, options);
        
        this.extensionName = 'ClayExtension';
        this.isClayMode = false;
        this.originalMaterials = new Map();
        this.clayMaterial = null;
        this.clayPanel = null;
        this.clayToolbar = null;
        
        this.clayOptions = options?.clayTypes || [
            { name: "Beige Clay", color: 0xDDCCAA },
            { name: "White Clay", color: 0xF5F5F5 },
            { name: "Terracotta", color: 0xCD853F },
            { name: "Gray Clay", color: 0x999999 }
        ];
        
        this.defaultClayColor = options?.defaultClayColor || 0xDDCCAA;
        
        // Bound event handlers
        this.onToolbarCreatedBinded = null;
        this.onViewerReadyBinded = null;
        this.onGeometryLoadedBinded = null;
        this.onObjectTreeCreatedBinded = null;
        this.toggleClayModeBinded = null;
        this.showClayPanelBinded = null;
    }

    load() {
        console.log(`${this.extensionName} loaded`);
        
        // Bind event handlers
        this.onViewerReadyBinded = this.onViewerReady.bind(this);
        this.onGeometryLoadedBinded = this.onGeometryLoaded.bind(this);
        this.onObjectTreeCreatedBinded = this.onObjectTreeCreated.bind(this);
        this.toggleClayModeBinded = this.toggleClayMode.bind(this);
        this.showClayPanelBinded = this.showClayPanel.bind(this);
        
        // Toolbar detection
        if (this.viewer.toolbar) {
            this.createUI();
        } else {
            this.onToolbarCreatedBinded = this.onToolbarCreated.bind(this);
            this.viewer.addEventListener(Autodesk.Viewing.TOOLBAR_CREATED_EVENT, this.onToolbarCreatedBinded);
        }
        
        this.setupEventListeners();
        return true;
    }

    unload() {
        console.log(`${this.extensionName} unloaded`);
        
        if (this.isClayMode) {
            this.disableClayMode();
        }
        
        this.removeUI();
        this.removeEventListeners();
        this.cleanupBindings();
        
        this.originalMaterials.clear();
        this.clayMaterial = null;
        
        return true;
    }

    onToolbarCreated() {
        this.viewer.removeEventListener(Autodesk.Viewing.TOOLBAR_CREATED_EVENT, this.onToolbarCreatedBinded);
        this.onToolbarCreatedBinded = null;
        this.createUI();
    }

    createUI() {
        console.log(`${this.extensionName}: Creating UI`);
        
        var viewer = this.viewer;

        // Clay Toggle Button
        var clayToggleButton = new Autodesk.Viewing.UI.Button('clay-toggle-button');
        clayToggleButton.onClick = this.toggleClayModeBinded;
        clayToggleButton.addClass('clay-toggle-button');
        clayToggleButton.setToolTip('Toggle Clay Rendering');

        // Clay Settings Button
        var claySettingsButton = new Autodesk.Viewing.UI.Button('clay-settings-button');
        claySettingsButton.onClick = this.showClayPanelBinded;
        claySettingsButton.addClass('clay-settings-button');
        claySettingsButton.setToolTip('Clay Settings');

        // Create Control Group
        this.clayToolbar = new Autodesk.Viewing.UI.ControlGroup('clay-toolbar');
        this.clayToolbar.addControl(clayToggleButton);
        this.clayToolbar.addControl(claySettingsButton);

        // Add to main toolbar
        viewer.toolbar.addControl(this.clayToolbar);
        
        console.log(`${this.extensionName}: UI created successfully`);
    }

    removeUI() {
        if (this.clayToolbar && this.viewer.toolbar) {
            this.viewer.toolbar.removeControl(this.clayToolbar);
            this.clayToolbar = null;
        }
        
        if (this.clayPanel) {
            this.clayPanel.setVisible(false);
            this.clayPanel.uninitialize();
            this.clayPanel = null;
        }
    }

    setupEventListeners() {
        this.viewer.addEventListener(Autodesk.Viewing.VIEWER_STATE_RESTORED_EVENT, this.onViewerReadyBinded);
        this.viewer.addEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, this.onGeometryLoadedBinded);
        
        if (this.viewer.model && this.viewer.model.getInstanceTree()) {
            this.onObjectTreeCreated();
        } else {
            this.viewer.addEventListener(Autodesk.Viewing.OBJECT_TREE_CREATED_EVENT, this.onObjectTreeCreatedBinded);
        }
    }

    removeEventListeners() {
        this.viewer.removeEventListener(Autodesk.Viewing.VIEWER_STATE_RESTORED_EVENT, this.onViewerReadyBinded);
        this.viewer.removeEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, this.onGeometryLoadedBinded);
        this.viewer.removeEventListener(Autodesk.Viewing.OBJECT_TREE_CREATED_EVENT, this.onObjectTreeCreatedBinded);
    }

    cleanupBindings() {
        this.onViewerReadyBinded = null;
        this.onGeometryLoadedBinded = null;
        this.onObjectTreeCreatedBinded = null;
        this.toggleClayModeBinded = null;
        this.showClayPanelBinded = null;
    }

    onViewerReady() {
        console.log(`${this.extensionName}: Viewer ready`);
    }

    onGeometryLoaded() {
        console.log(`${this.extensionName}: Geometry loaded, clay controls now available`);
        this.updateUIState();
    }

    onObjectTreeCreated() {
        console.log(`${this.extensionName}: Object tree created`);
    }

    toggleClayMode() {
        if (!this.viewer.model) {
            console.warn(`${this.extensionName}: No model loaded`);
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
        
        this.clayPanel.setVisible(!this.clayPanel.isVisible());
    }

    enableClayMode() {
        console.log(`${this.extensionName}: Enabling clay mode`);

        try {
            // Store original materials first
            this.storeOriginalMaterials();
            
            // Create clay material using official Autodesk workflow
            this.createClayMaterial();
            
            // Apply clay material using official method
            this.applyClayMaterialOfficial();
            
            this.isClayMode = true;
            this.updateUIState();
            
            // Inform the viewer that there were changes to the scene
            this.viewer.impl.invalidate(true);
            
            console.log(`${this.extensionName}: Clay mode enabled successfully`);
        } catch (error) {
            console.error(`${this.extensionName}: Error enabling clay mode:`, error);
        }
    }

    disableClayMode() {
        console.log(`${this.extensionName}: Disabling clay mode`);

        try {
            this.restoreOriginalMaterials();
            
            this.isClayMode = false;
            this.updateUIState();
            
            // Inform the viewer that there were changes to the scene
            this.viewer.impl.invalidate(true);
            
            console.log(`${this.extensionName}: Clay mode disabled successfully`);
        } catch (error) {
            console.error(`${this.extensionName}: Error disabling clay mode:`, error);
        }
    }

    /**
     * Create clay material using official Autodesk workflow
     * Following the pattern from official documentation
     */
    createClayMaterial(color = this.defaultClayColor) {
        if (!window.THREE) {
            console.error(`${this.extensionName}: THREE.js not available`);
            return null;
        }

        const THREE = window.THREE;
        
        // Use the exact pattern from official Autodesk documentation
        this.clayMaterial = new THREE.MeshPhongMaterial({
            side: THREE.DoubleSide,
            reflectivity: 0.0,
            flatShading: true,
            transparent: true,
            opacity: 0.8,  // Slightly transparent for clay-like appearance
            color: color
        });

        this.clayMaterial.name = 'ClayMaterial_' + Date.now();
        this.clayMaterial.needsUpdate = true;

        console.log(`${this.extensionName}: Clay material created with color ${color.toString(16)}`);
        return this.clayMaterial;
    }

    /**
     * Store original materials - following official pattern
     */
    storeOriginalMaterials() {
        if (!this.viewer.model) {
            console.warn(`${this.extensionName}: No model available for material storage`);
            return;
        }

        console.log(`${this.extensionName}: Storing original materials`);
        this.originalMaterials.clear();

        const tree = this.viewer.model.getInstanceTree();
        if (!tree) {
            console.warn(`${this.extensionName}: No instance tree available`);
            return;
        }

        const fragList = this.viewer.model.getFragmentList();
        if (!fragList) {
            console.warn(`${this.extensionName}: No fragment list available`);
            return;
        }

        // Store materials for all fragments
        tree.enumNodeFragments(tree.getRootId(), (fragId) => {
            const originalMaterial = fragList.getMaterial(fragId);
            if (originalMaterial) {
                this.originalMaterials.set(fragId, originalMaterial);
            }
        }, true); // true = recursive

        console.log(`${this.extensionName}: Stored ${this.originalMaterials.size} original materials`);
    }

    /**
     * Apply clay material using official Autodesk workflow
     * Following the exact pattern from documentation
     */
    applyClayMaterialOfficial() {
        if (!this.viewer.model || !this.clayMaterial) {
            console.warn(`${this.extensionName}: Model or clay material not available`);
            return;
        }

        console.log(`${this.extensionName}: Applying clay material using official workflow`);

        const tree = this.viewer.model.getInstanceTree();
        if (!tree) {
            console.warn(`${this.extensionName}: No instance tree available`);
            return;
        }

        // Get material manager - following official pattern
        const materials = this.viewer.impl.matman();
        if (!materials) {
            console.warn(`${this.extensionName}: Material manager not available`);
            return;
        }

        // Register material with material manager
        materials.addMaterial("ClayMaterial", this.clayMaterial, true);

        // Get all fragments and assign new material to them
        // Following the exact pattern from official documentation
        let appliedCount = 0;
        tree.enumNodeFragments(tree.getRootId(), (fragId) => {
            try {
                this.viewer.model.getFragmentList().setMaterial(fragId, this.clayMaterial);
                appliedCount++;
            } catch (error) {
                console.warn(`${this.extensionName}: Failed to apply clay material to fragment ${fragId}:`, error);
            }
        }, true); // true = recursive

        console.log(`${this.extensionName}: Applied clay material to ${appliedCount} fragments using official workflow`);
    }

    /**
     * Restore original materials using official pattern
     */
    restoreOriginalMaterials() {
        if (!this.viewer.model || this.originalMaterials.size === 0) {
            console.warn(`${this.extensionName}: No model or stored materials to restore`);
            return;
        }

        console.log(`${this.extensionName}: Restoring original materials`);

        const fragList = this.viewer.model.getFragmentList();
        if (!fragList) {
            console.warn(`${this.extensionName}: No fragment list available for restoration`);
            return;
        }

        let restoredCount = 0;
        for (const [fragId, originalMaterial] of this.originalMaterials) {
            try {
                fragList.setMaterial(fragId, originalMaterial);
                restoredCount++;
            } catch (error) {
                console.warn(`${this.extensionName}: Failed to restore material for fragment ${fragId}:`, error);
            }
        }

        console.log(`${this.extensionName}: Restored ${restoredCount}/${this.originalMaterials.size} original materials`);
    }

    /**
     * Apply a different clay variant
     */
    applyClayVariant(colorHex) {
        if (!this.isClayMode) return;

        console.log(`${this.extensionName}: Applying clay variant: ${colorHex}`);
        
        this.createClayMaterial(colorHex);
        this.applyClayMaterialOfficial();
        
        // Inform the viewer that there were changes to the scene
        this.viewer.impl.invalidate(true);
    }

    /**
     * Create clay control panel
     */
    createClayPanel() {
        // Simplified panel creation for this example
        console.log(`${this.extensionName}: Clay control panel would be created here`);
        
        // You could create a proper panel here with clay color options
        // using the this.clayOptions array
    }

    /**
     * Update UI elements based on current state
     */
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

        console.log(`${this.extensionName}: UI state updated - Clay mode: ${this.isClayMode}`);
    }
}

// Register the extension
Autodesk.Viewing.theExtensionManager.registerExtension('ClayExtension', ClayExtension);

console.log('Clay Extension (Official Workflow) registered successfully');