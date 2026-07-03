// src/engines/parser/layout/OrthogonalGridRouter.ts

import { Point, LayoutNode } from './types';

export interface GridObstacle {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GridVertex {
  id: number;
  x: number;
  y: number;
  neighbors: number[];
}

export class OrthogonalGridRouter {
  public vertices: Map<number, GridVertex> = new Map();
  public xLines: number[] = [];
  public yLines: number[] = [];
  public obstacles: GridObstacle[] = [];
  public clearance: number;
  public minX: number = 0;
  public maxX: number = 0;
  public minY: number = 0;
  public maxY: number = 0;

  constructor(nodes: LayoutNode[], clearance: number) {
    this.clearance = clearance;
    
    // 1. Inflate obstacles
    this.obstacles = nodes.map(n => ({
      x: n.x - clearance,
      y: n.y - clearance,
      w: n.width + 2 * clearance,
      h: n.height + 2 * clearance
    }));

    // Calculate global bounds for peripheral routing
    this.minX = Infinity;
    this.minY = Infinity;
    this.maxX = -Infinity;
    this.maxY = -Infinity;
    for (const obs of this.obstacles) {
      if (obs.x < this.minX) this.minX = obs.x;
      if (obs.y < this.minY) this.minY = obs.y;
      if (obs.x + obs.w > this.maxX) this.maxX = obs.x + obs.w;
      if (obs.y + obs.h > this.maxY) this.maxY = obs.y + obs.h;
    }

    const xSet = new Set<number>();
    const ySet = new Set<number>();

    // Peripheral lines
    xSet.add(this.minX - clearance * 2);
    xSet.add(this.maxX + clearance * 2);
    ySet.add(this.minY - clearance * 2);
    ySet.add(this.maxY + clearance * 2);

    for (const obs of this.obstacles) {
      xSet.add(obs.x);
      xSet.add(obs.x + obs.w);
      ySet.add(obs.y);
      ySet.add(obs.y + obs.h);
      
      // Also add center lines for anchoring
      xSet.add(obs.x + obs.w / 2);
      ySet.add(obs.y + obs.h / 2);

      // Add quarter lines for more anchor options
      xSet.add(obs.x + obs.w * 0.25);
      xSet.add(obs.x + obs.w * 0.75);
      ySet.add(obs.y + obs.h * 0.25);
      ySet.add(obs.y + obs.h * 0.75);
    }

    this.xLines = Array.from(xSet).sort((a, b) => a - b);
    this.yLines = Array.from(ySet).sort((a, b) => a - b);

    this.buildGraph();
  }

  private buildGraph() {
    this.vertices.clear();

    // Create a vertex for every intersection
    let idCounter = 0;
    const vertexMatrix: (number | null)[][] = [];

    for (let i = 0; i < this.xLines.length; i++) {
      vertexMatrix[i] = [];
      const x = this.xLines[i];
      for (let j = 0; j < this.yLines.length; j++) {
        const y = this.yLines[j];
        
        // Check if point is STRICTLY inside any obstacle
        const isInside = this.obstacles.some(obs => 
          x > obs.x + 0.1 && x < obs.x + obs.w - 0.1 && 
          y > obs.y + 0.1 && y < obs.y + obs.h - 0.1
        );

        if (!isInside) {
          const vId = idCounter++;
          this.vertices.set(vId, { id: vId, x, y, neighbors: [] });
          vertexMatrix[i][j] = vId;
        } else {
          vertexMatrix[i][j] = null;
        }
      }
    }

    // Connect horizontal and vertical neighbors
    for (let i = 0; i < this.xLines.length; i++) {
      for (let j = 0; j < this.yLines.length; j++) {
        const vId = vertexMatrix[i][j];
        if (vId === null) continue;

        // Connect right
        for (let k = i + 1; k < this.xLines.length; k++) {
          const neighborId = vertexMatrix[k][j];
          if (neighborId !== null) {
            // Check if segment intersects obstacle strictly
            if (this.hasClearLine(this.xLines[i], this.yLines[j], this.xLines[k], this.yLines[j])) {
              this.vertices.get(vId)!.neighbors.push(neighborId);
              this.vertices.get(neighborId)!.neighbors.push(vId);
            }
            break; // only connect to closest visible neighbor in this direction
          }
        }

        // Connect down
        for (let k = j + 1; k < this.yLines.length; k++) {
          const neighborId = vertexMatrix[i][k];
          if (neighborId !== null) {
            if (this.hasClearLine(this.xLines[i], this.yLines[j], this.xLines[i], this.yLines[k])) {
              this.vertices.get(vId)!.neighbors.push(neighborId);
              this.vertices.get(neighborId)!.neighbors.push(vId);
            }
            break;
          }
        }
      }
    }
  }

  private hasClearLine(x1: number, y1: number, x2: number, y2: number): boolean {
    const minX = Math.min(x1, x2) + 0.1;
    const maxX = Math.max(x1, x2) - 0.1;
    const minY = Math.min(y1, y2) + 0.1;
    const maxY = Math.max(y1, y2) - 0.1;

    for (const obs of this.obstacles) {
      if (x1 === x2) { // Vertical line
        if (x1 > obs.x + 0.1 && x1 < obs.x + obs.w - 0.1) {
          // Line crosses through horizontal bounds of obstacle
          // Check vertical overlap
          if (Math.max(minY, obs.y) < Math.min(maxY, obs.y + obs.h)) return false;
        }
      } else { // Horizontal line
        if (y1 > obs.y + 0.1 && y1 < obs.y + obs.h - 0.1) {
          // Check horizontal overlap
          if (Math.max(minX, obs.x) < Math.min(maxX, obs.x + obs.w)) return false;
        }
      }
    }
    return true;
  }

  public getClosestVertex(x: number, y: number): GridVertex | null {
    let bestDist = Infinity;
    let bestV: GridVertex | null = null;
    for (const v of this.vertices.values()) {
      const dist = Math.abs(v.x - x) + Math.abs(v.y - y);
      if (dist < bestDist) {
        bestDist = dist;
        bestV = v;
      }
    }
    return bestV;
  }
}
