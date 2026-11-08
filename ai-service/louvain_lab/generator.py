import random

from .graph import Graph


def make_dispute_graph(n_rings=5, ring_size=10, p_in=0.5, p_out=0.02,
                       seed=0, ring_sizes=None):
    rng = random.Random(seed)
    sizes = ring_sizes if ring_sizes else [ring_size] * n_rings
    g = Graph()
    truth = {}
    u = 0
    for ring, size in enumerate(sizes):
        for _ in range(size):
            truth[u] = ring
            g.add_node(u)
            u += 1
    n = u
    for a in range(n):
        for b in range(a + 1, n):
            p = p_in if truth[a] == truth[b] else p_out
            if rng.random() < p:
                g.add_edge(a, b, rng.randint(1, 5))
    return g, truth