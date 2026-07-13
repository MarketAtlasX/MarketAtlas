from similarity import CosineSimilarity, WeightedSimilarity


def test_cosine_similarity_identical():
    cosine = CosineSimilarity()
    vec = [1.0, 0.0, 0.0]
    score = cosine.compute(vec, vec)
    assert abs(score - 1.0) < 0.001


def test_cosine_similarity_orthogonal():
    cosine = CosineSimilarity()
    vec_a = [1.0, 0.0, 0.0]
    vec_b = [0.0, 1.0, 0.0]
    score = cosine.compute(vec_a, vec_b)
    assert abs(score) < 0.001


def test_cosine_rank():
    cosine = CosineSimilarity()
    query = [1.0, 0.0]
    candidates = [[0.9, 0.1], [0.1, 0.9], [0.5, 0.5]]
    ids = ["a", "b", "c"]
    ranked = cosine.rank(query, candidates, ids)
    assert ranked[0][0] == "a"
    assert ranked[0][1] >= ranked[1][1]


def test_weighted_similarity_identical(sample_episode):
    weighted = WeightedSimilarity()
    score = weighted.compute(sample_episode, sample_episode)
    assert abs(score - 1.0) < 0.001 or score > 0.9


def test_weighted_breakdown(sample_episode):
    weighted = WeightedSimilarity()
    bd = weighted.breakdown(sample_episode, sample_episode)
    for key in ["event", "entity", "sector", "location", "market", "timeline", "graph"]:
        assert key in bd


def test_set_similarity():
    weighted = WeightedSimilarity()
    sim = weighted._set_similarity({"a", "b"}, {"a", "b", "c"})
    assert abs(sim - 2/3) < 0.001


def test_set_similarity_empty():
    weighted = WeightedSimilarity()
    assert weighted._set_similarity(set(), set()) == 1.0
    assert weighted._set_similarity({"a"}, set()) == 0.0
