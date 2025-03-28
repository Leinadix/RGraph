# Graph App

A React application for creating and managing nodes and edges in a graph view, with server-side database persistence.

## Features

- Create, edit, and delete nodes
- Connect nodes with edges
- Export and import graph data as JSON
- Server-side database persistence with SQLite
- Real-time synchronization with the server

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Start the API server (in a separate terminal):
```bash
npm run server
```

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