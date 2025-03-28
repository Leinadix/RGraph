import { useState, useEffect, useRef } from 'react';
import './App.css';
import GraphView from './components/GraphView';
import { Node, Edge } from './types';
import * as api from './utils/api';

// Available icons for nodes
const AVAILABLE_ICONS = [
  'circle', 'diamond', 'square', 'triangle', 'star',
  'document', 'image', 'code', 'person', 'calendar',
  'task', 'note', 'idea', 'question', 'info'
];

function App() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [connectMode, setConnectMode] = useState<boolean>(false);
  const [sourceNode, setSourceNode] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [editTransitioning, setEditTransitioning] = useState<boolean>(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [syncEnabled, setSyncEnabled] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string>('Server disconnected');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [serverConnected, setServerConnected] = useState<boolean>(false);
  
  // Form fields for editing
  const [editLabel, setEditLabel] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editIcon, setEditIcon] = useState<string>('');

  // Reference to track previous edit mode state for animation
  const prevEditModeRef = useRef<boolean>(false);
  const editPanelRef = useRef<HTMLDivElement>(null);
  const editFormRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Check server connection on load
  useEffect(() => {
    const checkConnection = async () => {
      setIsLoading(true);
      try {
        const isConnected = await api.checkServerStatus();
        setServerConnected(isConnected);
        setSyncStatus(isConnected ? 'Server connected' : 'Server disconnected');
        
        if (isConnected) {
          // Load initial data
          await loadGraphData();
        }
      } catch (error) {
        console.error('Server connection error:', error);
        setServerConnected(false);
        setSyncStatus('Server disconnected');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkConnection();
    
    // Set up periodic connection check
    const connectionInterval = setInterval(async () => {
      const isConnected = await api.checkServerStatus();
      if (isConnected !== serverConnected) {
        setServerConnected(isConnected);
        setSyncStatus(isConnected ? 'Server connected' : 'Server disconnected');
        
        if (isConnected && !serverConnected) {
          // If we just reconnected, reload data
          await loadGraphData();
        }
      }
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(connectionInterval);
  }, [serverConnected]);
  
  // Sync data periodically when enabled
  useEffect(() => {
    if (!syncEnabled || !serverConnected) return;
    
    const syncInterval = setInterval(async () => {
      await syncData();
    }, 10000); // Sync every 10 seconds
    
    return () => clearInterval(syncInterval);
  }, [syncEnabled, serverConnected]);

  // Handle transitions when edit mode changes
  useEffect(() => {
    // If we're entering edit mode
    if (editMode && !prevEditModeRef.current) {
      setEditTransitioning(false);
    }
    
    prevEditModeRef.current = editMode;
  }, [editMode]);

  // Get details of selected node
  useEffect(() => {
    if (selectedNode) {
      const selectedNodeData = nodes.find(node => node.id === selectedNode);
      if (selectedNodeData) {
        // Only set these values if we're not in edit mode already
        if (!editMode) {
          setEditLabel(selectedNodeData.label);
          setEditDescription(selectedNodeData.description || '');
          setEditIcon(selectedNodeData.icon || 'circle');
        }
      }
    }
  }, [selectedNode, nodes, editMode]);
  
  // Load graph data from the server
  const loadGraphData = async () => {
    try {
      setIsLoading(true);
      const data = await api.getGraphData();
      setNodes(data.nodes);
      setEdges(data.edges);
      setSyncStatus('Data loaded from server');
    } catch (error) {
      console.error('Failed to load graph data:', error);
      setSyncStatus('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Sync data with the server
  const syncData = async () => {
    try {
      setSyncStatus('Syncing...');
      
      // Get the last sync timestamp
      const lastSync = await api.getLastSyncTimestamp();
      
      // Get changes since last sync
      const changes = await api.getChangesSince(lastSync);
      
      // Update local state with server changes
      if (changes.nodes.length > 0 || changes.edges.length > 0) {
        // Apply changes from server
        setNodes(prevNodes => {
          const nodeMap = new Map(prevNodes.map(node => [node.id, node]));
          
          // Update existing nodes and add new ones
          changes.nodes.forEach(node => {
            nodeMap.set(node.id, node);
          });
          
          return Array.from(nodeMap.values());
        });
        
        setEdges(prevEdges => {
          const edgeMap = new Map(prevEdges.map(edge => [edge.id, edge]));
          
          // Update existing edges and add new ones
          changes.edges.forEach(edge => {
            edgeMap.set(edge.id, edge);
          });
          
          return Array.from(edgeMap.values());
        });
        
        setSyncStatus(`Synced ${changes.nodes.length} nodes, ${changes.edges.length} edges`);
      } else {
        setSyncStatus('No changes to sync');
      }
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus('Sync failed');
    }
  };
  
  const addNode = async (x?: number, y?: number) => {
    const newNode: Node = {
      id: `node-${Date.now()}`,
      label: `Node ${nodes.length + 1}`,
      description: '',
      icon: 'circle',
      x: x !== undefined ? x : Math.random() * 800,
      y: y !== undefined ? y : Math.random() * 600,
    };
    
    // Add to local state first for immediate feedback
    setNodes(prevNodes => [...prevNodes, newNode]);
    
    // Then save to server if connected
    if (serverConnected) {
      try {
        await api.saveNode(newNode);
      } catch (error) {
        console.error('Failed to save node to server:', error);
        setSyncStatus('Failed to save node');
      }
    }
  };

  const startConnectMode = (nodeId: string) => {
    setSourceNode(nodeId);
    setConnectMode(true);
    setSelectedNode(nodeId);
  };

  const handleNodeSelect = (nodeId: string | null) => {
    if (connectMode && sourceNode && nodeId && nodeId !== sourceNode) {
      // Create a connection between source and target nodes
      const newEdge: Edge = {
        id: `edge-${Date.now()}`,
        source: sourceNode,
        target: nodeId,
      };
      
      // Add to local state first
      setEdges(prevEdges => [...prevEdges, newEdge]);
      
      // Then save to server if connected
      if (serverConnected) {
        api.saveEdge(newEdge).catch(error => {
          console.error('Failed to save edge to server:', error);
          setSyncStatus('Failed to save connection');
        });
      }
      
      // Exit connect mode
      setConnectMode(false);
      setSourceNode(null);
      setSelectedNode(nodeId);
    } else {
      // Normal selection
      setSelectedNode(nodeId);
      if (nodeId) {
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
          setEditLabel(node.label);
          setEditDescription(node.description || '');
          setEditIcon(node.icon || 'circle');
        }
      }
    }
  };

  const cancelConnectMode = () => {
    setConnectMode(false);
    setSourceNode(null);
  };

  const deleteNode = async (nodeId: string) => {
    // Remove the node from local state
    setNodes(prevNodes => prevNodes.filter(node => node.id !== nodeId));
    
    // Also remove any edges connected to this node
    setEdges(prevEdges => prevEdges.filter(
      edge => edge.source !== nodeId && edge.target !== nodeId
    ));
    
    // Deselect if this was the selected node
    if (selectedNode === nodeId) {
      setSelectedNode(null);
    }
    
    // Delete from server if connected
    if (serverConnected) {
      try {
        await api.deleteNode(nodeId);
        // Edges connected to this node should be automatically deleted on the server
      } catch (error) {
        console.error('Failed to delete node from server:', error);
        setSyncStatus('Failed to delete node');
      }
    }
  };

  const handleEditStart = () => {
    if (selectedNode) {
      // Find the selected node data
      const selectedNodeData = nodes.find(node => node.id === selectedNode);
      if (!selectedNodeData) return;
      
      // Set transitioning state for animation
      setEditTransitioning(true);
      
      // Wait a short delay for animation to start
      setTimeout(() => {
        setEditLabel(selectedNodeData.label);
        setEditDescription(selectedNodeData.description || '');
        setEditIcon(selectedNodeData.icon || 'circle');
        setEditMode(true);
      }, 200);
    }
  };

  const handleEditCancel = () => {
    // Set transitioning state first
    setEditTransitioning(true);
    
    // Add a small delay before changing mode to allow animations to work smoothly
    setTimeout(() => {
      setEditMode(false);
    }, 200);
  };

  const saveNodeChanges = async () => {
    if (selectedNode) {
      // Create a temporary exiting class for animation
      if (editPanelRef.current) {
        editPanelRef.current.classList.add('exiting');
      }
      
      // After the animation delay, update the node
      setTimeout(async () => {
        // Update local state
        setNodes(prevNodes => {
          const updatedNodes = prevNodes.map(node => 
            node.id === selectedNode 
              ? { 
                  ...node, 
                  label: editLabel,
                  description: editDescription,
                  icon: editIcon
                } 
              : node
          );
          
          return updatedNodes;
        });
        
        // Save to server if connected
        if (serverConnected) {
          const updatedNode = nodes.find(node => node.id === selectedNode);
          if (updatedNode) {
            try {
              await api.saveNode({
                ...updatedNode,
                label: editLabel,
                description: editDescription,
                icon: editIcon
              });
            } catch (error) {
              console.error('Failed to save node changes to server:', error);
              setSyncStatus('Failed to save changes');
            }
          }
        }
        
        setEditMode(false);
      }, 200);
    }
  };

  // Handler for creating a node at cursor position
  const handleAddNodeAtPosition = (x: number, y: number) => {
    addNode(x, y);
  };

  // Export graph data as JSON file
  const handleExportData = () => {
    // Create an object with the current graph data
    const graphData = {
      nodes,
      edges
    };
    
    // Convert to JSON string
    const jsonString = JSON.stringify(graphData, null, 2);
    
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    // Create a download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Set the filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.download = `graph-data-${timestamp}.json`;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Trigger file input click for import
  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle the file selection and import data
  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setImportError(null);
    
    if (!file) return;
    
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const parsedData = JSON.parse(content);
        
        // Validate the imported data structure
        if (!parsedData.nodes || !Array.isArray(parsedData.nodes) || 
            !parsedData.edges || !Array.isArray(parsedData.edges)) {
          setImportError('Invalid JSON format: Missing nodes or edges arrays');
          return;
        }
        
        // Check if nodes have required properties
        const validNodes = parsedData.nodes.every((node: any) => 
          node.id && node.label && 
          typeof node.x === 'number' && 
          typeof node.y === 'number'
        );
        
        if (!validNodes) {
          setImportError('Invalid node data: Nodes must have id, label, x, and y properties');
          return;
        }
        
        // Check if edges have required properties
        const validEdges = parsedData.edges.every((edge: any) => 
          edge.id && edge.source && edge.target
        );
        
        if (!validEdges) {
          setImportError('Invalid edge data: Edges must have id, source, and target properties');
          return;
        }
        
        // Set the imported data
        setNodes(parsedData.nodes);
        setEdges(parsedData.edges);
        
        // Import to server if connected
        if (serverConnected) {
          try {
            setSyncStatus('Importing data to server...');
            await api.importData(parsedData);
            setSyncStatus('Data imported successfully');
          } catch (error) {
            console.error('Failed to import data to server:', error);
            setSyncStatus('Server import failed');
          }
        }
        
        // Deselect any selected node
        setSelectedNode(null);
        setEditMode(false);
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        setImportError(`Error parsing JSON: ${error instanceof Error ? error.message : String(error)}`);
      }
    };
    
    reader.readAsText(file);
  };

  // Toggle database sync
  const toggleDatabaseSync = () => {
    const newSyncState = !syncEnabled;
    setSyncEnabled(newSyncState);
    
    if (newSyncState) {
      if (serverConnected) {
        syncData(); // Perform initial sync
        setSyncStatus('Sync enabled - syncing data');
      } else {
        setSyncStatus('Cannot enable sync - server not connected');
        setSyncEnabled(false); // Force it back off
      }
    } else {
      setSyncStatus(serverConnected ? 'Sync disabled' : 'Server disconnected');
    }
  };

  return (
    <div className="app">
      <div className="app-header">
        <div className="sync-toggle">
          <label className="sync-label">
            <span>Database Sync:</span>
            <div className={`toggle-switch ${syncEnabled ? 'active' : ''}`} onClick={toggleDatabaseSync}>
              <div className="toggle-slider"></div>
            </div>
          </label>
          <div className={`sync-status ${!serverConnected ? 'error' : ''}`}>{syncStatus}</div>
        </div>
      </div>
      
      {isLoading ? (
        <div className="loading-indicator">Loading graph data...</div>
      ) : (
      <div className="controls">
        <button onClick={() => addNode()}>Add Node</button>
        {!connectMode && !editMode && !editTransitioning ? (
          <>
            <button onClick={() => selectedNode && startConnectMode(selectedNode)} disabled={!selectedNode}>
              Connect Nodes
            </button>
            <button 
              onClick={handleEditStart} 
              disabled={!selectedNode}
              className="edit-button"
            >
              Edit Node
            </button>
            
            <div className="separator"></div>
            
            <button 
              onClick={handleExportData}
              className="export-button"
              title="Export graph data as JSON"
            >
              Export JSON
            </button>
            
            <button 
              onClick={handleImportClick}
              className="import-button"
              title="Import graph data from JSON file"
            >
              Import JSON
            </button>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileImport} 
              style={{ display: 'none' }} 
              accept=".json"
            />
          </>
        ) : null}
        
        {connectMode && !editTransitioning && (
          <>
            <button onClick={cancelConnectMode} className="cancel-button">
              Cancel Connection
            </button>
            <div className="connection-help">
              Select target node to complete connection
            </div>
          </>
        )}
        
        <div 
          className={`edit-panel ${!editMode ? 'hidden' : ''}`} 
          ref={editPanelRef}
        >
          <div className="edit-form" ref={editFormRef}>
            <label>
              Node Name:
              <input 
                type="text" 
                value={editLabel} 
                onChange={(e) => setEditLabel(e.target.value)}
                placeholder="Enter node name" 
              />
            </label>
            
            <label>
              Description:
              <textarea 
                value={editDescription} 
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Enter node description"
                rows={3} 
              />
            </label>
            
            <label>
              Icon:
              <div className="icon-selector">
                {AVAILABLE_ICONS.map(icon => (
                  <div 
                    key={icon}
                    className={`icon-option ${editIcon === icon ? 'selected' : ''}`}
                    onClick={() => setEditIcon(icon)}
                  >
                    {icon}
                  </div>
                ))}
              </div>
            </label>
            
            <div className="edit-buttons">
              <button onClick={saveNodeChanges} className="save-button">Save</button>
              <button onClick={handleEditCancel} className="cancel-button">Cancel</button>
            </div>
          </div>
        </div>
        
        {!connectMode && !editMode && !editTransitioning && (
          <button 
            onClick={() => selectedNode && deleteNode(selectedNode)} 
            disabled={!selectedNode}
            className="delete-button"
          >
            Delete Node
          </button>
        )}
        
        {importError && !editMode && !connectMode && (
          <div className="import-error">
            {importError}
            <button 
              className="close-error-button" 
              onClick={() => setImportError(null)}
              title="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}
      </div>
      )}
      
      <div className="main-content">
        <GraphView 
          nodes={nodes}
          edges={edges}
          selectedNode={selectedNode}
          sourceNode={sourceNode}
          connectMode={connectMode}
          onSelectNode={handleNodeSelect}
          onAddNode={handleAddNodeAtPosition}
          onStartConnectMode={startConnectMode}
          isEditing={editMode}
        />
        
        <div 
          className={`node-info ${!selectedNode || editMode ? 'hidden' : ''}`}
          ref={infoRef}
        >
          {selectedNode && (
            <>
              {(() => {
                const node = nodes.find(n => n.id === selectedNode);
                return node ? (
                  <div>
                    <h3>{node.label}</h3>
                    {node.description && (
                      <div className="node-description">{node.description}</div>
                    )}
                  </div>
                ) : null;
              })()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App; 