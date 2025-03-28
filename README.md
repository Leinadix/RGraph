# Graph App

An interactive graph/node editor inspired by Obsidian's graph view. This application allows you to create, connect, and manage nodes in a visual graph interface with smooth animations and transitions.

## Features

- Create nodes with unique IDs, labels, descriptions, and icons
- Connect nodes using an intuitive two-step selection process
- Edit node properties with a dedicated editing panel
- Interactive drag-and-drop interface
- Smooth animations and transitions when opening/closing panels
- Visual representation of the graph structure
- Zoom controls for better graph navigation
- Right-click functionality for creating nodes and connections
- Import and export graph data in JSON format
- Elegant user interface with dark and light mode support

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 14 or later)

### Installation

1. Clone the repository
2. Navigate to the project directory
3. Install dependencies:

```bash
npm install
```

### Development

To start the development server:

```bash
npm run dev
```

### Building for Production

To build the application for production:

```bash
npm run build
```

## Usage

- Click the "Add Node" button to create a new node
- Right-click on the background to create a node at that position
- Select a node by clicking on it
- To connect nodes:
  1. Select the source node
  2. Click "Connect Nodes" button (or right-click the node)
  3. In connection mode, potential target nodes are highlighted with a green outline
  4. Click on a target node to create the connection
  5. Or click "Cancel Connection" to abort
- To edit a node:
  1. Select the node
  2. Click "Edit Node" button
  3. Update the node's name, description, and icon
  4. Click "Save" to apply changes or "Cancel" to discard
- Saving and loading your graph:
  - Click "Export JSON" to save your current graph data
  - Click "Import JSON" to load a previously saved graph
- Delete a selected node with the "Delete Node" button
- Drag nodes to rearrange the graph layout
- Use the zoom controls in the top-right corner:
  - "+" to zoom in
  - "-" to zoom out
  - "FIT" to fit all nodes in the view

## Technologies Used

- [React](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [D3.js](https://d3js.org/) for graph visualization
- [Vite](https://vitejs.dev/) for build tooling 