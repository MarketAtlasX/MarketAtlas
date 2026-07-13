from indexing import EventClusterer, Deduplicator


def test_deduplicator_identical():
    dedup = Deduplicator(similarity_threshold=0.99)
    articles = [
        {"url": "https://example.com/a", "title": "Same Title"},
        {"url": "https://example.com/a", "title": "Same Title"},
    ]
    embeddings = [[1.0, 0.0], [1.0, 0.0]]
    unique, _, indices = dedup.deduplicate(articles, embeddings)
    assert len(unique) == 1


def test_deduplicator_fingerprint():
    dedup = Deduplicator()
    fp1 = dedup._fingerprint(
        {"url": "http://a.com", "title": "Hello"}
    )
    fp2 = dedup._fingerprint(
        {"url": "http://a.com", "title": "Hello"}
    )
    assert fp1 == fp2


def test_deduplicator_fingerprint_different():
    dedup = Deduplicator()
    fp1 = dedup._fingerprint(
        {"url": "http://a.com", "title": "Hello"}
    )
    fp2 = dedup._fingerprint(
        {"url": "http://b.com", "title": "World"}
    )
    assert fp1 != fp2


def test_clusterer_basic():
    clusterer = EventClusterer(eps=0.5, min_samples=1)
    articles = [
        {"title": "Event A1", "published_at": "2026-01-01T00:00:00Z"},
        {"title": "Event A2", "published_at": "2026-01-01T01:00:00Z"},
        {"title": "Event B1", "published_at": "2026-06-01T00:00:00Z"},
    ]
    embeddings = [[1.0, 0.0, 0.0], [0.9, 0.1, 0.0], [0.0, 1.0, 0.0]]
    clusters = clusterer.cluster(articles, embeddings)
    assert len(clusters) >= 2


def test_clusterer_representative():
    clusterer = EventClusterer()
    articles = [
        {"title": "A", "url": "http://a.com"},
        {"title": "B", "url": "http://b.com"},
        {"title": "C", "url": "http://c.com"},
    ]
    embeddings = [[1.0, 0.0], [0.8, 0.2], [0.9, 0.1]]
    idx = clusterer.get_representative_article(
        articles, [0, 1, 2], embeddings
    )
    assert idx in [0, 1, 2]
