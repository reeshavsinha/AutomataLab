import dagre from 'dagre'
import { MachineDefinition } from '@/engines/core/types'

export function applyAutoLayout(machine: MachineDefinition, direction: 'LR' | 'TB' = 'LR'): MachineDefinition {
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))

  // Configure layout engine
  const nodeWidth = 80
  const nodeHeight = 80
  
  // LR provides nice left-to-right flow typical for automata
  dagreGraph.setGraph({ 
    rankdir: direction,
    nodesep: 60, // Minimum vertical/horizontal space between nodes
    ranksep: 120, // Minimum space between ranks (layers)
  })

  // Add nodes to the graph
  machine.states.forEach((state) => {
    // If it's a text node, use slightly different dimensions or just treat it roughly the same
    dagreGraph.setNode(state.id, { width: nodeWidth, height: nodeHeight })
  })

  // Add edges to the graph
  machine.transitions.forEach((transition) => {
    // Avoid self-loops in layout as they don't affect rank positioning
    if (transition.from !== transition.to) {
      dagreGraph.setEdge(transition.from, transition.to)
    }
  })

  // Calculate layout
  dagre.layout(dagreGraph)

  // Map calculated positions back to the states
  const updatedStates = machine.states.map((state) => {
    const nodeWithPosition = dagreGraph.node(state.id)
    if (!nodeWithPosition) return state
    
    // dagre returns center coordinates, we need top-left coordinates for our states (assuming x/y in state is top-left)
    // Our state render logic effectively uses x/y for the position of the container
    return {
      ...state,
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    }
  })

  return {
    ...machine,
    states: updatedStates,
  }
}
