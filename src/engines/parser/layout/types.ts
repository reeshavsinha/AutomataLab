// src/engines/parser/layout/types.ts

// --------------------------------------------------------
// Configuration
// --------------------------------------------------------
export interface LayoutConfig {
  horizontalSpacing: number;
  verticalSpacing: number;
  statePadding: number;
  routingClearance: number;
  laneSpacing: number;
  labelMargin: number;
  cornerRadius: number;
  showExtended: boolean;
}

export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  horizontalSpacing: 210,
  verticalSpacing: 110,
  statePadding: 15,
  routingClearance: 25,
  laneSpacing: 8,
  labelMargin: 5,
  cornerRadius: 8,
  showExtended: false,
};

// --------------------------------------------------------
// Graph Model & Layout Input
// --------------------------------------------------------
export type EdgeClassification = 'Tree' | 'Forward' | 'Cross' | 'Back' | 'Self';

export interface AutomatonNode {
  id: string;
  width: number;
  height: number;
  isStart?: boolean;
}

export interface AutomatonEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  classification?: EdgeClassification; // Determined by GraphModel
}

export interface AutomatonGraph {
  nodes: AutomatonNode[];
  edges: AutomatonEdge[];
}

// --------------------------------------------------------
// Layout Results
// --------------------------------------------------------
export interface LayoutNode extends AutomatonNode {
  x: number;
  y: number;
  layer?: number; // BFS layer depth
  order?: number; // Index within layer
}

export interface LayoutResult {
  nodes: LayoutNode[];
}

export interface LayoutStrategy {
  layout(graph: AutomatonGraph, config: LayoutConfig): LayoutResult;
}

// --------------------------------------------------------
// Routing & Geometry Results
// --------------------------------------------------------
export interface Point {
  x: number;
  y: number;
}

export interface RoutedEdge extends AutomatonEdge {
  polyline: Point[]; // Sequence of points making up the route
  labelPosition?: Point; // Center position for the label
}

export interface RoutingResult {
  edges: RoutedEdge[];
}

export interface SVGEdge extends RoutedEdge {
  svgPath: string; // The fully smoothed SVG string (M ... L ... Q ... etc)
}

export interface GeometryResult {
  edges: SVGEdge[];
}
