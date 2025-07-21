/**
 * Basic Skeleton Extension for APS Viewer
 * Template following official APS extension patterns
 */
console.log('🎯 BasicSkeleton Extension script loaded!');

class BasicSkeleton extends Autodesk.Viewing.Extension {
    constructor(viewer, options) {
        super(viewer, options);
        
        this.extensionName = 'BasicSkeleton';
        
        // Bind event handlers (Official Pattern)
        this.onToolbarCreatedBinded = null;
        this.onObjectTreeCreatedBinded = null;
    }

    load() {
        console.log(`${this.extensionName} loaded`);

        // Bind event handlers
        this.onObjectTreeCreatedBinded = this.onObjectTreeCreated.bind(this);

        // Handle Toolbar Creation (Official Pattern)
        if (this.viewer.toolbar) {
            this.createUI();
        } else {
            this.onToolbarCreatedBinded = this.onToolbarCreated.bind(this);
            this.viewer.addEventListener(Autodesk.Viewing.TOOLBAR_CREATED_EVENT, this.onToolbarCreatedBinded);
        }

        // Handle Object Tree Creation (Official Pattern)
        if (this.viewer.model && this.viewer.model.getInstanceTree()) {
            this.onObjectTreeCreated();
        } else {
            this.viewer.addEventListener(Autodesk.Viewing.OBJECT_TREE_CREATED_EVENT, this.onObjectTreeCreatedBinded);
        }

        return true;
    }

    unload() {
        console.log(`${this.extensionName} unloaded`);
        
        // Cleanup (Official Pattern)
        this.removeUI();
        this.removeEventListeners();
        this.cleanupBindings();
        
        return true;
    }

    // Official Pattern: Toolbar creation handler
    onToolbarCreated() {
        this.viewer.removeEventListener(Autodesk.Viewing.TOOLBAR_CREATED_EVENT, this.onToolbarCreatedBinded);
        this.onToolbarCreatedBinded = null;
        this.createUI();
    }

    // Official Pattern: Object tree creation handler
    onObjectTreeCreated() {
        console.log(`${this.extensionName}: Object tree created`);
        const tree = this.viewer.model.getInstanceTree();
        if (tree) {
            console.log(`${this.extensionName}: Ready to work with model data`);
        }
    }

    createUI() {
        console.log(`${this.extensionName}: Creating UI`);
        
        // Example: Create a simple button
        const button = new Autodesk.Viewing.UI.Button('basic-skeleton-button');
        button.onClick = () => {
            console.log(`${this.extensionName}: Button clicked!`);
        };
        button.addClass('basic-skeleton-button');
        button.setToolTip('Basic Skeleton Action');

        // Create control group and add to toolbar
        this.controlGroup = new Autodesk.Viewing.UI.ControlGroup('basic-skeleton-group');
        this.controlGroup.addControl(button);
        this.viewer.toolbar.addControl(this.controlGroup);
        
        console.log(`${this.extensionName}: UI created successfully`);
    }

    removeUI() {
        if (this.controlGroup) {
            this.viewer.toolbar.removeControl(this.controlGroup);
            this.controlGroup = null;
        }
        console.log(`${this.extensionName}: UI removed`);
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
    }
}

// Register extension (Official Pattern)
Autodesk.Viewing.theExtensionManager.registerExtension('BasicSkeleton', BasicSkeleton);

console.log('BasicSkeleton extension registered');
