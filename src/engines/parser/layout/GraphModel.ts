// src/engines/parser/layout/GraphModel.ts

import { LR0Table } from '../lr0';
import { AutomatonNode, AutomatonEdge, AutomatonGraph, EdgeClassification } from './types';

export class GraphModel {
  static extractGraph(table: LR0Table, estimateWidth: (stateId: number) => number): AutomatonGraph {
    const nodes: AutomatonNode[] = [];
    const edges: AutomatonEdge[] = [];
    
    // 1. Create nodes
    for (const state of table.states) {
      nodes.push({
        id: state.id.toString(),
        width: estimateWidth(state.id),
        height: 40 + state.items.length * 20, // Rough estimate, 20px per item
        isStart: state.id === 0
      });
    }

    // 2. Extract edges and merge parallel transitions
    const edgeMap = new Map<string, AutomatonEdge>();

    // GOTO Transitions
    for (const [stateId, transitions] of table.gotoTable.entries()) {
      for (const [symbol, targetState] of transitions.entries()) {
        if (targetState !== -1) {
          const key = `${stateId}-${targetState}`;
          if (!edgeMap.has(key)) {
            edgeMap.set(key, {
              id: `edge-${key}`,
              source: stateId.toString(),
              target: targetState.toString(),
              label: symbol
            });
          } else {
            edgeMap.get(key)!.label += `, ${symbol}`;
          }
        }
      }
    }

    // SHIFT Transitions
    for (const [stateId, symbolActions] of table.actionTable.entries()) {
      for (const [symbol, actions] of symbolActions.entries()) {
        for (const action of actions) {
          if (action.type === 'Shift' && action.target !== undefined) {
            const key = `${stateId}-${action.target}`;
            if (!edgeMap.has(key)) {
              edgeMap.set(key, {
                id: `edge-${key}`,
                source: stateId.toString(),
                target: action.target.toString(),
                label: symbol
              });
            } else {
              const edge = edgeMap.get(key)!;
              if (!edge.label.split(', ').includes(symbol)) {
                edge.label += `, ${symbol}`;
              }
            }
          }
        }
      }
    }

    edges.push(...Array.from(edgeMap.values()));

    // 3. Run BFS for Layering and Edge Classification
    const depthMap = new Map<string, number>();
    const queue: string[] = ['0'];
    depthMap.set('0', 0);

    const adjacencyList = new Map<string, AutomatonEdge[]>();
    for (const e of edges) {
      if (!adjacencyList.has(e.source)) adjacencyList.set(e.source, []);
      adjacencyList.get(e.source)!.push(e);
    }

    // Assign depths
    while (queue.length > 0) {
      const u = queue.shift()!;
      const d = depthMap.get(u)!;
      
      const outEdges = adjacencyList.get(u) || [];
      for (const e of outEdges) {
        if (!depthMap.has(e.target)) {
          depthMap.set(e.target, d + 1);
          e.classification = 'Tree';
          queue.push(e.target);
        } else {
          // Already visited
          const targetDepth = depthMap.get(e.target)!;
          if (e.source === e.target) {
            e.classification = 'Self';
          } else if (targetDepth < d) {
            e.classification = 'Back';
          } else if (targetDepth === d) {
            e.classification = 'Cross';
          } else {
            e.classification = 'Forward';
          }
        }
      }
    }

    // Any unreachable nodes (shouldn't happen in valid automata, but just in case)
    for (const n of nodes) {
      if (!depthMap.has(n.id)) {
        depthMap.set(n.id, 0); // Dump in layer 0
      }
    }
    
    // Classify any edges from unreachable nodes
    for (const e of edges) {
      if (!e.classification) {
        e.classification = 'Forward';
      }
    }

    // Assign layers to nodes
    for (const n of nodes) {
      (n as any).layer = depthMap.get(n.id) || 0;
    }

    return { nodes, edges };
  }
}
