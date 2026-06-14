// ============================================================
// AutomataLab — Computation Tree
// Builds the nondeterministic computation tree consumed by the
// Computation Tree Viewer (NFA / ε-NFA / NPDA).
//
// The raw material is a FLAT list of per-branch Configurations
// carrying lineage (`id` + `parentId`), accumulated by an engine
// across a whole run. This module nests them into a tree and
// derives a display status per node. It is pure (no React/UI) and
// engine-agnostic, so it can be unit-tested in isolation (NFR-15/18).
// ============================================================

import type { Automaton, Configuration } from './types'

/**
 * Per-node colour bucket for the viewer:
 *  - `accepted`  🟢 an accepting halt (accept state, input consumed)
 *  - `rejected`  🔴 a dead leaf (no children, not accepting, not live)
 *  - `running`   🟡 a live frontier branch (only while the sim is running)
 *  - `internal`  ⚪ an interior node that has already been expanded
 */
export type TreeNodeStatus = 'accepted' | 'rejected' | 'running' | 'internal'

/**
 * Cap on the number of branch nodes an engine records for the computation tree.
 * Wide/long nondeterministic runs can otherwise accumulate hundreds of thousands
 * of nodes — unbounded memory plus an O(nodes) rebuild on every step. Once the
 * cap is hit the engine stops recording tree nodes; the simulation itself keeps
 * advancing on its full frontier (correctness is unaffected), only the visualised
 * tree stops growing.
 */
export const MAX_TREE_NODES = 20_000

export interface ComputationTreeNode {
  config: Configuration
  children: ComputationTreeNode[]
  /** Distance from the root (root = 0). */
  depth: number
  status: TreeNodeStatus
}

export interface ComputationTree {
  roots: ComputationTreeNode[]
  /** Total branch nodes explored. */
  totalNodes: number
  /** Deepest level reached (root = 0). */
  maxDepth: number
  /** Number of accepting branches found. */
  acceptingCount: number
  /** Number of currently-live (frontier) branches. */
  liveCount: number
}

/**
 * Capability implemented by engines that can produce a computation tree
 * (the nondeterministic engines: NFA, ε-NFA, NPDA). Kept separate from the
 * base `Automaton` contract so deterministic engines stay untouched.
 */
export interface TreeProvider {
  /**
   * Every branch configuration explored so far, in creation order. Each node
   * carries `id` + `parentId` lineage; accepting branches report
   * `status === 'accepted'` so the builder can colour them.
   */
  getTreeNodes(): Configuration[]
  /** Ids of the currently-live frontier branches (empty once the run ends). */
  getLiveBranchIds(): string[]
}

/** Runtime guard: does this engine expose a computation tree? */
export function supportsTree(engine: Automaton): engine is Automaton & TreeProvider {
  const candidate = engine as Partial<TreeProvider>
  return (
    typeof candidate.getTreeNodes === 'function' &&
    typeof candidate.getLiveBranchIds === 'function'
  )
}

/**
 * Nest a flat list of lineage-carrying configurations into a tree and assign
 * each node a display status. Children keep their creation order. Iterative
 * traversal (no recursion) so deep trees can't overflow the call stack.
 */
export function buildComputationTree(
  nodes: Configuration[],
  liveIds: Set<string> = new Set()
): ComputationTree {
  const nodeMap = new Map<string, ComputationTreeNode>()
  for (const config of nodes) {
    if (!nodeMap.has(config.id)) {
      nodeMap.set(config.id, { config, children: [], depth: 0, status: 'internal' })
    }
  }

  const roots: ComputationTreeNode[] = []
  for (const config of nodes) {
    const node = nodeMap.get(config.id)!
    const parent = config.parentId !== null ? nodeMap.get(config.parentId) : undefined
    if (parent) {
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  }

  let maxDepth = 0
  let acceptingCount = 0
  let liveCount = 0
  const visited = new Set<string>()
  const stack: { node: ComputationTreeNode; depth: number }[] = roots.map((node) => ({ node, depth: 0 }))

  while (stack.length > 0) {
    const { node, depth } = stack.pop()!
    if (visited.has(node.config.id)) continue // defensive: should never cycle
    visited.add(node.config.id)

    node.depth = depth
    if (depth > maxDepth) maxDepth = depth

    if (node.config.status === 'accepted') {
      node.status = 'accepted'
      acceptingCount++
    } else if (node.children.length > 0) {
      node.status = 'internal'
    } else if (liveIds.has(node.config.id)) {
      node.status = 'running'
      liveCount++
    } else {
      node.status = 'rejected'
    }

    for (const child of node.children) {
      stack.push({ node: child, depth: depth + 1 })
    }
  }

  return { roots, totalNodes: nodeMap.size, maxDepth, acceptingCount, liveCount }
}
