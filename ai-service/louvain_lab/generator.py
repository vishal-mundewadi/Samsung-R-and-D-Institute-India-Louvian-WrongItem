import random

from .graph import Graph


def make_dispute_graph(n_rings=5, ring_size=10, p_in=0.5, p_out=0.02, seed=0):
    """Nodes are sellers/listings. Edge weight = shared disputes.
    Rings are the hidden groups we want Louvain to recover."""
    rng = random.Random(seed)
    g = Graph()
    truth = {}
    n = n_rings * ring_size
    for u in range(n):
        g.add_node(u)
        truth[u] = u // ring_size
    for u in range(n):
        for v in range(u + 1, n):
            p = p_in if truth[u] == truth[v] else p_out
            if rng.random() < p:
                g.add_edge(u, v, rng.randint(1, 5))
    return g, truth