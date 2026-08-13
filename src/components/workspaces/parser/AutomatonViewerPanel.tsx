import React, { useEffect, useMemo, useState, useRef } from 'react';
import { ReactFlow, Background, MiniMap, Controls, ControlButton, Node, Edge, Position, MarkerType, useNodesState, useEdgesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useParserStore, useActiveSimulationState, useLR0Table, useSLR1Table, useCLR1Table, useLALR1Table } from '@/store/parserStore';
import { useMachineStore } from '@/store/machineStore';
import { useGrammarStore } from '@/store/grammarStore';
import { formatItem, LR0Table } from '@/engines/parser/lr0';
import { LRStateNode } from './LRStateNode';
import { LRStateEdge } from './LRStateEdge';
import { GlobalRoutingEngine } from '@/engines/parser/layout/GlobalRoutingEngine';
import { DEFAULT_LAYOUT_CONFIG } from '@/engines/parser/layout/types';
import { Undo2, Redo2, RotateCcw, Eye, EyeOff, Lock, Unlock } from 'lucide-react';

const nodeTypes = {
  lrState: LRStateNode
};

const edgeTypes = {
  lrEdge: LRStateEdge
};

export function AutomatonViewerPanel() {
  const { algorithm } = useParserStore();
  const machine = useMachineStore(s => s.machine);
  
  const initialMachineId = useRef(machine?.id).current;
  
  const setAutomatonState = React.useCallback((machineId: string, state: { algorithm: string, nodes: any[], edges: any[] }) => {
    useMachineStore.setState(s => {
      const tabs = [...s.tabs];
      const index = tabs.findIndex(t => t.id === machineId);
      if (index === -1) return s;
      tabs[index] = { ...tabs[index], parserLayoutCache: state };
      return { tabs, machine: s.machine?.id === machineId ? tabs[index] : s.machine, dirtyTabs: { ...s.dirtyTabs, [machineId]: true } };
    });
  }, []);

  const automatonState = machine?.parserLayoutCache;
  const simulation = useActiveSimulationState();
  const lr0Table = useLR0Table();
  const slr1Table = useSLR1Table();
  const clr1Table = useCLR1Table();
  const lalr1Table = useLALR1Table();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(automatonState?.algorithm === algorithm ? automatonState.nodes : []);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(automatonState?.algorithm === algorithm ? automatonState.edges : []);
  const [isLayingOut, setIsLayingOut] = useState(false);
  const [showExtended, setShowExtended] = useState(false);
  const [layoutSeed, setLayoutSeed] = useState(0);
  const [isLocked, setIsLocked] = useState(true);

  const globalRouter = useMemo(() => new GlobalRoutingEngine(), []);

  const [pastNodes, setPastNodes] = useState<Node[][]>([]);
  const [futureNodes, setFutureNodes] = useState<Node[][]>([]);

  const handleUndo = () => {
    if (pastNodes.length === 0) return;
    const previous = pastNodes[pastNodes.length - 1];
    setPastNodes(p => p.slice(0, -1));
    setFutureNodes(f => [nodes, ...f]);
    setNodes(previous);
  };

  const handleRedo = () => {
    if (futureNodes.length === 0) return;
    const next = futureNodes[0];
    setFutureNodes(f => f.slice(1));
    setPastNodes(p => [...p, nodes]);
    setNodes(next);
  };

  const onNodeDragStart = () => {
    setPastNodes(p => [...p, nodes]);
    setFutureNodes([]);
  };

  const table: LR0Table | null = useMemo(() => {
    if (algorithm === 'LR0') return lr0Table;
    if (algorithm === 'SLR1') return slr1Table;
    if (algorithm === 'CLR1') return clr1Table;
    if (algorithm === 'LALR1') return lalr1Table;
    return null;
  }, [algorithm, lr0Table, slr1Table, clr1Table, lalr1Table]);

  useEffect(() => {
    if (!table || table.states.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    if (automatonState && automatonState.algorithm === algorithm && automatonState.nodes.length > 0) {
      return; // Already have cached layout for this active model and algorithm
    }

    // Safety guard for massive grammars
    if (table.states.length > 200) {
      console.warn("Automaton is too large to render safely (>200 states).");
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
        data: { stateId: state.id, items: uniqueItems },
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
            labelOffset = { x: 30, y: stubIndex * 30 };
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
      } else {
        console.error("Layout worker error:", e.data.error);
        setNodes(initialNodes.map(n => ({ ...n, style: { opacity: 1 } })));
        setEdges(initialEdges);
      }
      setIsLayingOut(false);
      worker.terminate();
    };

    worker.postMessage({ table, configOverrides: { showExtended }, widthMap });

    return () => worker.terminate();
  }, [table, algorithm, showExtended, layoutSeed, automatonState, setNodes, setEdges, setIsLayingOut]);

  // Sync state to store on unmount
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);

  useEffect(() => {
    return () => {
      if (initialMachineId) {
        setAutomatonState(initialMachineId, { algorithm, nodes: nodesRef.current, edges: edgesRef.current });
      }
    };
  }, [setAutomatonState, initialMachineId]);

  const onConnect = () => {};

  // Dynamic Orthogonal Edge Routing
  useEffect(() => {
    if (nodes.length === 0 || !table) return;

    const layoutNodes = nodes.map(n => ({
      id: n.id,
      x: (n as any).positionAbsolute?.x || n.position.x,
      y: (n as any).positionAbsolute?.y || n.position.y,
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
        { ...DEFAULT_LAYOUT_CONFIG, showExtended }
      );

      let changed = false;
      const stubsBySource = new Map<string, number>();

      const newEds = eds.map(e => {
         const routed = result.edges.find(re => re.id === e.id);
         if (routed) {
            const originalLabel = (e.data?.originalLabel || e.label) as string;
            const cls = e.data?.classification;
            const isExtended = cls === 'Cross' || cls === 'Back';
            const isStub = !showExtended && isExtended;
            
            let labelOffset = e.data?.labelOffset;
            if (isStub && !labelOffset) {
              const stubIndex = stubsBySource.get(e.source) || 0;
              stubsBySource.set(e.source, stubIndex + 1);
              labelOffset = { x: 30, y: stubIndex * 30 };
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
  }, [nodes, showExtended, table, globalRouter, setEdges]);

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

  if (table && table.states.length > 200) {
    return (
      <div className="automaton-viewer-pane" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <p>Automaton is too large to render safely ({table.states.length} states).</p>
        </div>
      </div>
    );
  }

  return (
    <div className="automaton-viewer-pane" style={{ height: '100%', width: '100%', background: 'var(--bg-primary)', position: 'relative' }}>
      {isLayingOut && (
        <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, background: 'var(--bg-secondary)', padding: '4px 12px', borderRadius: '16px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Computing Layout...
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
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStart={onNodeDragStart}
        nodesDraggable={!isLocked && simulation?.status !== 'running'}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={0.1}
        translateExtent={[[-10000, -10000], [10000, 10000]]}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="var(--border-subtle)" gap={16} />
        <Controls showInteractive={false}>
          <ControlButton
            onClick={() => setIsLocked(!isLocked)}
            title={isLocked ? 'Unlock Layout' : 'Lock Layout'}
          >
            {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
          </ControlButton>
        </Controls>
      </ReactFlow>
    </div>
  );
}
