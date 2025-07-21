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
        this.originalThemingColors = new Map()
        this.clayMaterial = null;
        this.clayPanel = null;
        this.clayToolbar = null;
        
        this.clayOptions = options?.clayTypes || [
            { name: "Beige Clay", color: 0xDDCCAA },
            { name: "White Clay", color: 0xF5F5F5 },
            { name: "Terracotta", color: 0xCD853F },
            { name: "Gray Clay", color: 0x999999 }
        ];
        
        this.defaultClayColor = options?.defaultClayColor || 0xF5F5F5;
        //this.currentClayCOlor = new THREE.Color(this.defaultClayColor)
        
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
        this.originalThemingColors.clear();
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
        //var claySettingsButton = new Autodesk.Viewing.UI.Button('clay-settings-button');
        //claySettingsButton.onClick = this.showClayPanelBinded;
        //claySettingsButton.addClass('clay-settings-button');
        //claySettingsButton.setToolTip('Clay Settings');

        // Create Control Group
        this.clayToolbar = new Autodesk.Viewing.UI.ControlGroup('clay-toolbar');
        this.clayToolbar.addControl(clayToggleButton);
        //this.clayToolbar.addControl(claySettingsButton);

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
            //this.storeOriginalMaterials();
            this.storeOriginalThemingColors();
            this.applyClayThemingToAllObjects();

            // Create clay material using official Autodesk workflow
            //this.createClayMaterial();
            
            // Apply clay material using official method
            //this.applyClayMaterialOfficial();
            
            this.isClayMode = true;
            this.updateUIState();
            
            // Inform the viewer that there were changes to the scene
            //this.viewer.impl.invalidate(true);
            
            console.log(`${this.extensionName}: Clay mode enabled successfully`);
        } catch (error) {
            console.error(`${this.extensionName}: Error enabling clay mode:`, error);
        }
    }

    disableClayMode() {
        console.log(`${this.extensionName}: Disabling clay mode`);

        try {
            this.viewer.clearThemingColors()
            //this.restoreOriginalThemingColors()
            //this.restoreOriginalMaterials();
            
            this.isClayMode = false;
            this.updateUIState();
            
            // Inform the viewer that there were changes to the scene
            this.viewer.impl.invalidate(false, false, true);
            
            console.log(`${this.extensionName}: Clay mode disabled successfully`);
        } catch (error) {
            console.error(`${this.extensionName}: Error disabling clay mode:`, error);
        }
    }

    /**
     * Create clay material using official Autodesk workflow
     * Following the pattern from official documentation
     */
    storeOriginalThemingColors(){
        console.log(`${this.extensionName}: Storing original theming colors`);
        this.originalThemingColors.clear();
        const tree = this.viewer.model.getInstanceTree()
        if (!tree){
            console.warn(`${this.extensionName}: No instance tree available`)
            return
        }
        const rootId = tree.getRootId()
        tree.enumNodeChildren(rootId, (dbId)=>{
            this.originalThemingColors.set(dbId, null)
        }, true)
        console.log(`${this.extensionName}: Original theming colors stored`);
    }

    applyClayThemingToAllObjects(){
        if(!this.viewer.model){
            console.warn(`${this.extensionName}: No model available for theming`)
            return
        }
        console.log(`${this.extensionName}: Applying clay theming to all objects`);
        
        const clayVector4 = this.hexToVector4(this.defaultClayColor)
        console.log(`${this.extensionName}: Clay color Vector4:`, clayVector4)

        const tree = this.viewer.model.getInstanceTree()
        if (!tree) {
            console.warn(`${this.extensionName}: No instance tree available`);
            return;
        }
        let themedCount = 0
        const rootId = tree.getRootId()
        tree.enumNodeChildren(rootId, (dbId) =>{
            try{
                this.viewer.setThemingColor(dbId, clayVector4)
                themedCount++
            } catch (error){
                console.warn(`${this.extensionName}: Failed to set theming color for dbId ${dbId}:`, error)
            }
        }, true)
        console.log(`${this.extensionName}: Applied clay theming to ${themedCount} objects`)
        this.viewer.impl.invalidate(false, false, true)
    }
    hexToVector4(hexColor){
        const color = new THREE.Color(hexColor)
        return new THREE.Vector4(color.r, color.g, color.b, 1)
    }

    restoreOriginalThemingColors(){
        console.log(`${this.extensionName}: Restoring original theming colors`)
        if (this.originalThemingColors.size === 0){
            console.warn(`${this.extensionName}: No original theming colors to restore`)
            return
        }

        for (const[dbId, originalColor] of this.originalThemingColors){
            try{
                this.viewer.setThemingColor(dbId, originalColor)

            } catch(error){
                console.warn(`${this.extensionName}: Failed to restore theming color for dbId ${dbId}:`, error)
            }            
    }
    console.log(`${this.extensionName}: Original theming colors restored`)
}
        
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
    //storeOriginalMaterials() {
    //    if (!this.viewer.model) {
    //        console.warn(`${this.extensionName}: No model available for material storage`);
    //        return;
    //    }

    //    console.log(`${this.extensionName}: Storing original materials`);
    //    this.originalMaterials.clear();

    //    const tree = this.viewer.model.getInstanceTree();
    //    if (!tree) {
    //        console.warn(`${this.extensionName}: No instance tree available`);
    //        return;
    //    }

    //    const fragList = this.viewer.model.getFragmentList();
    //    if (!fragList) {
    //        console.warn(`${this.extensionName}: No fragment list available`);
    //        return;
    //    }

        // Store materials for all fragments
    //    tree.enumNodeFragments(tree.getRootId(), (fragId) => {
    //        const originalMaterial = fragList.getMaterial(fragId);
    //        if (originalMaterial) {
    //            this.originalMaterials.set(fragId, originalMaterial);
    //        }
    //    }, true); // true = recursive

    //    console.log(`${this.extensionName}: Stored ${this.originalMaterials.size} original materials`);
    //}

    /**
     * Apply clay material using official Autodesk workflow
     * Fixed for consolidated models based on knowledge graph insights
     */
    //applyClayMaterialOfficial() {
    //    if (!this.viewer.model || !this.clayMaterial) {
    //        console.warn(`${this.extensionName}: Model or clay material not available`);
    //        return;
    //    }

    //    console.log(`${this.extensionName}: Applying clay material using official workflow`);
    //    console.log(`${this.extensionName}: Model is consolidated:`, this.viewer.model.isConsolidated());

    //    const tree = this.viewer.model.getInstanceTree();
    //    if (!tree) {
    //        console.warn(`${this.extensionName}: No instance tree available`);
    //        return;
    //    }

    //    // Get material manager - following official pattern
    //    const materials = this.viewer.impl.matman();
    //    if (!materials) {
    //        console.warn(`${this.extensionName}: Material manager not available`);
    //        return;
    //    }

        // Register material with material manager
    //    materials.addMaterial("ClayMaterial", this.clayMaterial, true);
        
    //    const fragList = this.viewer.model.getFragmentList();
    //    let appliedCount = 0;
    //    let failedCount = 0;
        
    //    // Handle consolidated vs non-consolidated models differently
    //    if (this.viewer.model.isConsolidated()) {
    //        console.log(`${this.extensionName}: Applying materials to consolidated model`);
            
    //        tree.enumNodeFragments(tree.getRootId(), (fragId) => {
    //            try {
                    // For consolidated models: Use INSTANCED material variant (not VERTEX_IDS)
    //                const materialVariant = materials.getMaterialVariant(
    //                    this.clayMaterial, 
    //                    Autodesk.Viewing.Private.MATERIAL_VARIANT.INSTANCED, 
    //                    this.viewer.model
    //                );
                    
    //                if (materialVariant) {
                        // Set needsUpdate flag on the material variant
    //                    materialVariant.needsUpdate = true;
    //                    fragList.setMaterial(fragId, materialVariant);
    //                    appliedCount++;
    //                    console.log(`${this.extensionName}: Applied INSTANCED material variant to fragment ${fragId}`);
    //                } else {
    //                    // Fallback: Direct material assignment with needsUpdate
    //                    this.clayMaterial.needsUpdate = true;
    //                    fragList.setMaterial(fragId, this.clayMaterial);
    //                    appliedCount++;
    //                    console.log(`${this.extensionName}: Applied direct material to fragment ${fragId} (variant failed)`);
    //                }
                    
                    // CRITICAL: Also update mesh material directly for consolidated models
    //                const mesh = fragList.getVizmesh(fragId);
    //                if (mesh && mesh.material) {
    //                    mesh.material = materialVariant || this.clayMaterial;
    //                    mesh.material.needsUpdate = true;
    //                }
                    
    //            } catch (error) {
    //                console.warn(`${this.extensionName}: Failed to apply material to fragment ${fragId}:`, error);
    //                failedCount++;
    //            }
    //        }, true);
            
    //    } else {
    //        console.log(`${this.extensionName}: Applying materials to non-consolidated model`);

    //        tree.enumNodeFragments(tree.getRootId(), (fragId) => {
    //            try {
                    // For non-consolidated models, direct assignment works better
    //                this.clayMaterial.needsUpdate = true;
    //                fragList.setMaterial(fragId, this.clayMaterial);
                    
    //                // Also update mesh material
    //                const mesh = fragList.getVizmesh(fragId);
    //                if (mesh && mesh.material) {
    //                    mesh.material = this.clayMaterial;
    //                    mesh.material.needsUpdate = true;
    //                }
                        
    //                appliedCount++;
    //            } catch (error) {
    //                console.warn(`${this.extensionName}: Failed to apply material to fragment ${fragId}:`, error);
    //                failedCount++;
    //            }
    //        }, true);
    //    }

    //    console.log(`${this.extensionName}: Applied clay material to ${appliedCount} fragments, ${failedCount} failed`);
        
        // CRITICAL: Force viewer update with the correct invalidation pattern
    //    console.log(`${this.extensionName}: Forcing comprehensive viewer update`);
        
        // Pattern from knowledge graph: invalidate(false, false, true) for material updates
    //    this.viewer.impl.invalidate(true);
        
        // Additional invalidation for consolidated models
    //    if (this.viewer.model.isConsolidated()) {
    //        // Force scene update for consolidated geometry
    //        this.viewer.impl.sceneUpdated(true);
            
            // Additional refresh with delay to allow GPU processing
    //        setTimeout(() => {
    //            this.viewer.refresh(true);
    //            console.log(`${this.extensionName}: Delayed refresh completed`);
    //        }, 150);
    //    }
    //}

    /**
     * Restore original materials using official pattern
     */
    //restoreOriginalMaterials() {
    //    if (!this.viewer.model || this.originalMaterials.size === 0) {
    //        console.warn(`${this.extensionName}: No model or stored materials to restore`);
    //        return;
    //    }

    //    console.log(`${this.extensionName}: Restoring original materials`);
    //    console.log(`${this.extensionName}: Model is consolidated:`, this.viewer.model.isConsolidated());

    //    const fragList = this.viewer.model.getFragmentList();
    //    if (!fragList) {
    //        console.warn(`${this.extensionName}: No fragment list available for restoration`);
    //        return;
    //    }

    //    let restoredCount = 0;
    //    let failedCount = 0;
        
    //    for (const [fragId, originalMaterial] of this.originalMaterials) {
    //        try {
    //            // Set needsUpdate flag on original material
    //            if (originalMaterial) {
    //                originalMaterial.needsUpdate = true;
    //            }
                
    //            fragList.setMaterial(fragId, originalMaterial);
                
                // CRITICAL: Also update mesh material directly
    //            const mesh = fragList.getVizmesh(fragId);
    //            if (mesh && mesh.material) {
    //                mesh.material = originalMaterial;
    //                mesh.material.needsUpdate = true;
    //            }
                
    //            restoredCount++;
    //        } catch (error) {
    //            console.warn(`${this.extensionName}: Failed to restore material for fragment ${fragId}:`, error);
    //            failedCount++;
    //        }
    //    }

    //    console.log(`${this.extensionName}: Restored ${restoredCount}/${this.originalMaterials.size} original materials, ${failedCount} failed`);
        
        // CRITICAL: Use the same invalidation pattern as material application
    //    console.log(`${this.extensionName}: Forcing comprehensive viewer update for restoration`);
        
        // Pattern from knowledge graph: invalidate(false, false, true) for material updates
    //    this.viewer.impl.invalidate(false, false, true);
        
        // Additional invalidation for consolidated models
    //    if (this.viewer.model.isConsolidated()) {
    //        // Force scene update for consolidated geometry
    //        this.viewer.impl.sceneUpdated(true);
            
            // Additional refresh with delay to allow GPU processing
    //        setTimeout(() => {
    //            this.viewer.refresh(true);
    //            console.log(`${this.extensionName}: Delayed restoration refresh completed`);
    //        }, 150);
    //    }
    //}

    /**
     * Apply a different clay variant
     */
    applyClayVariant(colorHex) {
        if (!this.isClayMode) return;

        console.log(`${this.extensionName}: Applying clay variant: ${colorHex}`);
        
        //this.createClayMaterial(colorHex);
        //this.applyClayMaterialOfficial();
        this.defaultClayColor = colorHex
        this.applyClayThemingToAllObjects()
        
        // The render update is now handled inside applyClayMaterialOfficial()
    }

    /**
     * Create clay control panel
     */
    //createClayPanel() {
        // Simplified panel creation for this example
        //console.log(`${this.extensionName}: Clay control panel would be created here`);
        
        // You could create a proper panel here with clay color options
        // using the this.clayOptions array
    //}

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