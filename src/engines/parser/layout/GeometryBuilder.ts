// src/engines/parser/layout/GeometryBuilder.ts

import { RoutingResult, GeometryResult, SVGEdge, Point } from './types';

export class GeometryBuilder {
  public build(routing: RoutingResult, cornerRadius: number): GeometryResult {
    const svgEdges: SVGEdge[] = routing.edges.map(e => {
      return {
        ...e,
        svgPath: this.generatePath(e.polyline, cornerRadius)
      };
    });
    return { edges: svgEdges };
  }

  private generatePath(points: Point[], radius: number): string {
    if (points.length < 2) return '';
    if (points.length === 2) {
      return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`;
    }

    let path = `M ${points[0].x},${points[0].y}`;

    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];

      // Vector from curr to prev
      const dx1 = prev.x - curr.x;
      const dy1 = prev.y - curr.y;
      const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);

      // Vector from curr to next
      const dx2 = next.x - curr.x;
      const dy2 = next.y - curr.y;
      const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

      const r = Math.min(radius, len1 / 2, len2 / 2);

      if (r === 0) {
        path += ` L ${curr.x},${curr.y}`;
      } else {
        // Compute start of arc
        const p1x = curr.x + (dx1 / len1) * r;
        const p1y = curr.y + (dy1 / len1) * r;

        // Compute end of arc
        const p2x = curr.x + (dx2 / len2) * r;
        const p2y = curr.y + (dy2 / len2) * r;

        path += ` L ${p1x},${p1y} Q ${curr.x},${curr.y} ${p2x},${p2y}`;
      }
    }

    const last = points[points.length - 1];
    path += ` L ${last.x},${last.y}`;

    return path;
  }
}
