import React, { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import './App.css';

function App() {
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const fileInputRef = useRef(null);
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
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    // Create Fabric.js canvas - full screen with space for dock
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: window.innerWidth - 40,
      height: window.innerHeight - 120, // Leave space for dock
      backgroundColor: '#ffffff'
    });

    fabricCanvasRef.current = canvas;

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
      canvas.dispose();
    };
  }, []);

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
          case 'escape':
            e.preventDefault();
            canvas.discardActiveObject();
            canvas.renderAll();
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

  // Export as image
  const exportCanvas = () => {
    const canvas = fabricCanvasRef.current;
    const originalZoom = canvas.getZoom();
    canvas.setZoom(1); // Reset zoom for export
    
    const dataURL = canvas.toDataURL({
      format: 'jpeg',
      quality: 0.9,
      multiplier: 2
    });
    
    canvas.setZoom(originalZoom); // Restore zoom
    
    const link = document.createElement('a');
    link.download = 'artwork.jpg';
    link.href = dataURL;
    link.click();
  };

  return (
    <div className="app-container">
      {/* Canvas */}
      <div className="canvas-container">
        <div className="canvas-wrapper">
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
            <div><strong>Esc</strong> - Deselect All</div>
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