import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force'
import { MachineDefinition } from '@/engines/core/types'

export function applyAutoLayout(machine: MachineDefinition): MachineDefinition {
  // Create nodes for the simulation
  const nodes = machine.states.map((state) => ({
    id: state.id,
    // Use current positions as a starting point if they aren't stacked at 0,0,
    // otherwise give them a random starting jitter so they explode outwards nicely
    x: state.x === 0 ? Math.random() * 10 : state.x,
    y: state.y === 0 ? Math.random() * 10 : state.y,
    stateData: state
  }))

  // Create links for the simulation (ignoring self-loops)
  const links = machine.transitions
    .filter((t) => t.from !== t.to)
    .map((t) => ({
      source: t.from,
      target: t.to
    }))

  // Setup the physics simulation
  const simulation = forceSimulation(nodes as any)
    .force('link', forceLink(links).id((d: any) => d.id).distance(150))
    .force('charge', forceManyBody().strength(-1000)) // Strong repel to push states apart
    .force('center', forceCenter(400, 300)) // Center it roughly in the canvas
    .force('collide', forceCollide().radius(60)) // Prevent nodes from intersecting
    .stop() // We stop it so we can run it synchronously

  // Fast-forward the simulation 300 ticks to calculate the final layout instantly
  for (let i = 0; i < 300; ++i) {
    simulation.tick()
  }

  // Map the new calculated coordinates back to our state objects
  const updatedStates = nodes.map((node: any) => {
    // node.x and node.y are center coordinates. 
    // We adjust them slightly since our node components are drawn with top-left origins (width ~80)
    return {
      ...node.stateData,
      x: node.x - 40,
      y: node.y - 40
    }
  })

  return {
    ...machine,
    states: updatedStates
  }
}
