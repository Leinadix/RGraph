import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import * as db from './database.js';

const app = express();
const PORT = process.env.PORT || 3001;
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Track connected clients
let connectedClients = 0;

// Socket.IO connection handling
io.on('connection', (socket) => {
  connectedClients++;
  console.log(`Client connected. Total clients: ${connectedClients}`);
  
  // Send initial data to newly connected client
  const initialData = {
    nodes: db.getNodes(),
    edges: db.getEdges()
  };
  socket.emit('initialData', initialData);
  
  // Handle client disconnection
  socket.on('disconnect', () => {
    connectedClients--;
    console.log(`Client disconnected. Total clients: ${connectedClients}`);
  });
});

// Helper function to broadcast updates to all clients
function broadcastChanges(type, data) {
  io.emit(type, data);
}

// Enable CORS
app.use(cors());

// Parse JSON bodies
app.use(bodyParser.json());

// API status endpoint
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now(), connectedClients });
});

// Get all nodes
app.get('/api/nodes', (req, res) => {
  const nodes = db.getNodes();
  res.json({ nodes });
});

// Get all edges
app.get('/api/edges', (req, res) => {
  const edges = db.getEdges();
  res.json({ edges });
});

// Get all graph data (nodes and edges)
app.get('/api/graph', (req, res) => {
  const nodes = db.getNodes();
  const edges = db.getEdges();
  res.json({ nodes, edges });
});

// Save a node
app.post('/api/nodes', (req, res) => {
  const node = req.body;
  
  // Validate required fields
  if (!node || !node.id || !node.label || typeof node.x !== 'number' || typeof node.y !== 'number') {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid node data. Required fields: id, label, x, y' 
    });
  }
  
  const result = db.saveNode(node);
  
  // Broadcast the update to all clients if successful
  if (result.success) {
    broadcastChanges('nodeUpdated', node);
  }
  
  res.json(result);
});

// Update a node
app.put('/api/nodes/:id', (req, res) => {
  const nodeId = req.params.id;
  const node = req.body;
  
  // Ensure the ID in the URL matches the body
  if (node.id !== nodeId) {
    return res.status(400).json({ 
      success: false, 
      error: 'Node ID in URL must match the ID in the request body' 
    });
  }
  
  const result = db.saveNode(node);
  
  // Broadcast the update to all clients if successful
  if (result.success) {
    broadcastChanges('nodeUpdated', node);
  }
  
  res.json(result);
});

// Delete a node
app.delete('/api/nodes/:id', (req, res) => {
  const nodeId = req.params.id;
  const result = db.deleteNode(nodeId);
  
  // Broadcast the deletion to all clients if successful
  if (result.success) {
    broadcastChanges('nodeDeleted', { id: nodeId });
  }
  
  res.json(result);
});

// Save an edge
app.post('/api/edges', (req, res) => {
  const edge = req.body;
  
  // Validate required fields
  if (!edge || !edge.id || !edge.source || !edge.target) {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid edge data. Required fields: id, source, target' 
    });
  }
  
  const result = db.saveEdge(edge);
  
  // Broadcast the update to all clients if successful
  if (result.success) {
    broadcastChanges('edgeUpdated', edge);
  }
  
  res.json(result);
});

// Update an edge
app.put('/api/edges/:id', (req, res) => {
  const edgeId = req.params.id;
  const edge = req.body;
  
  // Ensure the ID in the URL matches the body
  if (edge.id !== edgeId) {
    return res.status(400).json({ 
      success: false, 
      error: 'Edge ID in URL must match the ID in the request body' 
    });
  }
  
  const result = db.saveEdge(edge);
  
  // Broadcast the update to all clients if successful
  if (result.success) {
    broadcastChanges('edgeUpdated', edge);
  }
  
  res.json(result);
});

// Delete an edge
app.delete('/api/edges/:id', (req, res) => {
  const edgeId = req.params.id;
  const result = db.deleteEdge(edgeId);
  
  // Broadcast the deletion to all clients if successful
  if (result.success) {
    broadcastChanges('edgeDeleted', { id: edgeId });
  }
  
  res.json(result);
});

// Get changes since timestamp
app.get('/api/changes/:timestamp', (req, res) => {
  const timestamp = parseInt(req.params.timestamp, 10) || 0;
  const changes = db.getChangesSinceLastSync(timestamp);
  res.json({ 
    timestamp: Date.now(),
    ...changes
  });
});

// Get last sync timestamp
app.get('/api/sync/timestamp', (req, res) => {
  const timestamp = db.getLastSyncTimestamp();
  res.json({ timestamp });
});

// Import data
app.post('/api/import', (req, res) => {
  const data = req.body;
  
  // Validate data structure
  if (!data || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid data structure. Expected: { nodes: [], edges: [] }' 
    });
  }
  
  const result = db.importIntoDatabase(data);
  
  // Broadcast the full data import to all clients if successful
  if (result.success) {
    broadcastChanges('dataImported', data);
  }
  
  res.json(result);
});

// Clear all data
app.post('/api/clear', (req, res) => {
  const result = db.clearDatabase();
  
  // Broadcast the clear operation to all clients if successful
  if (result.success) {
    broadcastChanges('dataCleared', {});
  }
  
  res.json(result);
});

// Start the server
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  io.close(() => {
    console.log('Socket.IO server closed');
    db.closeDatabase();
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('Shutting down server...');
  io.close(() => {
    console.log('Socket.IO server closed');
    db.closeDatabase();
    process.exit(0);
  });
}); 