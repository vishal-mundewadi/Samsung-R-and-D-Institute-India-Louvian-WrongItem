from collections import defaultdict


class Graph:
    """Weighted undirected graph stored as adjacency dicts.

    A self-loop (u, u, w) is stored once in adj[u][u] and counts
    twice toward the degree of u, which is the standard convention
    for Louvain.
    """

    def __init__(self):
        self.adj = defaultdict(dict)

    def add_node(self, u):
        self.adj[u]  # touching the key creates it

    def add_edge(self, u, v, w=1.0):
        self.adj[u][v] = self.adj[u].get(v, 0.0) + w
        if u != v:
            self.adj[v][u] = self.adj[v].get(u, 0.0) + w

    def nodes(self):
        return list(self.adj.keys())

    def degree(self, u):
        d = sum(self.adj[u].values())
        d += self.adj[u].get(u, 0.0)  # self-loop counts twice
        return d

    def total_weight(self):
        """m = sum of all edge weights."""
        return sum(self.degree(u) for u in self.adj) / 2.0

    def modularity(self, partition):
        """partition: dict node -> community id. Returns Q."""
        m2 = 2.0 * self.total_weight()
        if m2 == 0:
            return 0.0
        inside = defaultdict(float)
        total = defaultdict(float)
        for u in self.adj:
            cu = partition[u]
            total[cu] += self.degree(u)
            for v, w in self.adj[u].items():
                if partition[v] == cu:
                    inside[cu] += w
                    if u == v:
                        inside[cu] += w  # self-loop counted twice
        return sum(
            inside[c] / m2 - (total[c] / m2) ** 2 for c in total
        )