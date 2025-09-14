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
  const dockRef = useRef(null);
  
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
  
  // Drag and drop state
  const [isDragOver, setIsDragOver] = useState(false);
  
  // AI UX enhancements
  const [showAITutorial, setShowAITutorial] = useState(false);
  const [aiProcessingStage, setAiProcessingStage] = useState('idle');
  
  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [customAIPrompt, setCustomAIPrompt] = useState(
    "This is a canvas screenshot with instruction arrows and text annotations that tell you what to create or modify. READ and FOLLOW the arrows and text instructions, but DO NOT include them in your output. Generate the final image based on the instructions, but exclude: all instruction arrows, annotation text, UI elements, canvas interface, toolbars, and annotation markings. IMPORTANT: Crop tightly around the actual content - remove ALL empty white canvas space, borders, and padding. Return only the essential image content itself, properly cropped to its natural boundaries with no excess white space. Ensure ALL elements have consistent lighting, shadows, color temperature, and visual style - everything should look naturally integrated and cohesive, not like separate pasted elements. The final image should feel unified with harmonious lighting and seamless blending of all components."
  );
  
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

  // Update document title with Canana branding
  useEffect(() => {
    const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId);
    const workspaceName = currentWorkspace?.name || 'Workspace';
    document.title = `${workspaceName} - Canana | Visual Prompting Canvas`;
  }, [workspaces, currentWorkspaceId]);

  // Handle dock scroll indicator visibility
  useEffect(() => {
    const dock = dockRef.current;
    if (!dock) return;

    const updateScrollIndicator = () => {
      const canScroll = dock.scrollWidth > dock.clientWidth;
      const isAtEnd = dock.scrollLeft >= (dock.scrollWidth - dock.clientWidth - 10);
      
      // Add/remove classes for scroll state
      dock.classList.toggle('can-scroll', canScroll && !isAtEnd);
      dock.classList.toggle('scroll-end', isAtEnd);
    };

    // Check on mount and resize
    updateScrollIndicator();
    
    // Listen to scroll events
    dock.addEventListener('scroll', updateScrollIndicator);
    window.addEventListener('resize', updateScrollIndicator);

    return () => {
      dock.removeEventListener('scroll', updateScrollIndicator);
      window.removeEventListener('resize', updateScrollIndicator);
    };
  }, []);

  // Load custom AI prompt from localStorage
  useEffect(() => {
    const savedPrompt = localStorage.getItem('canana_ai_prompt');
    if (savedPrompt) {
      setCustomAIPrompt(savedPrompt);
    }
  }, []);

  // Save custom AI prompt to localStorage
  const saveCustomPrompt = (newPrompt) => {
    setCustomAIPrompt(newPrompt);
    localStorage.setItem('canana_ai_prompt', newPrompt);
  };

  // Initialize canvas (only once)
  useEffect(() => {
    if (!canvasRef.current || fabricCanvasRef.current) return;
    
    // Create Fabric.js canvas - responsive with mobile optimizations
    const isMobile = window.innerWidth <= 768;
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: window.innerWidth - (isMobile ? 24 : 40),
      height: window.innerHeight - (isMobile ? 160 : 120), // More space for mobile dock and header
      backgroundColor: '#ffffff',
      // Enhanced mobile touch support
      allowTouchScrolling: true,
      imageSmoothingEnabled: true,
      renderOnAddRemove: true,
      skipTargetFind: false,
      touchStartX: null,
      touchStartY: null
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

    // Handle text editing events - simpler approach
    canvas.on('text:editing:entered', (options) => {
      const textObject = options.target;
      if (textObject.isPlaceholder && textObject.text === 'Text goes here') {
        textObject.text = '';
        textObject.isPlaceholder = false;
        canvas.renderAll();
      }
    });

    canvas.on('text:editing:exited', (options) => {
      const textObject = options.target;
      
      // If text is empty, restore placeholder
      if (!textObject.text.trim()) {
        textObject.text = 'Text goes here';
        textObject.isPlaceholder = true;
      }
      
      canvas.renderAll();
    });

    // Store canvas reference for use in React event handlers
    fabricCanvasRef.current = canvas;

    // Close context menu when clicking outside
    const handleOutsideClick = (e) => {
      if (contextMenu) {
        setContextMenu(null);
      }
    };

    document.addEventListener('click', handleOutsideClick);

    // Enhanced mobile touch gestures for visual prompting
    if (isMobile) {
      // Prevent default touch behaviors that interfere with drawing
      canvas.upperCanvasEl.addEventListener('touchstart', (e) => {
        // Allow single touch for drawing, prevent multi-touch zoom
        if (e.touches.length === 1) {
          e.preventDefault();
        }
      }, { passive: false });
      
      canvas.upperCanvasEl.addEventListener('touchmove', (e) => {
        // Prevent scroll while drawing
        if (e.touches.length === 1 && canvas.isDrawingMode) {
          e.preventDefault();
        }
      }, { passive: false });
      
      // Enhanced touch sensitivity for precise visual prompting
      canvas.touchStartX = null;
      canvas.touchStartY = null;
      
      canvas.on('touch:gesture', (e) => {
        // Allow pinch to zoom on canvas
        if (e.e.touches && e.e.touches.length === 2) {
          const touch1 = e.e.touches[0];
          const touch2 = e.e.touches[1];
          const dist = Math.sqrt(
            Math.pow(touch2.clientX - touch1.clientX, 2) +
            Math.pow(touch2.clientY - touch1.clientY, 2)
          );
          
          if (!canvas.lastPinchDistance) {
            canvas.lastPinchDistance = dist;
            return;
          }
          
          const scale = dist / canvas.lastPinchDistance;
          const zoom = canvas.getZoom() * scale;
          
          // Limit zoom range for mobile
          const maxZoom = 3;
          const minZoom = 0.5;
          
          if (zoom >= minZoom && zoom <= maxZoom) {
            const center = canvas.getCenter();
            canvas.zoomToPoint(new fabric.Point(center.left, center.top), zoom);
          }
          
          canvas.lastPinchDistance = dist;
          canvas.renderAll();
        }
      });
      
      canvas.on('touch:drag', (e) => {
        // Enhanced drag support for mobile visual prompting
        if (e.e.touches && e.e.touches.length === 1) {
          const touch = e.e.touches[0];
          const rect = canvas.upperCanvasEl.getBoundingClientRect();
          const x = touch.clientX - rect.left;
          const y = touch.clientY - rect.top;
          
          // Update last touch position for smooth drawing
          canvas.lastTouchX = x;
          canvas.lastTouchY = y;
        }
      });
    }

    // Handle window resize with mobile considerations
    const handleResize = () => {
      const isMobileNow = window.innerWidth <= 768;
      canvas.setDimensions({
        width: window.innerWidth - (isMobileNow ? 24 : 40),
        height: window.innerHeight - (isMobileNow ? 160 : 120)
      });
      canvas.renderAll();
    };

    window.addEventListener('resize', handleResize);

    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('click', handleOutsideClick);
      canvas.off('object:added', saveWorkspace);
      canvas.off('object:modified', saveWorkspace);
      canvas.off('object:removed', saveWorkspace);
      canvas.off('text:editing:entered');
      canvas.off('text:editing:exited');
      
      
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

      // Prevent shortcuts when typing in inputs or on mobile soft keyboards
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      // Skip keyboard shortcuts on mobile devices (except specific ones)
      const isMobile = window.innerWidth <= 768;
      if (isMobile && !['Escape', 'Enter', 'Space'].includes(e.key)) return;

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
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // Use Textbox for better text handling - auto-sizes to content
    const fabricText = new fabric.Textbox('Text goes here', {
      left: 100,
      top: 100,
      fontSize: 24,
      fill: fillEnabled ? fillColor : '#333333',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      padding: 5,
      width: 180,  // Initial width, will expand as needed
      splitByGrapheme: true,  // Better character handling
      borderColor: '#667eea',
      cornerColor: '#667eea',
      cornerSize: 8,
      cornerStyle: 'circle',
      transparentCorners: false,
      selectable: true,
      editable: true,
      dynamicMinWidth: 2,
      lockScalingFlip: true,
      minWidth: 20,
      strokeWidth: 0,
      hasControls: true,
      hasBorders: true
    });

    // Add custom properties for text editing
    fabricText.isPlaceholder = true;
    fabricText.originalText = 'Text goes here';

    // Add the text to canvas
    canvas.add(fabricText);
    canvas.setActiveObject(fabricText);
    
    // Immediately enter edit mode for better UX
    setTimeout(() => {
      fabricText.enterEditing();
      fabricText.selectAll();
    }, 100);

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

  // Drag and drop handlers for image upload
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if leaving the canvas wrapper itself
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      alert('Please drop image files only');
      return;
    }
    
    // Get drop position relative to canvas
    const rect = canvasRef.current.getBoundingClientRect();
    const dropX = e.clientX - rect.left;
    const dropY = e.clientY - rect.top;
    
    // Convert to canvas coordinates
    const pointer = canvas.getPointer(e);
    
    imageFiles.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        fabric.Image.fromURL(event.target.result, (img) => {
          // Scale image if too large
          const maxWidth = 400;
          const maxHeight = 400;
          
          if (img.width > maxWidth || img.height > maxHeight) {
            const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
            img.scale(scale);
          }
          
          // Position image at drop location with slight offset for multiple images
          img.set({
            left: pointer.x + (index * 20),
            top: pointer.y + (index * 20),
            selectable: true,
            evented: true
          });
          
          canvas.add(img);
          canvas.setActiveObject(img);
          canvas.renderAll();
          
          // Save workspace after adding image
          const workspace = workspaceManagerRef.current.getCurrentWorkspace();
          if (workspace) {
            const canvasData = canvas.toJSON();
            const thumbnail = canvas.toDataURL({
              format: 'png',
              quality: 0.3,
              multiplier: 0.1
            });
            workspaceManagerRef.current.updateWorkspaceData(canvasData, thumbnail);
          }
        });
      };
      reader.readAsDataURL(file);
    });
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
      setAiProcessingStage('preparing');
      
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
      
      setAiProcessingStage('processing');
      
      // Generate using AI service with custom prompt
      const service = aiService || new AIService(aiApiKey);
      const results = await service.generateContent(base64Data, 'image/jpeg', customAIPrompt);
      
      setAiProcessingStage('generating');
      
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
          
          setAiProcessingStage('complete');
          setTimeout(() => setAiProcessingStage('idle'), 2000);
        };
        img.src = `data:image/png;base64,${results.image}`;
      }
      
      if (results.text) {
        console.log('AI Response Text:', results.text);
      }
      
    } catch (error) {
      console.error('AI Generation error:', error);
      setAiProcessingStage('error');
      alert(`✨ AI Magic encountered an issue: ${error.message}`);
      setTimeout(() => setAiProcessingStage('idle'), 3000);
    } finally {
      setTimeout(() => setIsAIGenerating(false), aiProcessingStage === 'complete' ? 2000 : 0);
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
      {/* Canana Header */}
      <div className="canana-header">
        <div className="canana-logo">
          <span className="canana-icon">🎨</span>
          <h1 className="canana-title">Canana</h1>
          <span className="canana-subtitle">Visual Prompting for Nano Banana</span>
        </div>
        <div className="canana-actions">
          <div className="canana-workspace-info">
            <span className="current-workspace">
              {workspaces.find(w => w.id === currentWorkspaceId)?.name || 'Workspace'}
            </span>
          </div>
        </div>
      </div>

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
          className={`canvas-wrapper ${isDragOver ? 'drag-over' : ''}`}
          onContextMenu={handleCanvasContextMenu}
          onMouseDown={handleCanvasMouseDown}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <canvas ref={canvasRef} />
          
          {/* AI Processing Overlay */}
          {isAIGenerating && (
            <div className="ai-processing-overlay">
              <div className="ai-processing-content">
                <div className="ai-processing-icon">✨</div>
                <h3 className="ai-processing-title">Visual Prompting Active</h3>
                <div className="ai-processing-stage">
                  {aiProcessingStage === 'preparing' && 'Analyzing visual prompts...'}
                  {aiProcessingStage === 'processing' && 'Sending to Nano Banana...'}
                  {aiProcessingStage === 'generating' && 'Nano Banana processing...'}
                  {aiProcessingStage === 'complete' && '✨ Visual transformation complete!'}
                  {aiProcessingStage === 'error' && '❌ Something went wrong'}
                </div>
                <div className="ai-processing-bar">
                  <div 
                    className="ai-processing-progress"
                    style={{
                      width: aiProcessingStage === 'preparing' ? '25%' : 
                             aiProcessingStage === 'processing' ? '60%' : 
                             aiProcessingStage === 'generating' ? '85%' : 
                             aiProcessingStage === 'complete' ? '100%' : '0%'
                    }}
                  ></div>
                </div>
              </div>
            </div>
          )}
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

      {/* AI API Key Panel - Enhanced */}
      {showAIPanel && (
        <div className="ai-config-panel">
          <button className="close-panel" onClick={() => setShowAIPanel(false)}>×</button>
          
          <div className="ai-config-header">
            <div className="ai-config-icon">✨</div>
            <h3 className="ai-config-title">Visual Prompting Setup</h3>
            <p className="ai-config-subtitle">Configure your Google Gemini API key to unlock visual prompting with Nano Banana</p>
          </div>
          
          <div className="ai-config-form">
            <label className="ai-config-label">Google Gemini API Key</label>
            <input
              type="password"
              className="ai-config-input"
              placeholder="Enter your API key..."
              value={aiApiKey}
              onChange={(e) => setAiApiKey(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAIApiKeySubmit()}
            />
            <button 
              className="ai-config-button"
              onClick={handleAIApiKeySubmit}
              disabled={!aiApiKey}
            >
              <span>🚀 Start Creating Magic</span>
            </button>
          </div>
          
          <div className="ai-config-instructions">
            <h4>How to use AI Magic:</h4>
            <ol>
              <li>Draw, sketch, or add images to your canvas</li>
              <li>Add arrows and text to guide the AI</li>
              <li>Click the ✨ AI Magic button</li>
              <li>Watch as AI transforms your canvas!</li>
            </ol>
          </div>
          
          <div className="ai-config-privacy">
            <div>🔒 Your API key is stored securely on your device</div>
            <div>🌟 No data is shared with third parties</div>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="settings-panel">
          <button className="close-panel" onClick={() => setShowSettings(false)}>×</button>
          
          <div className="settings-header">
            <div className="settings-icon">⚙️</div>
            <h3 className="settings-title">Canana Settings</h3>
            <p className="settings-subtitle">Customize your AI experience</p>
          </div>
          
          <div className="settings-content">
            <div className="settings-section">
              <h4 className="settings-section-title">JSON Visual Prompting for Nano Banana</h4>
              <p className="settings-description">
                Use structured JSON prompts for 60% more accurate and consistent results with Nano Banana. JSON prompting provides precise control over visual transformations and reduces AI errors.
              </p>
              
              <div className="prompt-templates">
                <h5>Quick Templates:</h5>
                <div className="template-buttons">
                  <button 
                    className="template-button"
                    onClick={() => saveCustomPrompt(`{
  "task": "sketch_enhancement",
  "enhancement_type": "professional_artwork_refinement",
  "input_analysis": {
    "source_type": "rough_sketch",
    "preserve_elements": ["core_composition", "main_subjects", "basic_structure"]
  },
  "transformation_requirements": {
    "quality_enhancement": "professional_grade",
    "lighting": "proper_directional_lighting",
    "shadows": "realistic_depth_shadows",
    "details": "enhanced_line_work_and_textures",
    "finish": "polished_professional_artwork"
  },
  "output_specifications": {
    "exclude": ["canvas_interface", "ui_elements", "sketch_guidelines"],
    "include": "refined_artwork_only",
    "style": "enhanced_original_style"
  }
}`)}
                  >
                    🎨 Sketch Enhancer
                  </button>
                  <button 
                    className="template-button"
                    onClick={() => saveCustomPrompt(`{
  "task": "photorealistic_transformation",
  "enhancement_type": "photograph_quality_rendering",
  "input_analysis": {
    "preserve_elements": ["composition", "subjects", "spatial_relationships"],
    "transformation_target": "high_quality_photograph"
  },
  "realism_requirements": {
    "lighting": "natural_photographic_lighting",
    "textures": "realistic_surface_materials",
    "materials": "accurate_material_properties",
    "atmosphere": "environmental_depth_effects",
    "shadows": "physically_accurate_shadows",
    "reflections": "natural_light_interactions"
  },
  "output_specifications": {
    "quality_level": "professional_photography",
    "style": "photorealistic",
    "resolution": "high_definition"
  }
}`)}
                  >
                    📸 Photo Realistic
                  </button>
                  <button 
                    className="template-button"
                    onClick={() => saveCustomPrompt(`{
  "task": "digital_art_transformation",
  "enhancement_type": "modern_digital_artwork",
  "input_analysis": {
    "preserve_elements": ["original_concept", "core_composition"],
    "transformation_target": "stunning_digital_art"
  },
  "artistic_requirements": {
    "color_palette": "vibrant_saturated_colors",
    "gradients": "smooth_color_transitions",
    "styling": "contemporary_digital_art_techniques",
    "effects": "creative_visual_enhancements",
    "finish": "polished_digital_masterpiece"
  },
  "visual_enhancements": {
    "color_vibrancy": "maximum",
    "contrast": "dynamic_range",
    "details": "crisp_digital_precision",
    "overall_impact": "visually_stunning"
  },
  "output_specifications": {
    "style": "modern_digital_art",
    "quality": "professional_artwork"
  }
}`)}
                  >
                    🌈 Digital Art
                  </button>
                  <button 
                    className="template-button"
                    onClick={() => saveCustomPrompt(`{
  "task": "instruction_following_enhancement",
  "enhancement_type": "directed_visual_modification",
  "input_analysis": {
    "instruction_types": ["arrows", "text_annotations", "visual_markers"],
    "processing_priority": "follow_visual_instructions_precisely"
  },
  "instruction_processing": {
    "arrow_interpretation": "directional_modification_cues",
    "text_instructions": "written_enhancement_directions",
    "annotation_following": "precise_visual_guidance_execution",
    "modification_scope": "as_directed_by_markings"
  },
  "output_requirements": {
    "remove_completely": ["arrows", "text_annotations", "instruction_markers", "visual_guides"],
    "preserve_modifications": "all_directed_changes",
    "composition": "clean_professional_result",
    "quality": "professional_grade_finish"
  },
  "final_specifications": {
    "cleanliness": "no_instructional_artifacts",
    "quality": "polished_professional_output"
  }
}`)}
                  >
                    ✏️ Instruction Follower
                  </button>
                </div>
              </div>
              
              <div className="json-prompting-tips">
                <h5>💡 JSON Prompting Tips:</h5>
                <ul>
                  <li><strong>Structured Format:</strong> Use JSON objects for 60% better accuracy</li>
                  <li><strong>Clear Keys:</strong> Define "task", "requirements", "output_specifications"</li>
                  <li><strong>Nested Objects:</strong> Organize complex instructions hierarchically</li>
                  <li><strong>Specific Values:</strong> Use precise descriptors over vague terms</li>
                </ul>
              </div>
              
              <div className="custom-prompt-editor">
                <label className="prompt-label">Custom JSON Prompt for Nano Banana:</label>
                <textarea
                  className="prompt-textarea"
                  value={customAIPrompt}
                  onChange={(e) => setCustomAIPrompt(e.target.value)}
                  placeholder='{\n  "task": "your_enhancement_type",\n  "requirements": {\n    "style": "your_desired_style",\n    "quality": "professional_grade"\n  },\n  "output_specifications": {\n    "exclude": ["canvas_interface", "ui_elements"],\n    "include": "enhanced_content_only"\n  }\n}'
                  rows={8}
                />
                <div className="prompt-actions">
                  <button 
                    className="save-prompt-button"
                    onClick={() => saveCustomPrompt(customAIPrompt)}
                  >
                    💾 Save Prompt
                  </button>
                  <button 
                    className="reset-prompt-button"
                    onClick={() => {
                      const defaultPrompt = "This is a canvas screenshot with instruction arrows and text annotations that tell you what to create or modify. READ and FOLLOW the arrows and text instructions, but DO NOT include them in your output. Generate the final image based on the instructions, but exclude: all instruction arrows, annotation text, UI elements, canvas interface, toolbars, and annotation markings. IMPORTANT: Crop tightly around the actual content - remove ALL empty white canvas space, borders, and padding. Return only the essential image content itself, properly cropped to its natural boundaries with no excess white space. Ensure ALL elements have consistent lighting, shadows, color temperature, and visual style - everything should look naturally integrated and cohesive, not like separate pasted elements. The final image should feel unified with harmonious lighting and seamless blending of all components.";
                      saveCustomPrompt(defaultPrompt);
                    }}
                  >
                    🔄 Reset to Default
                  </button>
                </div>
              </div>
              
              <div className="prompt-preview">
                <h5>Current Prompt Preview:</h5>
                <div className="prompt-preview-text">
                  {customAIPrompt.length > 150 
                    ? `${customAIPrompt.substring(0, 150)}...` 
                    : customAIPrompt}
                </div>
                <div className="prompt-stats">
                  Length: {customAIPrompt.length} characters
                </div>
              </div>
            </div>
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
        <div className="dock" ref={dockRef}>
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

          {/* AI Generation - Featured */}
          <div 
            className={`dock-item ai-button ${isAIGenerating ? 'active loading' : ''}`}
            onClick={handleAIGenerate}
          >
            {isAIGenerating ? (
              <div className="canana-loading-spinner"></div>
            ) : (
              <span className="ai-icon">✨</span>
            )}
            <span className="dock-tooltip">
              {isAIGenerating ? 'Visual Prompting Active...' : '✨ Visual Prompting - Powered by Nano Banana'}
            </span>
          </div>

          <div className="dock-divider" />

          {/* Settings */}
          <div 
            className={`dock-item ${showSettings ? 'active' : ''}`}
            onClick={() => setShowSettings(!showSettings)}
          >
            ⚙️
            <span className="dock-tooltip">Settings - Customize AI Prompt</span>
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