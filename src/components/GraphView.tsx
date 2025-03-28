import React, { useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Connection,
  Edge,
  NodeChange,
  EdgeChange,
  Node,
  NodeMouseHandler,
  OnSelectionChangeParams,
  Panel,
  useEdgesState,
  useNodesState,
  applyNodeChanges,
  applyEdgeChanges
} from 'reactflow';
import 'reactflow/dist/style.css';

interface GraphViewProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onNodeClick: NodeMouseHandler;
  onPaneClick: () => void;
  onConnect: (connection: Connection) => void;
}

const GraphView: React.FC<GraphViewProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onNodeClick,
  onPaneClick,
  onConnect
}) => {
  // Node types for custom rendering
  const nodeTypes = {
    // Define custom node types here if needed
  };

  // Edge types for custom rendering
  const edgeTypes = {
    // Define custom edge types here if needed
  };

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      attributionPosition="bottom-right"
    >
      <Controls />
      <Background color="#aaa" gap={16} />
      <Panel position="top-right">
        <button 
          onClick={() => {}} 
          className="add-node-button"
          style={{
            padding: '8px 12px',
            background: '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '8px'
          }}
        >
          Add Node
        </button>
      </Panel>
    </ReactFlow>
  );
};

export default GraphView; 