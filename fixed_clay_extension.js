/**
 * Fixed Clay Extension for APS Viewer
 * Addresses material application issues with improved THREE.js material handling
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
            { name: "Beige Clay", color: "#DDCCAA" },
            { name: "White Clay", color: "#F5F5F5" },
            { name: "Terracotta", color: "#CD853F" },
            { name: "Gray Clay", color: "#999999" }
        ];
        
        this.defaultClayColor = options?.defaultClayColor || "#DDCCAA";
        
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
            
            // Create clay material
            this.createClayMaterial();
            
            // Apply clay material
            this.applyClayToAllFragments();
            
            this.isClayMode = true;
            this.updateUIState();
            
            // Enhanced viewer refresh
            this.forceViewerRefresh();
            
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
            
            // Enhanced viewer refresh
            this.forceViewerRefresh();
            
            console.log(`${this.extensionName}: Clay mode disabled successfully`);
        } catch (error) {
            console.error(`${this.extensionName}: Error disabling clay mode:`, error);
        }
    }

    /**
     * Fixed clay material creation using viewer-compatible materials
     */
    createClayMaterial(color = this.defaultClayColor) {
        if (!window.THREE) {
            console.error(`${this.extensionName}: THREE.js not available`);
            return null;
        }

        const THREE = window.THREE;
        
        // Convert color string to number
        const colorHex = typeof color === 'string' ? 
            parseInt(color.replace('#', '0x')) : color;

        // FIXED: Use MeshBasicMaterial for better compatibility with APS Viewer
        this.clayMaterial = new THREE.MeshBasicMaterial({
            color: colorHex,
            transparent: false,
            opacity: 1.0,
            side: THREE.DoubleSide, // Ensure both sides are rendered
            vertexColors: false,
            fog: true
        });

        // Alternative: Use MeshPhongMaterial for better lighting
        // this.clayMaterial = new THREE.MeshPhongMaterial({
        //     color: colorHex,
        //     transparent: false,
        //     opacity: 1.0,
        //     side: THREE.DoubleSide,
        //     shininess: 10,
        //     specular: 0x111111
        // });

        this.clayMaterial.name = 'ClayMaterial_' + Date.now();
        this.clayMaterial.needsUpdate = true;

        console.log(`${this.extensionName}: Clay material created with color ${color}`);
        return this.clayMaterial;
    }

    /**
     * Store original materials with improved error handling
     */
    storeOriginalMaterials() {
        if (!this.viewer.model) {
            console.warn(`${this.extensionName}: No model available for material storage`);
            return;
        }

        console.log(`${this.extensionName}: Storing original materials`);
        this.originalMaterials.clear();

        const fragList = this.viewer.model.getFragmentList();
        if (!fragList) {
            console.warn(`${this.extensionName}: No fragment list available`);
            return;
        }

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
                console.warn(`${this.extensionName}: Failed to store material for fragment ${fragId}:`, error);
            }
        }

        console.log(`${this.extensionName}: Stored ${storedCount}/${fragCount} original materials`);
    }

    /**
     * FIXED: Improved clay material application with multiple fallback methods
     */
    applyClayToAllFragments() {
        if (!this.viewer.model || !this.clayMaterial) {
            console.warn(`${this.extensionName}: Model or clay material not available`);
            return;
        }

        console.log(`${this.extensionName}: Applying clay material to all fragments`);

        const fragList = this.viewer.model.getFragmentList();
        if (!fragList) {
            console.warn(`${this.extensionName}: No fragment list available`);
            return;
        }

        const fragCount = fragList.getCount();
        let appliedCount = 0;
        let errors = 0;

        // Method 1: Direct setMaterial approach
        for (let fragId = 0; fragId < fragCount; fragId++) {
            try {
                // Primary method: Set material directly
                fragList.setMaterial(fragId, this.clayMaterial);
                
                // Secondary method: Update mesh material if available
                const mesh = fragList.getVizmesh(fragId);
                if (mesh && mesh.material) {
                    mesh.material = this.clayMaterial;
                    mesh.material.needsUpdate = true;
                }

                appliedCount++;
            } catch (error) {
                console.warn(`${this.extensionName}: Failed to apply clay material to fragment ${fragId}:`, error);
                errors++;
            }
        }

        console.log(`${this.extensionName}: Applied clay material to ${appliedCount}/${fragCount} fragments (${errors} errors)`);

        // If direct method had significant failures, try alternative approach
        if (errors > fragCount * 0.1) { // More than 10% failures
            console.log(`${this.extensionName}: High error rate detected, trying alternative material application...`);
            this.applyClayMaterialAlternative();
        }
    }

    /**
     * Alternative material application method for difficult cases
     */
    applyClayMaterialAlternative() {
        try {
            const matman = this.viewer.impl.matman();
            if (!matman) {
                console.warn(`${this.extensionName}: Material manager not available`);
                return;
            }

            // Create a material variant for the viewer
            const materialId = matman.addMaterial(
                'clay_material_' + Date.now(), 
                this.clayMaterial, 
                true // skip naming
            );

            const fragList = this.viewer.model.getFragmentList();
            const fragCount = fragList.getCount();
            let altAppliedCount = 0;

            for (let fragId = 0; fragId < fragCount; fragId++) {
                try {
                    fragList.setMaterial(fragId, materialId);
                    altAppliedCount++;
                } catch (error) {
                    // Silent failure for alternative method
                }
            }

            console.log(`${this.extensionName}: Alternative method applied to ${altAppliedCount}/${fragCount} fragments`);
        } catch (error) {
            console.error(`${this.extensionName}: Alternative material application failed:`, error);
        }
    }

    /**
     * Restore original materials with improved error handling
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
        let errors = 0;

        for (const [fragId, originalMaterial] of this.originalMaterials) {
            try {
                fragList.setMaterial(fragId, originalMaterial);

                // Also restore mesh material if accessible
                const mesh = fragList.getVizmesh(fragId);
                if (mesh && mesh.material) {
                    mesh.material = originalMaterial;
                    mesh.material.needsUpdate = true;
                }

                restoredCount++;
            } catch (error) {
                console.warn(`${this.extensionName}: Failed to restore material for fragment ${fragId}:`, error);
                errors++;
            }
        }

        console.log(`${this.extensionName}: Restored ${restoredCount}/${this.originalMaterials.size} original materials (${errors} errors)`);
    }

    /**
     * Enhanced viewer refresh to ensure visual updates
     */
    forceViewerRefresh() {
        try {
            // Multiple refresh approaches
            this.viewer.impl.invalidate(true, true, true);
            
            // Force scene refresh
            if (this.viewer.impl.sceneUpdated) {
                this.viewer.impl.sceneUpdated(true);
            }
            
            // Request animation frame to ensure render
            requestAnimationFrame(() => {
                this.viewer.impl.invalidate(true, true, true);
            });

            // Additional refresh after short delay
            setTimeout(() => {
                this.viewer.impl.invalidate(true, true, true);
                console.log(`${this.extensionName}: Delayed refresh completed`);
            }, 100);

        } catch (error) {
            console.error(`${this.extensionName}: Error during viewer refresh:`, error);
        }
    }

    /**
     * Apply a different clay variant
     */
    applyClayVariant(colorHex) {
        if (!this.isClayMode) return;

        console.log(`${this.extensionName}: Applying clay variant: ${colorHex}`);
        
        this.createClayMaterial(colorHex);
        this.applyClayToAllFragments();
        
        this.forceViewerRefresh();
    }

    /**
     * Create clay control panel
     */
    createClayPanel() {
        // Panel creation would go here - simplified for this fix
        console.log(`${this.extensionName}: Clay control panel would be created here`);
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

console.log('Fixed Clay Extension registered successfully');