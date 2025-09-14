// Workspace management utilities
export class WorkspaceManager {
  constructor() {
    this.workspaces = this.loadWorkspaces();
    this.currentWorkspaceId = this.loadCurrentWorkspaceId();
  }

  // Generate unique ID
  generateId() {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Load workspaces from localStorage
  loadWorkspaces() {
    try {
      const saved = localStorage.getItem('artist_workspaces');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading workspaces:', e);
    }
    
    // Create default workspace if none exist
    const defaultWorkspace = {
      id: this.generateId(),
      name: 'Workspace 1',
      data: null,
      thumbnail: null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    return [defaultWorkspace];
  }

  // Load current workspace ID
  loadCurrentWorkspaceId() {
    const id = localStorage.getItem('artist_current_workspace');
    if (id && this.workspaces.find(ws => ws.id === id)) {
      return id;
    }
    return this.workspaces[0]?.id;
  }

  // Save workspaces to localStorage
  saveWorkspaces() {
    try {
      localStorage.setItem('artist_workspaces', JSON.stringify(this.workspaces));
      localStorage.setItem('artist_current_workspace', this.currentWorkspaceId);
    } catch (e) {
      console.error('Error saving workspaces:', e);
      // If localStorage is full, remove oldest workspace
      if (e.name === 'QuotaExceededError' && this.workspaces.length > 1) {
        this.workspaces.sort((a, b) => b.updatedAt - a.updatedAt);
        this.workspaces.pop();
        this.saveWorkspaces();
      }
    }
  }

  // Get all workspaces
  getAllWorkspaces() {
    return this.workspaces;
  }

  // Get current workspace
  getCurrentWorkspace() {
    return this.workspaces.find(ws => ws.id === this.currentWorkspaceId);
  }

  // Create new workspace
  createWorkspace(name = null) {
    const workspaceNumber = this.workspaces.length + 1;
    const newWorkspace = {
      id: this.generateId(),
      name: name || `Workspace ${workspaceNumber}`,
      data: null,
      thumbnail: null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    this.workspaces.push(newWorkspace);
    this.currentWorkspaceId = newWorkspace.id;
    this.saveWorkspaces();
    
    return newWorkspace;
  }

  // Switch to workspace
  switchToWorkspace(id) {
    if (this.workspaces.find(ws => ws.id === id)) {
      this.currentWorkspaceId = id;
      this.saveWorkspaces();
      return true;
    }
    return false;
  }

  // Update current workspace data
  updateWorkspaceData(canvasData, thumbnail = null) {
    const workspace = this.getCurrentWorkspace();
    if (workspace) {
      workspace.data = canvasData;
      workspace.updatedAt = Date.now();
      if (thumbnail) {
        workspace.thumbnail = thumbnail;
      }
      this.saveWorkspaces();
    }
  }

  // Rename workspace
  renameWorkspace(id, newName) {
    const workspace = this.workspaces.find(ws => ws.id === id);
    if (workspace) {
      workspace.name = newName;
      workspace.updatedAt = Date.now();
      this.saveWorkspaces();
      return true;
    }
    return false;
  }

  // Delete workspace
  deleteWorkspace(id) {
    // Don't delete if it's the only workspace
    if (this.workspaces.length <= 1) {
      return false;
    }
    
    const index = this.workspaces.findIndex(ws => ws.id === id);
    if (index !== -1) {
      this.workspaces.splice(index, 1);
      
      // If deleting current workspace, switch to another
      if (this.currentWorkspaceId === id) {
        this.currentWorkspaceId = this.workspaces[0].id;
      }
      
      this.saveWorkspaces();
      return true;
    }
    return false;
  }

  // Duplicate workspace
  duplicateWorkspace(id) {
    const workspace = this.workspaces.find(ws => ws.id === id);
    if (workspace) {
      const duplicate = {
        ...workspace,
        id: this.generateId(),
        name: `${workspace.name} (Copy)`,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      this.workspaces.push(duplicate);
      this.currentWorkspaceId = duplicate.id;
      this.saveWorkspaces();
      
      return duplicate;
    }
    return null;
  }

  // Get workspace count
  getWorkspaceCount() {
    return this.workspaces.length;
  }

  // Clear all workspaces (reset to default)
  clearAllWorkspaces() {
    if (window.confirm('This will delete all workspaces. Are you sure?')) {
      localStorage.removeItem('artist_workspaces');
      localStorage.removeItem('artist_current_workspace');
      this.workspaces = this.loadWorkspaces();
      this.currentWorkspaceId = this.workspaces[0]?.id;
      return true;
    }
    return false;
  }
}

export default WorkspaceManager;