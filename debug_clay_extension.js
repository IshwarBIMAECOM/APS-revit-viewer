/**
 * Debugging Clay Extension - Enhanced diagnostics
 * This version includes extensive debugging to help identify material application issues
 */

class DebugClayExtension extends Autodesk.Viewing.Extension {
    constructor(viewer, options) {
        super(viewer, options);
        this.extensionName = 'DebugClayExtension';
        this.isClayMode = false;
        this.originalMaterials = new Map();
        this.clayMaterial = null;
        this.debugInfo = {
            fragCount: 0,
            materialsStored: 0,
            materialsApplied: 0,
            errors: []
        };
    }

    load() {
        console.log(`🎯 ${this.extensionName}: Starting load process`);
        
        // Quick debug setup
        this.createDebugUI();
        return true;
    }

    createDebugUI() {
        // Create a simple debug button
        const debugButton = document.createElement('button');
        debugButton.innerHTML = 'Debug Clay';
        debugButton.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 10000;
            padding: 10px;
            background: #ff6b6b;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        `;
        
        debugButton.onclick = () => this.runFullDiagnostics();
        document.body.appendChild(debugButton);
        
        console.log(`🎯 ${this.extensionName}: Debug UI created`);
    }

    runFullDiagnostics() {
        console.log(`🔍 === CLAY EXTENSION FULL DIAGNOSTICS ===`);
        
        // 1. Check viewer state
        this.checkViewerState();
        
        // 2. Check THREE.js availability
        this.checkThreeJS();
        
        // 3. Check model and fragment list
        this.checkModelAndFragments();
        
        // 4. Test material creation
        this.testMaterialCreation();
        
        // 5. Test material application methods
        this.testMaterialApplicationMethods();
        
        console.log(`🔍 === DIAGNOSTICS COMPLETE ===`);
    }

    checkViewerState() {
        console.log(`🔍 Checking viewer state...`);
        console.log(`- Viewer exists: ${!!this.viewer}`);
        console.log(`- Viewer impl: ${!!this.viewer?.impl}`);
        console.log(`- Viewer scene: ${!!this.viewer?.impl?.scene}`);
        console.log(`- Model loaded: ${!!this.viewer?.model}`);
        console.log(`- Geometry loaded: ${this.viewer?.model?.isLoadDone()}`);
    }

    checkThreeJS() {
        console.log(`🔍 Checking THREE.js availability...`);
        console.log(`- window.THREE: ${!!window.THREE}`);
        console.log(`- THREE.MeshBasicMaterial: ${!!window.THREE?.MeshBasicMaterial}`);
        console.log(`- THREE.MeshLambertMaterial: ${!!window.THREE?.MeshLambertMaterial}`);
        console.log(`- THREE.MeshPhongMaterial: ${!!window.THREE?.MeshPhongMaterial}`);
    }

    checkModelAndFragments() {
        console.log(`🔍 Checking model and fragments...`);
        
        if (!this.viewer.model) {
            console.warn(`❌ No model loaded`);
            return;
        }

        const fragList = this.viewer.model.getFragmentList();
        if (!fragList) {
            console.warn(`❌ No fragment list available`);
            return;
        }

        const fragCount = fragList.getCount();
        console.log(`- Fragment count: ${fragCount}`);
        
        // Check first few fragments
        for (let i = 0; i < Math.min(5, fragCount); i++) {
            const material = fragList.getMaterial(i);
            const mesh = fragList.getVizmesh(i);
            
            console.log(`- Fragment ${i}:`);
            console.log(`  Material: ${material ? 'EXISTS' : 'NULL'}`);
            console.log(`  Material type: ${material?.type || 'N/A'}`);
            console.log(`  Mesh: ${mesh ? 'EXISTS' : 'NULL'}`);
            console.log(`  Mesh material: ${mesh?.material ? 'EXISTS' : 'NULL'}`);
        }
    }

    testMaterialCreation() {
        console.log(`🔍 Testing material creation...`);
        
        if (!window.THREE) {
            console.error(`❌ THREE.js not available`);
            return;
        }

        const THREE = window.THREE;
        
        // Test different material types
        const materialTypes = [
            { name: 'MeshBasicMaterial', constructor: THREE.MeshBasicMaterial },
            { name: 'MeshLambertMaterial', constructor: THREE.MeshLambertMaterial },
            { name: 'MeshPhongMaterial', constructor: THREE.MeshPhongMaterial }
        ];

        materialTypes.forEach(({ name, constructor }) => {
            try {
                const testMaterial = new constructor({
                    color: 0xDDCCAA,
                    transparent: false,
                    opacity: 1.0
                });
                console.log(`✅ ${name} created successfully`);
                console.log(`   - Type: ${testMaterial.type}`);
                console.log(`   - Color: ${testMaterial.color.getHex()}`);
            } catch (error) {
                console.error(`❌ ${name} creation failed:`, error);
            }
        });
    }

    testMaterialApplicationMethods() {
        console.log(`🔍 Testing material application methods...`);
        
        if (!this.viewer.model) {
            console.warn(`❌ No model for testing`);
            return;
        }

        const fragList = this.viewer.model.getFragmentList();
        if (!fragList || fragList.getCount() === 0) {
            console.warn(`❌ No fragments for testing`);
            return;
        }

        // Create test material
        const THREE = window.THREE;
        const testMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000, // Red for testing
            transparent: false,
            opacity: 1.0
        });

        console.log(`🧪 Testing with red test material...`);

        // Test on first fragment only
        const testFragId = 0;
        const originalMaterial = fragList.getMaterial(testFragId);
        
        console.log(`- Original material for fragment 0: ${originalMaterial?.type || 'NULL'}`);

        // Method 1: Direct setMaterial
        try {
            fragList.setMaterial(testFragId, testMaterial);
            console.log(`✅ Method 1 (setMaterial): SUCCESS`);
            
            // Check if it was actually applied
            const appliedMaterial = fragList.getMaterial(testFragId);
            console.log(`- Applied material type: ${appliedMaterial?.type}`);
            console.log(`- Applied material color: ${appliedMaterial?.color?.getHex()}`);
            
        } catch (error) {
            console.error(`❌ Method 1 (setMaterial): FAILED`, error);
        }

        // Method 2: Mesh material update
        try {
            const mesh = fragList.getVizmesh(testFragId);
            if (mesh && mesh.material) {
                mesh.material = testMaterial;
                mesh.material.needsUpdate = true;
                console.log(`✅ Method 2 (mesh.material): SUCCESS`);
            } else {
                console.warn(`⚠️ Method 2 (mesh.material): No mesh or mesh.material`);
            }
        } catch (error) {
            console.error(`❌ Method 2 (mesh.material): FAILED`, error);
        }

        // Method 3: Material Manager
        try {
            const matman = this.viewer.impl.matman();
            if (matman) {
                const materialId = matman.addMaterial('test_material', testMaterial, true);
                fragList.setMaterial(testFragId, materialId);
                console.log(`✅ Method 3 (material manager): SUCCESS`);
            } else {
                console.warn(`⚠️ Method 3: Material manager not available`);
            }
        } catch (error) {
            console.error(`❌ Method 3 (material manager): FAILED`, error);
        }

        // Force refresh and check visual result
        this.viewer.impl.invalidate(true, true, true);
        
        setTimeout(() => {
            console.log(`🔄 Refresh completed - check if fragment 0 is red`);
            
            // Restore original material
            if (originalMaterial) {
                fragList.setMaterial(testFragId, originalMaterial);
                this.viewer.impl.invalidate(true, true, true);
                console.log(`🔄 Original material restored`);
            }
        }, 1000);
    }

    // Simple clay toggle for testing
    toggleTestClay() {
        if (!this.isClayMode) {
            this.enableTestClay();
        } else {
            this.disableTestClay();
        }
    }

    enableTestClay() {
        console.log(`🎨 Enabling test clay mode...`);
        
        if (!window.THREE || !this.viewer.model) {
            console.error(`❌ Prerequisites not met`);
            return;
        }

        const THREE = window.THREE;
        const fragList = this.viewer.model.getFragmentList();
        
        // Store originals
        this.originalMaterials.clear();
        const fragCount = fragList.getCount();
        
        for (let i = 0; i < fragCount; i++) {
            const original = fragList.getMaterial(i);
            if (original) {
                this.originalMaterials.set(i, original);
            }
        }

        // Create and apply clay material
        const clayMaterial = new THREE.MeshBasicMaterial({
            color: 0xDDCCAA,
            transparent: false,
            opacity: 1.0,
            side: THREE.DoubleSide
        });

        let appliedCount = 0;
        for (let i = 0; i < fragCount; i++) {
            try {
                fragList.setMaterial(i, clayMaterial);
                appliedCount++;
            } catch (error) {
                console.warn(`Failed to apply to fragment ${i}:`, error);
            }
        }

        console.log(`🎨 Applied clay to ${appliedCount}/${fragCount} fragments`);
        
        this.isClayMode = true;
        this.viewer.impl.invalidate(true, true, true);
    }

    disableTestClay() {
        console.log(`🎨 Disabling test clay mode...`);
        
        if (!this.viewer.model || this.originalMaterials.size === 0) {
            console.warn(`❌ Cannot restore materials`);
            return;
        }

        const fragList = this.viewer.model.getFragmentList();
        let restoredCount = 0;

        for (const [fragId, originalMaterial] of this.originalMaterials) {
            try {
                fragList.setMaterial(fragId, originalMaterial);
                restoredCount++;
            } catch (error) {
                console.warn(`Failed to restore fragment ${fragId}:`, error);
            }
        }

        console.log(`🎨 Restored ${restoredCount}/${this.originalMaterials.size} materials`);
        
        this.isClayMode = false;
        this.originalMaterials.clear();
        this.viewer.impl.invalidate(true, true, true);
    }
}

// Register debug extension
Autodesk.Viewing.theExtensionManager.registerExtension('DebugClayExtension', DebugClayExtension);

console.log('🔍 Debug Clay Extension registered - click "Debug Clay" button to run diagnostics');