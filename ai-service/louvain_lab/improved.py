from collections import deque

from .louvain import Louvain


def split_disconnected(graph, partition):
    """Split every community into its connected components."""
    new = {}
    seen = set()
    next_id = 0
    for start in graph.nodes():
        if start in seen:
            continue
        c = partition[start]
        comp = next_id
        next_id += 1
        seen.add(start)
        new[start] = comp
        queue = deque([start])
        while queue:
            u = queue.popleft()
            for v in graph.adj[u]:
                if v not in seen and partition[v] == c:
                    seen.add(v)
                    new[v] = comp
                    queue.append(v)
    return new


def count_disconnected(graph, partition):
    """How many extra pieces appear when communities are split."""
    split = split_disconnected(graph, partition)
    return len(set(split.values())) - len(set(partition.values()))


class ConnectedLouvain(Louvain):
    """Louvain plus a connectivity repair step."""

    def fit(self, graph):
        part = super().fit(graph)
        return split_disconnected(graph, part)
    


class MultiStartLouvain:
    """Run Louvain several times, keep the best-modularity result."""

    def __init__(self, seed=0, starts=10):
        self.seed = seed
        self.starts = starts

    def fit(self, graph):
        best, best_q = None, float("-inf")
        for k in range(self.starts):
            part = Louvain(seed=self.seed * 1000 + k).fit(graph)
            q = graph.modularity(part)
            if q > best_q:
                best, best_q = part, q
        return best