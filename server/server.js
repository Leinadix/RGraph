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

// Track connected clients by project
const connectedClients = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  let currentProjectId = null;
  
  console.log(`Client connected without project.`);
  
  // Handle joining a project room
  socket.on('joinProject', (sessionToken) => {
    if (!sessionToken) {
      socket.emit('error', { message: 'No session token provided' });
      return;
    }
    
    // Get project from token
    const project = db.getProjectByToken(sessionToken);
    if (!project) {
      socket.emit('error', { message: 'Invalid session token' });
      return;
    }
    
    // Leave previous project room if any
    if (currentProjectId) {
      socket.leave(`project:${currentProjectId}`);
      
      // Update connected clients count for previous project
      if (connectedClients.has(currentProjectId)) {
        const count = connectedClients.get(currentProjectId) - 1;
        connectedClients.set(currentProjectId, count <= 0 ? 0 : count);
        
        // Notify other clients in the room
        socket.to(`project:${currentProjectId}`).emit('clientsUpdated', { count });
      }
    }
    
    // Join new project room
    currentProjectId = project.id;
    socket.join(`project:${currentProjectId}`);
    
    // Update connected clients count
    const currentCount = connectedClients.get(currentProjectId) || 0;
    connectedClients.set(currentProjectId, currentCount + 1);
    const newCount = connectedClients.get(currentProjectId);
    
    // Notify all clients in the room (including this one)
    io.to(`project:${currentProjectId}`).emit('clientsUpdated', { count: newCount });
    
    console.log(`Client joined project: ${currentProjectId} (${project.name}). Total clients in project: ${newCount}`);
    
    // Send initial project data
    const initialData = {
      project,
      nodes: db.getNodes(currentProjectId),
      edges: db.getEdges(currentProjectId)
    };
    socket.emit('initialData', initialData);
  });
  
  // Handle client disconnection
  socket.on('disconnect', () => {
    if (currentProjectId) {
      // Update connected clients count
      if (connectedClients.has(currentProjectId)) {
        const count = connectedClients.get(currentProjectId) - 1;
        connectedClients.set(currentProjectId, count <= 0 ? 0 : count);
        
        // Notify other clients in the room
        io.to(`project:${currentProjectId}`).emit('clientsUpdated', { count });
        
        console.log(`Client disconnected from project: ${currentProjectId}. Remaining clients in project: ${connectedClients.get(currentProjectId)}`);
      }
    } else {
      console.log(`Client disconnected without project.`);
    }
  });
});

// Helper function to broadcast updates to project clients
function broadcastToProject(projectId, type, data) {
  io.to(`project:${projectId}`).emit(type, data);
}

// Get connected client count for a project
function getConnectedClientsCount(projectId) {
  return connectedClients.get(projectId) || 0;
}

// Enable CORS
app.use(cors());

// Parse JSON bodies
app.use(bodyParser.json());

// Middleware to verify session token and get project ID
function verifyToken(req, res, next) {
  const sessionToken = req.headers['x-session-token'];
  
  if (!sessionToken) {
    if (req.path === '/api/projects/create' || 
        req.path === '/api/projects' || 
        req.path === '/api/status' ||
        req.path.startsWith('/api/projects/join/')) {
      return next();
    }
    return res.status(401).json({ error: 'No session token provided' });
  }
  
  const project = db.getProjectByToken(sessionToken);
  if (!project) {
    return res.status(403).json({ error: 'Invalid session token' });
  }
  
  req.projectId = project.id;
  req.project = project;
  next();
}

app.use('/api', verifyToken);

// API status endpoint
app.get('/api/status', (req, res) => {
  const projectCount = db.getProjects().length;
  res.json({ 
    status: 'ok', 
    timestamp: Date.now(), 
    projectCount,
    connectedProjects: connectedClients.size
  });
});

// Project endpoints
app.get('/api/projects', (req, res) => {
  const projects = db.getProjects();
  
  // Add connected clients count to each project
  const projectsWithCounts = projects.map(project => ({
    ...project,
    connectedClients: connectedClients.get(project.id) || 0
  }));
  
  res.json({ projects: projectsWithCounts });
});

// Create a new project
app.post('/api/projects/create', (req, res) => {
  const { name, description } = req.body;
  
  if (!name) {
    return res.status(400).json({ success: false, error: 'Project name is required' });
  }
  
  const result = db.createProject(name, description || '');
  
  if (result.success) {
    res.json({ 
      success: true, 
      project: result.project,
      token: result.token 
    });
  } else {
    res.status(500).json({ success: false, error: result.error });
  }
});

// Get a session token for an existing project
app.get('/api/projects/join/:projectId', (req, res) => {
  const projectId = req.params.projectId;
  
  const result = db.createSessionToken(projectId);
  
  if (result.success) {
    res.json({ 
      success: true, 
      token: result.token,
      projectId: result.projectId
    });
  } else {
    res.status(404).json({ success: false, error: result.error });
  }
});

// Get project info by token
app.get('/api/projects/current', (req, res) => {
  if (!req.project) {
    return res.status(403).json({ success: false, error: 'Invalid session token' });
  }
  
  res.json({ 
    success: true, 
    project: req.project,
    connectedClients: connectedClients.get(req.projectId) || 0
  });
});

// Delete a project
app.delete('/api/projects/:projectId', (req, res) => {
  const { projectId } = req.params;
  
  if (projectId !== req.projectId) {
    return res.status(403).json({ success: false, error: 'You can only delete your current project' });
  }
  
  const result = db.deleteProject(projectId);
  
  if (result.success) {
    // Notify all clients in the room
    broadcastToProject(projectId, 'projectDeleted', { projectId });
    
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, error: result.error });
  }
});

// Get all nodes
app.get('/api/nodes', (req, res) => {
  const nodes = db.getNodes(req.projectId);
  res.json({ nodes });
});

// Get all edges
app.get('/api/edges', (req, res) => {
  const edges = db.getEdges(req.projectId);
  res.json({ edges });
});

// Get all graph data (nodes and edges)
app.get('/api/graph', (req, res) => {
  const nodes = db.getNodes(req.projectId);
  const edges = db.getEdges(req.projectId);
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
  
  const result = db.saveNode(node, req.projectId);
  
  // Broadcast the update to project clients if successful
  if (result.success) {
    broadcastToProject(req.projectId, 'nodeUpdated', node);
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
  
  const result = db.saveNode(node, req.projectId);
  
  // Broadcast the update to project clients if successful
  if (result.success) {
    broadcastToProject(req.projectId, 'nodeUpdated', node);
  }
  
  res.json(result);
});

// Delete a node
app.delete('/api/nodes/:id', (req, res) => {
  const nodeId = req.params.id;
  const result = db.deleteNode(nodeId, req.projectId);
  
  // Broadcast the deletion to project clients if successful
  if (result.success) {
    broadcastToProject(req.projectId, 'nodeDeleted', { id: nodeId });
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
  
  const result = db.saveEdge(edge, req.projectId);
  
  // Broadcast the update to project clients if successful
  if (result.success) {
    broadcastToProject(req.projectId, 'edgeUpdated', edge);
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
  
  const result = db.saveEdge(edge, req.projectId);
  
  // Broadcast the update to project clients if successful
  if (result.success) {
    broadcastToProject(req.projectId, 'edgeUpdated', edge);
  }
  
  res.json(result);
});

// Delete an edge
app.delete('/api/edges/:id', (req, res) => {
  const edgeId = req.params.id;
  const result = db.deleteEdge(edgeId, req.projectId);
  
  // Broadcast the deletion to project clients if successful
  if (result.success) {
    broadcastToProject(req.projectId, 'edgeDeleted', { id: edgeId });
  }
  
  res.json(result);
});

// Get changes since timestamp
app.get('/api/changes/:timestamp', (req, res) => {
  const timestamp = parseInt(req.params.timestamp, 10) || 0;
  const changes = db.getChangesSinceLastSync(timestamp, req.projectId);
  res.json({ 
    timestamp: Date.now(),
    ...changes
  });
});

// Get last sync timestamp
app.get('/api/sync/timestamp', (req, res) => {
  const timestamp = db.getLastSyncTimestamp(req.projectId);
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
  
  const result = db.importIntoDatabase(data, req.projectId);
  
  // Broadcast the full data import to project clients if successful
  if (result.success) {
    broadcastToProject(req.projectId, 'dataImported', data);
  }
  
  res.json(result);
});

// Clear all data
app.post('/api/clear', (req, res) => {
  const result = db.clearDatabase(req.projectId);
  
  // Broadcast the clear operation to project clients if successful
  if (result.success) {
    broadcastToProject(req.projectId, 'dataCleared', {});
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