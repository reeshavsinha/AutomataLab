// src/engines/parser/layout/worker.ts

import { LR0Table } from '../lr0';
import { GraphModel } from './GraphModel';
import { LRLayeredStrategy } from './LRLayeredStrategy';
import { GlobalRoutingEngine } from './GlobalRoutingEngine';
import { GeometryBuilder } from './GeometryBuilder';
import { DEFAULT_LAYOUT_CONFIG } from './types';

self.onmessage = (e: MessageEvent) => {
  const { table, configOverrides } = e.data;
  
  if (!table) return;

  const config = { ...DEFAULT_LAYOUT_CONFIG, ...configOverrides };

  try {
    // 1. Graph Construction
    const graph = GraphModel.extractGraph(table, (id) => 120); // Dummy width estimator

    // 2. Layout
    const layoutStrategy = new LRLayeredStrategy();
    const layoutResult = layoutStrategy.layout(graph, config);

    // 3. Routing
    const routingEngine = new GlobalRoutingEngine();
    const routingResult = routingEngine.route(layoutResult, graph.edges, config);

    // 4. Geometry
    const geometryBuilder = new GeometryBuilder();
    const geometryResult = geometryBuilder.build(routingResult, config.cornerRadius);

    // Return the final payload
    self.postMessage({ type: 'SUCCESS', nodes: layoutResult.nodes, edges: geometryResult.edges });
  } catch (error: any) {
    self.postMessage({ type: 'ERROR', error: error.message });
  }
};
