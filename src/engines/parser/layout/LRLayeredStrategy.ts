// src/engines/parser/layout/LRLayeredStrategy.ts

import { LayoutStrategy, AutomatonGraph, LayoutConfig, LayoutResult, LayoutNode } from './types';

export class LRLayeredStrategy implements LayoutStrategy {
  layout(graph: AutomatonGraph, config: LayoutConfig): LayoutResult {
    const nodes: LayoutNode[] = graph.nodes.map(n => ({
      ...n,
      x: 0,
      y: 0,
      layer: (n as any).layer || 0,
      order: 0
    }));

    const maxLayer = Math.max(0, ...nodes.map(n => n.layer!));
    const layers: LayoutNode[][] = Array.from({ length: maxLayer + 1 }, () => []);
    
    // Group nodes by layer
    for (const n of nodes) {
      layers[n.layer!].push(n);
    }

    // Assign initial Y based on parent order to minimize crossings
    // Layer 0 is just sorted by ID (or arbitrary)
    layers[0].sort((a, b) => a.id.localeCompare(b.id));
    layers[0].forEach((n, i) => {
      n.order = i;
      n.y = i * config.verticalSpacing;
      n.x = 0;
    });

    const edgeMap = new Map<string, string[]>(); // target -> source[]
    for (const e of graph.edges) {
      if (e.classification === 'Tree' || e.classification === 'Forward') {
        if (!edgeMap.has(e.target)) edgeMap.set(e.target, []);
        edgeMap.get(e.target)!.push(e.source);
      }
    }

    // Left-to-right pass: Barycenter sorting (vertically)
    for (let l = 1; l <= maxLayer; l++) {
      const currentLayer = layers[l];
      
      // Compute vertical barycenter for each node
      const barycenters = new Map<string, number>();
      for (const n of currentLayer) {
        const parents = edgeMap.get(n.id) || [];
        let sumY = 0;
        let count = 0;
        for (const pId of parents) {
          const parent = nodes.find(x => x.id === pId);
          if (parent && parent.layer! < l) {
            sumY += parent.y;
            count++;
          }
        }
        barycenters.set(n.id, count > 0 ? sumY / count : 0);
      }

      // Sort by vertical barycenter
      currentLayer.sort((a, b) => barycenters.get(a.id)! - barycenters.get(b.id)!);
      
      // Assign initial Y coordinates (and X based on layer)
      let currentY = 0;
      for (let i = 0; i < currentLayer.length; i++) {
        const n = currentLayer[i];
        n.order = i;
        
        // Try to place it near its barycenter, but at least verticalSpacing from the previous node
        const targetY = barycenters.get(n.id) || 0;
        n.y = Math.max(currentY, targetY);
        n.x = l * config.horizontalSpacing; // layer determines X
        
        currentY = n.y + n.height + config.verticalSpacing;
      }
    }

    // Right-to-left pass: Centering parents vertically next to children
    const childMap = new Map<string, string[]>(); // source -> target[]
    for (const e of graph.edges) {
      if (e.classification === 'Tree') { 
        if (!childMap.has(e.source)) childMap.set(e.source, []);
        childMap.get(e.source)!.push(e.target);
      }
    }

    for (let l = maxLayer - 1; l >= 0; l--) {
      const currentLayer = layers[l];
      for (let i = 0; i < currentLayer.length; i++) {
        const n = currentLayer[i];
        const children = childMap.get(n.id) || [];
        let sumY = 0;
        let count = 0;
        for (const cId of children) {
          const child = nodes.find(x => x.id === cId);
          if (child && child.layer! > l) {
            // vertical center of the child
            sumY += child.y + child.height / 2;
            count++;
          }
        }

        if (count > 0) {
          const targetCenter = sumY / count;
          let desiredY = targetCenter - (n.height / 2);
          
          // Ensure it doesn't overlap with the previous node vertically
          const prevNode = i > 0 ? currentLayer[i - 1] : null;
          const minY = prevNode ? prevNode.y + prevNode.height + config.verticalSpacing : 0;
          
          n.y = Math.max(minY, desiredY);
        }
      }
      
      // Push subsequent nodes down if we pushed a node down and created overlap
      for (let i = 1; i < currentLayer.length; i++) {
        const prev = currentLayer[i-1];
        const curr = currentLayer[i];
        const minY = prev.y + prev.height + config.verticalSpacing;
        if (curr.y < minY) {
          curr.y = minY;
        }
      }
    }

    return { nodes };
  }
}
