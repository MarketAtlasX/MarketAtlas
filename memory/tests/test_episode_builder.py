from episodic_memory.builders import EpisodeBuilder


def test_build_from_articles(sample_articles):
    builder = EpisodeBuilder()
    episode = builder.build(sample_articles)
    assert episode.id is not None
    assert len(episode.title) > 0
    assert len(episode.summary) > 0
    assert len(episode.locations) > 0
    assert len(episode.entities) > 0
    assert len(episode.sectors) > 0


def test_build_empty_articles():
    builder = EpisodeBuilder()
    try:
        builder.build([])
        assert False, "Should have raised ValueError"
    except ValueError:
        pass


def test_build_extracts_title(sample_articles):
    builder = EpisodeBuilder()
    episode = builder.build(sample_articles)
    assert "Iran" in episode.title or "Missile" in episode.title


def test_build_extracts_locations(sample_articles):
    builder = EpisodeBuilder()
    episode = builder.build(sample_articles)
    assert "Iran" in episode.locations or "Middle East" in episode.locations


def test_build_extracts_sectors(sample_articles):
    builder = EpisodeBuilder()
    episode = builder.build(sample_articles)
    assert "energy" in episode.sectors


def test_build_extracts_commodities(sample_articles):
    builder = EpisodeBuilder()
    episode = builder.build(sample_articles)
    assert "oil" in episode.commodities


def test_build_confidence(sample_articles):
    builder = EpisodeBuilder()
    episode = builder.build(sample_articles)
    assert episode.confidence > 0
    assert episode.confidence <= 1.0


def test_build_source_count(sample_articles):
    builder = EpisodeBuilder()
    episode = builder.build(sample_articles)
    assert episode.source_count == len(sample_articles)


def test_build_references(sample_articles):
    builder = EpisodeBuilder()
    episode = builder.build(sample_articles)
    assert len(episode.references) > 0
    assert all(r.startswith("http") for r in episode.references if r)


def test_build_timeline_events(sample_articles):
    builder = EpisodeBuilder()
    episode = builder.build(sample_articles)
    assert len(episode.timeline.events) > 0
