// src/engines/parser/layout/GlobalRoutingEngine.ts

import { LayoutResult, RoutingResult, LayoutConfig, RoutedEdge, Point, LayoutNode, EdgeClassification } from './types';
import { OrthogonalGridRouter, GridVertex } from './OrthogonalGridRouter';

interface AStarNode {
  idx: number;
  g: number;
  h: number;
  f: number;
  parent: number | null;
}

export interface CandidateAnchor {
  border: Point;
  clearance: Point;
  side: 'top'|'right'|'bottom'|'left';
  score: number;
}

export class GlobalRoutingEngine {
  public route(layout: LayoutResult, edges: any[], config: LayoutConfig): RoutingResult {
    const gridRouter = new OrthogonalGridRouter(layout.nodes, config.routingClearance);
    const routedEdges: RoutedEdge[] = [];
    const segmentUsage = new Map<string, number>();

    // Sort edges by priority: Tree > Forward > Cross > Back > Self
    const priority = { 'Tree': 1, 'Forward': 2, 'Cross': 3, 'Back': 4, 'Self': 5 };
    const sortedEdges = [...edges].sort((a, b) => 
      (priority[a.classification as keyof typeof priority] || 99) - (priority[b.classification as keyof typeof priority] || 99)
    );

    const edgesToRoute = sortedEdges;
    const stubCounts = new Map<string, number>();

    for (const e of edgesToRoute) {
      const isExtended = e.classification === 'Cross' || e.classification === 'Back' || e.classification === 'Self';

      if (e.classification === 'Cross' || e.classification === 'Back') {
        if (!config.showExtended) {
          const sourceNode = layout.nodes.find(n => n.id === e.source)!;
          const stubIndex = stubCounts.get(e.source) || 0;
          stubCounts.set(e.source, stubIndex + 1);

          const sx = sourceNode.x + sourceNode.width;
          const sy = sourceNode.y + sourceNode.height / 2 + (stubIndex * 20) - 20;
          const ex = sx + 50;
          
          routedEdges.push({
            ...e,
            label: `${e.label} ➔ State ${e.target}`,
            polyline: [{ x: sx, y: sy }, { x: ex, y: sy }],
            labelX: sx + 25,
            labelY: sy - 10,
            isStub: true
          });
          continue;
        }
        // If showExtended is true, we fall through to route it orthogonally!
      }

      if (e.classification === 'Self') {
        const sourceNode = layout.nodes.find(n => n.id === e.source)!;
        const p1: Point = { x: sourceNode.x + sourceNode.width / 2, y: sourceNode.y };
        const p2: Point = { x: sourceNode.x + sourceNode.width, y: sourceNode.y + sourceNode.height / 2 };
        routedEdges.push({
          ...e,
          polyline: [p1, { x: p1.x, y: p1.y - 40 }, { x: p2.x + 40, y: p1.y - 40 }, p2]
        });
        continue;
      }

      const sourceNode = layout.nodes.find(n => n.id === e.source)!;
      const targetNode = layout.nodes.find(n => n.id === e.target)!;
      
      const gridRouter = new OrthogonalGridRouter(layout.nodes, config.routingClearance, sourceNode, targetNode);

      const route = this.selectOptimalRoute(sourceNode, targetNode, e.classification, gridRouter, segmentUsage, config);
      
      let polyline: Point[] = [];
      if (route) {
        // Record usage
        for (let i = 0; i < route.path.length - 1; i++) {
          const v1 = route.path[i];
          const v2 = route.path[i + 1];
          const segKey = this.getSegmentKey(v1, v2);
          segmentUsage.set(segKey, (segmentUsage.get(segKey) || 0) + 1);
        }

        polyline = this.processPathIntoPolyline(route.sourceBorder, route.path, route.targetBorder, segmentUsage, config);
      } else {
        // Fallback
        const startAnchor = { x: sourceNode.x + sourceNode.width, y: sourceNode.y + sourceNode.height / 2 };
        const endAnchor = { x: targetNode.x, y: targetNode.y + targetNode.height / 2 };
        polyline = [startAnchor, endAnchor];
      }

      // 5. Labels
      const labelPos = this.computeLabelPosition(polyline);

      routedEdges.push({ 
        ...e, 
        polyline,
        labelX: labelPos?.x,
        labelY: labelPos?.y
      });
    }

    return { edges: routedEdges };
  }

  private selectOptimalRoute(
    sourceNode: LayoutNode,
    targetNode: LayoutNode,
    classification: EdgeClassification | undefined,
    gridRouter: OrthogonalGridRouter,
    segmentUsage: Map<string, number>,
    config: LayoutConfig
  ): { path: GridVertex[], sourceBorder: Point, targetBorder: Point } | null {
    const sourceCandidates = this.generateCandidates(sourceNode, config.routingClearance, true, targetNode, classification);
    const targetCandidates = this.generateCandidates(targetNode, config.routingClearance, false, sourceNode, classification);

    // Multi-source A* to Multi-target
    const openSet: number[] = [];
    const nodes = new Map<number, AStarNode>();
    
    // Virtual start nodes
    for (const sc of sourceCandidates) {
      const v = gridRouter.getClosestVertex(sc.clearance.x, sc.clearance.y);
      if (v) {
        // Penalty score for suboptimal anchors
        const startG = sc.score * 5; 
        if (!nodes.has(v.id) || startG < nodes.get(v.id)!.g) {
          nodes.set(v.id, { idx: v.id, g: startG, h: 0, f: startG, parent: null });
          if (!openSet.includes(v.id)) openSet.push(v.id);
        }
      }
    }

    const targetVertexIds = new Map<number, CandidateAnchor>();
    for (const tc of targetCandidates) {
      const v = gridRouter.getClosestVertex(tc.clearance.x, tc.clearance.y);
      if (v) {
        targetVertexIds.set(v.id, tc);
      }
    }

    let bestTargetIdx: number | null = null;
    let bestTargetG = Infinity;

    while (openSet.length > 0) {
      let lowestFIdx = 0;
      for (let i = 1; i < openSet.length; i++) {
        if (nodes.get(openSet[i])!.f < nodes.get(openSet[lowestFIdx])!.f) {
          lowestFIdx = i;
        }
      }
      const currentIdx = openSet[lowestFIdx];
      const current = nodes.get(currentIdx)!;

      if (targetVertexIds.has(currentIdx)) {
        const tc = targetVertexIds.get(currentIdx)!;
        const totalCost = current.g - tc.score * 10;
        if (totalCost < bestTargetG) {
          bestTargetG = totalCost;
          bestTargetIdx = currentIdx;
        }
        // Don't stop immediately, there might be a better target anchor shortly
        if (openSet.length > 2000) break; // sanity limit
      }

      openSet.splice(lowestFIdx, 1);
      const v1 = gridRouter.vertices.get(currentIdx)!;

      for (const neighborIdx of v1.neighbors) {
        const v2 = gridRouter.vertices.get(neighborIdx)!;
        
        let moveCost = Math.abs(v1.x - v2.x) + Math.abs(v1.y - v2.y);
        
        // Congestion penalty
        const segKey = this.getSegmentKey(v1, v2);
        const usage = segmentUsage.get(segKey) || 0;
        moveCost += usage * 1000; // Heavy penalty for sharing lanes

        // Back edge peripheral wrapping
        if (classification === 'Back') {
          const isInteriorX = (v1.x + v2.x)/2 > gridRouter.minX && (v1.x + v2.x)/2 < gridRouter.maxX;
          const isInteriorY = (v1.y + v2.y)/2 > gridRouter.minY && (v1.y + v2.y)/2 < gridRouter.maxY;
          if (isInteriorX && isInteriorY) {
            moveCost += 5000; // Strongly discourage interior back edges
          }
        }

        // Turn penalty
        let turnPenalty = 0;
        if (current.parent !== null) {
          const v0 = gridRouter.vertices.get(current.parent)!;
          const dir1X = Math.sign(v1.x - v0.x);
          const dir1Y = Math.sign(v1.y - v0.y);
          const dir2X = Math.sign(v2.x - v1.x);
          const dir2Y = Math.sign(v2.y - v1.y);
          if (dir1X !== dir2X || dir1Y !== dir2Y) {
            turnPenalty = 50;
          }
        }

        const tentativeG = current.g + moveCost + turnPenalty;

        let neighbor = nodes.get(neighborIdx);
        if (!neighbor || tentativeG < neighbor.g) {
          nodes.set(neighborIdx, { idx: neighborIdx, g: tentativeG, h: 0, f: tentativeG, parent: currentIdx });
          if (!openSet.includes(neighborIdx)) openSet.push(neighborIdx);
        }
      }
    }

    if (bestTargetIdx !== null) {
      const path: GridVertex[] = [];
      let curr: number | null = bestTargetIdx;
      while (curr !== null) {
        path.push(gridRouter.vertices.get(curr)!);
        curr = nodes.get(curr)!.parent;
      }
      path.reverse();

      // Find the source border anchor that matches the first path vertex
      const firstV = path[0];
      let bestSourceAnchor = sourceCandidates[0];
      let minDist = Infinity;
      for (const sc of sourceCandidates) {
        const dist = Math.abs(sc.clearance.x - firstV.x) + Math.abs(sc.clearance.y - firstV.y);
        if (dist < minDist) {
          minDist = dist;
          bestSourceAnchor = sc;
        }
      }

      return {
        path,
        sourceBorder: bestSourceAnchor.border,
        targetBorder: targetVertexIds.get(bestTargetIdx)!.border
      };
    }

    return null;
  }

  private processPathIntoPolyline(
    sourceBorder: Point,
    path: GridVertex[],
    targetBorder: Point,
    segmentUsage: Map<string, number>,
    config: LayoutConfig
  ): Point[] {
    const rawPolyline: Point[] = [sourceBorder];
    
    if (path.length > 0) {
      rawPolyline.push({ x: path[0].x, y: path[0].y });
    }
    
    for (let i = 0; i < path.length - 1; i++) {
      const p1 = path[i];
      const p2 = path[i+1];
      const segKey = this.getSegmentKey(p1, p2);
      const uses = segmentUsage.get(segKey) || 1;
      
      let pt1 = { x: p1.x, y: p1.y };
      let pt2 = { x: p2.x, y: p2.y };

      if (uses > 1) {
        const offset = Math.ceil(uses / 2) * config.laneSpacing * (uses % 2 === 0 ? 1 : -1);
        if (p1.x === p2.x) { // Vertical segment
          pt1.x += offset;
          pt2.x += offset;
        } else if (p1.y === p2.y) { // Horizontal segment
          pt1.y += offset;
          pt2.y += offset;
        }
      }
      
      rawPolyline.push(pt1);
      rawPolyline.push(pt2);
    }
    
    if (path.length > 0) {
      rawPolyline.push({ x: path[path.length - 1].x, y: path[path.length - 1].y });
    }
    rawPolyline.push(targetBorder);

    // Simplification: Merge collinear points
    if (rawPolyline.length < 3) return rawPolyline;
    const simplified: Point[] = [rawPolyline[0]];
    for (let i = 1; i < rawPolyline.length - 1; i++) {
      const prev = simplified[simplified.length - 1];
      const curr = rawPolyline[i];
      const next = rawPolyline[i + 1];
      
      // If they are strictly collinear, skip curr
      if ((prev.x === curr.x && curr.x === next.x) || (prev.y === curr.y && curr.y === next.y)) {
        continue;
      }
      simplified.push(curr);
    }
    simplified.push(rawPolyline[rawPolyline.length - 1]);

    return simplified;
  }

  private computeLabelPosition(polyline: Point[]): Point | null {
    if (polyline.length < 2) return null;
    let longestLen = 0;
    let bestMid: Point | null = null;

    for (let i = 0; i < polyline.length - 1; i++) {
      const p1 = polyline[i];
      const p2 = polyline[i+1];
      const len = Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
      if (len > longestLen) {
        longestLen = len;
        bestMid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      }
    }
    return bestMid;
  }

  private getSegmentKey(p1: {x: number, y: number}, p2: {x: number, y: number}): string {
    const x1 = Math.round(p1.x);
    const y1 = Math.round(p1.y);
    const x2 = Math.round(p2.x);
    const y2 = Math.round(p2.y);
    if (x1 < x2 || (x1 === x2 && y1 < y2)) return `${x1},${y1}-${x2},${y2}`;
    return `${x2},${y2}-${x1},${y1}`;
  }



  private generateCandidates(node: LayoutNode, clearance: number, isSource: boolean, otherNode: LayoutNode, classification: EdgeClassification | undefined): CandidateAnchor[] {
    const w = node.width;
    const h = node.height;
    const x = node.x;
    const y = node.y;

    const isNormal = classification === 'Tree' || classification === 'Forward' || !classification;

    let rightClearance = clearance;
    let leftClearance = clearance;
    let topClearance = clearance;
    let bottomClearance = clearance;

    if (otherNode) {
      if (otherNode.x > x + w) rightClearance = Math.min(clearance, Math.max(5, (otherNode.x - (x + w)) / 2));
      if (otherNode.x + otherNode.width < x) leftClearance = Math.min(clearance, Math.max(5, (x - (otherNode.x + otherNode.width)) / 2));
      if (otherNode.y > y + h) bottomClearance = Math.min(clearance, Math.max(5, (otherNode.y - (y + h)) / 2));
      if (otherNode.y + otherNode.height < y) topClearance = Math.min(clearance, Math.max(5, (y - (otherNode.y + otherNode.height)) / 2));
    }

    if (isNormal) {
      if (isSource) {
        return [{ border: { x: x + w, y: y + h * 0.5 }, clearance: { x: x + w + rightClearance, y: y + h * 0.5 }, side: 'right', score: 0 }];
      } else {
        return [{ border: { x: x, y: y + h * 0.5 }, clearance: { x: x - leftClearance, y: y + h * 0.5 }, side: 'left', score: 0 }];
      }
    }

    const candidates: CandidateAnchor[] = [
      { border: { x: x + w * 0.25, y: y }, clearance: { x: x + w * 0.25, y: y - topClearance }, side: 'top', score: 0 },
      { border: { x: x + w * 0.5, y: y }, clearance: { x: x + w * 0.5, y: y - topClearance }, side: 'top', score: 0 },
      { border: { x: x + w * 0.75, y: y }, clearance: { x: x + w * 0.75, y: y - topClearance }, side: 'top', score: 0 },
      { border: { x: x + w, y: y + h * 0.25 }, clearance: { x: x + w + rightClearance, y: y + h * 0.25 }, side: 'right', score: 0 },
      { border: { x: x + w, y: y + h * 0.5 }, clearance: { x: x + w + rightClearance, y: y + h * 0.5 }, side: 'right', score: 0 },
      { border: { x: x + w, y: y + h * 0.75 }, clearance: { x: x + w + rightClearance, y: y + h * 0.75 }, side: 'right', score: 0 },
      { border: { x: x + w * 0.75, y: y + h }, clearance: { x: x + w * 0.75, y: y + h + bottomClearance }, side: 'bottom', score: 0 },
      { border: { x: x + w * 0.5, y: y + h }, clearance: { x: x + w * 0.5, y: y + h + bottomClearance }, side: 'bottom', score: 0 },
      { border: { x: x + w * 0.25, y: y + h }, clearance: { x: x + w * 0.25, y: y + h + bottomClearance }, side: 'bottom', score: 0 },
      { border: { x: x, y: y + h * 0.75 }, clearance: { x: x - leftClearance, y: y + h * 0.75 }, side: 'left', score: 0 },
      { border: { x: x, y: y + h * 0.5 }, clearance: { x: x - leftClearance, y: y + h * 0.5 }, side: 'left', score: 0 },
      { border: { x: x, y: y + h * 0.25 }, clearance: { x: x - leftClearance, y: y + h * 0.25 }, side: 'left', score: 0 },
    ];

    if (otherNode) {
      for (const c of candidates) {
        const dx = c.border.x - (otherNode.x + otherNode.width / 2);
        const dy = c.border.y - (otherNode.y + otherNode.height / 2);
        c.score = Math.sqrt(dx*dx + dy*dy);
      }
      candidates.sort((a, b) => a.score - b.score);
    }

    return candidates;
  }
}
