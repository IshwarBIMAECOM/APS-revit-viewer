/**
 * Test Extension Debug Script
 * This script will help debug toolbar and extension loading issues
 */

// Add global debugging function
window.debugClayExtension = function() {
    console.log('🔍 DEBUG: ClayExtension Status Check');
    console.log('📊 Viewer State:', {
        viewerExists: !!window.viewer,
        hasToolbar: !!window.viewer?.toolbar,
        toolbarControls: window.viewer?.toolbar?.getNumberOfControls?.(),
        hasModel: !!window.viewer?.model,
        hasInstanceTree: !!window.viewer?.model?.getInstanceTree()
    });
    
    console.log('📊 Extension Registration:', {
        extensionManager: !!Autodesk.Viewing.theExtensionManager,
        clayExtensionRegistered: !!Autodesk.Viewing.theExtensionManager?.extensions?.ClayExtension,
        loadedExtensions: window.viewer?.loadedExtensions || {}
    });
    
    console.log('📊 DOM Elements:', {
        clayToolbar: !!document.getElementById('clay-toolbar'),
        clayToggleButton: !!document.getElementById('clay-toggle-button'),
        claySettingsButton: !!document.getElementById('clay-settings-button')
    });
    
    // Try to manually create a test toolbar button
    if (window.viewer && window.viewer.toolbar) {
        console.log('🧪 Testing manual toolbar button creation...');
        try {
            const testButton = new Autodesk.Viewing.UI.Button('debug-test-button');
            testButton.onClick = () => console.log('🎯 Test button clicked!');
            testButton.setToolTip('Debug Test Button');
            
            const testGroup = new Autodesk.Viewing.UI.ControlGroup('debug-test-group');
            testGroup.addControl(testButton);
            
            window.viewer.toolbar.addControl(testGroup);
            console.log('✅ Test button created successfully');
            
            // Remove it after 5 seconds
            setTimeout(() => {
                window.viewer.toolbar.removeControl(testGroup);
                console.log('🗑️ Test button removed');
            }, 5000);
            
        } catch (error) {
            console.error('❌ Error creating test button:', error);
        }
    }
};

// Also add this to window for easy access
window.testClayExtension = function() {
    console.log('🧪 Testing ClayExtension manually...');
    if (window.viewer && Autodesk.Viewing.theExtensionManager?.extensions?.ClayExtension) {
        try {
            window.viewer.loadExtension('ClayExtension', {
                clayTypes: [
                    { name: "Debug Clay", color: "#FF0000" }
                ],
                defaultClayColor: "#FF0000"
            });
            console.log('✅ ClayExtension loaded manually');
        } catch (error) {
            console.error('❌ Error loading ClayExtension manually:', error);
        }
    } else {
        console.error('❌ ClayExtension not available for manual loading');
    }
};

console.log('🔧 Debug functions loaded. Use debugClayExtension() or testClayExtension() in console.');
