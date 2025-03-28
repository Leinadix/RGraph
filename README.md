# Graph App

An interactive graph/node editor inspired by Obsidian's graph view. This application allows you to create, connect, and manage nodes in a visual graph interface.

## Features

- Create nodes with unique IDs and labels
- Connect nodes using an intuitive two-step selection process
- Select and delete nodes
- Interactive drag-and-drop interface
- Visual representation of the graph structure

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
- Select a node by clicking on it
- To connect nodes:
  1. Select the source node
  2. Click "Connect Nodes" button
  3. In connection mode, potential target nodes are highlighted with a green outline
  4. Click on a target node to create the connection
  5. Or click "Cancel Connection" to abort
- Delete a selected node with the "Delete Selected Node" button
- Drag nodes to rearrange the graph layout

## Technologies Used

- [React](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [D3.js](https://d3js.org/) for graph visualization
- [Vite](https://vitejs.dev/) for build tooling 