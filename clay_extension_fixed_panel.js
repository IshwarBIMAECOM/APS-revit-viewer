/**
 * Clay Extension - Fixed Clay Panel Implementation
 * Addresses the setVisible error and creates a proper clay control panel
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

    // FIXED: Proper clay panel show/hide logic
    showClayPanel() {
        console.log(`${this.extensionName}: Attempting to show clay panel`);
        
        try {
            if (!this.clayPanel) {
                console.log(`${this.extensionName}: Creating clay panel for the first time`);
                this.createClayPanel();
            }
            
            if (this.clayPanel) {
                const isCurrentlyVisible = this.clayPanel.isVisible();
                console.log(`${this.extensionName}: Panel currently visible: ${isCurrentlyVisible}`);
                
                if (isCurrentlyVisible) {
                    this.clayPanel.setVisible(false);
                    console.log(`${this.extensionName}: Clay panel hidden`);
                } else {
                    this.clayPanel.setVisible(true);
                    console.log(`${this.extensionName}: Clay panel shown`);
                }
            } else {
                console.error(`${this.extensionName}: Failed to create clay panel`);
            }
        } catch (error) {
            console.error(`${this.extensionName}: Error in showClayPanel:`, error);
        }
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
            opacity: 0.8,
            color: color
        });

        this.clayMaterial.name = 'ClayMaterial_' + Date.now();
        this.clayMaterial.needsUpdate = true;

        console.log(`${this.extensionName}: Clay material created with color ${color.toString(16)}`);
        return this.clayMaterial;
    }

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

    applyClayVariant(colorHex) {
        if (!this.isClayMode) return;

        console.log(`${this.extensionName}: Applying clay variant: ${colorHex}`);
        
        this.createClayMaterial(colorHex);
        this.applyClayMaterialOfficial();
        
        // Inform the viewer that there were changes to the scene
        this.viewer.impl.invalidate(true);
    }

    /**
     * FIXED: Proper clay control panel creation using APS DockingPanel
     */
    createClayPanel() {
        console.log(`${this.extensionName}: Creating clay control panel`);
        
        try {
            // Create a proper APS DockingPanel
            this.clayPanel = new ClayControlPanel(this.viewer, this.viewer.container, 'clay-control-panel', this);
            
            if (this.clayPanel) {
                console.log(`${this.extensionName}: Clay control panel created successfully`);
                this.clayPanel.setVisible(false); // Start hidden
            } else {
                console.error(`${this.extensionName}: Failed to create clay control panel`);
            }
        } catch (error) {
            console.error(`${this.extensionName}: Error creating clay panel:`, error);
            
            // Fallback: Create a simple HTML panel
            this.createFallbackPanel();
        }
    }

    /**
     * Fallback panel creation if DockingPanel fails
     */
    createFallbackPanel() {
        console.log(`${this.extensionName}: Creating fallback HTML panel`);
        
        try {
            // Create a simple HTML panel as fallback
            const panelDiv = document.createElement('div');
            panelDiv.id = 'clay-control-panel-fallback';
            panelDiv.style.cssText = `
                position: fixed;
                top: 100px;
                right: 20px;
                width: 200px;
                background: white;
                border: 1px solid #ccc;
                border-radius: 4px;
                padding: 15px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                z-index: 1000;
                display: none;
                font-family: Arial, sans-serif;
                font-size: 12px;
            `;
            
            panelDiv.innerHTML = `
                <h3 style="margin: 0 0 15px 0; color: #333;">Clay Settings</h3>
                <div id="clay-color-options">
                    ${this.clayOptions.map((option, index) => `
                        <button 
                            onclick="clayExtensionInstance.applyClayVariant(${option.color})"
                            style="
                                display: block;
                                width: 100%;
                                margin-bottom: 5px;
                                padding: 8px;
                                border: 1px solid #ccc;
                                background: white;
                                cursor: pointer;
                                border-radius: 3px;
                            "
                        >${option.name}</button>
                    `).join('')}
                </div>
                <button 
                    onclick="clayExtensionInstance.hideFallbackPanel()"
                    style="
                        margin-top: 10px;
                        padding: 5px 10px;
                        background: #f0f0f0;
                        border: 1px solid #ccc;
                        cursor: pointer;
                        border-radius: 3px;
                    "
                >Close</button>
            `;
            
            document.body.appendChild(panelDiv);
            
            // Create a simple panel object that mimics DockingPanel interface
            this.clayPanel = {
                element: panelDiv,
                isVisible: () => panelDiv.style.display !== 'none',
                setVisible: (visible) => {
                    panelDiv.style.display = visible ? 'block' : 'none';
                },
                uninitialize: () => {
                    if (panelDiv.parentNode) {
                        panelDiv.parentNode.removeChild(panelDiv);
                    }
                }
            };
            
            // Make this extension instance globally accessible for button clicks
            window.clayExtensionInstance = this;
            
            console.log(`${this.extensionName}: Fallback panel created successfully`);
        } catch (error) {
            console.error(`${this.extensionName}: Failed to create fallback panel:`, error);
        }
    }

    /**
     * Method to hide fallback panel
     */
    hideFallbackPanel() {
        if (this.clayPanel && this.clayPanel.setVisible) {
            this.clayPanel.setVisible(false);
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

        console.log(`${this.extensionName}: UI state updated - Clay mode: ${this.isClayMode}`);
    }
}

/**
 * Clay Control Panel - Proper APS DockingPanel Implementation
 */
class ClayControlPanel extends Autodesk.Viewing.UI.DockingPanel {
    constructor(viewer, parentContainer, id, clayExtension) {
        super(parentContainer, id, 'Clay Settings');
        
        this.viewer = viewer;
        this.clayExtension = clayExtension;
        
        // Initialize the panel
        this.container.style.width = '250px';
        this.container.style.height = 'auto';
        this.container.style.resize = 'none';
        
        this.createContent();
    }

    createContent() {
        const content = document.createElement('div');
        content.style.padding = '15px';
        
        content.innerHTML = `
            <div class="clay-panel-content">
                <label>Clay Types:</label>
                <div id="clay-type-buttons">
                    ${this.clayExtension.clayOptions.map((option, index) => `
                        <button 
                            class="clay-type-btn" 
                            data-color="${option.color}"
                            style="
                                display: block;
                                width: 100%;
                                padding: 6px 12px;
                                margin-bottom: 4px;
                                border: 1px solid #ccc;
                                border-radius: 3px;
                                background-color: white;
                                color: #333;
                                font-size: 11px;
                                cursor: pointer;
                                transition: all 0.2s ease;
                                text-align: left;
                            "
                        >${option.name}</button>
                    `).join('')}
                </div>
            </div>
        `;
        
        this.container.appendChild(content);
        
        // Add event listeners for clay type buttons
        const buttons = content.querySelectorAll('.clay-type-btn');
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                const color = parseInt(button.dataset.color);
                this.clayExtension.applyClayVariant(color);
            });
            
            // Add hover effects
            button.addEventListener('mouseenter', () => {
                button.style.borderColor = '#0090D2';
                button.style.boxShadow = '0 1px 4px rgba(0, 144, 210, 0.3)';
                button.style.transform = 'translateY(-1px)';
            });
            
            button.addEventListener('mouseleave', () => {
                button.style.borderColor = '#ccc';
                button.style.boxShadow = 'none';
                button.style.transform = 'translateY(0)';
            });
        });
    }
}

// Register the extension
Autodesk.Viewing.theExtensionManager.registerExtension('ClayExtension', ClayExtension);

console.log('Clay Extension (Fixed Panel) registered successfully');