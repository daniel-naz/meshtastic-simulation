import { RadioNode } from "./node.js";

/**
 * Find all transmitters that can reach a node within a given number of hops.
 * @param {RadioNode} dest - The destination node.
 * @param {RadioNode[]} nodes - All nodes in the network.
 * @param {number} depth - Maximum number of hops (default: 10).
 * @returns {Set<RadioNode>} - Set of transmitters that can reach `dest`.
 */
function findTransmitters(dest, nodes, depth = 10) {
    const visited = new Set();
    const queue = [[dest, 0]];

    while (queue.length > 0) {
        const [current, hops] = queue.shift();
        if (hops >= depth) continue;

        for (const node of nodes) {
            if (node.canTransmit(current) && !visited.has(node)) {
                visited.add(node);
                queue.push([node, hops + 1]);
            }
        }
    }

    // Remove the destination node if it was added
    visited.delete(dest);
    return visited;
}

/**
 * Find all receivers that can get data from a node within a given number of hops.
 * @param {RadioNode} src - The source node.
 * @param {RadioNode[]} nodes - All nodes in the network.
 * @param {number} depth - Maximum number of hops (default: 10).
 * @returns {Set<RadioNode>} - Set of reachable nodes.
 */
function findReceiver(src, nodes, depth = 10) {
    const visited = new Set();
    const queue = [[src, 0]];

    while (queue.length > 0) {
        const [current, hops] = queue.shift();
        if (hops >= depth) continue;

        for (const neighbor of nodes) {
            if (current.canTransmit(neighbor) && !visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push([neighbor, hops + 1]);
            }
        }
    }

    // Remove the source node if it was added
    visited.delete(src);
    return visited;
}

/**
 * Find all nodes that are strongly connected to a node within a given number of hops.
 * I.e., they can both transmit to and receive from the node.
 * @param {RadioNode} node
 * @param {RadioNode[]} nodes 
 * @param {number} depth
 * @returns {Set<RadioNode>}
 */
function findStrongConnections(node, nodes, maxDepth = 10) {
    const visited = new Set();

    function explore(n, depthLeft) {
        if (depthLeft < 0) return;

        visited.add(n);

        const receivers = findReceiver(n, nodes, 1);
        const transmitters = findTransmitters(n, nodes, 1);

        const connected = new Set([...receivers, ...transmitters]);

        for (const neighbor of connected) {
            explore(neighbor, depthLeft - 1); // Decrease global hop budget
        }
    }

    explore(node, maxDepth);

    visited.delete(node); // optional: exclude starting node
    return visited;
}

export default {
    findTransmitters,
    findReceiver,
    findStrongConnections,
}