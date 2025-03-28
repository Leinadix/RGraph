import { Project } from '../types';

const API_URL = 'http://localhost:3001/api';

// Generic response type for API calls
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

// Helper function to handle API responses
const handleResponse = async <T>(response: Response): Promise<ApiResponse<T>> => {
  if (!response.ok) {
    // Check if the response is JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const errorData = await response.json();
      return {
        success: false,
        message: errorData.message || `Error: ${response.status} ${response.statusText}`
      };
    } else {
      return {
        success: false,
        message: `Error: ${response.status} ${response.statusText}`
      };
    }
  }

  try {
    const data = await response.json();
    return {
      success: true,
      data
    };
  } catch (err) {
    return {
      success: false,
      message: 'Failed to parse server response'
    };
  }
};

// Get all available projects
export const getProjects = async (): Promise<ApiResponse<Project[]>> => {
  try {
    const response = await fetch(`${API_URL}/projects`);
    return handleResponse<Project[]>(response);
  } catch (err) {
    console.error('Error fetching projects:', err);
    return {
      success: false,
      message: 'Failed to connect to server'
    };
  }
};

// Create a new project
export const createProject = async (
  name: string,
  description?: string | null
): Promise<ApiResponse<{ token: string, project: Project }>> => {
  try {
    const response = await fetch(`${API_URL}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, description })
    });
    
    return handleResponse<{ token: string, project: Project }>(response);
  } catch (err) {
    console.error('Error creating project:', err);
    return {
      success: false,
      message: 'Failed to connect to server'
    };
  }
};

// Join a project (get a session token)
export const joinProject = async (
  projectId: string
): Promise<ApiResponse<{ token: string, project: Project }>> => {
  try {
    const response = await fetch(`${API_URL}/projects/${projectId}/join`, {
      method: 'POST'
    });
    
    return handleResponse<{ token: string, project: Project }>(response);
  } catch (err) {
    console.error('Error joining project:', err);
    return {
      success: false,
      message: 'Failed to connect to server'
    };
  }
};

// Get project info with session token
export const getCurrentProject = async (
  token?: string
): Promise<ApiResponse<Project>> => {
  try {
    const sessionToken = token || getSessionToken();
    if (!sessionToken) {
      return {
        success: false,
        message: 'No session token found'
      };
    }

    const response = await fetch(`${API_URL}/projects/current`, {
      headers: {
        'Authorization': `Bearer ${sessionToken}`
      }
    });
    
    return handleResponse<Project>(response);
  } catch (err) {
    console.error('Error getting current project:', err);
    return {
      success: false,
      message: 'Failed to connect to server'
    };
  }
};

// Delete a project
export const deleteProject = async (
  projectId: string,
  token?: string
): Promise<ApiResponse<void>> => {
  try {
    const sessionToken = token || getSessionToken();
    if (!sessionToken) {
      return {
        success: false,
        message: 'No session token found'
      };
    }

    const response = await fetch(`${API_URL}/projects/${projectId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${sessionToken}`
      }
    });
    
    return handleResponse<void>(response);
  } catch (err) {
    console.error('Error deleting project:', err);
    return {
      success: false,
      message: 'Failed to connect to server'
    };
  }
};

// Local storage functions for session token
const SESSION_TOKEN_KEY = 'graphapp_session_token';

export const saveSessionToken = (token: string): void => {
  localStorage.setItem(SESSION_TOKEN_KEY, token);
};

export const getSessionToken = (): string | null => {
  return localStorage.getItem(SESSION_TOKEN_KEY);
};

export const clearSessionToken = (): void => {
  localStorage.removeItem(SESSION_TOKEN_KEY);
}; 