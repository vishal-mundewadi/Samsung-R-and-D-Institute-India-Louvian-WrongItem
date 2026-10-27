import math
from collections import Counter


def _counts(a, b):
    nodes = list(a.keys())
    n = len(nodes)
    ca = Counter(a[u] for u in nodes)
    cb = Counter(b[u] for u in nodes)
    joint = Counter((a[u], b[u]) for u in nodes)
    return n, ca, cb, joint


def nmi(a, b):
    n, ca, cb, joint = _counts(a, b)
    if n == 0:
        return 1.0
    mi = sum(
        (nxy / n) * math.log((nxy * n) / (ca[x] * cb[y]))
        for (x, y), nxy in joint.items()
    )
    ha = -sum((c / n) * math.log(c / n) for c in ca.values())
    hb = -sum((c / n) * math.log(c / n) for c in cb.values())
    if ha == 0 and hb == 0:
        return 1.0
    if ha + hb == 0:
        return 0.0
    return 2 * mi / (ha + hb)


def _c2(x):
    return x * (x - 1) / 2


def ari(a, b):
    n, ca, cb, joint = _counts(a, b)
    total = _c2(n)
    if total == 0:
        return 1.0
    s_joint = sum(_c2(v) for v in joint.values())
    s_a = sum(_c2(v) for v in ca.values())
    s_b = sum(_c2(v) for v in cb.values())
    expected = s_a * s_b / total
    max_index = (s_a + s_b) / 2
    if max_index == expected:
        return 1.0
    return (s_joint - expected) / (max_index - expected)