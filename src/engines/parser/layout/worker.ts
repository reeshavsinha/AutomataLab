// src/engines/parser/layout/worker.ts

import { LR0Table } from '../lr0';
import { GraphModel } from './GraphModel';
import { LRLayeredStrategy } from './LRLayeredStrategy';
import { GlobalRoutingEngine } from './GlobalRoutingEngine';
import { GeometryBuilder } from './GeometryBuilder';
import { DEFAULT_LAYOUT_CONFIG } from './types';

self.onmessage = (e: MessageEvent) => {
  const { table, configOverrides, widthMap } = e.data;
  
  if (!table) return;

  const config = { ...DEFAULT_LAYOUT_CONFIG, ...configOverrides };

  try {
    // 1. Graph Construction
    const graph = GraphModel.extractGraph(table, (id) => widthMap?.[id] || 120);

    // 2. Layout
    const layoutStrategy = new LRLayeredStrategy();
    const layoutResult = layoutStrategy.layout(graph, config);

    // 3. Return the final payload without custom SVG routing (let React Flow handle it natively)
    self.postMessage({ type: 'SUCCESS', nodes: layoutResult.nodes, edges: graph.edges });
  } catch (error: any) {
    self.postMessage({ type: 'ERROR', error: error.message });
  }
};
