"""Tests for health check aggregation and component status tracking."""
from app.health import HealthChecker, ComponentHealth


def test_health_checker():
    checker = HealthChecker()
    checker.register_component("database", "healthy", 1.2)
    checker.register_component("cache", "healthy", 0.5)

    system_health = checker.get_system_health()
    assert system_health.status == "healthy"
    assert len(system_health.components) == 2
    assert "database" in system_health.components


def test_degraded_health():
    checker = HealthChecker()
    checker.register_component("db", "healthy", 1.0)
    checker.register_component("external_feed", "degraded", 450.0, "Timeout warning")

    system_health = checker.get_system_health()
    assert system_health.status == "degraded"
