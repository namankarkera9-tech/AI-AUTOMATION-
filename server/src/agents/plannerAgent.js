/**
 * Planner Agent
 * Pure agent: Analyzes workflow topology, determines optimal node execution sequence,
 * computes dependency graph, and emits a confidence score.
 */
class PlannerAgent {
  plan(workflow, input = {}) {
    const nodes = workflow.nodes || [];
    const edges = workflow.edges || [];

    if (nodes.length === 0) {
      return {
        sequence: [],
        confidence: 0,
        explanation: 'Workflow contains no executable nodes.',
      };
    }

    // Map dependencies: target -> [sources]
    const inDegree = new Map();
    const adjList = new Map();

    for (const node of nodes) {
      inDegree.set(node.id, 0);
      adjList.set(node.id, []);
    }

    for (const edge of edges) {
      if (adjList.has(edge.source) && inDegree.has(edge.target)) {
        adjList.get(edge.source).push(edge.target);
        inDegree.set(edge.target, inDegree.get(edge.target) + 1);
      }
    }

    // Topological Sort (Kahn's Algorithm)
    const queue = [];
    for (const [nodeId, deg] of inDegree.entries()) {
      if (deg === 0) {
        queue.push(nodeId);
      }
    }

    const sequence = [];
    while (queue.length > 0) {
      const current = queue.shift();
      sequence.push(current);

      const neighbors = adjList.get(current) || [];
      for (const neighbor of neighbors) {
        inDegree.set(neighbor, inDegree.get(neighbor) - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      }
    }

    // If cycle exists, append any unvisited nodes
    for (const node of nodes) {
      if (!sequence.includes(node.id)) {
        sequence.push(node.id);
      }
    }

    // Confidence scoring based on structural completeness
    const hasTrigger = nodes.some(
      (n) => n.data?.category === 'trigger' || n.data?.nodeType === 'trigger'
    );
    const hasDisconnectedNodes = sequence.length !== nodes.length;
    let confidence = 0.98;
    if (!hasTrigger) confidence -= 0.1;
    if (hasDisconnectedNodes) confidence -= 0.15;
    if (edges.length === 0 && nodes.length > 1) confidence -= 0.2;

    confidence = Math.max(0.5, Math.min(1.0, confidence));

    return {
      sequence,
      totalNodes: nodes.length,
      confidence: parseFloat(confidence.toFixed(2)),
      explanation: `Topological planning resolved ${sequence.length} steps with confidence score ${confidence * 100}%.`,
      plannedAt: new Date().toISOString(),
    };
  }
}

module.exports = new PlannerAgent();
