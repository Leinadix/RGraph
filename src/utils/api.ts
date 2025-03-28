import { Node, Edge } from '../types';

const API_URL = 'http://localhost:3001/api';

interface ApiResponse<T = any> {
  success?: boolean;
  error?: string;
  [key: string]: any;
}

// Helper function to handle API errors
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API error: ${response.status}`);
  }
  return response.json();
}

// Get all nodes
export async function getNodes(): Promise<Node[]> {
  const response = await fetch(`${API_URL}/nodes`);
  const data = await handleResponse<{ nodes: Node[] }>(response);
  return data.nodes || [];
}

// Get all edges
export async function getEdges(): Promise<Edge[]> {
  const response = await fetch(`${API_URL}/edges`);
  const data = await handleResponse<{ edges: Edge[] }>(response);
  return data.edges || [];
}

// Get all graph data (nodes and edges)
export async function getGraphData(): Promise<{ nodes: Node[], edges: Edge[] }> {
  const response = await fetch(`${API_URL}/graph`);
  const data = await handleResponse<{ nodes: Node[], edges: Edge[] }>(response);
  return {
    nodes: data.nodes || [],
    edges: data.edges || []
  };
}

// Save a node
export async function saveNode(node: Node): Promise<ApiResponse> {
  const method = node.id ? 'PUT' : 'POST';
  const url = node.id ? `${API_URL}/nodes/${node.id}` : `${API_URL}/nodes`;
  
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(node),
  });
  
  return handleResponse<ApiResponse>(response);
}

// Delete a node
export async function deleteNode(nodeId: string): Promise<ApiResponse> {
  const response = await fetch(`${API_URL}/nodes/${nodeId}`, {
    method: 'DELETE',
  });
  
  return handleResponse<ApiResponse>(response);
}

// Save an edge
export async function saveEdge(edge: Edge): Promise<ApiResponse> {
  const method = edge.id ? 'PUT' : 'POST';
  const url = edge.id ? `${API_URL}/edges/${edge.id}` : `${API_URL}/edges`;
  
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(edge),
  });
  
  return handleResponse<ApiResponse>(response);
}

// Delete an edge
export async function deleteEdge(edgeId: string): Promise<ApiResponse> {
  const response = await fetch(`${API_URL}/edges/${edgeId}`, {
    method: 'DELETE',
  });
  
  return handleResponse<ApiResponse>(response);
}

// Get changes since timestamp
export async function getChangesSince(timestamp: number): Promise<{
  nodes: Node[];
  edges: Edge[];
  timestamp: number;
}> {
  const response = await fetch(`${API_URL}/changes/${timestamp}`);
  const data = await handleResponse<{
    nodes: Node[];
    edges: Edge[];
    timestamp: number;
  }>(response);
  
  return {
    nodes: data.nodes || [],
    edges: data.edges || [],
    timestamp: data.timestamp || Date.now()
  };
}

// Get last sync timestamp
export async function getLastSyncTimestamp(): Promise<number> {
  const response = await fetch(`${API_URL}/sync/timestamp`);
  const data = await handleResponse<{ timestamp: number }>(response);
  return data.timestamp || 0;
}

// Import data
export async function importData(data: { nodes: Node[], edges: Edge[] }): Promise<ApiResponse> {
  const response = await fetch(`${API_URL}/import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  return handleResponse<ApiResponse>(response);
}

// Clear all data
export async function clearDatabase(): Promise<ApiResponse> {
  const response = await fetch(`${API_URL}/clear`, {
    method: 'POST',
  });
  
  return handleResponse<ApiResponse>(response);
}

// Check server status
export async function checkServerStatus(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/status`);
    const data = await handleResponse<{ status: string }>(response);
    return data.status === 'ok';
  } catch (error) {
    console.error('Server status check failed:', error);
    return false;
  }
} 