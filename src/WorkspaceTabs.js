import React from 'react';

function WorkspaceTabs({ 
  workspaces, 
  currentWorkspaceId, 
  onSwitch, 
  onNew, 
  onDelete, 
  onRename,
  showPanel,
  setShowPanel 
}) {
  const handleRename = (workspace) => {
    const newName = prompt('Rename workspace:', workspace.name);
    if (newName && newName.trim()) {
      onRename(workspace.id, newName.trim());
    }
  };

  // Show only first 3 workspaces in tabs, rest in panel
  const visibleWorkspaces = workspaces.slice(0, 3);
  const hasMore = workspaces.length > 3;

  return (
    <>
      <div className="workspace-tabs">
        {visibleWorkspaces.map(workspace => (
          <div
            key={workspace.id}
            className={`workspace-tab ${workspace.id === currentWorkspaceId ? 'active' : ''}`}
            onClick={() => onSwitch(workspace.id)}
            onDoubleClick={() => handleRename(workspace)}
            title="Double-click to rename"
          >
            <span>{workspace.name}</span>
            {workspaces.length > 1 && (
              <span 
                className="workspace-tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Delete "${workspace.name}"?`)) {
                    onDelete(workspace.id);
                  }
                }}
              >
                ×
              </span>
            )}
          </div>
        ))}
        
        {hasMore && (
          <div 
            className="workspace-tab"
            onClick={() => setShowPanel(!showPanel)}
            style={{ background: showPanel ? '#f0f0f0' : undefined }}
          >
            <span>More ({workspaces.length - 3})</span>
          </div>
        )}
        
        <button className="workspace-new" onClick={onNew}>
          + New
        </button>
      </div>

      {/* Workspace Panel for additional workspaces */}
      {showPanel && hasMore && (
        <div className="workspace-panel">
          <button className="close-panel" onClick={() => setShowPanel(false)}>×</button>
          <div className="panel-header">All Workspaces</div>
          <div style={{ marginTop: '12px' }}>
            {workspaces.map(workspace => (
              <div
                key={workspace.id}
                className={`workspace-list-item ${workspace.id === currentWorkspaceId ? 'active' : ''}`}
                onClick={() => {
                  onSwitch(workspace.id);
                  setShowPanel(false);
                }}
                onDoubleClick={() => handleRename(workspace)}
                title="Double-click to rename"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {workspace.thumbnail && (
                    <img 
                      src={workspace.thumbnail} 
                      alt={workspace.name}
                      className="workspace-thumbnail"
                    />
                  )}
                  <div>
                    <div style={{ fontWeight: workspace.id === currentWorkspaceId ? '600' : '400' }}>
                      {workspace.name}
                    </div>
                    <div style={{ fontSize: '10px', opacity: 0.6 }}>
                      {new Date(workspace.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                {workspaces.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Delete "${workspace.name}"?`)) {
                        onDelete(workspace.id);
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ff6b6b',
                      cursor: 'pointer',
                      fontSize: '18px'
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export default WorkspaceTabs;