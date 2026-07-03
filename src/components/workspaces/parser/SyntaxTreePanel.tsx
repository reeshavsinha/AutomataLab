import React, { useEffect } from 'react';
import { ReactFlow, Background, MiniMap, Controls, Node, Edge, useNodesState, useEdgesState, Position, MarkerType, ReactFlowInstance } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useParserStore, useActiveSimulationState } from '@/store/parserStore';
import { SyntaxTreeNode } from '@/engines/parser/model';
import { EPSILON } from '@/engines/grammar/types';
import ELK from 'elkjs/lib/elk.bundled.js';

const elk = new ELK();

const getLayoutedElements = async (nodes: Node[], edges: Edge[]): Promise<{ nodes: Node[], edges: Edge[] }> => {
  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'mrtree',
      'elk.direction': 'DOWN',
      'elk.spacing.nodeNode': '30',
      'elk.layered.spacing.nodeNodeBetweenLayers': '50',
    },
    children: nodes.map(n => ({ id: n.id, width: Number(n.style?.width) || 56, height: 36 })),
    edges: edges.map(e => ({ id: e.id, sources: [e.source], targets: [e.target] }))
  };

  try {
    const layoutedGraph = await elk.layout(graph);
    const layoutedNodes = nodes.map(node => {
      const elNode = layoutedGraph.children?.find(n => n.id === node.id);
      return {
        ...node,
        position: { x: elNode?.x || 0, y: elNode?.y || 0 }
      };
    });
    return { nodes: layoutedNodes, edges };
  } catch (e) {
    console.error('ELK layout error', e);
    return { nodes, edges };
  }
};

const buildElements = (tree: SyntaxTreeNode | null, stackRoots: SyntaxTreeNode[] = []) => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  let virtualRoot: SyntaxTreeNode | null = tree;

  // Progressive LR building: if no tree but we have floating stack roots, group them
  if (!virtualRoot && stackRoots.length > 0) {
    virtualRoot = {
      id: 'virtual_stack_root',
      symbol: 'NULL',
      children: stackRoots
    };
  }

  if (!virtualRoot) return { nodes, edges };

  const traverse = (node: SyntaxTreeNode) => {
    const isLeaf = !node.children || node.children.length === 0;
    const isEpsilon = node.symbol === EPSILON;
    const isMatched = node.isMatched;
    const isVirtual = node.id === 'virtual_stack_root';

    let bgColor = 'var(--bg-primary)';
    let borderColor = 'var(--border-default)';
    let color = 'var(--text-primary)';
    let width = 56;

    if (isVirtual) {
      bgColor = 'transparent';
      borderColor = 'transparent';
      color = 'var(--text-muted)';
      width = 40;
    } else if (isMatched) {
      bgColor = 'var(--status-accept-soft)';
      borderColor = 'var(--status-accept)';
      color = 'var(--status-accept)';
    } else if (isEpsilon) {
      bgColor = 'var(--bg-secondary)';
      borderColor = 'var(--border-subtle)';
      color = 'var(--text-muted)';
    } else if (!isLeaf) {
      bgColor = 'var(--trace-ring)';
      borderColor = 'var(--trace)';
      color = 'var(--trace)';
    }

    nodes.push({
      id: node.id,
      position: { x: 0, y: 0 },
      data: { label: node.symbol },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      style: {
        background: bgColor,
        color,
        border: isVirtual ? 'none' : `1px solid ${borderColor}`,
        borderRadius: '6px',
        fontWeight: 600,
        padding: '6px 10px',
        width,
        textAlign: 'center',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.8rem',
        boxShadow: isVirtual ? 'none' : '0 2px 4px rgba(0,0,0,0.05)'
      }
    });

    if (node.children) {
      node.children.forEach(child => {
        edges.push({
          id: `e-${node.id}-${child.id}`,
          source: node.id,
          target: child.id,
          type: 'straight',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 12,
            height: 12,
            color: isVirtual ? 'transparent' : 'var(--border-strong)'
          },
          style: { 
            stroke: isVirtual ? 'transparent' : 'var(--border-strong)', 
            strokeWidth: 1.5 
          }
        });
        traverse(child);
      });
    }
  };

  traverse(virtualRoot);
  return { nodes, edges };
};

export function SyntaxTreePanel() {
  const { currentStep, isPlaying, playSpeed } = useParserStore();
  const simulation = useActiveSimulationState();
  const treeSnapshot = simulation?.tree ?? null;
  const [rfInstance, setRfInstance] = React.useState<ReactFlowInstance | null>(null);
  
  // Extract floating roots from stack for LR bottom-up progressive rendering
  const stackRoots = !treeSnapshot && simulation && 'stack' in simulation 
    ? (simulation.stack as any[]).filter(item => typeof item === 'object' && item !== null && 'id' in item) as SyntaxTreeNode[]
    : [];

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    const { nodes: initialNodes, edges: initialEdges } = buildElements(treeSnapshot, stackRoots);
    if (initialNodes.length > 0) {
      getLayoutedElements(initialNodes, initialEdges).then(({ nodes: ln, edges: le }) => {
        setNodes(ln);
        setEdges(le);
      });
    } else {
      setNodes([]);
      setEdges([]);
    }
  }, [treeSnapshot, stackRoots.length, currentStep]); // Also update on step change for progressive rendering

  useEffect(() => {
    if (rfInstance && isPlaying) {
      const duration = 1000 / playSpeed;
      const timeout = setTimeout(() => {
        rfInstance.fitView({ padding: 0.15, duration: Math.min(duration, 500) });
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [nodes, edges, rfInstance, isPlaying, playSpeed]);

  return (
    <div style={{
      height: '100%',
      width: '100%',
      background: 'var(--bg-primary)',
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0
    }}>
      {nodes.length > 0 ? (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onInit={setRfInstance}
          fitView
          minZoom={0.2}
          maxZoom={4}
          nodesDraggable={true}
          translateExtent={[[-2000, -2000], [4000, 4000]]}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            color="var(--border-subtle)"
            gap={20}
            size={1}
            style={{ opacity: 0.6 }}
          />
          <MiniMap
            nodeColor={(node) => (node.style?.background as string) || 'var(--bg-primary)'}
            maskColor="var(--bg-primary)"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '4px'
            }}
          />
          <Controls
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}
          />
        </ReactFlow>
      ) : (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8rem'
        }}>
          Run the parser to visualize the syntax tree
        </div>
      )}
    </div>
  );
}
