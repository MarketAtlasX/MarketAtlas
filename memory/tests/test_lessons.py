from lessons import LessonEngine, LessonTemplates


def test_lesson_engine_generates(sample_episode_with_outcomes):
    engine = LessonEngine()
    lessons = engine.generate(sample_episode_with_outcomes)
    assert len(lessons) > 0
    assert all(isinstance(l, str) for l in lessons)


def test_lesson_templates_market(sample_episode_with_outcomes):
    templates = LessonTemplates()
    lessons = templates.apply_market_lessons(sample_episode_with_outcomes)
    assert len(lessons) > 0
    assert any("Brent Crude" in l for l in lessons)


def test_lesson_templates_conflict(sample_episode_with_outcomes):
    templates = LessonTemplates()
    lessons = templates.apply_conflict_lessons(sample_episode_with_outcomes)
    assert len(lessons) > 0


def test_lesson_templates_supply(sample_episode_with_outcomes):
    templates = LessonTemplates()
    lessons = templates.apply_supply_lessons(sample_episode_with_outcomes)
    assert len(lessons) > 0


def test_lesson_templates_diplomatic(sample_episode):
    templates = LessonTemplates()
    lessons = templates.apply_diplomatic_lessons(sample_episode)
    assert len(lessons) == 0


def test_cross_episode_lessons(sample_episode_with_outcomes):
    engine = LessonEngine()
    lessons = engine.generate(sample_episode_with_outcomes)
    sample_episode_with_outcomes.lessons = lessons
    cross = engine.generate_cross_episode(
        [sample_episode_with_outcomes, sample_episode_with_outcomes],
        min_occurrences=2,
    )
    assert len(cross) > 0
    for item in cross:
        assert "lesson" in item
        assert "occurrences" in item
