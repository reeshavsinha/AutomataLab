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

/** Full item list + spacing up to this many LR states. */
export const LR_AUTOMATON_LAYOUT_FULL = 200
/** Compact spacing and shortened extended edges. */
export const LR_AUTOMATON_LAYOUT_COMPACT = 500
/** Truncated item rows per state (LOD). */
export const LR_AUTOMATON_LAYOUT_LOD = 1200
/** Hard cap — use parse table / export instead of the graph. */
export const LR_AUTOMATON_LAYOUT_MAX = 1500
/** Stop opening new columns past this width. Later columns may overlap. */
export const LR_AUTOMATON_LAYOUT_MAX_WIDTH = 12000

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

/** Drop undefined overrides so they cannot replace the numeric defaults with NaN spacing. */
export function mergeLayoutConfig(overrides?: Partial<LayoutConfig>): LayoutConfig {
  const config: LayoutConfig = { ...DEFAULT_LAYOUT_CONFIG };
  if (!overrides) return config;
  for (const key of Object.keys(overrides) as (keyof LayoutConfig)[]) {
    const value = overrides[key];
    if (value !== undefined) Object.assign(config, { [key]: value });
  }
  return config;
}

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
