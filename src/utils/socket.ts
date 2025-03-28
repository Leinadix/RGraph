import { io, Socket } from 'socket.io-client';
import { Node, Edge } from '../types';

// Socket connection
let socket: Socket | null = null;

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
  error: []
};

// Initialize socket connection
export function initSocket() {
  if (socket) return socket;
  
  // Create new socket connection
  socket = io('http://localhost:3001');
  
  // Set up core event listeners
  socket.on('connect', () => {
    console.log('Connected to server');
    triggerHandlers('connect', null);
  });
  
  socket.on('disconnect', () => {
    console.log('Disconnected from server');
    triggerHandlers('disconnect', null);
  });
  
  socket.on('error', (error) => {
    console.error('Socket error:', error);
    triggerHandlers('error', error);
  });
  
  // Set up data event listeners
  socket.on('initialData', (data: { nodes: Node[], edges: Edge[] }) => {
    console.log('Received initial data');
    triggerHandlers('initialData', data);
  });
  
  socket.on('nodeUpdated', (node: Node) => {
    triggerHandlers('nodeUpdated', node);
  });
  
  socket.on('nodeDeleted', (data: { id: string }) => {
    triggerHandlers('nodeDeleted', data);
  });
  
  socket.on('edgeUpdated', (edge: Edge) => {
    triggerHandlers('edgeUpdated', edge);
  });
  
  socket.on('edgeDeleted', (data: { id: string }) => {
    triggerHandlers('edgeDeleted', data);
  });
  
  socket.on('dataImported', (data: { nodes: Node[], edges: Edge[] }) => {
    triggerHandlers('dataImported', data);
  });
  
  socket.on('dataCleared', () => {
    triggerHandlers('dataCleared', null);
  });
  
  return socket;
}

// Disconnect socket
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

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