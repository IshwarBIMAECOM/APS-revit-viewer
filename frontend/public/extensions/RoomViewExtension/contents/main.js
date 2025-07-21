/**
 * Basic Skeleton Extension for APS Viewer
 * Template following official APS extension patterns
 */


class RoomViewExtension extends Autodesk.Viewing.Extension {
    constructor(viewer, options) {
        super(viewer, options);
        
        this.extensionName = 'RoomViewExtension';
        this.isRoomViewMode = false;
        this.originalThemingColors = new Map()
        this.clayMaterial = null;
        this.RoomViewToolbar = null

        
        this.defaultClayColor = options?.defaultClayColor || 0xF5F5F5;

        // Bind event handlers (Official Pattern)
        this.onToolbarCreatedBinded = null;
        this.onViewerReadyBinded = null;
        this.onGeometryLoadedBinded = null;
        this.toggleRoomViewBinded = null;
    }

    load() {
        console.log(`${this.extensionName} loaded`);

        // Bind event handlers
        this.onViewerReadyBinded = this.onViewerReady.bind(this);
        this.onGeometryLoadedBinded = this.onGeometryLoaded.bind(this);
        this.toggleRoomViewBinded = this.toggleRoomView.bind(this);
        this.showRoomViewBinded = this.showRoomView.bind(this);

        // Handle Toolbar Creation (Official Pattern)
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
        
        if (this.isRoomViewMode) {
            this.disableRoomViewMode();
        }
        
        // Cleanup (Official Pattern)
        this.removeUI();
        this.removeEventListeners();
        this.cleanupBindings();

        this.originalThemingColors.clear();
        this.clayMaterial = null;
        
        return true;
    }

    // Official Pattern: Toolbar creation handler
    onToolbarCreated() {
        this.viewer.removeEventListener(Autodesk.Viewing.TOOLBAR_CREATED_EVENT, this.onToolbarCreatedBinded);
        this.onToolbarCreatedBinded = null;
        this.createUI();
    }

    createUI() {
        console.log(`${this.extensionName}: Creating UI`);
        
        // Example: Create a simple button
        const button = new Autodesk.Viewing.UI.Button('RoomViewButton');
        button.onClick = this.toggleRoomViewModeBinded;
        button.addClass('Room-View-button');
        button.setToolTip('Room View Toggle');

        // Create control group and add to toolbar
        this.controlGroup = new Autodesk.Viewing.UI.ControlGroup('Room-View-group');
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

    setupEventListeners() {
        this.viewer.addEventListener(Autodesk.Viewing.VIEWER_STATE_RESTORED_EVENT, this.onViewerReadyBinded);
        this.viewer.addEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, this.onGeometryLoadedBinded);
        
    }
    removeEventListeners() {

        this.viewer.removeEventListener(Autodesk.Viewing.TOOLBAR_CREATED_EVENT, this.onToolbarCreatedBinded);
        this.viewer.removeEventListener(Autodesk.Viewing.VIEWER_STATE_RESTORED_EVENT, this.onViewerReadyBinded);
        this.viewer.removeEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, this.onGeometryLoadedBinded);
    }

    cleanupBindings() {
        this.onToolbarCreatedBinded = null;
        this.onViewerReadyBinded = null;
        this.onGeometryLoadedBinded = null;
        this.toggleRoomViewBinded = null;

    }

    onViewerReady(){
        console.log(`${this.extensionName}: Viewer ready`);
    }

    onGeometryLoaded(){
        console.log(`${this.extensionName}: Geometry loaded, room view controls now available`);
        this.updateUIState();
    }

    toggleRoomView(){
        if (!this.viewer.model) {
            console.warn(`${this.extensionName}: No model loaded`);
            return;
        }

        if (this.isRoomViewMode) {
            this.disableRoomViewMode();
        } else {
            this.enableRoomViewMode();
        }
    }

    enableRoomViewMode(){
        console.log(`${this.extensionName}: Enabling room view mode`);

    }

    getAllRoomDbIds(){
        const tree = this.viewer.model.getInstanceTree()
        if (!tree) return []
        //get all db Ids
        const allDbIds = []
        tree.enumNodeChildren(tree.getRootId(), (dbId)=>{
            allDbIds.push(dbId)
        }, true)
        console.log(`checking ${allDbIds.length} objects for room properties`)
        return new Promise((resolve) =>{
            const roomDbIds = []
            let processed = 0
            const batchSize = 50

            const processBatch = (startIndex) =>{
                const batch = allDbIds.slice(startIndex, startIndex + batchSize)
                if (batch.length === 0) {
                    resolve(roomDbIds)
                    return
                }
                this.viewer.model.getPropertyDb().getBulkProperties(
                    batch,
                    ['Category'],
                    (result) =>{
                        result.forEach(item =>{
                            const props = item.properties
                            const isRoom = props.some(prop =>{
                                const value = prop.displayValue?.toLowerCase() || ''
                                const name = prop.displayName?.toLowerCase() || ''
                                return (
                                    //check category
                                    (name === 'category' && (
                                        value.includes('room')
                                    )) 
                                )
                            })
                            if (isRoom) {
                                roomDbIds.push(item.dbId)
                                console.log(`found room: ${item.dbId}`, props.map(p=>`${p.displayName}: ${p.displayValue}`))
                            }
                        })
                        processed += batch.length
                        console.log(`Processed ${processed}/${allDbIds.length}objects, found ${roomDbIds.length} rooms so far`)
                        //process next batch
                        setTimeout(() => processBatch(startIndex + batchSize), 10)
                    }, (error) =>{
                        console.error(`Error processing batch: ${error}`)
                        processBatch(startIndex + batchSize)
                    }
                )
            }
            processBatch(0)
        })

    }

    getRoomFragments(dbIds){
        const fragList = this.viewer.model.getFragmentList()
        const roomFragments = new Set()

        if(!fragList) return roomFragments

        const totalFragments = fragList.getCount()
        for (let fragId=0; fragId<totalFragments; fragId++){
            
        }
    }


}

// Register extension (Official Pattern)
Autodesk.Viewing.theExtensionManager.registerExtension('BasicSkeleton', BasicSkeleton);

console.log('BasicSkeleton extension registered');
