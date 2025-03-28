import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Node, Edge } from '../types';

interface GraphViewProps {
  nodes: Node[];
  edges: Edge[];
  selectedNode: string | null;
  sourceNode: string | null;
  connectMode: boolean;
  onSelectNode: (nodeId: string | null) => void;
  onAddNode?: (x: number, y: number) => void;
  onStartConnectMode?: (nodeId: string) => void;
  isEditing?: boolean;
}

const GraphView = ({ 
  nodes, 
  edges, 
  selectedNode, 
  sourceNode,
  connectMode,
  onSelectNode,
  onAddNode,
  onStartConnectMode,
  isEditing = false
}: GraphViewProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<any, undefined> | null>(null);
  const graphRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const previousTransform = useRef<d3.ZoomTransform | null>(null);

  // Helper function to get icon symbol
  const getIconSymbol = (iconName: string): string => {
    switch(iconName) {
      case 'diamond': return '◆';
      case 'square': return '■';
      case 'triangle': return '▲'; 
      case 'star': return '★';
      case 'document': return '📄';
      case 'image': return '🖼️';
      case 'code': return '📊';
      case 'person': return '👤';
      case 'calendar': return '📅';
      case 'task': return '✓';
      case 'note': return '📝';
      case 'idea': return '💡';
      case 'question': return '❓';
      case 'info': return 'ℹ️';
      default: return '●'; // circle is default
    }
  };

  // Helper function to fit the graph in the viewport with smoother transition
  const fitGraphToViewport = (
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    graph: d3.Selection<SVGGElement, unknown, null, undefined>,
    nodeElements: d3.Selection<SVGGElement, Node, SVGGElement, unknown>,
    width: number,
    height: number,
    padding: number = 50,
    transitionDuration: number = 750,
    forceUpdate: boolean = false
  ) => {
    if (!zoomRef.current) return;
    
    // Skip fitting if we're in edit mode - we'll do it when editing completes
    if (isEditing) return;
    
    // Skip auto-fitting on layout changes from node selection unless forced
    if (!forceUpdate && nodes.length > 1) return;

    // If there are no nodes, don't try to fit
    if (nodes.length === 0) return;

    // Get the bounding box of all nodes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    nodeElements.each((d: any) => {
      if (d.x < minX) minX = d.x;
      if (d.y < minY) minY = d.y;
      if (d.x > maxX) maxX = d.x;
      if (d.y > maxY) maxY = d.y;
    });

    // Add padding
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    // Calculate the scale and translate to fit all nodes
    const graphWidth = maxX - minX;
    const graphHeight = maxY - minY;
    
    if (graphWidth === 0 || graphHeight === 0) return;
    
    const scaleX = width / graphWidth;
    const scaleY = height / graphHeight;
    const scale = Math.min(scaleX, scaleY, 2); // Cap the max zoom level
    
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    const translate = [
      width / 2 - scale * centerX,
      height / 2 - scale * centerY
    ];

    // Save the current transform so we can animate from it
    if (!previousTransform.current) {
      previousTransform.current = d3.zoomIdentity;
    }

    // Apply the zoom transformation with a smooth transition
    svg.transition()
      .duration(transitionDuration)
      .ease(d3.easeCubicInOut)
      .call(zoomRef.current.transform, 
        d3.zoomIdentity
          .translate(translate[0], translate[1])
          .scale(scale)
      );
      
    // Update previous transform reference
    previousTransform.current = d3.zoomIdentity
      .translate(translate[0], translate[1])
      .scale(scale);
  };

  useEffect(() => {
    if (!svgRef.current) return;

    // Get dimensions
    const svgElement = svgRef.current;
    const width = svgElement.clientWidth || 800;
    const height = svgElement.clientHeight || 600;

    // Clear the SVG
    d3.select(svgRef.current).selectAll('*').remove();

    // Setup the SVG container with smooth transitions
    const svg = d3.select(svgRef.current)
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('transition', 'all 2.0s cubic-bezier(0.175, 0.885, 0.32, 1.275)');

    // Create zoom behavior with smoother transitions
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        graph.attr('transform', event.transform);
        // Store the current transform for transitions
        previousTransform.current = event.transform;
      });
    
    zoomRef.current = zoom;

    // Apply zoom to svg
    svg.call(zoom);

    // Create a group for the graph that will be transformed by zoom
    const graph = svg.append('g')
      .attr('class', 'graph')
      .style('transition', 'transform 2.0s cubic-bezier(0.175, 0.885, 0.32, 1.275)');
    
    // Store reference to graph for later use
    graphRef.current = graph;

    // Process nodes and edges to ensure proper references
    const nodeMap = new Map();
    nodes.forEach(node => {
      nodeMap.set(node.id, node);
    });

    // Ensure edges reference actual node objects, not just IDs
    const processedEdges = edges.map(edge => {
      return {
        ...edge,
        source: nodeMap.get(edge.source) || edge.source,
        target: nodeMap.get(edge.target) || edge.target
      };
    });

    // Create a simulation for the graph layout with reduced powers
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(processedEdges).id((d: any) => d.id).distance(70))
      .force('charge', d3.forceManyBody().strength(-10))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(0.005))
      .force('collide', d3.forceCollide().radius(30).strength(0.07))
      .velocityDecay(0.6) // Increased friction to slow down movement
      .alphaDecay(0.005) // Slower simulation cooling
      .on('tick', ticked)
      .on('end', () => {
        // When simulation ends, fit the graph to the viewport
        // Only do this if we're not in edit mode
        if (!isEditing) {
          fitGraphToViewport(svg, graph, node, width, height, 50, 750, false);
        }
      });
    
    // Store simulation for cleanup
    simulationRef.current = simulation;

    // Create the links (edges)
    const link = graph.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(processedEdges)
      .enter()
      .append('line')
      .attr('stroke', '#999')
      .attr('stroke-width', 1);

    // Create the nodes
    const node = graph.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .call(d3.drag<SVGGElement, Node>()
        .on('start', dragStarted)
        .on('drag', dragged)
        .on('end', dragEnded)
      )
      .on('click', (event, d) => {
        event.stopPropagation();
        onSelectNode(d.id);
      })
      .on('contextmenu', (event, d) => {
        // Prevent default context menu
        event.preventDefault();
        // Stop propagation to prevent the background from also creating a node
        event.stopPropagation();
        // Start connection mode when right-clicking on a node
        if (onStartConnectMode) {
          onStartConnectMode(d.id);
        }
      })
      .attr('cursor', 'pointer');

    // Add highlight effect for connect mode
    if (connectMode && sourceNode) {
      // Add a temporary "ghost" line to follow cursor
      const sourceNodeData = nodes.find(n => n.id === sourceNode);
      
      if (sourceNodeData) {
        // Add large highlight circle for the source node
        node.filter(d => d.id === sourceNode)
          .append('circle')
          .attr('r', 15)
          .attr('fill', 'none')
          .attr('stroke', '#ff5722')
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '4,4')
          .attr('class', 'highlight-circle');
        
        // Add visual cursor cue
        svg.style('cursor', 'crosshair');
      }
    }

    // Add background circles to nodes
    node.append('circle')
      .attr('r', 14)
      .attr('fill', (d) => {
        if (connectMode && d.id === sourceNode) return '#ff5722';  // Source node in connect mode
        if (d.id === selectedNode) return '#ff9800';   // Selected node
        return '#4285f4';  // Default color
      })
      .attr('stroke', (d) => {
        if (connectMode && d.id !== sourceNode) return '#8bc34a';  // Potential target nodes
        return 'none';
      })
      .attr('stroke-width', 2);

    // Add icon to nodes
    node.append('text')
      .attr('dy', 5)
      .attr('text-anchor', 'middle')
      .attr('font-size', '16px')
      .attr('class', 'node-icon')
      .text((d) => getIconSymbol(d.icon || 'circle'))
      .attr('fill', '#fff');

    // Add indicator for nodes with description
    node.filter((d: Node) => Boolean(d.description) && d.description.length > 0)
      .append('circle')
      .attr('r', 3)
      .attr('cy', -12)
      .attr('cx', 12)
      .attr('fill', '#8bc34a');

    // Add labels to nodes
    node.append('text')
      .attr('dy', -15)
      .attr('text-anchor', 'middle')
      .attr('class', 'node-label')
      .text((d) => d.label)
      .attr('fill', '#333');

    // Context menu on background to create new node at cursor position
    svg.on('contextmenu', (event) => {
      // Prevent default context menu
      event.preventDefault();
      
      if (!onAddNode) return;
      
      // Get the mouse coordinates relative to the SVG
      const svgPoint = d3.pointer(event, graph.node());
      
      // Create a new node at cursor position
      onAddNode(svgPoint[0], svgPoint[1]);
    });

    // Clear selection when clicking on the background (only if not in connect mode)
    svg.on('click', () => {
      if (!connectMode) {
        onSelectNode(null);
      }
    });

    // Add manual zoom controls
    const zoomControls = svg.append('g')
      .attr('class', 'zoom-controls')
      .attr('transform', `translate(${width - 50}, 30)`);

    // Zoom in button
    zoomControls.append('circle')
      .attr('r', 15)
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('fill', '#333')
      .attr('stroke', '#666')
      .attr('stroke-width', 1)
      .attr('cursor', 'pointer')
      .on('click', (event) => {
        event.stopPropagation();
        svg.transition()
          .duration(1200)
          .ease(d3.easeQuadOut)
          .call(zoom.scaleBy, 1.3);
      });

    zoomControls.append('text')
      .attr('x', 0)
      .attr('y', 5)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .attr('pointer-events', 'none')
      .text('+');

    // Zoom out button
    zoomControls.append('circle')
      .attr('r', 15)
      .attr('cx', 0)
      .attr('cy', 40)
      .attr('fill', '#333')
      .attr('stroke', '#666')
      .attr('stroke-width', 1)
      .attr('cursor', 'pointer')
      .on('click', (event) => {
        event.stopPropagation();
        svg.transition()
          .duration(1200)
          .ease(d3.easeQuadOut)
          .call(zoom.scaleBy, 0.7);
      });

    zoomControls.append('text')
      .attr('x', 0)
      .attr('y', 45)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .attr('pointer-events', 'none')
      .text('-');

    // Reset zoom/fit all button
    zoomControls.append('circle')
      .attr('r', 15)
      .attr('cx', 0)
      .attr('cy', 80)
      .attr('fill', '#333')
      .attr('stroke', '#666')
      .attr('stroke-width', 1)
      .attr('cursor', 'pointer')
      .on('click', (event) => {
        event.stopPropagation();
        fitGraphToViewport(svg, graph, node, width, height, 50, 2000, true);
      });

    zoomControls.append('text')
      .attr('x', 0)
      .attr('y', 85)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', '10px')
      .attr('pointer-events', 'none')
      .text('FIT');

    // Add a tooltip about right-click functionality
    const tooltip = svg.append('g')
      .attr('class', 'tooltip')
      .attr('transform', `translate(20, ${height - 20})`);
    
    tooltip.append('text')
      .attr('fill', '#999')
      .attr('font-size', '12px')
      .text('Right-click: Create node or start connection');

    // Functions for the force simulation
    function ticked() {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node
        .attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    }

    function dragStarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.2).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragEnded(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      // Allow nodes to move freely with the simulation again
      event.subject.fx = null;
      event.subject.fy = null;
      
      // After dragging ends, refit the graph if significantly changed and not in edit mode
      if (!isEditing) {
        setTimeout(() => fitGraphToViewport(svg, graph, node, width, height, 50, 2000, true), 300);
      }
    }

    // Initial fit if we have nodes and aren't in edit mode, but use a force flag
    if (nodes.length > 0) {
      // Slight delay to allow nodes to initialize positions
      setTimeout(() => {
        fitGraphToViewport(svg, graph, node, width, height, 50, isEditing ? 0 : 3000, true);
      }, 100);
    }

    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, [nodes, edges, selectedNode, sourceNode, connectMode, onSelectNode, onAddNode, onStartConnectMode, isEditing]);

  return (
    <svg ref={svgRef} className="graph-view"></svg>
  );
};

export default GraphView; 