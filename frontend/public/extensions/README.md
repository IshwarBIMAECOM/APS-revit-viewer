# APS Viewer Extensions

This directory contains APS Viewer extensions following the official [autodesk-platform-services/aps-extensions](https://github.com/autodesk-platform-services/aps-extensions) repository patterns.

## Structure

Each extension follows the official directory structure:

```
ExtensionName/
├── contents/
│   ├── main.js        # Extension implementation
│   └── main.css       # Extension styles
├── assets/            # Extension assets (images, etc.)
└── config.json        # Extension configuration
```

## Available Extensions

### ClayExtension
- **Purpose**: Apply clay-like materials to all model geometry for architectural visualization
- **Features**: 
  - Toggle clay rendering on/off
  - Multiple clay types (Beige, White, Terracotta, Gray)
  - Configurable clay panel with color options
  - Proper material storage and restoration
- **Usage**: Automatically loaded via extensionloader pattern

### BasicSkeleton
- **Purpose**: Template extension following official APS patterns
- **Features**: 
  - Toolbar integration
  - Event handling patterns
  - Proper cleanup
- **Usage**: Template for creating new extensions

## Extension Loading Pattern

This implementation follows the official APS extensions repository pattern:

### 1. Extension Registration
Extensions are registered using `config.json` files and loaded via `extensionloader.js`.

### 2. Event-Driven Architecture
- **Viewer Instance Event**: `viewerinstance` - Notifies when viewer is ready
- **Load Extension Event**: `loadextension` - Loads an extension programmatically
- **Unload Extension Event**: `unloadextension` - Unloads an extension

### 3. Integration in ViewerDemo.jsx

```javascript
// Emit viewer instance event
const ViewerInstance = new CustomEvent("viewerinstance", {
    detail: { viewer: viewer }
});
document.dispatchEvent(ViewerInstance);

// Load extension
const LoadExtensionEvent = new CustomEvent("loadextension", {
    detail: { extension: "ClayExtension", viewer: viewer }
});
document.dispatchEvent(LoadExtensionEvent);

// Unload extension (in cleanup)
const UnloadExtensionEvent = new CustomEvent("unloadextension", {
    detail: { extension: "ClayExtension", viewer: viewer }
});
document.dispatchEvent(UnloadExtensionEvent);
```

## Configuration

### Global Configuration (`config.json`)
```json
{
  "Extensions": [
    {
      "name": "ClayExtension",
      "displayname": "Clay Rendering Extension",
      "description": "Apply clay-like materials to all model geometry",
      "options": { ... },
      "viewerversion": "7.*",
      "loadonstartup": "false",
      "filestoload": {
        "cssfiles": ["main.css"],
        "jsfiles": ["main.js"]
      },
      "includeinlist": "true",
      "editoptions": "true"
    }
  ]
}
```

### Extension Configuration (`ExtensionName/config.json`)
Each extension has its own configuration file with the same schema.

## Creating New Extensions

1. **Create Directory Structure**:
   ```
   mkdir extensions/MyExtension/contents
   mkdir extensions/MyExtension/assets
   ```

2. **Copy BasicSkeleton**: Use BasicSkeleton as a template

3. **Update Configuration**: 
   - Create `extensions/MyExtension/config.json`
   - Add to global `extensions/config.json`

4. **Implement Extension**:
   - Follow official patterns in `main.js`
   - Handle `TOOLBAR_CREATED_EVENT` and `OBJECT_TREE_CREATED_EVENT`
   - Implement proper cleanup in `unload()`

## Key Patterns

### Official Extension Class Structure
```javascript
class MyExtension extends Autodesk.Viewing.Extension {
    constructor(viewer, options) {
        super(viewer, options);
        // Bind event handlers
    }

    load() {
        // Handle toolbar creation
        // Handle object tree creation
        return true;
    }

    unload() {
        // Cleanup UI
        // Remove event listeners
        // Clean up bindings
        return true;
    }
}
```

### Event Handling Pattern
```javascript
// Check if data is already loaded
if (this.viewer.model && this.viewer.model.getInstanceTree()) {
    this.onObjectTreeCreated();
} else {
    this.viewer.addEventListener(
        Autodesk.Viewing.OBJECT_TREE_CREATED_EVENT, 
        this.onObjectTreeCreatedBinded
    );
}
```

## Differences from Manual Loading

### Before (Manual Loading)
- Extensions loaded directly via `<script>` tags
- Direct `viewer.loadExtension()` calls
- No standardized configuration
- No loose coupling

### After (Official Pattern)
- Extensions loaded via `extensionloader.js`
- Event-driven loading system
- Standardized configuration files
- Loose coupling between app and extensions
- Easy to add/remove extensions
- Proper cleanup handling

## Benefits

1. **Modularity**: Extensions are self-contained and easily shareable
2. **Loose Coupling**: Extensions can be loaded/unloaded dynamically
3. **Standardization**: Follows official APS patterns
4. **Maintainability**: Clear separation of concerns
5. **Extensibility**: Easy to add new extensions
6. **Configuration**: JSON-based configuration system
