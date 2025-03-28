import sqlite3 from 'better-sqlite3';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get current directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database path
const DB_PATH = resolve(__dirname, 'graph-app.db');

// Create a database connection
let db = null;

try {
  db = new sqlite3(DB_PATH);
  
  // Create tables if they don't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS nodes (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      x REAL NOT NULL,
      y REAL NOT NULL,
      updated_at INTEGER NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS edges (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      target TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (source) REFERENCES nodes(id) ON DELETE CASCADE,
      FOREIGN KEY (target) REFERENCES nodes(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS sync_status (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      last_sync INTEGER NOT NULL
    );
    
    INSERT OR IGNORE INTO sync_status (id, last_sync) VALUES (1, 0);
  `);
  
  console.log('Database initialized successfully');
} catch (error) {
  console.error('Failed to initialize database:', error);
}

// Get all nodes from the database
export function getNodes() {
  if (!db) return [];
  
  try {
    const stmt = db.prepare('SELECT * FROM nodes');
    return stmt.all();
  } catch (error) {
    console.error('Error fetching nodes:', error);
    return [];
  }
}

// Get all edges from the database
export function getEdges() {
  if (!db) return [];
  
  try {
    const stmt = db.prepare('SELECT id, source, target FROM edges');
    return stmt.all();
  } catch (error) {
    console.error('Error fetching edges:', error);
    return [];
  }
}

// Save a node to the database
export function saveNode(node) {
  if (!db) return null;
  
  try {
    const timestamp = Date.now();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO nodes (id, label, description, icon, x, y, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const info = stmt.run(
      node.id,
      node.label,
      node.description || '',
      node.icon || 'circle',
      node.x,
      node.y,
      timestamp
    );
    
    // Update the last sync timestamp
    updateSyncTimestamp(timestamp);
    
    return { success: true, id: node.id };
  } catch (error) {
    console.error('Error saving node:', error);
    return { success: false, error: error.message };
  }
}

// Delete a node from the database
export function deleteNode(nodeId) {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    const timestamp = Date.now();
    
    // Delete the node
    const deleteNodeStmt = db.prepare('DELETE FROM nodes WHERE id = ?');
    const nodeInfo = deleteNodeStmt.run(nodeId);
    
    // Delete any associated edges
    const deleteEdgesStmt = db.prepare('DELETE FROM edges WHERE source = ? OR target = ?');
    const edgeInfo = deleteEdgesStmt.run(nodeId, nodeId);
    
    // Update the last sync timestamp
    updateSyncTimestamp(timestamp);
    
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
export function saveEdge(edge) {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    const timestamp = Date.now();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO edges (id, source, target, updated_at)
      VALUES (?, ?, ?, ?)
    `);
    
    const info = stmt.run(
      edge.id,
      edge.source,
      edge.target,
      timestamp
    );
    
    // Update the last sync timestamp
    updateSyncTimestamp(timestamp);
    
    return { success: true, id: edge.id };
  } catch (error) {
    console.error('Error saving edge:', error);
    return { success: false, error: error.message };
  }
}

// Delete an edge from the database
export function deleteEdge(edgeId) {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    const timestamp = Date.now();
    const stmt = db.prepare('DELETE FROM edges WHERE id = ?');
    const info = stmt.run(edgeId);
    
    // Update the last sync timestamp
    updateSyncTimestamp(timestamp);
    
    return { success: true, deleted: info.changes };
  } catch (error) {
    console.error('Error deleting edge:', error);
    return { success: false, error: error.message };
  }
}

// Save multiple nodes to the database
export function saveNodes(nodes) {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    const timestamp = Date.now();
    
    // Begin a transaction
    const transaction = db.transaction((nodesToSave) => {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO nodes (id, label, description, icon, x, y, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      let count = 0;
      for (const node of nodesToSave) {
        stmt.run(
          node.id,
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
      const syncStmt = db.prepare('UPDATE sync_status SET last_sync = ? WHERE id = 1');
      syncStmt.run(timestamp);
      
      return count;
    });
    
    const count = transaction(nodes);
    
    return { success: true, count };
  } catch (error) {
    console.error('Error saving nodes:', error);
    return { success: false, error: error.message };
  }
}

// Save multiple edges to the database
export function saveEdges(edges) {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    const timestamp = Date.now();
    
    // Begin a transaction
    const transaction = db.transaction((edgesToSave) => {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO edges (id, source, target, updated_at)
        VALUES (?, ?, ?, ?)
      `);
      
      let count = 0;
      for (const edge of edgesToSave) {
        stmt.run(
          edge.id,
          edge.source,
          edge.target,
          timestamp
        );
        count++;
      }
      
      // Update the last sync timestamp
      const syncStmt = db.prepare('UPDATE sync_status SET last_sync = ? WHERE id = 1');
      syncStmt.run(timestamp);
      
      return count;
    });
    
    const count = transaction(edges);
    
    return { success: true, count };
  } catch (error) {
    console.error('Error saving edges:', error);
    return { success: false, error: error.message };
  }
}

// Update the sync timestamp in the database
function updateSyncTimestamp(timestamp) {
  if (!db) return false;
  
  try {
    const stmt = db.prepare('UPDATE sync_status SET last_sync = ? WHERE id = 1');
    stmt.run(timestamp);
    return true;
  } catch (error) {
    console.error('Error updating sync timestamp:', error);
    return false;
  }
}

// Get the last sync timestamp from the database
export function getLastSyncTimestamp() {
  if (!db) return 0;
  
  try {
    const stmt = db.prepare('SELECT last_sync FROM sync_status WHERE id = 1');
    const result = stmt.get();
    return result?.last_sync || 0;
  } catch (error) {
    console.error('Error getting last sync timestamp:', error);
    return 0;
  }
}

// Get all changes since the last sync
export function getChangesSinceLastSync(timestamp) {
  if (!db) return { nodes: [], edges: [] };
  
  try {
    const nodesStmt = db.prepare('SELECT * FROM nodes WHERE updated_at > ?');
    const edgesStmt = db.prepare('SELECT id, source, target FROM edges WHERE updated_at > ?');
    
    const nodes = nodesStmt.all(timestamp);
    const edges = edgesStmt.all(timestamp);
    
    return { nodes, edges };
  } catch (error) {
    console.error('Error getting changes since last sync:', error);
    return { nodes: [], edges: [] };
  }
}

// Clear all data from the database
export function clearDatabase() {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    db.exec(`
      DELETE FROM edges;
      DELETE FROM nodes;
      UPDATE sync_status SET last_sync = ${Date.now()} WHERE id = 1;
    `);
    
    return { success: true };
  } catch (error) {
    console.error('Error clearing database:', error);
    return { success: false, error: error.message };
  }
}

// Import data into the database
export function importIntoDatabase(data) {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    // Clear existing data
    db.exec('DELETE FROM edges; DELETE FROM nodes;');
    
    // Import new data
    const nodeCount = saveNodes(data.nodes).count || 0;
    const edgeCount = saveEdges(data.edges).count || 0;
    
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

// Close the database connection
export function closeDatabase() {
  if (db) {
    db.close();
    console.log('Database connection closed');
  }
} 