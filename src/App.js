import React, { useEffect, useRef, useState, useCallback } from 'react';
import { fabric } from 'fabric';
import WorkspaceManager from './WorkspaceManager';
import WorkspaceTabs from './WorkspaceTabs';
import AIService from './AIService';
import './App.css';

function App() {
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const workspaceManagerRef = useRef(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(5);
  const [brushColor, setBrushColor] = useState('#000000');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [fillColor, setFillColor] = useState('#3B82F6');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [fillEnabled, setFillEnabled] = useState(true);
  const [strokeEnabled, setStrokeEnabled] = useState(true);
  const [showBrushPanel, setShowBrushPanel] = useState(false);
  const [showShapePanel, setShowShapePanel] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showWorkspacePanel, setShowWorkspacePanel] = useState(false);
  const [zoom, setZoom] = useState(1);
  
  // AI generation state
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiService, setAiService] = useState(null);
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedObject, setSelectedObject] = useState(null);
  
  // Workspace state
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState(null);

  // Initialize workspace manager
  useEffect(() => {
    if (!workspaceManagerRef.current) {
      workspaceManagerRef.current = new WorkspaceManager();
      setWorkspaces(workspaceManagerRef.current.getAllWorkspaces());
      setCurrentWorkspaceId(workspaceManagerRef.current.currentWorkspaceId);
    }
  }, []);

  // Initialize canvas (only once)
  useEffect(() => {
    if (!canvasRef.current || fabricCanvasRef.current) return;
    
    // Create Fabric.js canvas - full screen with space for dock
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: window.innerWidth - 40,
      height: window.innerHeight - 120, // Leave space for dock
      backgroundColor: '#ffffff'
    });

    fabricCanvasRef.current = canvas;

    // Auto-save workspace on changes
    const saveWorkspace = () => {
      if (workspaceManagerRef.current && currentWorkspaceId) {
        const canvasData = canvas.toJSON();
        const thumbnail = canvas.toDataURL({
          format: 'png',
          quality: 0.3,
          multiplier: 0.1
        });
        workspaceManagerRef.current.updateWorkspaceData(canvasData, thumbnail);
      }
    };

    // Save on canvas modifications
    canvas.on('object:added', saveWorkspace);
    canvas.on('object:modified', saveWorkspace);
    canvas.on('object:removed', saveWorkspace);

    // Store canvas reference for use in React event handlers
    fabricCanvasRef.current = canvas;

    // Close context menu when clicking outside
    const handleOutsideClick = (e) => {
      if (contextMenu) {
        setContextMenu(null);
      }
    };

    document.addEventListener('click', handleOutsideClick);

    // Handle window resize
    const handleResize = () => {
      canvas.setDimensions({
        width: window.innerWidth - 40,
        height: window.innerHeight - 120
      });
    };

    window.addEventListener('resize', handleResize);

    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('click', handleOutsideClick);
      canvas.off('object:added', saveWorkspace);
      canvas.off('object:modified', saveWorkspace);
      canvas.off('object:removed', saveWorkspace);
      
      
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, []);

  // Load workspace data when currentWorkspaceId changes
  useEffect(() => {
    if (!fabricCanvasRef.current || !workspaceManagerRef.current || !currentWorkspaceId) return;
    
    const canvas = fabricCanvasRef.current;
    const workspace = workspaceManagerRef.current.getCurrentWorkspace();
    
    if (workspace && workspace.data) {
      canvas.loadFromJSON(workspace.data, () => {
        canvas.renderAll();
      });
    } else {
      canvas.clear();
      canvas.backgroundColor = '#ffffff';
      canvas.renderAll();
    }
  }, [currentWorkspaceId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      // Prevent shortcuts when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      // Command/Ctrl shortcuts
      if (e.metaKey || e.ctrlKey) {
        switch(e.key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            break;
          case 's':
            e.preventDefault();
            exportCanvas();
            break;
          case 'a':
            e.preventDefault();
            selectAll();
            break;
          case 'd':
            e.preventDefault();
            duplicateSelected();
            break;
          case '=':
          case '+':
            e.preventDefault();
            zoomIn();
            break;
          case '-':
            e.preventDefault();
            zoomOut();
            break;
          case '0':
            e.preventDefault();
            resetZoom();
            break;
        }
      } else {
        // Single key shortcuts
        switch(e.key.toLowerCase()) {
          case 'delete':
          case 'backspace':
            e.preventDefault();
            deleteSelected();
            break;
          case 'v':
            e.preventDefault();
            setIsDrawing(false);
            canvas.isDrawingMode = false;
            break;
          case 'b':
            e.preventDefault();
            toggleDrawing();
            break;
          case 't':
            e.preventDefault();
            addText();
            break;
          case 'r':
            e.preventDefault();
            addRectangle();
            break;
          case 'c':
            e.preventDefault();
            addCircle();
            break;
          case 'h':
            e.preventDefault();
            setShowHelp(!showHelp);
            break;
          case 'n':
            e.preventDefault();
            handleNewWorkspace();
            break;
          case 'escape':
            e.preventDefault();
            canvas.discardActiveObject();
            canvas.renderAll();
            setShowWorkspacePanel(false);
            setShowHelp(false);
            setShowBrushPanel(false);
            setShowShapePanel(false);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showHelp]);

  // Toggle drawing mode
  const toggleDrawing = () => {
    const canvas = fabricCanvasRef.current;
    const newDrawingState = !isDrawing;
    setIsDrawing(newDrawingState);
    
    canvas.isDrawingMode = newDrawingState;
    if (newDrawingState) {
      canvas.freeDrawingBrush.width = brushSize;
      canvas.freeDrawingBrush.color = brushColor;
      setShowBrushPanel(true);
    } else {
      setShowBrushPanel(false);
    }
  };

  // Update brush settings
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (canvas && canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.width = brushSize;
      canvas.freeDrawingBrush.color = brushColor;
    }
  }, [brushSize, brushColor]);

  // Handle image upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imgElement = new Image();
      imgElement.onload = () => {
        const fabricImage = new fabric.Image(imgElement, {
          left: 100,
          top: 100,
          scaleX: 0.5,
          scaleY: 0.5
        });
        
        const canvas = fabricCanvasRef.current;
        canvas.add(fabricImage);
        canvas.setActiveObject(fabricImage);
        canvas.renderAll();
      };
      imgElement.src = event.target.result;
    };
    reader.readAsDataURL(file);
    
    // Reset file input
    e.target.value = '';
  };

  // Add text
  const addText = () => {
    const text = prompt('Enter text:');
    if (!text) return;

    const fabricText = new fabric.Text(text, {
      left: 100,
      top: 100,
      fontSize: 24,
      fill: fillEnabled ? fillColor : 'transparent'
    });

    const canvas = fabricCanvasRef.current;
    canvas.add(fabricText);
    canvas.setActiveObject(fabricText);
    canvas.renderAll();
  };

  // Add rectangle with customization
  const addRectangle = () => {
    setShowShapePanel(true);
    
    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      width: 100,
      height: 80,
      fill: fillEnabled ? fillColor : 'transparent',
      stroke: strokeEnabled ? strokeColor : null,
      strokeWidth: strokeEnabled ? strokeWidth : 0
    });

    const canvas = fabricCanvasRef.current;
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();
  };

  // Add circle with customization
  const addCircle = () => {
    setShowShapePanel(true);
    
    const circle = new fabric.Circle({
      left: 100,
      top: 100,
      radius: 50,
      fill: fillEnabled ? fillColor : 'transparent',
      stroke: strokeEnabled ? strokeColor : null,
      strokeWidth: strokeEnabled ? strokeWidth : 0
    });

    const canvas = fabricCanvasRef.current;
    canvas.add(circle);
    canvas.setActiveObject(circle);
    canvas.renderAll();
  };

  // Update selected shape properties
  const updateSelectedShape = () => {
    const canvas = fabricCanvasRef.current;
    const activeObject = canvas.getActiveObject();
    
    if (activeObject && (activeObject.type === 'rect' || activeObject.type === 'circle')) {
      activeObject.set({
        fill: fillEnabled ? fillColor : 'transparent',
        stroke: strokeEnabled ? strokeColor : null,
        strokeWidth: strokeEnabled ? strokeWidth : 0
      });
      canvas.renderAll();
    }
  };

  // Select all objects
  const selectAll = () => {
    const canvas = fabricCanvasRef.current;
    canvas.discardActiveObject();
    const selection = new fabric.ActiveSelection(canvas.getObjects(), {
      canvas: canvas,
    });
    canvas.setActiveObject(selection);
    canvas.renderAll();
  };

  // Duplicate selected
  const duplicateSelected = () => {
    const canvas = fabricCanvasRef.current;
    const activeObject = canvas.getActiveObject();
    
    if (activeObject) {
      activeObject.clone((cloned) => {
        canvas.discardActiveObject();
        cloned.set({
          left: cloned.left + 20,
          top: cloned.top + 20,
          evented: true,
        });
        if (cloned.type === 'activeSelection') {
          cloned.canvas = canvas;
          cloned.forEachObject((obj) => {
            canvas.add(obj);
          });
          cloned.setCoords();
        } else {
          canvas.add(cloned);
        }
        canvas.setActiveObject(cloned);
        canvas.requestRenderAll();
      });
    }
  };

  // Delete selected object
  const deleteSelected = () => {
    const canvas = fabricCanvasRef.current;
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      if (activeObject.type === 'activeSelection') {
        activeObject.forEachObject((obj) => {
          canvas.remove(obj);
        });
      } else {
        canvas.remove(activeObject);
      }
      canvas.discardActiveObject();
      canvas.renderAll();
    }
  };

  // Clear canvas
  const clearCanvas = () => {
    if (window.confirm('Clear entire canvas?')) {
      const canvas = fabricCanvasRef.current;
      canvas.clear();
      canvas.backgroundColor = '#ffffff';
      canvas.renderAll();
    }
  };

  // Undo/Redo (simple implementation)
  const undo = () => {
    const canvas = fabricCanvasRef.current;
    const objects = canvas.getObjects();
    if (objects.length > 0) {
      canvas.remove(objects[objects.length - 1]);
      canvas.renderAll();
    }
  };

  const redo = () => {
    // Simple redo would require maintaining a history stack
    console.log('Redo: Would require history implementation');
  };

  // Zoom controls
  const zoomIn = () => {
    const newZoom = Math.min(zoom * 1.2, 3);
    setZoom(newZoom);
    const canvas = fabricCanvasRef.current;
    canvas.setZoom(newZoom);
    canvas.renderAll();
  };

  const zoomOut = () => {
    const newZoom = Math.max(zoom / 1.2, 0.5);
    setZoom(newZoom);
    const canvas = fabricCanvasRef.current;
    canvas.setZoom(newZoom);
    canvas.renderAll();
  };

  const resetZoom = () => {
    setZoom(1);
    const canvas = fabricCanvasRef.current;
    canvas.setZoom(1);
    canvas.renderAll();
  };

  // Workspace Management Functions
  const handleNewWorkspace = useCallback(() => {
    if (!workspaceManagerRef.current) return;
    
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    // Save current workspace before creating new one
    if (currentWorkspaceId) {
      const canvasData = canvas.toJSON();
      const thumbnail = canvas.toDataURL({
        format: 'png',
        quality: 0.3,
        multiplier: 0.1
      });
      workspaceManagerRef.current.updateWorkspaceData(canvasData, thumbnail);
    }
    
    // Create new workspace (canvas will be cleared by useEffect)
    const newWorkspace = workspaceManagerRef.current.createWorkspace();
    setWorkspaces(workspaceManagerRef.current.getAllWorkspaces());
    setCurrentWorkspaceId(newWorkspace.id);
  }, [currentWorkspaceId]);

  // React event handlers for right-click context menu
  const handleCanvasContextMenu = useCallback((e) => {
    console.log('React onContextMenu event triggered!', e);
    e.preventDefault();
    e.stopPropagation();
    
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      console.log('No canvas available');
      return;
    }
    
    // Get canvas coordinates
    const rect = canvasRef.current.getBoundingClientRect();
    const pointer = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    console.log('Mouse position:', { clientX: e.clientX, clientY: e.clientY, pointer });
    
    // Find object at pointer position
    const target = canvas.findTarget(e.nativeEvent || e, false);
    console.log('Found target:', target);
    
    if (target) {
      canvas.setActiveObject(target);
      canvas.renderAll();
      setSelectedObject(target);
      
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        object: target
      });
      
      console.log('Context menu created at:', e.clientX, e.clientY, 'for target:', target.type);
    } else {
      console.log('No object found, showing general context menu');
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        object: null
      });
    }
  }, []);

  const handleCanvasMouseDown = useCallback((e) => {
    console.log('React onMouseDown event:', e.button);
    // Close context menu on left click
    if (e.button !== 2) {
      setContextMenu(null);
    }
  }, []);

  const handleSwitchWorkspace = useCallback((workspaceId) => {
    if (!workspaceManagerRef.current || workspaceId === currentWorkspaceId) return;
    
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    // Save current workspace before switching
    if (currentWorkspaceId) {
      const canvasData = canvas.toJSON();
      const thumbnail = canvas.toDataURL({
        format: 'png',
        quality: 0.3,
        multiplier: 0.1
      });
      workspaceManagerRef.current.updateWorkspaceData(canvasData, thumbnail);
    }
    
    // Switch workspace (canvas data will be loaded by useEffect)
    workspaceManagerRef.current.switchToWorkspace(workspaceId);
    setCurrentWorkspaceId(workspaceId);
    setWorkspaces(workspaceManagerRef.current.getAllWorkspaces());
  }, [currentWorkspaceId]);

  const handleDeleteWorkspace = useCallback((workspaceId) => {
    if (!workspaceManagerRef.current) return;
    
    if (workspaceManagerRef.current.deleteWorkspace(workspaceId)) {
      setWorkspaces(workspaceManagerRef.current.getAllWorkspaces());
      setCurrentWorkspaceId(workspaceManagerRef.current.currentWorkspaceId);
    }
  }, []);

  const handleRenameWorkspace = useCallback((workspaceId, newName) => {
    if (!workspaceManagerRef.current) return;
    
    if (workspaceManagerRef.current.renameWorkspace(workspaceId, newName)) {
      setWorkspaces(workspaceManagerRef.current.getAllWorkspaces());
    }
  }, []);

  // Export as image (visible area only)
  const exportCanvas = () => {
    const canvas = fabricCanvasRef.current;
    const zoom = canvas.getZoom();
    const vpt = canvas.viewportTransform;
    
    // Get the visible area bounds in canvas coordinates
    const canvasWidth = canvas.getWidth();
    const canvasHeight = canvas.getHeight();
    
    // Calculate the visible area
    const left = -vpt[4] / zoom;
    const top = -vpt[5] / zoom;
    const width = canvasWidth / zoom;
    const height = canvasHeight / zoom;
    
    // Use Fabric.js toDataURL with specific cropping area
    const dataURL = canvas.toDataURL({
      format: 'jpeg',
      quality: 0.9,
      multiplier: 2,
      left: left,
      top: top,
      width: width,
      height: height
    });
    
    const link = document.createElement('a');
    link.download = 'artwork.jpg';
    link.href = dataURL;
    link.click();
  };

  // AI Generation Functions
  const handleAIGenerate = async () => {
    if (!aiApiKey) {
      setShowAIPanel(true);
      return;
    }

    if (!aiService) {
      const service = new AIService(aiApiKey);
      setAiService(service);
    }

    try {
      setIsAIGenerating(true);
      
      // Get current canvas as base64 following your pattern
      const canvas = fabricCanvasRef.current;
      const zoom = canvas.getZoom();
      const vpt = canvas.viewportTransform;
      
      // Calculate visible area
      const canvasWidth = canvas.getWidth();
      const canvasHeight = canvas.getHeight();
      const left = -vpt[4] / zoom;
      const top = -vpt[5] / zoom;
      const width = canvasWidth / zoom;
      const height = canvasHeight / zoom;
      
      // Get base64 of visible area
      const dataURL = canvas.toDataURL({
        format: 'jpeg',
        quality: 0.9,
        multiplier: 1,
        left: left,
        top: top,
        width: width,
        height: height
      });
      
      // Extract base64 data (remove data:image/jpeg;base64, prefix)
      const base64Data = dataURL.split(',')[1];
      
      // Generate using AI service with your exact pattern
      const service = aiService || new AIService(aiApiKey);
      const results = await service.generateContent(base64Data, 'image/jpeg');
      
      if (results.image) {
        // Convert base64 back to image and add to canvas
        const img = new Image();
        img.onload = () => {
          const fabricImage = new fabric.Image(img, {
            left: 100,
            top: 100,
            scaleX: 0.8,
            scaleY: 0.8,
            // Mark as AI-generated for special handling
            isAIGenerated: true,
            aiImageData: results.image
          });
          
          canvas.add(fabricImage);
          canvas.setActiveObject(fabricImage);
          canvas.renderAll();
        };
        img.src = `data:image/png;base64,${results.image}`;
      }
      
      if (results.text) {
        console.log('AI Response Text:', results.text);
      }
      
    } catch (error) {
      console.error('AI Generation error:', error);
      alert(`AI Generation failed: ${error.message}`);
    } finally {
      setIsAIGenerating(false);
    }
  };

  const handleAIApiKeySubmit = () => {
    if (aiApiKey) {
      const service = new AIService(aiApiKey);
      setAiService(service);
      setShowAIPanel(false);
      handleAIGenerate();
    }
  };

  // Download AI-generated image
  const downloadAIImage = (object) => {
    if (object.isAIGenerated && object.aiImageData) {
      const link = document.createElement('a');
      link.href = `data:image/png;base64,${object.aiImageData}`;
      link.download = `ai-generated-${Date.now()}.png`;
      link.click();
    }
  };

  // Context menu actions
  const handleContextMenuAction = (action) => {
    const object = contextMenu?.object;
    if (!object) return;

    switch (action) {
      case 'download':
        if (object.isAIGenerated) {
          downloadAIImage(object);
        }
        break;
      case 'delete':
        const canvas = fabricCanvasRef.current;
        canvas.remove(object);
        canvas.renderAll();
        break;
      case 'duplicate':
        object.clone((cloned) => {
          const canvas = fabricCanvasRef.current;
          cloned.set({
            left: cloned.left + 20,
            top: cloned.top + 20,
          });
          canvas.add(cloned);
          canvas.setActiveObject(cloned);
          canvas.renderAll();
        });
        break;
    }
    
    setContextMenu(null);
  };

  return (
    <div className="app-container">
      {/* Workspace Tabs */}
      {workspaces.length > 0 && (
        <WorkspaceTabs
          workspaces={workspaces}
          currentWorkspaceId={currentWorkspaceId}
          onSwitch={handleSwitchWorkspace}
          onNew={handleNewWorkspace}
          onDelete={handleDeleteWorkspace}
          onRename={handleRenameWorkspace}
          showPanel={showWorkspacePanel}
          setShowPanel={setShowWorkspacePanel}
        />
      )}

      {/* Canvas */}
      <div className="canvas-container">
        <div 
          className="canvas-wrapper"
          onContextMenu={handleCanvasContextMenu}
          onMouseDown={handleCanvasMouseDown}
        >
          <canvas ref={canvasRef} />
        </div>
      </div>

      {/* Brush Settings Panel (floating) */}
      {showBrushPanel && (
        <div className="floating-panel" style={{ bottom: '100px', left: '20px' }}>
          <button className="close-panel" onClick={() => setShowBrushPanel(false)}>×</button>
          <div className="panel-header">Brush Settings</div>
          <div>
            <label style={{ fontSize: '12px' }}>Size: {brushSize}px</label>
            <input
              type="range"
              min="1"
              max="50"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="brush-slider"
            />
          </div>
          <div>
            <label style={{ fontSize: '12px' }}>Color</label>
            <input
              type="color"
              value={brushColor}
              onChange={(e) => setBrushColor(e.target.value)}
              className="color-input"
            />
          </div>
        </div>
      )}

      {/* Shape Customization Panel */}
      {showShapePanel && (
        <div className="floating-panel" style={{ bottom: '100px', right: '20px' }}>
          <button className="close-panel" onClick={() => setShowShapePanel(false)}>×</button>
          <div className="panel-header">Shape Settings</div>
          
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', fontSize: '12px', marginBottom: '4px' }}>
              <input 
                type="checkbox" 
                checked={fillEnabled}
                onChange={(e) => setFillEnabled(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Fill Color
            </label>
            {fillEnabled && (
              <input
                type="color"
                value={fillColor}
                onChange={(e) => setFillColor(e.target.value)}
                className="color-input"
              />
            )}
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', fontSize: '12px', marginBottom: '4px' }}>
              <input 
                type="checkbox" 
                checked={strokeEnabled}
                onChange={(e) => setStrokeEnabled(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Stroke
            </label>
            {strokeEnabled && (
              <>
                <input
                  type="color"
                  value={strokeColor}
                  onChange={(e) => setStrokeColor(e.target.value)}
                  className="color-input"
                  style={{ marginBottom: '8px' }}
                />
                <label style={{ fontSize: '12px' }}>Width: {strokeWidth}px</label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(Number(e.target.value))}
                  className="brush-slider"
                />
              </>
            )}
          </div>

          <button 
            onClick={updateSelectedShape}
            style={{
              width: '100%',
              padding: '8px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Apply to Selected
          </button>
        </div>
      )}

      {/* Keyboard Shortcuts Help */}
      {showHelp && (
        <div className="floating-panel" style={{ top: '20px', right: '20px', width: '300px' }}>
          <button className="close-panel" onClick={() => setShowHelp(false)}>×</button>
          <div className="panel-header">Keyboard Shortcuts</div>
          <div style={{ fontSize: '12px', lineHeight: '1.8' }}>
            <div><strong>V</strong> - Select Mode</div>
            <div><strong>B</strong> - Brush/Draw Mode</div>
            <div><strong>T</strong> - Add Text</div>
            <div><strong>R</strong> - Add Rectangle</div>
            <div><strong>C</strong> - Add Circle</div>
            <div><strong>Delete/Backspace</strong> - Delete Selected</div>
            <div><strong>Esc</strong> - Deselect All / Close Panels</div>
            <div><strong>N</strong> - New Workspace</div>
            <hr style={{ margin: '8px 0', opacity: 0.2 }} />
            <div><strong>⌘/Ctrl + A</strong> - Select All</div>
            <div><strong>⌘/Ctrl + D</strong> - Duplicate</div>
            <div><strong>⌘/Ctrl + Z</strong> - Undo</div>
            <div><strong>⌘/Ctrl + Shift + Z</strong> - Redo</div>
            <div><strong>⌘/Ctrl + S</strong> - Export/Save</div>
            <div><strong>⌘/Ctrl + Plus</strong> - Zoom In</div>
            <div><strong>⌘/Ctrl + Minus</strong> - Zoom Out</div>
            <div><strong>⌘/Ctrl + 0</strong> - Reset Zoom</div>
            <hr style={{ margin: '8px 0', opacity: 0.2 }} />
            <div><strong>H</strong> - Toggle This Help</div>
          </div>
        </div>
      )}

      {/* AI API Key Panel */}
      {showAIPanel && (
        <div className="floating-panel" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '400px', zIndex: 1000 }}>
          <button className="close-panel" onClick={() => setShowAIPanel(false)}>×</button>
          <div className="panel-header">AI Generation Setup</div>
          <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
            <p style={{ marginBottom: '12px', color: '#666' }}>
              Enter your Google GenAI API key to enable AI image generation
            </p>
            <input
              type="password"
              placeholder="Enter your Google GenAI API key"
              value={aiApiKey}
              onChange={(e) => setAiApiKey(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                marginBottom: '12px',
                fontSize: '14px'
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleAIApiKeySubmit()}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleAIApiKeySubmit}
                disabled={!aiApiKey}
                style={{
                  padding: '8px 16px',
                  backgroundColor: aiApiKey ? '#4CAF50' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: aiApiKey ? 'pointer' : 'not-allowed',
                  fontSize: '14px'
                }}
              >
                Start AI Generation
              </button>
              <button
                onClick={() => setShowAIPanel(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
            </div>
            <p style={{ marginTop: '12px', fontSize: '12px', color: '#888' }}>
              The AI will analyze your current canvas and generate enhanced content based on what it sees.
            </p>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="context-menu"
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            zIndex: 1001,
            minWidth: '150px',
            overflow: 'hidden'
          }}
        >
          {contextMenu.object?.isAIGenerated && (
            <div 
              className="context-menu-item"
              onClick={() => handleContextMenuAction('download')}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: '14px',
                borderBottom: '1px solid #eee',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
            >
              📥 Download AI Image
            </div>
          )}
          <div 
            className="context-menu-item"
            onClick={() => handleContextMenuAction('duplicate')}
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '14px',
              borderBottom: '1px solid #eee',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
          >
            📋 Duplicate
          </div>
          <div 
            className="context-menu-item"
            onClick={() => handleContextMenuAction('delete')}
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#f44336',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#ffebee'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
          >
            🗑️ Delete
          </div>
        </div>
      )}

      {/* macOS-style Dock */}
      <div className="dock-container">
        <div className="dock">
          {/* File Operations */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
          <div 
            className="dock-item"
            onClick={() => fileInputRef.current.click()}
          >
            📤
            <span className="dock-tooltip">Upload Image</span>
          </div>

          <div className="dock-divider" />

          {/* Tools */}
          <div 
            className={`dock-item ${!isDrawing ? 'active' : ''}`}
            onClick={() => isDrawing && toggleDrawing()}
          >
            👆
            <span className="dock-tooltip">Select (V)</span>
          </div>

          <div 
            className={`dock-item ${isDrawing ? 'active' : ''}`}
            onClick={toggleDrawing}
          >
            ✏️
            <span className="dock-tooltip">Draw (B)</span>
          </div>

          <div className="dock-item" onClick={addText}>
            📝
            <span className="dock-tooltip">Text (T)</span>
          </div>

          <div className="dock-item" onClick={addRectangle}>
            ⬜
            <span className="dock-tooltip">Rectangle (R)</span>
          </div>

          <div className="dock-item" onClick={addCircle}>
            ⭕
            <span className="dock-tooltip">Circle (C)</span>
          </div>

          <div className="dock-divider" />

          {/* Edit Actions */}
          <div className="dock-item" onClick={undo}>
            ↩️
            <span className="dock-tooltip">Undo (⌘Z)</span>
          </div>

          <div className="dock-item" onClick={duplicateSelected}>
            📋
            <span className="dock-tooltip">Duplicate (⌘D)</span>
          </div>

          <div className="dock-item danger" onClick={deleteSelected}>
            🗑️
            <span className="dock-tooltip">Delete (Del)</span>
          </div>

          <div className="dock-divider" />

          {/* Zoom Controls */}
          <div className="dock-item" onClick={zoomOut}>
            🔍
            <span className="dock-tooltip">Zoom Out (⌘-)</span>
          </div>

          <div className="dock-item" onClick={resetZoom}>
            💯
            <span className="dock-tooltip">{Math.round(zoom * 100)}% (⌘0)</span>
          </div>

          <div className="dock-item" onClick={zoomIn}>
            🔎
            <span className="dock-tooltip">Zoom In (⌘+)</span>
          </div>

          <div className="dock-divider" />

          {/* Export & Clear */}
          <div className="dock-item" onClick={exportCanvas}>
            💾
            <span className="dock-tooltip">Export (⌘S)</span>
          </div>

          <div className="dock-item danger" onClick={clearCanvas}>
            🧹
            <span className="dock-tooltip">Clear All</span>
          </div>

          <div className="dock-divider" />

          {/* AI Generation */}
          <div 
            className={`dock-item ${isAIGenerating ? 'active' : ''}`}
            onClick={handleAIGenerate}
            style={isAIGenerating ? { opacity: 0.6 } : {}}
          >
            {isAIGenerating ? '⏳' : '🤖'}
            <span className="dock-tooltip">
              {isAIGenerating ? 'AI Generating...' : 'AI Generate'}
            </span>
          </div>

          {/* Help */}
          <div 
            className={`dock-item ${showHelp ? 'active' : ''}`}
            onClick={() => setShowHelp(!showHelp)}
          >
            ⌨️
            <span className="dock-tooltip">Shortcuts (H)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;