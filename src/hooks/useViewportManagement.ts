import { useCallback, useEffect, useState } from 'react'
import type { Node, Edge } from '@xyflow/react'
import { useMachineStore } from '@/store/machineStore'
import { useUIStore } from '@/store/uiStore'

export function useViewportManagement(
  reactFlowWrapper: React.RefObject<HTMLDivElement | null>,
  setRfNodes: React.Dispatch<React.SetStateAction<Node[]>>,
  setRfEdges: React.Dispatch<React.SetStateAction<Edge[]>>,
  expandEdgeMembers: (ids: string[]) => string[]
) {
  const [rfInstance, setRfInstance] = useState<any>(null)
  const machine = useMachineStore((s) => s.machine)
  const fitViewNonce = useUIStore((s) => s.fitViewNonce)
  const focusRequest = useUIStore((s) => s.focusRequest)
  const { setSelectedStateIds, setSelectedTransitionIds } = useUIStore()

  const fitToContent = useCallback(
    (duration = 400) => {
      if (!rfInstance) return
      const rfNodesNow = rfInstance.getNodes()
      if (rfNodesNow.length === 0) return

      const nb = rfInstance.getNodesBounds(rfNodesNow)
      let minX = nb.x
      let minY = nb.y
      let maxX = nb.x + nb.width
      let maxY = nb.y + nb.height

      const wrap = reactFlowWrapper.current
      if (wrap) {
        const paths = wrap.querySelectorAll<SVGPathElement>('.react-flow__edge-path')
        paths.forEach((p) => {
          let bb: { x: number; y: number; width: number; height: number } | null = null
          try {
            bb = p.getBBox()
          } catch {
            bb = null
          }
          if (!bb || (bb.width === 0 && bb.height === 0)) return
          minX = Math.min(minX, bb.x)
          minY = Math.min(minY, bb.y)
          maxX = Math.max(maxX, bb.x + bb.width)
          maxY = Math.max(maxY, bb.y + bb.height)
        })
      }

      rfInstance.fitBounds(
        { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
        { padding: 0.18, duration }
      )
    },
    [rfInstance, reactFlowWrapper]
  )

  useEffect(() => {
    if (fitViewNonce === 0 || !rfInstance) return
    const handle = setTimeout(() => fitToContent(400), 80)
    return () => clearTimeout(handle)
  }, [fitViewNonce, rfInstance, fitToContent])

  useEffect(() => {
    if (!focusRequest || !rfInstance) return
    const { kind, id } = focusRequest
    const { zoom } = rfInstance.getViewport()
    const targetZoom = Math.max(zoom, 0.9)
    if (kind === 'state') {
      const s = machine.states.find((st) => st.id === id)
      if (!s) return
      rfInstance.setCenter(s.x + 26, s.y + 26, { zoom: targetZoom, duration: 400 })
      setSelectedStateIds([id])
      setSelectedTransitionIds([])
      setRfNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === id })))
      setRfEdges((eds) => eds.map((e) => ({ ...e, selected: false })))
    } else {
      const t = machine.transitions.find((tr) => tr.id === id)
      if (!t) return
      const from = machine.states.find((st) => st.id === t.from)
      const to = machine.states.find((st) => st.id === t.to)
      if (!from || !to) return
      rfInstance.setCenter((from.x + to.x) / 2 + 26, (from.y + to.y) / 2 + 26, { zoom: targetZoom, duration: 400 })
      setSelectedStateIds([])
      setSelectedTransitionIds(expandEdgeMembers([id]))
      setRfNodes((nds) => nds.map((n) => ({ ...n, selected: false })))
      setRfEdges((eds) => eds.map((e) => {
        const mem = (e.data as { memberTransitionIds?: string[] })?.memberTransitionIds
        return { ...e, selected: mem ? mem.includes(id) : e.id === id }
      }))
    }
  }, [focusRequest?.nonce, rfInstance, machine, expandEdgeMembers, setRfNodes, setRfEdges, setSelectedStateIds, setSelectedTransitionIds, fitToContent])

  return {
    rfInstance,
    setRfInstance,
    fitToContent,
  }
}
