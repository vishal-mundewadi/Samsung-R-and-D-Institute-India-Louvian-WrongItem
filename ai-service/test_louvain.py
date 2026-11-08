import pytest

from louvain_lab.graph import Graph
from louvain_lab.louvain import Louvain
from louvain_lab.improved import (
    ConnectedLouvain,
    MultiStartLouvain,
    count_disconnected,
    split_disconnected,
)
from louvain_lab.generator import make_dispute_graph
from louvain_lab.metrics import nmi, ari


def two_triangles():
    g = Graph()
    for u, v in [(0, 1), (1, 2), (0, 2), (3, 4), (4, 5), (3, 5), (2, 3)]:
        g.add_edge(u, v)
    return g


def test_known_graph_finds_two_groups():
    g = two_triangles()
    part = Louvain(seed=1).fit(g)
    assert part[0] == part[1] == part[2]
    assert part[3] == part[4] == part[5]
    assert part[0] != part[3]
    assert g.modularity(part) == pytest.approx(0.3571, abs=1e-4)


def test_every_node_in_exactly_one_community():
    g, _ = make_dispute_graph(ring_sizes=[10, 8, 6], p_in=0.4, p_out=0.05, seed=3)
    part = Louvain(seed=3).fit(g)
    assert set(part.keys()) == set(g.nodes())


def test_reproducible_with_fixed_seed():
    g, _ = make_dispute_graph(ring_sizes=[10, 8, 6], p_in=0.4, p_out=0.05, seed=5)
    assert Louvain(seed=9).fit(g) == Louvain(seed=9).fit(g)


def test_empty_graph():
    g = Graph()
    assert Louvain().fit(g) == {}
    assert g.modularity({}) == 0.0


def test_single_node():
    g = Graph()
    g.add_node(0)
    assert Louvain().fit(g) == {0: 0}


def test_self_loop_only():
    g = Graph()
    g.add_edge(0, 0, 1.0)
    part = Louvain().fit(g)
    assert part == {0: 0}
    assert g.modularity(part) == pytest.approx(0.0)


def test_disconnected_graph_not_merged():
    g = Graph()
    for u, v in [(0, 1), (1, 2), (0, 2), (3, 4), (4, 5), (3, 5)]:
        g.add_edge(u, v)
    part = ConnectedLouvain(seed=1).fit(g)
    assert part[0] != part[3]
    assert count_disconnected(g, part) == 0


def test_split_disconnected_repairs_bad_partition():
    g = Graph()
    for u, v in [(0, 1), (2, 3)]:
        g.add_edge(u, v)
    bad = {0: 0, 1: 0, 2: 0, 3: 0}  # one community, two components
    assert count_disconnected(g, bad) == 1
    fixed = split_disconnected(g, bad)
    assert fixed[0] == fixed[1]
    assert fixed[2] == fixed[3]
    assert fixed[0] != fixed[2]


def test_modularity_in_valid_range():
    for seed in range(10):
        g, _ = make_dispute_graph(ring_sizes=[8, 6, 5], p_in=0.3, p_out=0.08, seed=seed)
        q = g.modularity(Louvain(seed=seed).fit(g))
        assert -0.5 <= q <= 1.0


def test_multistart_at_least_as_good_as_its_own_first_run():
    g, _ = make_dispute_graph(ring_sizes=[10, 8, 6], p_in=0.3, p_out=0.06, seed=2)
    first = Louvain(seed=4 * 1000).fit(g)
    best = MultiStartLouvain(seed=4, starts=5).fit(g)
    assert g.modularity(best) >= g.modularity(first) - 1e-12


def test_metrics_perfect_and_identical():
    a = {0: 0, 1: 0, 2: 1, 3: 1}
    renamed = {0: 7, 1: 7, 2: 3, 3: 3}
    assert nmi(a, renamed) == pytest.approx(1.0)
    assert ari(a, renamed) == pytest.approx(1.0)