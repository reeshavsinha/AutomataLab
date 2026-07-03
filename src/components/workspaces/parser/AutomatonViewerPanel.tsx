import React, { useEffect, useMemo, useState } from 'react';
import { ReactFlow, Background, MiniMap, Controls, Node, Edge, Position, MarkerType, useNodesState, useEdgesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useParserStore, useActiveSimulationState, useLR0Table, useSLR1Table, useCLR1Table, useLALR1Table } from '@/store/parserStore';
import { formatItem, LR0Table } from '@/engines/parser/lr0';
import { LRStateNode } from './LRStateNode';
import { LRStateEdge } from './LRStateEdge';
import { Undo2, Redo2, RotateCcw, Eye, EyeOff } from 'lucide-react';

const nodeTypes = {
  lrState: LRStateNode
};

const edgeTypes = {
  lrEdge: LRStateEdge
};

export function AutomatonViewerPanel() {
  const { algorithm } = useParserStore();
  const simulation = useActiveSimulationState();
  const lr0Table = useLR0Table();
  const slr1Table = useSLR1Table();
  const clr1Table = useCLR1Table();
  const lalr1Table = useLALR1Table();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isLayingOut, setIsLayingOut] = useState(false);
  const [showExtended, setShowExtended] = useState(true);
  const [layoutSeed, setLayoutSeed] = useState(0);

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

    // Safety guard for massive grammars
    if (table.states.length > 200) {
      console.warn("Automaton is too large to render safely (>200 states).");
      setNodes([]);
      setEdges([]);
      return;
    }

    const initialNodes: Node[] = table.states.map(state => {
      const formattedItems = state.items.map(item => formatItem(item, table.augmentedCfg));
      // Deduplicate formatted items
      const uniqueItems = Array.from(new Set(formattedItems));

      return {
        id: state.id.toString(),
        type: 'lrState',
        position: { x: 0, y: 0 },
        data: { stateId: state.id, items: uniqueItems },
        style: { opacity: 0 } // hide until layout is done
      };
    });

    const initialEdges: Edge[] = [];

    // GOTO Transitions
    for (const [stateId, transitions] of table.gotoTable.entries()) {
      for (const [symbol, targetState] of transitions.entries()) {
        initialEdges.push({
          id: `goto-${stateId}-${symbol}-${targetState}`,
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
      }
    }

    // SHIFT Transitions
    for (const [stateId, symbolActions] of table.actionTable.entries()) {
      for (const [symbol, actions] of symbolActions.entries()) {
        for (const action of actions) {
          if (action.type === 'Shift' && action.target !== undefined) {
            // Check if edge already exists to prevent duplicate lines for same target (though symbols differ)
            // React Flow handles multiple edges between same source/target if IDs differ, but it draws them overlapping.
            // For now, draw one edge per symbol
            initialEdges.push({
              id: `shift-${stateId}-${symbol}-${action.target}`,
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
          }
        }
      }
    }

    // Web Worker Layout Execution
    setIsLayingOut(true);
    
    const worker = new Worker(new URL('../../../engines/parser/layout/worker.ts', import.meta.url), { type: 'module' });
    
    worker.onmessage = (e) => {
      if (e.data.type === 'SUCCESS') {
        const layoutedNodes = e.data.nodes.map((n: any) => {
          const original = initialNodes.find(on => on.id === n.id)!;
          return {
            ...original,
            position: { x: n.x, y: n.y },
            style: { opacity: 1 }
          };
        });

        const layoutedEdges = e.data.edges.map((e: any) => {
          const original = initialEdges.find(oe => oe.id === e.id)!;
          const isExtended = e.classification === 'Cross' || e.classification === 'Back' || e.classification === 'Self';
          return {
            ...original,
            type: 'lrEdge',
            data: { ...original.data, svgPath: e.svgPath, label: e.label, labelX: e.labelX, labelY: e.labelY, isStub: e.isStub },
            markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--text-muted)' },
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

    worker.postMessage({ table, configOverrides: { showExtended } });

    return () => {
      worker.terminate();
    };
  }, [table, showExtended, layoutSeed, setNodes, setEdges]);

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
          style={{ background: showExtended ? 'var(--button-primary)' : 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', padding: '6px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          {showExtended ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStart={onNodeDragStart}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={0.1}
      >
        <Background color="var(--border-subtle)" gap={16} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
