import { io, Socket } from 'socket.io-client';
import { Node, Edge, Project } from '../types';

const SOCKET_URL = 'http://localhost:3001';

export let socket: Socket | null = null;
let currentSessionToken: string | null = null;
let currentProject: Project | null = null;

// Socket event handlers
type EventHandler<T = any> = (data: T) => void;
const eventHandlers: Record<string, EventHandler[]> = {
  nodeUpdated: [],
  nodeDeleted: [],
  edgeUpdated: [],
  edgeDeleted: [],
  dataImported: [],
  dataCleared: [],
  initialData: [],
  connect: [],
  disconnect: [],
  error: [],
  clientsUpdated: [],
  projectDeleted: []
};

// Initialize socket connection
export const initSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL);
    
    // Set up event listeners
    socket.on('connect', () => {
      console.log('Socket connected');
      
      // Rejoin project if we have a token
      if (currentSessionToken) {
        joinProject(currentSessionToken);
      }
    });
    
    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });
    
    socket.on('reconnect', () => {
      console.log('Socket reconnected');
      
      // Rejoin project if we have a token
      if (currentSessionToken) {
        joinProject(currentSessionToken);
      }
    });
    
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
    
    socket.on('projectUpdate', (data) => {
      console.log('Project update received:', data);
      // Handle project updates
    });
    
    socket.on('clientsUpdated', (projectId, count) => {
      console.log(`Project ${projectId} now has ${count} connected clients`);
    });
    
    socket.on('projectDeleted', (projectId) => {
      console.log(`Project ${projectId} has been deleted`);
    });
  }
  
  return socket;
};

// Join a project room with session token
export const joinProject = (sessionToken: string): void => {
  if (!socket) {
    // Initialize socket if not already done
    initSocket();
  }
  
  if (socket) {
    currentSessionToken = sessionToken;
    
    socket.emit('joinProject', { token: sessionToken }, (response: { success: boolean; project?: Project }) => {
      if (response.success && response.project) {
        currentProject = response.project;
        console.log(`Joined project: ${response.project.name}`);
      } else {
        console.error('Failed to join project');
        currentProject = null;
      }
    });
  }
};

// Get the current project
export const getCurrentProject = async (): Promise<Project | null> => {
  return new Promise((resolve) => {
    if (!socket || !currentSessionToken) {
      resolve(null);
      return;
    }
    
    socket.emit('getCurrentProject', { token: currentSessionToken }, (response: { success: boolean; project?: Project }) => {
      if (response.success && response.project) {
        currentProject = response.project;
        resolve(response.project);
      } else {
        currentProject = null;
        resolve(null);
      }
    });
  });
};

// Disconnect the socket
export const disconnect = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentSessionToken = null;
    currentProject = null;
  }
};

// Get the current session token
export const getSessionToken = (): string | null => {
  return currentSessionToken;
};

// Add event handlers for socket events
export const onSocketEvent = (event: string, callback: (...args: any[]) => void): void => {
  if (socket) {
    socket.on(event, callback);
  }
};

// Remove event handlers for socket events
export const offSocketEvent = (event: string, callback?: (...args: any[]) => void): void => {
  if (socket) {
    socket.off(event, callback);
  }
};

// Add event handler
export function onEvent<T = any>(event: string, handler: EventHandler<T>) {
  if (!eventHandlers[event]) {
    eventHandlers[event] = [];
  }
  
  eventHandlers[event].push(handler as EventHandler);
  
  // Return a function to remove the handler
  return () => {
    const index = eventHandlers[event].indexOf(handler as EventHandler);
    if (index !== -1) {
      eventHandlers[event].splice(index, 1);
    }
  };
}

// Trigger all handlers for an event
function triggerHandlers(event: string, data: any) {
  if (!eventHandlers[event]) return;
  
  for (const handler of eventHandlers[event]) {
    try {
      handler(data);
    } catch (error) {
      console.error(`Error in ${event} handler:`, error);
    }
  }
}

// Get socket instance
export function getSocket() {
  return socket;
}

// Check if connected
export function isConnected() {
  return socket?.connected || false;
} 