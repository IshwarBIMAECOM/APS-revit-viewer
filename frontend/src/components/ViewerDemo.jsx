import React, { useEffect, useRef, useState, useCallback } from 'react'
import axios from 'axios'
// Add import for THREE
const THREE = window.THREE || {};

// SVF URL verification function
const verifySvfUrl = async (svfUrl, token) => {
    console.log('🔍 Verifying SVF URL accessibility...');
    
    try {
        // Test if SVF URL is accessible
        const response = await fetch(svfUrl, {
            method: 'HEAD', // Just check headers, don't download content
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        
        console.log('📊 SVF URL Status:', response.status);
        console.log('📊 SVF URL Headers:', Object.fromEntries(response.headers));
        
        if (response.ok) {
            console.log('✅ SVF URL is accessible');
            
            // If it's a manifest endpoint, try to get the actual content
            if (svfUrl.includes('/manifest/')) {
                const contentResponse = await fetch(svfUrl, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                });
                
                if (contentResponse.ok) {
                    const manifestData = await contentResponse.json();
                    console.log('📄 SVF Manifest data:', manifestData);
                } else {
                    console.warn('⚠️ SVF manifest content not accessible:', contentResponse.status);
                }
            }
        } else {
            console.error('❌ SVF URL not accessible:', response.status, response.statusText);
            
            // Try to get error details
            const errorText = await response.text();
            console.error('❌ Error details:', errorText);
        }
        
    } catch (error) {
        console.error('❌ SVF URL verification failed:', error);
    }
};

// SVF URL format helper
const logSvfUrlStructure = (url) => {
    console.log('🔗 SVF URL Structure:');
    console.log('   Full URL:', url);
    const parts = url.split('/');
    const urnIndex = parts.findIndex(part => part === 'designdata') + 1;
    const manifestIndex = parts.findIndex(part => part === 'manifest') + 1;
    if (urnIndex > 0 && manifestIndex > 0) {
        console.log('   Base URN:', parts[urnIndex]);
        console.log('   Viewable ID:', parts[manifestIndex]);
    }
};

const ViewerDemo = ({ jobData }) => {
    const viewerRef = useRef(null)
    const [viewer, setViewer] = useState(null)
    const [loading, setLoading] = useState(false);
    const [uiState, setUiState] = useState({ viewerReady: false, geometryReady: false, selectionCount: 0 })
    const [studioLighting] = useState(true); // Always true, no toggle
    const customLightsRef = useRef([]);

    const internalStateRef = useRef({
        objectTreeCreated: false,
        toolbarCreated: false,
        cameraPosition: null,
        loadingProgress: 0
    })

    // --- Studio Lighting Logic ---
    const cleanupCustomLights = () => {
        if (!viewer || !viewer.impl || !viewer.impl.scene) return;
        customLightsRef.current.forEach(light => {
            if (light.parent) {
                light.parent.remove(light);
            }
            if (light.dispose) {
                light.dispose();
            }
        });
        customLightsRef.current = [];
    };

    const setupStudioLighting = () => {
        if (!viewer || !viewer.impl || !viewer.impl.scene || !THREE.DirectionalLight) return;
        cleanupCustomLights();
        const scene = viewer.impl.scene;
        // Key light
        const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
        keyLight.position.set(100, 150, 100);
        scene.add(keyLight);
        customLightsRef.current.push(keyLight);
        // Fill light
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
        fillLight.position.set(-80, 120, 80);
        scene.add(fillLight);
        customLightsRef.current.push(fillLight);
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
        customLightsRef.current.push(ambientLight);
        // Optionally adjust exposure if available
        if (viewer.impl.glrenderer && viewer.impl.glrenderer().setTonemapExposure) {
            viewer.impl.glrenderer().setTonemapExposure(1.1);
        }
        viewer.impl.invalidate(true, true, true);
    };

    // --- End Studio Lighting Logic ---

    // --- Event Debugging ---
    const logViewerEvent = (eventName, data = null) => {
        console.log(`🎯 VIEWER EVENT: ${eventName}`, data ? data : '');
    };

    const handleViewerReady = (event) => {
        logViewerEvent('VIEWER_STATE_RESTORED_EVENT', event);
        setUiState(prev => ({...prev, viewerReady: true}));
        
        // ✅ NOW renderer is available - safe to set background color
        if (viewer) {
            viewer.setBackgroundColor(200, 200, 200, 255, 255, 255);
        }
        
        // ✅ NOW setup studio lighting - viewer.impl and THREE.js are available
        if (studioLighting) {
            setupStudioLighting();
        }
    };

    const handleGeometryLoaded = (event) => {
        logViewerEvent('GEOMETRY_LOADED_EVENT', event);
        setUiState(prev => ({...prev, geometryReady: true}));
        setLoading(false);
        if (viewer && viewer.impl){
            viewer.fitToView();
            // --- Material override here ---
            const matteGreyMaterial = new THREE.MeshPhongMaterial({
                color: 0x888888,
                flatShading: true,
                reflectivity: 0.0
            });
            overrideAllMaterials(viewer, matteGreyMaterial);
            viewer.impl.invalidate(true, true, true); // Force full redraw
        }
    };

    const handleObjectTreeCreated = (event) => {
        logViewerEvent('OBJECT_TREE_CREATED_EVENT', event);
        internalStateRef.current.objectTreeCreated = true;
    };

    const handleObjectTreeUnavailable = (event) => {
        logViewerEvent('OBJECT_TREE_UNAVAILABLE_EVENT', event);
    };

    const handleModelLoaded = (event) => {
        logViewerEvent('MODEL_LOADED_EVENT', event);
    };

    const handleModelUnloaded = (event) => {
        logViewerEvent('MODEL_UNLOADED_EVENT', event);
    };

    const handleSelectionChanged = (event) => {
        const selectionCount = (event.dbIdArray || []).length;
        logViewerEvent('SELECTION_CHANGED_EVENT', `Selection count: ${selectionCount}`);
        setUiState(prev => ({...prev, selectionCount}));
    };

    const handleCameraChange = (event) => {
        // Only log occasionally to avoid spam
        if (Math.random() < 0.01) logViewerEvent('CAMERA_CHANGE_EVENT (sampled)');
        if (viewer && viewer.getCamera){
            const camera = viewer.getCamera();
            internalStateRef.current.cameraPosition = {
                position: camera.position.toArray(),
                target: camera.getWorldDirection(new THREE.Vector3()).toArray(),
                up: camera.up.toArray()
            };
        }
    };

    const handleProgressUpdate = (event) => {
        const progress = event.percent || 0;
        logViewerEvent('PROGRESS_UPDATE_EVENT', `${progress}%`);
        internalStateRef.current.loadingProgress = progress;
        if (progress < 100 && !loading){
            setLoading(true);
        }
    };

    const handleToolbarCreated = (event) => {
        logViewerEvent('TOOLBAR_CREATED_EVENT', event);
        internalStateRef.current.toolbarCreated = true;
    };

    const handleError = (event) => {
        logViewerEvent('ERROR_EVENT', event);
        console.error('🚨 Viewer Error:', event);
        setLoading(false);
    };

    const handleTexturesLoaded = (event) => {
        logViewerEvent('TEXTURES_LOADED_EVENT', event);
    };

    const handleFragmentsLoaded = (event) => {
        logViewerEvent('FRAGMENTS_LOADED_EVENT', event);
    };

    const handleRenderFirstPixel = (event) => {
        logViewerEvent('RENDER_FIRST_PIXEL', event);
    };

    const handleFinalFrameRendered = (event) => {
        logViewerEvent('FINAL_FRAME_RENDERED_EVENT', event);
    };
    const setupEventListeners = (viewerInstance) => {
        if (!viewerInstance) return;
        
        console.log('🔗 Setting up comprehensive event listeners...');
        
        // Core Events
        viewerInstance.addEventListener(Autodesk.Viewing.VIEWER_STATE_RESTORED_EVENT, handleViewerReady);
        viewerInstance.addEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, handleGeometryLoaded);
        viewerInstance.addEventListener(Autodesk.Viewing.OBJECT_TREE_CREATED_EVENT, handleObjectTreeCreated);
        viewerInstance.addEventListener(Autodesk.Viewing.OBJECT_TREE_UNAVAILABLE_EVENT, handleObjectTreeUnavailable);
        
        // Model Events
        viewerInstance.addEventListener(Autodesk.Viewing.MODEL_LOADED_EVENT, handleModelLoaded);
        viewerInstance.addEventListener(Autodesk.Viewing.MODEL_UNLOADED_EVENT, handleModelUnloaded);
        
        // Loading Events
        viewerInstance.addEventListener(Autodesk.Viewing.PROGRESS_UPDATE_EVENT, handleProgressUpdate);
        viewerInstance.addEventListener(Autodesk.Viewing.TEXTURES_LOADED_EVENT, handleTexturesLoaded);
        viewerInstance.addEventListener(Autodesk.Viewing.FRAGMENTS_LOADED_EVENT, handleFragmentsLoaded);
        
        // Rendering Events
        viewerInstance.addEventListener(Autodesk.Viewing.RENDER_FIRST_PIXEL, handleRenderFirstPixel);
        viewerInstance.addEventListener(Autodesk.Viewing.FINAL_FRAME_RENDERED_EVENT, handleFinalFrameRendered);
        
        // UI Events
        viewerInstance.addEventListener(Autodesk.Viewing.TOOLBAR_CREATED_EVENT, handleToolbarCreated);
        viewerInstance.addEventListener(Autodesk.Viewing.SELECTION_CHANGED_EVENT, handleSelectionChanged);
        viewerInstance.addEventListener(Autodesk.Viewing.CAMERA_CHANGE_EVENT, handleCameraChange);
        
        // Error Events
        viewerInstance.addEventListener(Autodesk.Viewing.ERROR_EVENT, handleError);
        
        console.log('✅ Event listeners registered successfully');
    };
    const setupBasicMode = (viewerInstance) => {
        viewerInstance.setTheme('light-theme');
        // ❌ REMOVED: viewerInstance.setBackgroundColor() - will be called after renderer is ready
        viewerInstance.setLightPreset(0);
        viewerInstance.setEnvMapBackground(true);
    };
    const loadBasicModel = async(viewerInstance) => {
        try {
            console.log('🔍 Starting empty viewer setup for job:', jobData.job_id);
            
            // Get viewer token (still needed for viewer initialization)
            const tokenResponse = await axios.get(`/api/models/${jobData.job_id}/viewer-token`);
            const token = tokenResponse.data.token;
            console.log('🔑 Got viewer token:', token ? 'Token received' : 'No token');
            
            // ✅ Initialize APS Viewer without loading any model
            const options = {
                env: 'AutodeskProduction',
                getAccessToken: function(onSuccess) {
                    const expirationTimeSeconds = 60 * 60; // 1 hour
                    onSuccess(token, expirationTimeSeconds);
                }
            };
            
            console.log('🚀 Initializing APS Viewer (empty mode)...');
            
            // Check if Autodesk SDK is loaded
            if (!window.Autodesk || !window.Autodesk.Viewing) {
                console.error('❌ Autodesk Viewing SDK not loaded!');
                setLoading(false);
                return;
            }
            
            Autodesk.Viewing.Initializer(options, () => {
                console.log('✅ APS Viewer initialized successfully (empty mode)');
                
                // Wait for viewer to be fully ready
                const setupEmptyViewer = async () => {
                    if (!viewerInstance.impl) {
                        console.log('⏳ Waiting for viewer implementation to be ready...');
                        setTimeout(setupEmptyViewer, 50);
                        return;
                    }
                    
                    console.log('✅ Viewer implementation ready!');
                    
                    // Start the viewer UI
                    viewerInstance.start();
                    await viewerInstance.loadExtension('Autodesk.DefaultTools.NavTools', {});

                    // Load the translated SVF model into the viewer
                    const modelInfoResponse = await axios.get(`/api/models/${jobData.job_id}/info`);
                    const modelInfo = modelInfoResponse.data;
                    const documentId = 'urn:' + modelInfo.urn;
                    Autodesk.Viewing.Document.load(
                      documentId,
                      (doc) => {
                        const defaultModel = doc.getRoot().getDefaultGeometry();
                        viewerInstance.loadDocumentNode(doc, defaultModel);
                      },
                      (error) => {
                        console.error('Error loading document:', error);
                        setLoading(false);
                      }
                    );
                    
                    // Wait a moment for viewer to fully start
                    setTimeout(() => {
                        console.log('✅ Empty viewer is now ready for use');
                        console.log('📊 Viewer state:', {
                            impl: !!viewerInstance.impl,
                            container: !!viewerInstance.container,
                            canvas: !!viewerInstance.canvas,
                            toolbar: !!viewerInstance.toolbar
                        });
                        
                        // ✅ Ensure toolbar is created if missing
                        if (!viewerInstance.toolbar) {
                            console.log('🔧 Creating toolbar manually...');
                            try {
                                // Force toolbar creation for empty viewer
                                viewerInstance.createUI();
                                
                                // If createUI() doesn't work, try alternative approach
                                if (!viewerInstance.toolbar) {
                                    console.log('🔧 Trying alternative toolbar creation...');
                                    viewerInstance.setDisplaySettings({
                                        showModels: false // Prevent model-related errors
                                    });
                                    viewerInstance.createViewerUI();
                                }
                                
                                console.log('📊 Toolbar created:', !!viewerInstance.toolbar);
                            } catch (error) {
                                console.warn('⚠️ Toolbar creation failed:', error);
                                console.log('🔧 Continuing without toolbar...');
                            }
                        }
                        
                        // ✅ Load extensions dynamically after viewer is ready
                        console.log('📦 Loading APS Viewer extensions...');
                        
                        // Only load extensions that work without models
                        const extensionsToLoad = [
                            'Autodesk.ViewCubeUi',              // Navigation cube - works without model
                            // 'Autodesk.Viewing.ZoomWindow',       // May need model - commenting out for now
                            // 'Autodesk.DefaultTools.NavTools',   // May need model - commenting out for now  
                            // 'Autodesk.Section'                  // Definitely needs model - commenting out
                        ];
                        
                        // Load extensions one by one
                        const loadExtensions = async () => {
                            for (const extensionId of extensionsToLoad) {
                                try {
                                    console.log(`📦 Loading extension: ${extensionId}`);
                                    await viewerInstance.loadExtension(extensionId);
                                    console.log(`✅ Successfully loaded: ${extensionId}`);
                                } catch (error) {
                                    console.warn(`⚠️ Failed to load extension ${extensionId}:`, error);
                                }
                            }
                            console.log('📦 Extension loading completed');
                        };
                        
                        // Start loading extensions
                        loadExtensions();
                        
                        // 📌 DEBUG: Log viewer container dimensions
                        console.log('📌 Viewer container dimensions:', {
                            containerWidth: viewerRef.current.offsetWidth,
                            containerHeight: viewerRef.current.offsetHeight,
                            viewerCanvasWidth: viewerInstance.canvas?.width,
                            viewerCanvasHeight: viewerInstance.canvas?.height,
                            toolbarHeight: viewerInstance.toolbar?.container?.offsetHeight || 'Not available'
                        });
                        
                        // Set background and basic viewer settings
                        if (viewerInstance.impl && viewerInstance.impl.glrenderer) {
                            viewerInstance.setBackgroundColor(200, 200, 200, 255, 255, 255);
                        }
                        
                        // ✅ Setup resize handler to ensure viewer fills container
                        const handleResize = () => {
                            if (viewerInstance && viewerInstance.impl) {
                                console.log('📌 Resizing viewer to fit container');
                                viewerInstance.resize();
                            }
                        };
                        
                        // Listen for window resize
                        window.addEventListener('resize', handleResize);
                        
                        // Force initial resize to ensure proper fit
                        setTimeout(() => {
                            handleResize();
                        }, 100);
                        
                        setLoading(false);
                    }, 500);
                };
                
                // Start the setup process
                setupEmptyViewer();
            });
            
        } catch (error) {
            console.error('❌ Empty viewer setup error:', error);
            setLoading(false);
        }
    };
    // Utility: Override all materials in the scene using the object tree
    function overrideAllMaterials(viewer, material) {
        if (!viewer || !viewer.model) return;
        viewer.model.getObjectTree(function (tree) {
            tree.enumNodeChildren(tree.getRootId(), function (dbId) {
                viewer.model.getData().instanceTree.enumNodeFragments(dbId, function (fragId) {
                    const fragList = viewer.model.getFragmentList();
                    fragList.setMaterial(fragId, material);
                });
            }, true); // true for recursive
        });
        viewer.impl.invalidate(true);
    }
    const loadModel = async(viewerInstance) => {
        try {
            setLoading(true);
            await loadBasicModel(viewerInstance);
            // Removed material override from here; now handled in handleGeometryLoaded
        } catch (error) {
            setLoading(false);
        }
    }
    const cleanup = () => {
        if (viewer) {
            viewer.removeEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, handleGeometryLoaded);
            viewer.removeEventListener(Autodesk.Viewing.OBJECT_TREE_CREATED_EVENT, handleObjectTreeCreated);
            viewer.removeEventListener(Autodesk.Viewing.SELECTION_CHANGED_EVENT, handleSelectionChanged);
            viewer.removeEventListener(Autodesk.Viewing.CAMERA_CHANGE_EVENT, handleCameraChange);
            viewer.removeEventListener(Autodesk.Viewing.PROGRESS_UPDATE_EVENT, handleProgressUpdate);
            viewer.removeEventListener(Autodesk.Viewing.TOOLBAR_CREATED_EVENT, handleToolbarCreated);
            viewer.removeEventListener(Autodesk.Viewing.ERROR_EVENT, handleError);
            if (viewer.impl && viewer.impl.dispose) {
                viewer.impl.dispose();
            }
        }
        
        // Remove resize listener
        window.removeEventListener('resize', () => {}); // Note: this won't work perfectly, but it's safer
        
        cleanupCustomLights();
    }
    const setupPerformanceMonitoring = (viewerInstance) => {
        if (!viewerInstance) return;
        let frameCount = 0;
        let lastTime = performance.now();
        const monitorPerformance = () => {
            frameCount++;
            const currentTime = performance.now();
            if (currentTime - lastTime >= 1000) {
                const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
                frameCount = 0;
                lastTime = currentTime;
            }
            requestAnimationFrame(monitorPerformance);
        };
        requestAnimationFrame(monitorPerformance);
    }
    const initializeViewer = async () => {
        try {
            console.log('🛠️ Initializing viewer instance...');
            console.log('💻 Container element:', viewerRef.current);
            
            if (!viewerRef.current) {
                console.error('❌ Viewer container not found!');
                setLoading(false);
                return;
            }
            
            // ✅ Try GuiViewer3D first, fallback to manual UI creation
            let viewerInstance;
            try {
                viewerInstance = new Autodesk.Viewing.GuiViewer3D(viewerRef.current);
                console.log('✅ GuiViewer3D created successfully');
            } catch (error) {
                console.warn('⚠️ GuiViewer3D failed, trying Viewer3D with manual UI:', error);
                viewerInstance = new Autodesk.Viewing.Viewer3D(viewerRef.current);
                console.log('✅ Viewer3D created, will add UI manually');
            }
            
            console.log('🎯 Viewer instance created:', viewerInstance);
            setViewer(viewerInstance);
            
            setupEventListeners(viewerInstance);
            setupBasicMode(viewerInstance);
            setupPerformanceMonitoring(viewerInstance);
            
            console.log('🚀 Starting model load...');
            await loadModel(viewerInstance);
            
            console.log('✅ Viewer initialization completed');
        } catch (error) {
            console.error('❌ Viewer initialization failed:', error);
            setLoading(false);
        }
    };
    useEffect(() => {
        if (jobData) {
            initializeViewer();
        }
        return () => {
            cleanup();
            cleanupCustomLights(); // Clean up studio lighting on unmount
        };
    }, [jobData]);
    return (
        <div className="viewer-content">
            <div 
                ref={viewerRef} 
                className="viewer-canvas"
                style={{
                    width: '100%',
                    height: '80vh',           // Use viewport height instead of fixed pixels
                    minHeight: '700px',       // Ensure minimum height for UI elements
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    position: 'relative',
                    overflow: 'hidden'        // Prevent scrollbars within viewer
                }}
            />
            {loading && (
                <div className="loading-overlay">
                    <div className="loading-spinner"></div>
                    <div>Loading model...</div>
                </div>
            )}
            <style jsx>{`
                .loading-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(255,255,255,0.9);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    border-radius: 8px;
                }
                .loading-spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #007ACC;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-bottom: 10px;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    )
}

export default ViewerDemo; 