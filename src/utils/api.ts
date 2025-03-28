import { Node, Edge } from '../types';
import { getSessionToken } from './projectApi';

const API_URL = 'http://localhost:3001/api';

interface ApiResponse<T = any> {
  success?: boolean;
  error?: string;
  [key: string]: any;
}

// Helper function to get auth headers with session token
const getAuthHeaders = () => {
  const sessionToken = getSessionToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  
  if (sessionToken) {
    headers['Authorization'] = `Bearer ${sessionToken}`;
  }
  
  return headers;
};

// Helper function to handle API errors
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API error: ${response.status}`);
  }
  return response.json();
}

// Get all nodes from the database
export const getNodes = async (): Promise<Node[]> => {
  try {
    const response = await fetch(`${API_URL}/nodes`, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`Error fetching nodes: ${response.status}`);
    }
    
    const data = await response.json();
    return data.nodes || [];
  } catch (error) {
    console.error('Error getting nodes:', error);
    return [];
  }
};

// Get all edges from the database
export const getEdges = async (): Promise<Edge[]> => {
  try {
    const response = await fetch(`${API_URL}/edges`, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`Error fetching edges: ${response.status}`);
    }
    
    const data = await response.json();
    return data.edges || [];
  } catch (error) {
    console.error('Error getting edges:', error);
    return [];
  }
};

// Get both nodes and edges in a single request
export const getGraphData = async (): Promise<{ nodes: Node[], edges: Edge[] }> => {
  try {
    const response = await fetch(`${API_URL}/graph`, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`Error fetching graph data: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      nodes: data.nodes || [],
      edges: data.edges || []
    };
  } catch (error) {
    console.error('Error getting graph data:', error);
    return { nodes: [], edges: [] };
  }
};

// Save a node to the database
export const saveNode = async (node: Node): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/nodes/${node.id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(node)
    });
    
    if (!response.ok) {
      throw new Error(`Error saving node: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error saving node:', error);
    return false;
  }
};

// Delete a node from the database
export const deleteNode = async (nodeId: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/nodes/${nodeId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`Error deleting node: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting node:', error);
    return false;
  }
};

// Save an edge to the database
export const saveEdge = async (edge: Edge): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/edges/${edge.id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(edge)
    });
    
    if (!response.ok) {
      throw new Error(`Error saving edge: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error saving edge:', error);
    return false;
  }
};

// Delete an edge from the database
export const deleteEdge = async (edgeId: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/edges/${edgeId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`Error deleting edge: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting edge:', error);
    return false;
  }
};

// Get changes since a specific timestamp
export const getChangesSince = async (timestamp: number): Promise<{ nodes: Node[], edges: Edge[], deletedNodes: string[], deletedEdges: string[] }> => {
  try {
    const response = await fetch(`${API_URL}/changes?since=${timestamp}`, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`Error fetching changes: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      nodes: data.nodes || [],
      edges: data.edges || [],
      deletedNodes: data.deletedNodes || [],
      deletedEdges: data.deletedEdges || []
    };
  } catch (error) {
    console.error('Error getting changes:', error);
    return { nodes: [], edges: [], deletedNodes: [], deletedEdges: [] };
  }
};

// Get the last sync timestamp
export const getLastSyncTimestamp = async (): Promise<number | null> => {
  try {
    const response = await fetch(`${API_URL}/sync/timestamp`, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`Error fetching timestamp: ${response.status}`);
    }
    
    const data = await response.json();
    return data.timestamp || null;
  } catch (error) {
    console.error('Error getting timestamp:', error);
    return null;
  }
};

// Import data from JSON
export const importData = async (data: { nodes: Node[], edges: Edge[] }): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/import`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`Error importing data: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error importing data:', error);
    return false;
  }
};

// Clear the database
export const clearDatabase = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/clear`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`Error clearing database: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error clearing database:', error);
    return false;
  }
};

// Check server status
export const checkServerStatus = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/status`, {
      headers: getAuthHeaders()
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error checking server status:', error);
    return false;
  }
}; 