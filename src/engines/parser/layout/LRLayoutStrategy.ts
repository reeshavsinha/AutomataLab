// src/modules/parser/layout/LRLayoutStrategy.ts

/**
 * Stub layout strategy for LR automaton visualizations.
 * Integrates with GlobalRoutingEngine to provide edge routing.
 */
export class LRLayoutStrategy {
  constructor(public engine: any) {}

  /**
   * Compute node positions (placeholder). Returns unchanged nodes.
   */
  computeNodePositions(nodes: any[]): any[] {
    return nodes;
  }

  /**
   * Perform routing using the provided GlobalRoutingEngine.
   */
  routeEdges(edges: any[]): any[] {
    if (this.engine && typeof this.engine.route === 'function') {
      return this.engine.route();
    }
    return edges;
  }
}
