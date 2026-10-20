import React, { useEffect, useLayoutEffect, useMemo, useState, useRef } from 'react';
import { ReactFlow, Background, Node, Edge, MarkerType, useNodesState, useEdgesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useParserStore, useActiveSimulationState, useLR0Table, useSLR1Table, useCLR1Table, useLALR1Table } from '@/store/parserStore';
import { useMachineStore } from '@/store/machineStore';
import { useGrammarStore } from '@/store/grammarStore';
import { formatItem, LR0Table } from '@/engines/parser/lr0';
import { LRStateNode } from './LRStateNode';
import { LRStateEdge } from './LRStateEdge';
import { GlobalRoutingEngine } from '@/engines/parser/layout/GlobalRoutingEngine';
import {
  DEFAULT_LAYOUT_CONFIG,
  LR_AUTOMATON_LAYOUT_COMPACT,
  LR_AUTOMATON_LAYOUT_FULL,
  LR_AUTOMATON_LAYOUT_LOD,
  LR_AUTOMATON_LAYOUT_MAX,
} from '@/engines/parser/layout/types';
import { Undo2, Redo2, RotateCcw, Eye, EyeOff, Lock, Unlock, ZoomIn, ZoomOut, Maximize } from 'lucide-react';

const nodeTypes = {
  lrState: LRStateNode
};

const edgeTypes = {
  lrEdge: LRStateEdge
};

const CANVAS_PAD = 160;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2;

type LayoutCache = { algorithm: string; signature: string; nodes: Node[]; edges: Edge[] };

function layoutSignature(table: LR0Table): string {
  return `columns-v2|${table.states
    .map((state) => `${state.id}:${state.items.map((item) => `${item.prodIndex}.${item.dot}`).join(',')}`)
    .join('|')}`;
}

function tableForAlgorithm(
  algorithm: string,
  lr0: LR0Table | null,
  slr: LR0Table | null,
  clr: LR0Table | null,
  lalr: LR0Table | null,
): LR0Table | null {
  if (algorithm === 'LR0') return lr0;
  if (algorithm === 'SLR1') return slr;
  if (algorithm === 'CLR1') return clr;
  if (algorithm === 'LALR1') return lalr;
  return null;
}

function positionsReady(nodes: Node[]): boolean {
  return nodes.length > 0 && nodes.every((node) => {
    const opacity = (node.style as { opacity?: number } | undefined)?.opacity;
    return opacity !== 0 && Number.isFinite(node.position.x) && Number.isFinite(node.position.y);
  });
}

function cacheMatches(cache: LayoutCache | undefined, algorithm: string, signature: string): cache is LayoutCache {
  return !!cache && cache.algorithm === algorithm && cache.signature === signature && positionsReady(cache.nodes);
}

function clampNodes(nodes: Node[]): Node[] {
  return nodes.map((node) => ({
    ...node,
    position: {
      x: Number.isFinite(node.position.x) ? node.position.x : 0,
      y: Number.isFinite(node.position.y) ? node.position.y : 0,
    },
  }));
}

function nodeBox(node: Node): { width: number; height: number } {
  const data = node.data as { items?: string[]; maxItems?: number };
  const items = data.items ?? [];
  const limit = data.maxItems;
  const shown = limit != null && limit > 0 ? items.slice(0, limit) : items;
  const longest = shown.reduce((max, item) => Math.max(max, item.length), 8);
  return {
    width: Math.max(140, longest * 7.8 + 28),
    height: 32 + Math.max(shown.length, 1) * 18 + 12,
  };
}

function positiveSize(value: number | undefined, fallback: number): number {
  return value != null && Number.isFinite(value) && value > 0 ? value : fallback;
}

type ContentBounds = { minX: number; minY: number; maxX: number; maxY: number };

function canvasExtent(nodes: Node[], edges: Edge[]): ContentBounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const includeX = (x: number) => {
    if (!Number.isFinite(x)) return;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
  };
  const includeY = (y: number) => {
    if (!Number.isFinite(y)) return;
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  };
  const include = (x: number, y: number) => {
    includeX(x);
    includeY(y);
  };
  for (const node of nodes) {
    const box = nodeBox(node);
    const width = positiveSize(node.measured?.width, box.width);
    const height = positiveSize(node.measured?.height, box.height);
    include(node.position.x, node.position.y);
    include(node.position.x + width, node.position.y + height);
  }
  for (const edge of edges) {
    const data = edge.data as {
      polyline?: { x: number; y: number }[];
      routedLabelX?: number;
      routedLabelY?: number;
    } | undefined;
    for (const point of data?.polyline ?? []) include(point.x, point.y);
    const labelX = data?.routedLabelX;
    const labelY = data?.routedLabelY;
    if (labelX != null && Number.isFinite(labelX)) {
      includeX(labelX - 36);
      includeX(labelX + 72);
    }
    if (labelY != null && Number.isFinite(labelY)) {
      includeY(labelY - 12);
      includeY(labelY + 20);
    }
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  return { minX, minY, maxX, maxY };
}

function placeCanvas(
  bounds: ContentBounds,
  view: { width: number; height: number },
  zoom: number,
): { width: number; height: number; centerX: number; centerY: number; neededW: number; neededH: number } {
  const spanX = Math.max(0, bounds.maxX - bounds.minX);
  const spanY = Math.max(0, bounds.maxY - bounds.minY);
  const neededW = spanX + CANVAS_PAD * 2;
  const neededH = spanY + CANVAS_PAD * 2;
  const safeZoom = Math.max(zoom, 0.001);
  return {
    width: Math.max(neededW, view.width > 0 ? view.width / safeZoom : neededW),
    height: Math.max(neededH, view.height > 0 ? view.height / safeZoom : neededH),
    centerX: bounds.minX + spanX / 2,
    centerY: bounds.minY + spanY / 2,
    neededW,
    neededH,
  };
}

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

export function AutomatonViewerPanel() {
  const { algorithm } = useParserStore();
  const machine = useMachineStore(s => s.machine);
  
  const initialMachineId = useRef(machine?.id).current;
  
  const setAutomatonState = React.useCallback((machineId: string, state: LayoutCache) => {
    useMachineStore.setState(s => {
      const tabs = [...s.tabs];
      const index = tabs.findIndex(t => t.id === machineId);
      if (index === -1) return s;
      tabs[index] = { ...tabs[index], parserLayoutCache: state };
      return { tabs, machine: s.machine?.id === machineId ? tabs[index] : s.machine, dirtyTabs: { ...s.dirtyTabs, [machineId]: true } };
    });
  }, []);

  const automatonState = machine?.parserLayoutCache as LayoutCache | undefined;
  const simulation = useActiveSimulationState();
  const lr0Table = useLR0Table();
  const slr1Table = useSLR1Table();
  const clr1Table = useCLR1Table();
  const lalr1Table = useLALR1Table();
  const activeTableForCache = tableForAlgorithm(algorithm, lr0Table, slr1Table, clr1Table, lalr1Table);
  const signature = activeTableForCache ? layoutSignature(activeTableForCache) : '';
  const restored = cacheMatches(automatonState, algorithm, signature);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(restored ? automatonState.nodes : []);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(restored ? automatonState.edges : []);
  const [isLayingOut, setIsLayingOut] = useState(false);
  const [showExtended, setShowExtended] = useState(false);
  const [layoutSeed, setLayoutSeed] = useState(0);
  const [isLocked, setIsLocked] = useState(true);
  const [zoom, setZoom] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);

  const globalRouter = useMemo(() => new GlobalRoutingEngine(), []);

  const [pastNodes, setPastNodes] = useState<Node[][]>([]);
  const [futureNodes, setFutureNodes] = useState<Node[][]>([]);

  const handleUndo = () => {
    if (pastNodes.length === 0) return;
    const previous = pastNodes[pastNodes.length - 1];
    setPastNodes(p => p.slice(0, -1));
    setFutureNodes(f => [nodes, ...f]);
    setNodes(previous);
    persistArrangement(previous, edgesRef.current);
  };

  const handleRedo = () => {
    if (futureNodes.length === 0) return;
    const next = futureNodes[0];
    setFutureNodes(f => f.slice(1));
    setPastNodes(p => [...p, nodes]);
    setNodes(next);
    persistArrangement(next, edgesRef.current);
  };

  const onNodeDragStart = () => {
    setPastNodes(p => [...p, nodes]);
    setFutureNodes([]);
  };

  const onNodeDragStop = (_event: unknown, _node: Node, draggedNodes: Node[]) => {
    const dragged = new Map(clampNodes(draggedNodes).map((node) => [node.id, node.position]));
    const next = nodes.map((node) => {
      const position = dragged.get(node.id);
      return position ? { ...node, position } : node;
    });
    setNodes(next);
    persistArrangement(next, edgesRef.current);
  };

  const table: LR0Table | null = useMemo(() => {
    if (algorithm === 'LR0') return lr0Table;
    if (algorithm === 'SLR1') return slr1Table;
    if (algorithm === 'CLR1') return clr1Table;
    if (algorithm === 'LALR1') return lalr1Table;
    return null;
  }, [algorithm, lr0Table, slr1Table, clr1Table, lalr1Table]);

  const stateCount = table?.states.length ?? 0
  const layoutLod = stateCount > LR_AUTOMATON_LAYOUT_COMPACT && stateCount <= LR_AUTOMATON_LAYOUT_MAX
  const layoutCompact = stateCount > LR_AUTOMATON_LAYOUT_FULL && stateCount <= LR_AUTOMATON_LAYOUT_MAX
  const routeShowExtended = layoutCompact ? false : showExtended
  const itemLimit =
    stateCount <= LR_AUTOMATON_LAYOUT_FULL ? undefined : stateCount <= LR_AUTOMATON_LAYOUT_COMPACT ? 8 : 3
  const showExtendedRef = useRef(showExtended);
  showExtendedRef.current = showExtended;

  useEffect(() => {
    if (!table || table.states.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const signatureNow = layoutSignature(table);
    if (layoutSeed === 0 && cacheMatches(automatonState, algorithm, signatureNow)) {
      return;
    }

    // Safety guard for massive grammars
    if (table.states.length > LR_AUTOMATON_LAYOUT_MAX) {
      console.warn(`Automaton is too large to render safely (>${LR_AUTOMATON_LAYOUT_MAX} states).`);
      setNodes([]);
      setEdges([]);
      return;
    }

    const widthMap: Record<number, number> = {};

    const initialNodes: Node[] = table.states.map(state => {
      const formattedItems = state.items.map(item => formatItem(item, table.augmentedCfg));
      // Deduplicate formatted items
      const uniqueItems = Array.from(new Set(formattedItems));
      
      const maxLen = Math.max(15, ...uniqueItems.map(i => i.length));
      widthMap[state.id] = Math.max(120, maxLen * 8.5);

      return {
        id: state.id.toString(),
        type: 'lrState',
        position: { x: 0, y: 0 },
        data: { stateId: state.id, items: uniqueItems, maxItems: itemLimit },
        style: { opacity: 0 } // hide until layout is done
      };
    });

    const edgeMap = new Map<string, Edge>();

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
              label: symbol,
              markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--text-muted)' },
              style: { stroke: 'var(--text-muted)', strokeWidth: 1.5 },
              labelStyle: { fill: 'var(--text-primary)', fontWeight: 'bold' },
              labelBgStyle: { fill: 'var(--bg-primary)', fillOpacity: 0.8 },
              labelBgPadding: [4, 2],
              labelBgBorderRadius: 4,
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
                label: symbol,
                markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--text-muted)' },
                style: { stroke: 'var(--text-muted)', strokeWidth: 1.5 },
                labelStyle: { fill: 'var(--text-primary)', fontWeight: 'bold' },
                labelBgStyle: { fill: 'var(--bg-primary)', fillOpacity: 0.8 },
                labelBgPadding: [4, 2],
                labelBgBorderRadius: 4,
              });
            } else {
              const edge = edgeMap.get(key)!;
              const currentLabel = edge.label as string;
              if (!currentLabel.split(', ').includes(symbol)) {
                edge.label = `${currentLabel}, ${symbol}`;
              }
            }
          }
        }
      }
    }

    const initialEdges: Edge[] = Array.from(edgeMap.values());

    // Web Worker Layout Execution
    setIsLayingOut(true);
    
    const worker = new Worker(new URL('../../../engines/parser/layout/worker.ts', import.meta.url), { type: 'module' });
    
    worker.onmessage = (e) => {
      if (e.data.type === 'SUCCESS') {
        const selfLoopsByState = new Map<string, string[]>();
        e.data.edges.forEach((ed: any) => {
           if (ed.classification === 'Self') {
             const original = initialEdges.find(oe => oe.id === ed.id)!;
             if (!selfLoopsByState.has(ed.source)) selfLoopsByState.set(ed.source, []);
             selfLoopsByState.get(ed.source)!.push(original.label as string);
           }
        });

        const layoutedNodes = e.data.nodes.map((n: any) => {
          const original = initialNodes.find(on => on.id === n.id)!;
          return {
            ...original,
            position: { x: n.x, y: n.y },
            style: { opacity: 1 },
            data: { ...original.data, selfLoops: selfLoopsByState.get(original.id) || [] }
          };
        });

        const stubsBySource = new Map<string, number>();
        const layoutedEdges = e.data.edges
          .filter((ed: any) => ed.classification !== 'Self')
          .map((e: any) => {
          const original = initialEdges.find(oe => oe.id === e.id)!;
          const isExtended = e.classification === 'Cross' || e.classification === 'Back';
          const isStub = !showExtended && isExtended;
          let labelOffset = original.data?.labelOffset;
          if (isStub && !labelOffset) {
            const stubIndex = stubsBySource.get(original.source) || 0;
            stubsBySource.set(original.source, stubIndex + 1);
            labelOffset = { x: 16, y: stubIndex * 30 };
          }
          return {
            ...original,
            sourceHandle: isExtended ? 'extended' : undefined,
            type: 'lrEdge',
            label: isStub ? `${original.label} ---> State ${original.target}` : original.label,
            data: { ...original.data, isStub, classification: e.classification, originalLabel: original.label, labelOffset },
            markerEnd: isStub ? undefined : { type: MarkerType.ArrowClosed, color: 'var(--text-muted)' },
            style: { 
              stroke: 'var(--text-muted)', 
              strokeWidth: 1.5,
              strokeDasharray: isExtended ? '5 5' : undefined
            }
          };
        });

        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
        setPastNodes([]);
        setFutureNodes([]);
        if (initialMachineId) {
          setAutomatonState(initialMachineId, {
            algorithm,
            signature: signatureNow,
            nodes: layoutedNodes,
            edges: layoutedEdges,
          });
        }
      } else {
        console.error("Layout worker error:", e.data.error);
        setNodes(initialNodes.map(n => ({ ...n, style: { opacity: 1 } })));
        setEdges(initialEdges);
      }
      setIsLayingOut(false);
      worker.terminate();
    };

    worker.onerror = (error) => {
      console.error("Layout worker failed:", error.message);
      setNodes(initialNodes.map(n => ({ ...n, style: { opacity: 1 } })));
      setEdges(initialEdges);
      setIsLayingOut(false);
      worker.terminate();
    };

    const compact = table.states.length > LR_AUTOMATON_LAYOUT_FULL
    const lod = table.states.length > LR_AUTOMATON_LAYOUT_COMPACT
    const configOverrides: { showExtended: boolean; horizontalSpacing?: number; verticalSpacing?: number } = {
      showExtended: compact ? false : showExtendedRef.current,
    };
    if (lod) {
      configOverrides.horizontalSpacing = 96;
      configOverrides.verticalSpacing = 52;
    } else if (compact) {
      configOverrides.horizontalSpacing = 140;
      configOverrides.verticalSpacing = 72;
    }
    worker.postMessage({
      table,
      configOverrides,
      widthMap,
    });

    return () => worker.terminate();
    // automatonState is read for the cache check but omitted from deps: writing the
    // cache must not start another layout.
  }, [table, algorithm, layoutSeed, itemLimit, setNodes, setEdges, setIsLayingOut, setAutomatonState, initialMachineId]);

  // Sync state to store on unmount
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);

  const signatureRef = useRef(signature);
  const algorithmRef = useRef(algorithm);
  signatureRef.current = signature;
  algorithmRef.current = algorithm;

  const persistArrangement = React.useCallback((nextNodes: Node[], nextEdges: Edge[]) => {
    if (!initialMachineId || !positionsReady(nextNodes) || !signatureRef.current) return;
    setAutomatonState(initialMachineId, {
      algorithm: algorithmRef.current,
      signature: signatureRef.current,
      nodes: nextNodes,
      edges: nextEdges,
    });
  }, [initialMachineId, setAutomatonState]);

  useEffect(() => {
    return () => {
      persistArrangement(nodesRef.current, edgesRef.current);
    };
  }, [persistArrangement]);

  const onConnect = () => {};

  // Dynamic Orthogonal Edge Routing
  useEffect(() => {
    if (nodes.length === 0 || !table) return;

    const layoutNodes = nodes.map(n => ({
      id: n.id,
      x: (n as any).positionAbsolute?.x ?? n.position.x,
      y: (n as any).positionAbsolute?.y ?? n.position.y,
      width: n.measured?.width || 140,
      height: n.measured?.height || (40 + ((n.data as any).items?.length || 1) * 20)
    }));

    setEdges(eds => {
      if (eds.length === 0) return eds;
      
      const edgesToRoute = eds.map(e => ({
         id: e.id,
         source: e.source,
         target: e.target,
         classification: e.data?.classification,
         label: e.data?.originalLabel || e.label
      }));

      const result = globalRouter.route(
        { nodes: layoutNodes as any }, 
        edgesToRoute as any, 
        { ...DEFAULT_LAYOUT_CONFIG, showExtended: routeShowExtended }
      );

      let changed = false;
      const stubsBySource = new Map<string, number>();

      const newEds = eds.map(e => {
         const routed = result.edges.find(re => re.id === e.id);
         if (routed) {
            const originalLabel = (e.data?.originalLabel || e.label) as string;
            const cls = e.data?.classification;
            const isExtended = cls === 'Cross' || cls === 'Back';
            const isStub = !routeShowExtended && isExtended;
            
            let labelOffset = e.data?.labelOffset;
            if (isStub && !labelOffset) {
              const stubIndex = stubsBySource.get(e.source) || 0;
              stubsBySource.set(e.source, stubIndex + 1);
              labelOffset = { x: 16, y: stubIndex * 30 };
            }

            const oldPoly = JSON.stringify(e.data?.polyline);
            const newPoly = JSON.stringify(routed.polyline);

            if (oldPoly !== newPoly || e.data?.isStub !== isStub || e.data?.labelOffset !== labelOffset) {
              changed = true;
              return {
                ...e,
                sourceHandle: isExtended ? 'extended' : undefined,
                label: isStub ? `${originalLabel} ---> State ${e.target}` : originalLabel,
                data: { 
                  ...e.data, 
                  isStub,
                  labelOffset,
                  polyline: (routed as any).polyline, 
                  routedLabelX: (routed as any).labelX, 
                  routedLabelY: (routed as any).labelY 
                },
                markerEnd: isStub ? undefined : { type: MarkerType.ArrowClosed, color: 'var(--text-muted)' },
                style: { 
                  stroke: 'var(--text-muted)', 
                  strokeWidth: 1.5,
                  strokeDasharray: isExtended ? '5 5' : undefined
                }
              };
            }
         }
         return e;
      });
      return changed ? newEds : eds;
    });
  }, [nodes, routeShowExtended, table, globalRouter, setEdges]);

  const extent = useMemo(() => canvasExtent(nodes, edges), [nodes, edges]);
  const [settledBounds, setSettledBounds] = useState(extent);
  const [viewSize, setViewSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setSettledBounds((current) => (
        current.minX === extent.minX && current.minY === extent.minY
          && current.maxX === extent.maxX && current.maxY === extent.maxY
          ? current
          : extent
      ));
    });
    return () => cancelAnimationFrame(frame);
  }, [extent]);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => {
      const width = el.clientWidth;
      const height = el.clientHeight;
      setViewSize((current) => (
        current.width === width && current.height === height ? current : { width, height }
      ));
    };
    const frame = requestAnimationFrame(measure);
    const observer = new ResizeObserver(() => {
      requestAnimationFrame(measure);
    });
    observer.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [table, algorithm]);
  const canvas = useMemo(
    () => placeCanvas(settledBounds, viewSize, zoom),
    [settledBounds, viewSize, zoom],
  );
  const viewport = useMemo(() => ({
    x: zoom * (canvas.width / 2 - canvas.centerX),
    y: zoom * (canvas.height / 2 - canvas.centerY),
    zoom,
  }), [canvas.width, canvas.height, canvas.centerX, canvas.centerY, zoom]);
  const viewportFrame = useRef<{ x: number; y: number } | null>(null);
  const centerScroll = useRef(false);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (centerScroll.current) {
      el.scrollLeft = Math.max(0, (canvas.width * zoom - el.clientWidth) / 2);
      el.scrollTop = Math.max(0, (canvas.height * zoom - el.clientHeight) / 2);
      centerScroll.current = false;
    } else if (viewportFrame.current) {
      el.scrollLeft += viewport.x - viewportFrame.current.x;
      el.scrollTop += viewport.y - viewportFrame.current.y;
    }
    viewportFrame.current = { x: viewport.x, y: viewport.y };
  }, [viewport.x, viewport.y, canvas.width, canvas.height, zoom]);

  const fitToView = () => {
    const el = scrollRef.current;
    if (!el || canvas.neededW <= 0 || canvas.neededH <= 0) return;
    const next = Math.min(el.clientWidth / canvas.neededW, el.clientHeight / canvas.neededH);
    centerScroll.current = true;
    setZoom(clampZoom(next));
  };

  const onCanvasPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('button, a, input, textarea')) return;
    if (!isLocked && target.closest('.react-flow__node')) return;
    const el = scrollRef.current;
    if (!el) return;
    panRef.current = { x: event.clientX, y: event.clientY, left: el.scrollLeft, top: el.scrollTop };
    el.setPointerCapture(event.pointerId);
    el.classList.add('is-panning');
  };

  const onCanvasPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const pan = panRef.current;
    const el = scrollRef.current;
    if (!pan || !el) return;
    const maxLeft = Math.max(0, el.scrollWidth - el.clientWidth);
    const maxTop = Math.max(0, el.scrollHeight - el.clientHeight);
    el.scrollLeft = Math.min(maxLeft, Math.max(0, pan.left - (event.clientX - pan.x)));
    el.scrollTop = Math.min(maxTop, Math.max(0, pan.top - (event.clientY - pan.y)));
  };

  const endCanvasPan = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!panRef.current) return;
    panRef.current = null;
    const el = scrollRef.current;
    if (el?.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId);
    el?.classList.remove('is-panning');
  };

  if (simulation?.presentation?.automatonVisible === false) {
    return (
      <div className="automaton-viewer-pane" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <p>Automaton Viewer is only available for LR parsing algorithms.</p>
          <p style={{ fontSize: '0.85rem' }}>Select LR(0), SLR(1), CLR(1), or LALR(1) from the toolbar.</p>
        </div>
      </div>
    );
  }

  if (table && table.states.length > LR_AUTOMATON_LAYOUT_MAX) {
    return (
      <div className="automaton-viewer-pane" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <p>Automaton is too large to render safely ({table.states.length} states).</p>
        </div>
      </div>
    );
  }

  return (
    <div className="automaton-viewer-pane" style={{ height: '100%', width: '100%', minHeight: 0, background: 'var(--bg-primary)', position: 'absolute', inset: 0 }}>
      {isLayingOut && (
        <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, background: 'var(--bg-secondary)', padding: '4px 12px', borderRadius: '16px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Computing Layout...
        </div>
      )}
      {table && layoutCompact && (
        <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 10, background: 'var(--bg-secondary)', padding: '4px 12px', borderRadius: '16px', fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: 'min(420px, 92%)', textAlign: 'center' }}>
          {layoutLod
            ? `LOD layout (${stateCount} states): shortened item lists and tighter spacing — use the parse table for full items.`
            : `Compact layout (${stateCount} states). Extended back-edges are shortened; use the parse table for full detail.`}
        </div>
      )}

      <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 10, display: 'flex', gap: '8px' }}>
        <button 
          onClick={handleUndo}
          title="Undo Move"
          disabled={pastNodes.length === 0}
          style={{ background: 'var(--bg-secondary)', opacity: pastNodes.length === 0 ? 0.5 : 1, color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', padding: '6px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <Undo2 size={16} />
        </button>
        <button 
          onClick={handleRedo}
          title="Redo Move"
          disabled={futureNodes.length === 0}
          style={{ background: 'var(--bg-secondary)', opacity: futureNodes.length === 0 ? 0.5 : 1, color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', padding: '6px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <Redo2 size={16} />
        </button>
        <button 
          onClick={() => setLayoutSeed(s => s + 1)}
          title="Reset Layout"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', padding: '6px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <RotateCcw size={16} />
        </button>
        <button 
          onClick={() => setShowExtended(!showExtended)}
          title={showExtended ? 'Hide Extended Transitions' : 'Show Extended Transitions'}
          style={{ background: 'var(--bg-secondary)', color: showExtended ? '#3b82f6' : 'var(--text-primary)', border: '1px solid var(--border-subtle)', padding: '6px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          {showExtended ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
      </div>
      <div
        className="parser-graph-scroll"
        ref={scrollRef}
        onPointerDown={onCanvasPointerDown}
        onPointerMove={onCanvasPointerMove}
        onPointerUp={endCanvasPan}
        onPointerCancel={endCanvasPan}
      >
      <div className="parser-graph-canvas" style={{ width: canvas.width * zoom, height: canvas.height * zoom }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        nodesDraggable={!isLocked && simulation?.status !== 'running'}
        selectionOnDrag={false}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        panOnDrag={false}
        panOnScroll={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        viewport={viewport}
        translateExtent={[[-100000, -100000], [100000, 100000]]}
        style={{ width: '100%', height: '100%' }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="var(--border-subtle)" gap={16} />
      </ReactFlow>
      </div>
      </div>
      <div className="parser-graph-controls">
        <button type="button" title="Zoom In" aria-label="Zoom In" onClick={() => setZoom((value) => clampZoom(value * 1.2))}>
          <ZoomIn size={14} />
        </button>
        <button type="button" title="Zoom Out" aria-label="Zoom Out" onClick={() => setZoom((value) => clampZoom(value / 1.2))}>
          <ZoomOut size={14} />
        </button>
        <button type="button" title="Fit View" aria-label="Fit View" onClick={fitToView}>
          <Maximize size={14} />
        </button>
        <button type="button" title={isLocked ? 'Unlock Layout' : 'Lock Layout'} aria-label={isLocked ? 'Unlock Layout' : 'Lock Layout'} onClick={() => setIsLocked((locked) => !locked)}>
          {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
        </button>
      </div>
    </div>
  );
}
