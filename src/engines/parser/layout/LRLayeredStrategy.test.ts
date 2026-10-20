import { describe, expect, it } from 'vitest';
import { LRLayeredStrategy, stubReserve } from './LRLayeredStrategy';
import { AutomatonGraph, DEFAULT_LAYOUT_CONFIG } from './types';

describe('LRLayeredStrategy column spacing', () => {
  it('places the next column after a wide card and its shortened stub', () => {
    const graph = {
      nodes: [
        { id: '5', width: 280, height: 120, layer: 0 },
        { id: '7', width: 200, height: 80, layer: 1 },
      ],
      edges: [
        { id: 'tree', source: '5', target: '7', label: 'T', classification: 'Tree' },
        { id: 'back', source: '5', target: '4', label: 'id', classification: 'Back' },
      ],
    } as unknown as AutomatonGraph;
    const result = new LRLayeredStrategy().layout(graph, { ...DEFAULT_LAYOUT_CONFIG, showExtended: false });
    const source = result.nodes.find((node) => node.id === '5')!;
    const next = result.nodes.find((node) => node.id === '7')!;
    const lane = stubReserve('5', graph.edges, false);
    expect(lane).toBeGreaterThan(0);
    expect(next.x).toBeGreaterThanOrEqual(source.x + source.width + lane);
  });
});
