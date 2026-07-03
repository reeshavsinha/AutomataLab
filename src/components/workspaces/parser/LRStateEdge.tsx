// src/components/workspaces/parser/LRStateEdge.tsx

import React, { useEffect, useState, useRef } from 'react';
import { BaseEdge, EdgeProps, getBezierPath } from '@xyflow/react';

export function LRStateEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data
}: EdgeProps) {
  const svgPath = data?.svgPath as string | undefined;

  const [initialCoords, setInitialCoords] = useState<{sx: number, sy: number, tx: number, ty: number} | null>(null);
  const lastSvgPath = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (svgPath !== lastSvgPath.current) {
      setInitialCoords({ sx: sourceX, sy: sourceY, tx: targetX, ty: targetY });
      lastSvgPath.current = svgPath;
    }
  }, [svgPath, sourceX, sourceY, targetX, targetY]);

  const isMoved = initialCoords && (
    Math.abs(sourceX - initialCoords.sx) > 5 || 
    Math.abs(sourceY - initialCoords.sy) > 5 ||
    Math.abs(targetX - initialCoords.tx) > 5 ||
    Math.abs(targetY - initialCoords.ty) > 5
  );

  let path = (svgPath && !isMoved) ? svgPath : undefined;
  let labelX = data?.labelX as number | undefined;
  let labelY = data?.labelY as number | undefined;

  if (!path) {
    if (data?.isStub) {
      // It's a stub, so just render it sticking out of the source
      path = `M ${sourceX},${sourceY} L ${sourceX + 40},${sourceY}`;
      labelX = sourceX + 20;
      labelY = sourceY - 10;
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
  }

  return (
    <>
      <BaseEdge id={id} path={path} style={style} markerEnd={markerEnd} />
      {data?.label && (
        <text
          x={labelX ?? (sourceX + targetX) / 2}
          y={labelY ?? (sourceY + targetY) / 2}
          fill={(style.stroke as string) || '#fff'}
          fontSize={12}
          fontWeight={700}
          textAnchor="middle"
          dominantBaseline="central"
        >
          {data.label as string}
        </text>
      )}
    </>
  );
}
