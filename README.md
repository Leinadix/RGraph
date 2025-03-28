# GraphApp

A collaborative graph visualization and editing application that allows users to create, edit, and share graph structures with nodes and edges.

## Features

- Create and manage multiple projects
- Real-time collaboration with other users
- Create, edit, and delete nodes and edges
- Import and export graph data as JSON
- Project sharing via session tokens
- Responsive and modern UI

## Technology Stack

- **Frontend**: React, TypeScript, React Flow, React Toastify
- **Backend**: Node.js, Express, Socket.IO
- **Database**: SQLite

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)

### Installation

1. Clone the repository:
```
git clone <repository-url>
cd GraphApp
```

2. Install dependencies:
```
npm install
```

### Running the Application

You can start both the server and client with a single command:

```
npm start
```

Or run them separately:

- Start the server:
```
npm run server
```

- Start the client:
```
npm run dev
```

The application will be available at http://localhost:5173, and the server will run on http://localhost:3001.

## Usage

### Creating a New Project

1. When you first open the application, you'll be presented with a project selection screen.
2. Click "Create New Project" to create a new graph project.
3. Enter a name and optional description for your project.

### Sharing a Project

1. In the project selection screen, click the "Share" button next to a project.
2. Copy the generated session token.
3. Share this token with others who want to collaborate on the same project.
4. They can join by pasting the token in the "Join with Token" field.

### Working with Nodes and Edges

- **Adding a Node**: Click the "Add Node" button in the sidebar or press the "+" icon in the graph view.
- **Editing a Node**: Click on a node to select it, then modify its properties in the sidebar.
- **Connecting Nodes**: Drag from the handle of one node to another to create an edge.
- **Deleting**: Select a node or edge and press the "Delete" button in the sidebar.

### Importing and Exporting

- **Export**: Click the "Export" button in the header to download the current graph as JSON.
- **Import**: Click the "Import" button and paste a URL or JSON data.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Architecture

The application is split into client and server components:

### Client
- React application with TypeScript
- Uses the Fetch API to communicate with the server
- Maintains a local state for immediate UI updates

### Server
- Express.js API server
- SQLite database for persistence
- RESTful API endpoints for CRUD operations

## Database Schema

The SQLite database includes three tables:
- `nodes`: Stores node data (id, label, description, icon, x, y)
- `edges`: Stores edge connections (id, source, target)
- `sync_status`: Tracks the last synchronization timestamp

## API Endpoints

- `GET /api/status`: Check server status
- `GET /api/nodes`: Get all nodes
- `GET /api/edges`: Get all edges
- `GET /api/graph`: Get all graph data (nodes and edges)
- `POST /api/nodes`: Create a new node
- `PUT /api/nodes/:id`: Update a node
- `DELETE /api/nodes/:id`: Delete a node
- `POST /api/edges`: Create a new edge
- `PUT /api/edges/:id`: Update an edge
- `DELETE /api/edges/:id`: Delete an edge
- `GET /api/changes/:timestamp`: Get changes since timestamp
- `GET /api/sync/timestamp`: Get last sync timestamp
- `POST /api/import`: Import data
- `POST /api/clear`: Clear all data 