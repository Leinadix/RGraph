import sqlite3 from 'better-sqlite3';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'crypto';

// Get current directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database path
const DB_PATH = resolve(__dirname, 'graph-app.db');

// Create a database connection
let db = null;

// Generate a unique session token
function generateSessionToken() {
  return randomBytes(16).toString('hex');
}

try {
  db = new sqlite3(DB_PATH);
  
  // Create tables if they don't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS project_sessions (
      token TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS nodes (
      id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      label TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      x REAL NOT NULL,
      y REAL NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (id, project_id),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS edges (
      id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      source TEXT NOT NULL,
      target TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (id, project_id),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (source, project_id) REFERENCES nodes(id, project_id) ON DELETE CASCADE,
      FOREIGN KEY (target, project_id) REFERENCES nodes(id, project_id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS sync_status (
      project_id TEXT PRIMARY KEY,
      last_sync INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  `);
  
  // Create a default project if none exists
  const defaultProject = db.prepare('SELECT COUNT(*) as count FROM projects').get();
  if (defaultProject.count === 0) {
    const timestamp = Date.now();
    const defaultProjectId = 'default';
    
    // Insert default project
    db.prepare(`
      INSERT INTO projects (id, name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(defaultProjectId, 'Default Project', 'Default project for graph application', timestamp, timestamp);
    
    // Create a session token for the default project
    const defaultToken = generateSessionToken();
    db.prepare(`
      INSERT INTO project_sessions (token, project_id, created_at)
      VALUES (?, ?, ?)
    `).run(defaultToken, defaultProjectId, timestamp);
    
    // Initialize sync status for default project
    db.prepare(`
      INSERT INTO sync_status (project_id, last_sync)
      VALUES (?, ?)
    `).run(defaultProjectId, 0);
    
    console.log(`Created default project with token: ${defaultToken}`);
  }
  
  console.log('Database initialized successfully');
} catch (error) {
  console.error('Failed to initialize database:', error);
}

// Get all projects
export function getProjects() {
  if (!db) return [];
  
  try {
    const stmt = db.prepare('SELECT id, name, description, created_at, updated_at FROM projects');
    return stmt.all();
  } catch (error) {
    console.error('Error fetching projects:', error);
    return [];
  }
}

// Get project by session token
export function getProjectByToken(token) {
  if (!db) return null;
  
  try {
    const stmt = db.prepare(`
      SELECT p.id, p.name, p.description, p.created_at, p.updated_at 
      FROM projects p
      JOIN project_sessions ps ON p.id = ps.project_id
      WHERE ps.token = ?
    `);
    return stmt.get(token);
  } catch (error) {
    console.error('Error fetching project by token:', error);
    return null;
  }
}

// Create a new project
export function createProject(name, description = '') {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    const timestamp = Date.now();
    const projectId = `project-${timestamp}`;
    
    // Insert project
    const projectStmt = db.prepare(`
      INSERT INTO projects (id, name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    projectStmt.run(projectId, name, description, timestamp, timestamp);
    
    // Create a session token
    const token = generateSessionToken();
    const sessionStmt = db.prepare(`
      INSERT INTO project_sessions (token, project_id, created_at)
      VALUES (?, ?, ?)
    `);
    
    sessionStmt.run(token, projectId, timestamp);
    
    // Initialize sync status
    const syncStmt = db.prepare(`
      INSERT INTO sync_status (project_id, last_sync)
      VALUES (?, ?)
    `);
    
    syncStmt.run(projectId, 0);
    
    return { 
      success: true, 
      project: { 
        id: projectId, 
        name, 
        description, 
        created_at: timestamp, 
        updated_at: timestamp 
      },
      token
    };
  } catch (error) {
    console.error('Error creating project:', error);
    return { success: false, error: error.message };
  }
}

// Create a new session token for an existing project
export function createSessionToken(projectId) {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    // Check if project exists
    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
    if (!project) {
      return { success: false, error: 'Project not found' };
    }
    
    const timestamp = Date.now();
    const token = generateSessionToken();
    
    const stmt = db.prepare(`
      INSERT INTO project_sessions (token, project_id, created_at)
      VALUES (?, ?, ?)
    `);
    
    stmt.run(token, projectId, timestamp);
    
    return { success: true, token, projectId };
  } catch (error) {
    console.error('Error creating session token:', error);
    return { success: false, error: error.message };
  }
}

// Get all nodes for a project
export function getNodes(projectId) {
  if (!db) return [];
  
  try {
    const stmt = db.prepare('SELECT id, label, description, icon, x, y FROM nodes WHERE project_id = ?');
    return stmt.all(projectId);
  } catch (error) {
    console.error('Error fetching nodes:', error);
    return [];
  }
}

// Get all edges for a project
export function getEdges(projectId) {
  if (!db) return [];
  
  try {
    const stmt = db.prepare('SELECT id, source, target FROM edges WHERE project_id = ?');
    return stmt.all(projectId);
  } catch (error) {
    console.error('Error fetching edges:', error);
    return [];
  }
}

// Save a node to the database
export function saveNode(node, projectId) {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    const timestamp = Date.now();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO nodes (id, project_id, label, description, icon, x, y, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const info = stmt.run(
      node.id,
      projectId,
      node.label,
      node.description || '',
      node.icon || 'circle',
      node.x,
      node.y,
      timestamp
    );
    
    // Update the last sync timestamp
    updateSyncTimestamp(projectId, timestamp);
    
    return { success: true, id: node.id };
  } catch (error) {
    console.error('Error saving node:', error);
    return { success: false, error: error.message };
  }
}

// Delete a node from the database
export function deleteNode(nodeId, projectId) {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    const timestamp = Date.now();
    
    // Delete the node
    const deleteNodeStmt = db.prepare('DELETE FROM nodes WHERE id = ? AND project_id = ?');
    const nodeInfo = deleteNodeStmt.run(nodeId, projectId);
    
    // Delete any associated edges (this should happen automatically with foreign key constraints)
    const deleteEdgesStmt = db.prepare('DELETE FROM edges WHERE (source = ? OR target = ?) AND project_id = ?');
    const edgeInfo = deleteEdgesStmt.run(nodeId, nodeId, projectId);
    
    // Update the last sync timestamp
    updateSyncTimestamp(projectId, timestamp);
    
    return { 
      success: true, 
      nodesDeleted: nodeInfo.changes,
      edgesDeleted: edgeInfo.changes 
    };
  } catch (error) {
    console.error('Error deleting node:', error);
    return { success: false, error: error.message };
  }
}

// Save an edge to the database
export function saveEdge(edge, projectId) {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    const timestamp = Date.now();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO edges (id, project_id, source, target, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const info = stmt.run(
      edge.id,
      projectId,
      edge.source,
      edge.target,
      timestamp
    );
    
    // Update the last sync timestamp
    updateSyncTimestamp(projectId, timestamp);
    
    return { success: true, id: edge.id };
  } catch (error) {
    console.error('Error saving edge:', error);
    return { success: false, error: error.message };
  }
}

// Delete an edge from the database
export function deleteEdge(edgeId, projectId) {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    const timestamp = Date.now();
    const stmt = db.prepare('DELETE FROM edges WHERE id = ? AND project_id = ?');
    const info = stmt.run(edgeId, projectId);
    
    // Update the last sync timestamp
    updateSyncTimestamp(projectId, timestamp);
    
    return { success: true, deleted: info.changes };
  } catch (error) {
    console.error('Error deleting edge:', error);
    return { success: false, error: error.message };
  }
}

// Save multiple nodes to the database
export function saveNodes(nodes, projectId) {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    const timestamp = Date.now();
    
    // Begin a transaction
    const transaction = db.transaction((nodesToSave, project) => {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO nodes (id, project_id, label, description, icon, x, y, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      let count = 0;
      for (const node of nodesToSave) {
        stmt.run(
          node.id,
          project,
          node.label,
          node.description || '',
          node.icon || 'circle',
          node.x,
          node.y,
          timestamp
        );
        count++;
      }
      
      // Update the last sync timestamp
      const syncStmt = db.prepare('UPDATE sync_status SET last_sync = ? WHERE project_id = ?');
      syncStmt.run(timestamp, project);
      
      return count;
    });
    
    const count = transaction(nodes, projectId);
    
    return { success: true, count };
  } catch (error) {
    console.error('Error saving nodes:', error);
    return { success: false, error: error.message };
  }
}

// Save multiple edges to the database
export function saveEdges(edges, projectId) {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    const timestamp = Date.now();
    
    // Begin a transaction
    const transaction = db.transaction((edgesToSave, project) => {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO edges (id, project_id, source, target, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      let count = 0;
      for (const edge of edgesToSave) {
        stmt.run(
          edge.id,
          project,
          edge.source,
          edge.target,
          timestamp
        );
        count++;
      }
      
      // Update the last sync timestamp
      const syncStmt = db.prepare('UPDATE sync_status SET last_sync = ? WHERE project_id = ?');
      syncStmt.run(timestamp, project);
      
      return count;
    });
    
    const count = transaction(edges, projectId);
    
    return { success: true, count };
  } catch (error) {
    console.error('Error saving edges:', error);
    return { success: false, error: error.message };
  }
}

// Update the sync timestamp in the database
function updateSyncTimestamp(projectId, timestamp) {
  if (!db) return false;
  
  try {
    const stmt = db.prepare('UPDATE sync_status SET last_sync = ? WHERE project_id = ?');
    stmt.run(timestamp, projectId);
    return true;
  } catch (error) {
    console.error('Error updating sync timestamp:', error);
    return false;
  }
}

// Get the last sync timestamp from the database
export function getLastSyncTimestamp(projectId) {
  if (!db) return 0;
  
  try {
    const stmt = db.prepare('SELECT last_sync FROM sync_status WHERE project_id = ?');
    const result = stmt.get(projectId);
    return result?.last_sync || 0;
  } catch (error) {
    console.error('Error getting last sync timestamp:', error);
    return 0;
  }
}

// Get all changes since the last sync
export function getChangesSinceLastSync(timestamp, projectId) {
  if (!db) return { nodes: [], edges: [] };
  
  try {
    const nodesStmt = db.prepare('SELECT id, label, description, icon, x, y FROM nodes WHERE updated_at > ? AND project_id = ?');
    const edgesStmt = db.prepare('SELECT id, source, target FROM edges WHERE updated_at > ? AND project_id = ?');
    
    const nodes = nodesStmt.all(timestamp, projectId);
    const edges = edgesStmt.all(timestamp, projectId);
    
    return { nodes, edges };
  } catch (error) {
    console.error('Error getting changes since last sync:', error);
    return { nodes: [], edges: [] };
  }
}

// Clear all data for a project from the database
export function clearDatabase(projectId) {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    db.exec(`
      DELETE FROM edges WHERE project_id = '${projectId}';
      DELETE FROM nodes WHERE project_id = '${projectId}';
      UPDATE sync_status SET last_sync = ${Date.now()} WHERE project_id = '${projectId}';
    `);
    
    return { success: true };
  } catch (error) {
    console.error('Error clearing database:', error);
    return { success: false, error: error.message };
  }
}

// Import data into the database for a specific project
export function importIntoDatabase(data, projectId) {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    // Clear existing data for this project
    db.exec(`
      DELETE FROM edges WHERE project_id = '${projectId}'; 
      DELETE FROM nodes WHERE project_id = '${projectId}';
    `);
    
    // Import new data
    const nodeCount = saveNodes(data.nodes, projectId).count || 0;
    const edgeCount = saveEdges(data.edges, projectId).count || 0;
    
    return { 
      success: true, 
      nodeCount,
      edgeCount
    };
  } catch (error) {
    console.error('Error importing data into database:', error);
    return { success: false, error: error.message };
  }
}

// Delete a project and all associated data
export function deleteProject(projectId) {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    const stmt = db.prepare('DELETE FROM projects WHERE id = ?');
    const result = stmt.run(projectId);
    
    if (result.changes === 0) {
      return { success: false, error: 'Project not found' };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting project:', error);
    return { success: false, error: error.message };
  }
}

// Close the database connection
export function closeDatabase() {
  if (db) {
    db.close();
    console.log('Database connection closed');
  }
} 