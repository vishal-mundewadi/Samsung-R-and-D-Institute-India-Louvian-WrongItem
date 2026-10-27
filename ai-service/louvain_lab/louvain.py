import random

from .graph import Graph


class Louvain:
    """Baseline Louvain: local moving, then aggregation, repeated."""

    def __init__(self, seed=0, min_gain=1e-7, node_order="random"):
        self.seed = seed
        self.min_gain = min_gain
        self.node_order = node_order  # "random" or "degree"
        self.levels = []

    def fit(self, graph):
        rng = random.Random(self.seed)
        node_to_comm = {u: u for u in graph.nodes()}
        current = graph
        self.levels = []
        while True:
            partition, moved = self._local_moving(current, rng)
            if not moved:
                break
            partition = self._renumber(partition)
            node_to_comm = {u: partition[c] for u, c in node_to_comm.items()}
            self.levels.append(dict(node_to_comm))
            current = self._aggregate(current, partition)
        return self._renumber(node_to_comm)

    def _local_moving(self, g, rng):
        nodes = g.nodes()
        m2 = 2.0 * g.total_weight()
        comm = {u: u for u in nodes}
        if m2 == 0:
            return comm, False
        deg = {u: g.degree(u) for u in nodes}
        tot = dict(deg)
        any_move = False
        improved = True
        while improved:
            improved = False
            for u in self._order(nodes, deg, rng):
                cu = comm[u]
                ku = deg[u]
                w_to = {}
                for v, w in g.adj[u].items():
                    if v != u:
                        w_to[comm[v]] = w_to.get(comm[v], 0.0) + w
                tot[cu] -= ku
                best_c = cu
                best_gain = w_to.get(cu, 0.0) - tot[cu] * ku / m2
                for c, w_c in w_to.items():
                    gain = w_c - tot[c] * ku / m2
                    if gain > best_gain + self.min_gain:
                        best_gain = gain
                        best_c = c
                tot[best_c] += ku
                if best_c != cu:
                    comm[u] = best_c
                    improved = True
                    any_move = True
        return comm, any_move

    def _order(self, nodes, deg, rng):
        order = list(nodes)
        if self.node_order == "degree":
            order.sort(key=lambda u: (-deg[u], str(u)))
        else:
            rng.shuffle(order)
        return order

    @staticmethod
    def _renumber(partition):
        ids = {}
        out = {}
        for u, c in partition.items():
            if c not in ids:
                ids[c] = len(ids)
            out[u] = ids[c]
        return out

    @staticmethod
    def _aggregate(g, partition):
        new = Graph()
        for c in set(partition.values()):
            new.add_node(c)
        for u in g.adj:
            cu = partition[u]
            for v, w in g.adj[u].items():
                cv = partition[v]
                if u == v:
                    new.add_edge(cu, cu, w)
                else:
                    new.add_edge(cu, cv, w / 2.0)
        return new