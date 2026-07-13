// src/components/workspaces/parser/LRStateEdge.tsx

import React, { useState } from 'react';
import { BaseEdge, EdgeProps, getBezierPath, EdgeLabelRenderer, useReactFlow } from '@xyflow/react';

function getRoundedPath(points: {x: number, y: number}[], radius: number = 8): string {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;
  if (points.length === 2) return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`;

  let d = `M ${points[0].x},${points[0].y}`;
  
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    const dxPrev = curr.x - prev.x;
    const dyPrev = curr.y - prev.y;
    const distPrev = Math.sqrt(dxPrev * dxPrev + dyPrev * dyPrev);
    
    const dxNext = next.x - curr.x;
    const dyNext = next.y - curr.y;
    const distNext = Math.sqrt(dxNext * dxNext + dyNext * dyNext);

    const r = Math.min(radius, distPrev / 2, distNext / 2);

    if (r <= 0.1) {
      d += ` L ${curr.x},${curr.y}`;
      continue;
    }

    const startX = curr.x - (dxPrev / distPrev) * r;
    const startY = curr.y - (dyPrev / distPrev) * r;
    const endX = curr.x + (dxNext / distNext) * r;
    const endY = curr.y + (dyNext / distNext) * r;

    d += ` L ${startX},${startY} Q ${curr.x},${curr.y} ${endX},${endY}`;
  }

  d += ` L ${points[points.length - 1].x},${points[points.length - 1].y}`;
  return d;
}

export function LRStateEdge({
  id,
  source,
  sourceX,
  sourceY,
  target,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  label
}: EdgeProps) {
  let path = '';
  let labelX = 0;
  let labelY = 0;

  const { setEdges, getZoom } = useReactFlow();
  const [isDragging, setIsDragging] = useState(false);

  if (data?.isStub) {
    const offset = (data.labelOffset as { x: number, y: number } | undefined) ?? { x: 30, y: 0 };
    labelX = sourceX + offset.x;
    labelY = sourceY + offset.y;
    path = `M ${sourceX},${sourceY} L ${labelX},${labelY}`;
  } else if (data?.polyline && Array.isArray(data.polyline)) {
    const pts = data.polyline;
    path = getRoundedPath(pts, 12);
    labelX = (data.routedLabelX as number) || pts[0].x;
    labelY = (data.routedLabelY as number) || pts[0].y;
  } else {
    const [curvePath, cLabelX, cLabelY] = getBezierPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition
    });
    path = curvePath;
    labelX = cLabelX;
    labelY = cLabelY;
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (!data?.isStub) return;
    e.stopPropagation();
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (isDragging && data?.isStub) {
      setEdges((eds) => eds.map(edge => {
        if (edge.id === id) {
          const currentOffset = (edge.data?.labelOffset as { x: number, y: number } | undefined) ?? { x: 30, y: 0 };
          return {
            ...edge,
            data: {
              ...edge.data,
              labelOffset: {
                x: currentOffset.x + e.movementX / getZoom(),
                y: currentOffset.y + e.movementY / getZoom()
              }
            }
          };
        }
        return edge;
      }));
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <>
      <BaseEdge id={id} path={path} style={style} markerEnd={markerEnd} />
      {label && (
        <EdgeLabelRenderer>
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              background: 'var(--bg-primary)',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: 12,
              fontWeight: 700,
              color: style.stroke as string || 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
              pointerEvents: 'all',
              cursor: data?.isStub ? (isDragging ? 'grabbing' : 'grab') : 'default',
              userSelect: 'none',
              boxShadow: isDragging ? '0 4px 6px rgba(0,0,0,0.1)' : 'none',
            }}
            className="nodrag nopan"
          >
            {label as string}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
