import { useState, useEffect, useRef } from 'react';
import './App.css';
import GraphView from './components/GraphView';
import { Node, Edge } from './types';

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
  
  // Form fields for editing
  const [editLabel, setEditLabel] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editIcon, setEditIcon] = useState<string>('');

  // Reference to track previous edit mode state for animation
  const prevEditModeRef = useRef<boolean>(false);
  const editPanelRef = useRef<HTMLDivElement>(null);
  const editFormRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);

  // Handle transitions when edit mode changes
  useEffect(() => {
    if (editMode !== prevEditModeRef.current) {
      if (editMode) {
        // Entering edit mode
        setEditTransitioning(true);
        if (editPanelRef.current) {
          editPanelRef.current.classList.add('entering');
        }
        if (editFormRef.current) {
          editFormRef.current.classList.add('entering');
        }
        
        // Remove animation class after a small delay
        setTimeout(() => {
          if (editPanelRef.current) {
            editPanelRef.current.classList.remove('entering');
          }
          if (editFormRef.current) {
            editFormRef.current.classList.remove('entering');
          }
        }, 50);
        
        // Set transitioning to false after animation completes
        setTimeout(() => {
          setEditTransitioning(false);
        }, 500);
      } else {
        // Exiting edit mode
        setEditTransitioning(true);
        if (editPanelRef.current) {
          editPanelRef.current.classList.add('exiting');
        }
        
        // Remove animation class and set transitioning false after animation
        setTimeout(() => {
          if (editPanelRef.current) {
            editPanelRef.current.classList.remove('exiting');
          }
          setEditTransitioning(false);
        }, 500);
      }
      
      prevEditModeRef.current = editMode;
    }
  }, [editMode]);

  // Handle transitions when node selection changes
  useEffect(() => {
    if (infoRef.current) {
      if (selectedNode) {
        // When a node is selected, add entering class temporarily
        infoRef.current.classList.add('entering');
        
        // Remove the entering class after a delay to trigger the animation
        setTimeout(() => {
          if (infoRef.current) {
            infoRef.current.classList.remove('entering');
          }
        }, 50);
      }
    }
  }, [selectedNode]);
  
  const addNode = (x?: number, y?: number) => {
    const newNode: Node = {
      id: `node-${Date.now()}`,
      label: `Node ${nodes.length + 1}`,
      description: '',
      icon: 'circle',
      x: x !== undefined ? x : Math.random() * 800,
      y: y !== undefined ? y : Math.random() * 600,
    };
    setNodes([...nodes, newNode]);
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
      setEdges([...edges, newEdge]);
      
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
      } else {
        // Clear edit fields when deselected
        setEditLabel('');
        setEditDescription('');
        setEditIcon('circle');
        setEditMode(false);
      }
    }
  };

  const cancelConnectMode = () => {
    setConnectMode(false);
    setSourceNode(null);
  };

  const deleteNode = (nodeId: string) => {
    setNodes(nodes.filter(node => node.id !== nodeId));
    setEdges(edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId));
    if (selectedNode === nodeId) {
      setSelectedNode(null);
      setEditMode(false);
    }
  };

  const startEditMode = () => {
    if (selectedNode) {
      const node = nodes.find(n => n.id === selectedNode);
      if (node) {
        setEditLabel(node.label);
        setEditDescription(node.description || '');
        setEditIcon(node.icon || 'circle');
        setEditMode(true);
      }
    }
  };

  const saveNodeChanges = () => {
    if (selectedNode) {
      // Create a temporary exiting class for animation
      if (editPanelRef.current) {
        editPanelRef.current.classList.add('exiting');
      }
      
      // After the animation delay, update the node
      setTimeout(() => {
        setNodes(nodes.map(node => 
          node.id === selectedNode 
            ? { 
                ...node, 
                label: editLabel,
                description: editDescription,
                icon: editIcon
              } 
            : node
        ));
        setEditMode(false);
      }, 500);
    }
  };

  const cancelEditMode = () => {
    // Create a temporary exiting class for animation
    if (editPanelRef.current) {
      editPanelRef.current.classList.add('exiting');
    }
    
    // After the animation delay, reset edit mode
    setTimeout(() => {
      setEditMode(false);
    }, 500);
  };

  // Handler for creating a node at cursor position
  const handleAddNodeAtPosition = (x: number, y: number) => {
    addNode(x, y);
  };

  return (
    <div className="app">
      <div className="controls">
        <button onClick={() => addNode()}>Add Node</button>
        {!connectMode && !editMode && !editTransitioning ? (
          <>
            <button onClick={() => selectedNode && startConnectMode(selectedNode)} disabled={!selectedNode}>
              Connect Nodes
            </button>
            <button 
              onClick={startEditMode} 
              disabled={!selectedNode}
              className="edit-button"
            >
              Edit Node
            </button>
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
              <button onClick={cancelEditMode} className="cancel-button">Cancel</button>
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
      </div>
      
      <div className="main-content">
        <div className="graph-container">
          <GraphView 
            nodes={nodes} 
            edges={edges} 
            selectedNode={selectedNode}
            sourceNode={connectMode ? sourceNode : null}
            connectMode={connectMode}
            onSelectNode={handleNodeSelect}
            onAddNode={handleAddNodeAtPosition}
            onStartConnectMode={startConnectMode}
            isEditing={editMode || editTransitioning}
          />
        </div>
        
        <div 
          className={`node-info-panel ${!selectedNode || editMode || editTransitioning ? 'hidden' : ''}`} 
          ref={infoRef}
        >
          {nodes.find(n => n.id === selectedNode) && (
            <>
              <h3>{nodes.find(n => n.id === selectedNode)?.label}</h3>
              {nodes.find(n => n.id === selectedNode)?.description && (
                <p className="node-description">
                  {nodes.find(n => n.id === selectedNode)?.description}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App; 